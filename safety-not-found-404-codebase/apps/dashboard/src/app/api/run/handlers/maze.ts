import { HandlerResult, normalize } from "./common";

const MAZE_LANGUAGES = new Set(["en", "ko"]);

export function buildMazeArgs(payload: Record<string, unknown>): HandlerResult {
  const language = normalize(payload.lang as string | undefined);
  if (!language) return { args: [], error: "Language is required" };
  if (!MAZE_LANGUAGES.has(language)) return { args: [], error: `Unsupported maze language: ${language}` };
  return { args: ["scripts/run_maze_pipeline.py", "--language", language] };
}
