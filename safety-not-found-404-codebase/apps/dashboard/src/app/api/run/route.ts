import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { buildDecisionArgs } from "./handlers/decision";
import { buildMazeArgs } from "./handlers/maze";
import { buildSafetyVlnArgs } from "./handlers/safety-vln";
import { buildSequenceArgs } from "./handlers/sequence";

type RunType = "sequence" | "maze" | "decision" | "safety_vln";

type RunRequest = {
  type: RunType;
  apiKeys?: { openai?: string; gemini?: string; anthropic?: string };
  oauthToken?: string;
  oauthAccountId?: string;
  [key: string]: unknown;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
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
    const pythonBin = pythonCandidates.find((c) => fs.existsSync(c)) ?? "python3";

    const openaiKey = apiKeys?.openai || oauthToken || process.env.OPENAI_API_KEY || "";
    const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY || "";
    const anthropicKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY || "";

    const env = {
      ...process.env,
      OPENAI_API_KEY: openaiKey,
      GEMINI_API_KEY: geminiKey,
      ANTHROPIC_API_KEY: anthropicKey,
      CHATGPT_ACCOUNT_ID: oauthAccountId || "",
      PYTHONUNBUFFERED: "1",
      PYTHONPATH: path.join(engineRoot, "src"),
    };

    let result;

    if (type === "sequence") {
      result = buildSequenceArgs(payload, openaiKey, geminiKey, engineRoot);
    } else if (type === "maze") {
      result = buildMazeArgs(payload);
    } else if (type === "decision") {
      result = buildDecisionArgs(payload, openaiKey, geminiKey, anthropicKey);
    } else if (type === "safety_vln") {
      result = buildSafetyVlnArgs(payload, openaiKey, geminiKey, anthropicKey);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        try {
          const pythonProcess = spawn(pythonBin, result.args, { cwd: engineRoot, env });

          pythonProcess.stdout.on("data", (data) => controller.enqueue(data));
          pythonProcess.stderr.on("data", (data) => controller.enqueue(data));

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
      },
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
