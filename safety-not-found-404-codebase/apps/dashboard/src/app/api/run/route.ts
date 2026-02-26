import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type RunType = "sequence" | "maze" | "decision";

type RunRequest = {
  type: RunType;
  apiKeys?: {
    openai?: string;
    gemini?: string;
    anthropic?: string;
  };
  oauthToken?: string;
  oauthAccountId?: string;
  provider?: string;
  lang?: string;
  scenario?: string;
  models?: string;
};

const SEQUENCE_PROVIDERS = new Set(["openai", "gemini"]);
const MAZE_LANGUAGES = new Set(["en", "ko"]);
const DECISION_SCENARIOS = new Set([
  "dilemma_baseline_ab",
  "dilemma_factorial_abcd",
  "samarian_time_pressure",
  "samarian_priming_time",
]);
const MODEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}$/;
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseDecisionModels(rawModels: string): { models: string[]; invalidModel: string | null } {
  const models = rawModels
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const uniqueModels: string[] = [];
  const seen = new Set<string>();

  for (const modelId of models) {
    if (!MODEL_ID_PATTERN.test(modelId)) {
      return { models: [], invalidModel: modelId };
    }
    if (seen.has(modelId)) continue;
    seen.add(modelId);
    uniqueModels.push(modelId);
  }

  return { models: uniqueModels, invalidModel: null };
}

type ModelProvider = "openai" | "gemini" | "anthropic";

function inferProviderFromModelId(modelId: string): ModelProvider {
  const lowered = modelId.trim().toLowerCase();
  if (lowered.startsWith("gemini")) return "gemini";
  if (lowered.startsWith("claude")) return "anthropic";
  return "openai";
}

function containsImageFiles(rootDir: string): boolean {
  if (!fs.existsSync(rootDir)) return false;

  const queue: string[] = [rootDir];
  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
          return true;
        }
      }
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body: RunRequest = await req.json();
    const { type, apiKeys, oauthToken, oauthAccountId, ...payload } = body;

    const workspaceRoot = path.resolve(process.cwd(), "..", "..");
    const engineRoot = path.join(workspaceRoot, "services", "research-engine");
    const pythonCandidates = [
      path.join(engineRoot, ".qa_venv", "bin", "python"),
      path.join(engineRoot, ".venv", "bin", "python"),
    ];
    const pythonBin = pythonCandidates.find((candidate) => fs.existsSync(candidate)) ?? "python3";

    // Prefer explicit API key if provided, then OAuth token, then process env.
    const openaiKey = apiKeys?.openai || oauthToken || process.env.OPENAI_API_KEY || "";

    const env = {
      ...process.env,
      OPENAI_API_KEY: openaiKey,
      GEMINI_API_KEY: apiKeys?.gemini || process.env.GEMINI_API_KEY || "",
      ANTHROPIC_API_KEY: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY || "",
      CHATGPT_ACCOUNT_ID: oauthAccountId || "",
      PYTHONUNBUFFERED: "1",
      PYTHONPATH: path.join(engineRoot, "src"),
    };

    let commandArgs: string[] = [];
    
    if (type === "sequence") {
      const provider = normalize(payload.provider);
      if (!provider) {
        return NextResponse.json({ error: "Provider is required" }, { status: 400 });
      }
      if (!SEQUENCE_PROVIDERS.has(provider)) {
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
      }
      if (provider === "openai" && !openaiKey.trim()) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for sequence provider=openai" },
          { status: 400 }
        );
      }
      if (provider === "gemini" && !env.GEMINI_API_KEY?.trim()) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY is required for sequence provider=gemini" },
          { status: 400 }
        );
      }

      const sequenceDataRoot = path.join(engineRoot, "data", "sequence");
      const requiredTasks = ["masking", "validation"];
      const missingTasks = requiredTasks.filter((taskName) => !fs.existsSync(path.join(sequenceDataRoot, taskName)));
      const emptyTasks = requiredTasks.filter((taskName) => {
        if (missingTasks.includes(taskName)) return false;
        return !containsImageFiles(path.join(sequenceDataRoot, taskName));
      });

      if (missingTasks.length > 0 || emptyTasks.length > 0) {
        const messageParts: string[] = [
          `Sequence dataset is not ready at ${path.join("services", "research-engine", "data", "sequence")}.`,
        ];
        if (missingTasks.length > 0) {
          messageParts.push(`Missing folder(s): ${missingTasks.join(", ")}.`);
        }
        if (emptyTasks.length > 0) {
          messageParts.push(
            `No image files found in: ${emptyTasks.join(", ")} (supported: ${Array.from(SUPPORTED_IMAGE_EXTENSIONS).join(", ")}).`
          );
        }
        messageParts.push("Add benchmark images, then rerun Sequence.");
        return NextResponse.json({ error: messageParts.join(" ") }, { status: 400 });
      }

      commandArgs = ["scripts/run_sequence.py", "--run-defaults", "--provider", provider];
    } else if (type === "maze") {
      const language = normalize(payload.lang);
      if (!language) {
        return NextResponse.json({ error: "Language is required" }, { status: 400 });
      }
      if (!MAZE_LANGUAGES.has(language)) {
        return NextResponse.json({ error: `Unsupported maze language: ${language}` }, { status: 400 });
      }
      commandArgs = ["scripts/run_maze_pipeline.py", "--language", language];
    } else if (type === "decision") {
      const scenario = normalize(payload.scenario);
      const rawModels = normalize(payload.models);

      if (!scenario || !rawModels) {
        return NextResponse.json({ error: "Scenario and models are required" }, { status: 400 });
      }
      if (!DECISION_SCENARIOS.has(scenario)) {
        return NextResponse.json({ error: `Unsupported scenario: ${scenario}` }, { status: 400 });
      }

      const { models, invalidModel } = parseDecisionModels(rawModels);
      if (invalidModel) {
        return NextResponse.json({ error: `Invalid model id: ${invalidModel}` }, { status: 400 });
      }
      if (models.length === 0) {
        return NextResponse.json({ error: "At least one model is required" }, { status: 400 });
      }

      const requiredProviders = new Set<ModelProvider>(models.map(inferProviderFromModelId));
      if (requiredProviders.has("openai") && !openaiKey.trim()) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for selected OpenAI model(s)" },
          { status: 400 }
        );
      }
      if (requiredProviders.has("gemini") && !env.GEMINI_API_KEY?.trim()) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY is required for selected Gemini model(s)" },
          { status: 400 }
        );
      }
      if (requiredProviders.has("anthropic") && !env.ANTHROPIC_API_KEY?.trim()) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY is required for selected Anthropic model(s)" },
          { status: 400 }
        );
      }

      commandArgs = ["scripts/run_decision_experiment.py", "--scenario", scenario, "--models", models.join(",")];
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        try {
          const pythonProcess = spawn(pythonBin, commandArgs, {
            cwd: engineRoot,
            env,
          });

          pythonProcess.stdout.on("data", (data) => {
            controller.enqueue(data);
          });

          pythonProcess.stderr.on("data", (data) => {
            controller.enqueue(data);
          });

          pythonProcess.on("close", (code) => {
            controller.enqueue(encoder.encode(`\n[Process exited with code ${code}]\n`));
            controller.close();
          });
          
          pythonProcess.on("error", (err) => {
            controller.enqueue(encoder.encode(`\n[Failed to start process: ${err.message}]\n`));
            controller.close();
          });
        } catch (err: unknown) {
          controller.enqueue(encoder.encode(`\n[Process spawn error: ${toErrorMessage(err)}]\n`));
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
