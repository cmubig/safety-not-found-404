import fs from "fs";
import path from "path";

export const MODEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}$/;
export const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export type HandlerResult = {
  args: string[];
  error?: string;
};

export type ModelProvider = "openai" | "gemini" | "anthropic";

export function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function normalizeAny(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parseRatio(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

export function inferProviderFromModelId(modelId: string): ModelProvider {
  const lowered = modelId.trim().toLowerCase();
  if (lowered.startsWith("gemini")) return "gemini";
  if (lowered.startsWith("claude")) return "anthropic";
  return "openai";
}

export function containsImageFiles(rootDir: string): boolean {
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
