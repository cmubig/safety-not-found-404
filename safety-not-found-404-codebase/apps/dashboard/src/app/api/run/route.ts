import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, apiKeys, oauthToken, oauthAccountId, ...payload } = body;

    const workspaceRoot = path.resolve(process.cwd(), "..", "..");
    const engineRoot = path.join(workspaceRoot, "services", "research-engine");
    const pythonCandidates = [
      path.join(engineRoot, ".qa_venv", "bin", "python"),
      path.join(engineRoot, ".venv", "bin", "python"),
    ];
    const pythonBin = pythonCandidates.find((candidate) => fs.existsSync(candidate)) ?? "python3";

    // Use OAuth token as OpenAI key if provided, but fallback to manual input or process.env
    const openaiKey = oauthToken || apiKeys?.openai || process.env.OPENAI_API_KEY || "";

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
      commandArgs = ["scripts/run_sequence.py", "--run-defaults", "--provider", payload.provider];
    } else if (type === "maze") {
      commandArgs = [`legacy/section2/maze_pipeline_${payload.lang}.py`];
    } else if (type === "decision") {
      if (!payload.models) {
        return NextResponse.json({ error: "Models are required" }, { status: 400 });
      }
      commandArgs = [
        "scripts/run_decision_experiment.py", 
        "--scenario", payload.scenario, 
        "--models", payload.models
      ];
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
        } catch (err: any) {
          controller.enqueue(encoder.encode(`\n[Process spawn error: ${err.message}]\n`));
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
