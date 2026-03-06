import fs from "fs";
import path from "path";
import { containsImageFiles, HandlerResult, normalize, SUPPORTED_IMAGE_EXTENSIONS } from "./common";

const SEQUENCE_PROVIDERS = new Set(["openai", "gemini"]);

export function buildSequenceArgs(
  payload: Record<string, unknown>,
  openaiKey: string,
  geminiKey: string,
  engineRoot: string,
): HandlerResult {
  const provider = normalize(payload.provider as string | undefined);
  if (!provider) return { args: [], error: "Provider is required" };
  if (!SEQUENCE_PROVIDERS.has(provider)) return { args: [], error: `Unsupported provider: ${provider}` };

  if (provider === "openai" && !openaiKey.trim()) {
    return { args: [], error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for sequence provider=openai" };
  }
  if (provider === "gemini" && !geminiKey.trim()) {
    return { args: [], error: "GEMINI_API_KEY is required for sequence provider=gemini" };
  }

  const sequenceDataRoot = path.join(engineRoot, "data", "sequence");
  const requiredTasks = ["masking", "validation"];
  const missingTasks = requiredTasks.filter((t) => !fs.existsSync(path.join(sequenceDataRoot, t)));
  const emptyTasks = requiredTasks.filter((t) => {
    if (missingTasks.includes(t)) return false;
    return !containsImageFiles(path.join(sequenceDataRoot, t));
  });

  if (missingTasks.length > 0 || emptyTasks.length > 0) {
    const parts: string[] = [`Sequence dataset is not ready at ${path.join("services", "research-engine", "data", "sequence")}.`];
    if (missingTasks.length > 0) parts.push(`Missing folder(s): ${missingTasks.join(", ")}.`);
    if (emptyTasks.length > 0) {
      parts.push(`No image files found in: ${emptyTasks.join(", ")} (supported: ${Array.from(SUPPORTED_IMAGE_EXTENSIONS).join(", ")}).`);
    }
    parts.push("Add benchmark images, then rerun Sequence.");
    return { args: [], error: parts.join(" ") };
  }

  return { args: ["scripts/run_sequence.py", "--run-defaults", "--provider", provider] };
}
