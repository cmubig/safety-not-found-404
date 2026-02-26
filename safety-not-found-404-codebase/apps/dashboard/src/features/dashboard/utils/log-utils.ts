import { FailureInsight, FeedKind } from "../types";

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function classifyLogLine(line: string): FeedKind {
  const lowered = line.toLowerCase();
  const exitMatch = lowered.match(/\[process exited with code\s+(-?\d+)\]/);

  if (exitMatch && Number(exitMatch[1]) !== 0) {
    return "error";
  }

  if (
    lowered.startsWith("[system error]") ||
    lowered.includes("traceback") ||
    lowered.includes(" exception") ||
    lowered.includes(" error:") ||
    lowered.includes(" failed")
  ) {
    return "error";
  }

  if (lowered.startsWith("[system]")) {
    return "system";
  }

  if (lowered.includes("progress:")) {
    return "progress";
  }

  if (/^(saved(?: report)?|csv|summary json|summary txt|output):/i.test(line)) {
    return "saved";
  }

  if (lowered.includes("단계") || lowered.startsWith("processing ") || lowered.startsWith("scenario:")) {
    return "stage";
  }

  return "info";
}

export function categorizeFailureLine(line: string): FailureInsight {
  const lowered = line.toLowerCase();

  if (
    lowered.includes("unauthorized") ||
    lowered.includes("401") ||
    lowered.includes("invalid api key") ||
    lowered.includes("api_key is not set") ||
    lowered.includes("api key is not set") ||
    lowered.includes("authentication") ||
    lowered.includes("oauth")
  ) {
    return {
      category: "auth",
      title: "Authentication Failure",
      hint: "Check OAuth login or API key validity before rerun.",
      line,
    };
  }

  if (
    lowered.includes("insufficient_quota") ||
    lowered.includes("quota") ||
    lowered.includes("billing") ||
    lowered.includes("credit") ||
    lowered.includes("nonretryable_quota_zero")
  ) {
    return {
      category: "quota",
      title: "Quota Exhausted",
      hint: "Top up credits or switch to ChatGPT OAuth route.",
      line,
    };
  }

  if (lowered.includes("rate limit") || lowered.includes("too many requests") || lowered.includes("http 429")) {
    return {
      category: "rate_limit",
      title: "Rate Limited",
      hint: "Retry with lower request volume or wait and rerun.",
      line,
    };
  }

  if (lowered.includes("timeout") || lowered.includes("timed out") || lowered.includes("deadline")) {
    return {
      category: "timeout",
      title: "Timeout",
      hint: "Increase timeout or reduce workload per run.",
      line,
    };
  }

  if (
    lowered.includes("connection") ||
    lowered.includes("network") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("dns") ||
    lowered.includes("econn")
  ) {
    return {
      category: "network",
      title: "Network Failure",
      hint: "Verify connectivity and retry the same configuration.",
      line,
    };
  }

  if (
    lowered.includes("required") ||
    lowered.includes("invalid") ||
    lowered.includes("unknown provider") ||
    lowered.includes("no model targets") ||
    lowered.includes("usage:") ||
    lowered.includes("folder not found") ||
    lowered.includes("filenotfounderror")
  ) {
    return {
      category: "input",
      title: "Invalid Input",
      hint: "Review provider/model settings and required input dataset paths.",
      line,
    };
  }

  if (/\[process exited with code\s+(-?\d+)\]/i.test(line)) {
    return {
      category: "process",
      title: "Process Exit Failure",
      hint: "Inspect preceding error lines and stack traces for root cause.",
      line,
    };
  }

  return {
    category: "unknown",
    title: "Unknown Failure",
    hint: "Open Raw Terminal Output and inspect the final error block.",
    line,
  };
}

export function detectStageLabel(line: string): string | null {
  const trimmed = line.trim();
  const lowered = trimmed.toLowerCase();
  const koStageMatch = trimmed.match(/^(\d+)단계:\s*(.+)$/);

  if (koStageMatch) {
    return `${koStageMatch[1]}단계: ${koStageMatch[2]}`;
  }

  if (lowered.startsWith("scenario:")) {
    return "Scenario execution";
  }

  if (lowered.startsWith("models:")) {
    return "Model sweep";
  }

  if (lowered.startsWith("[system] initializing task:")) {
    return "Initialization";
  }

  if (lowered.startsWith("processing ")) {
    return "Map generation";
  }

  return null;
}

export function extractScopeLabel(line: string): string | null {
  const match = line.match(/^Processing\s+([0-9]+x[0-9]+)\.\.\./i);
  return match ? match[1] : null;
}

export function extractProgressValue(line: string): { current: number; total: number; percent: number } | null {
  const match = line.match(/progress:\s*(\d+)\s*\/\s*(\d+)/i);
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);

  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return {
    current,
    total,
    percent: Math.max(0, Math.min(100, Math.round((current / total) * 100))),
  };
}

export function extractArtifactPath(line: string): string | null {
  const match = line.match(/^(saved(?: report)?|csv|summary json|summary txt|output):\s*(.+)$/i);
  if (!match) return null;

  const cleaned = match[2].trim().replace(/\s+\([^)]*\)$/, "");
  return cleaned.startsWith("/") ? cleaned : null;
}

export function toFileHref(path: string): string {
  return `file://${encodeURI(path)}`;
}
