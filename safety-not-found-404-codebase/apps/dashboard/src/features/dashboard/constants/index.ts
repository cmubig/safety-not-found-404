import { FailureCategory, FeedKind, RunTaskType } from "../types";

export const MODEL_CATALOG_FETCH_DEBOUNCE_MS = 350;

export const FEED_KIND_STYLE: Record<FeedKind, string> = {
  system: "border-neutral-700 text-neutral-200",
  stage: "border-sky-800 text-sky-300",
  progress: "border-amber-700 text-amber-300",
  saved: "border-emerald-800 text-emerald-300",
  error: "border-red-800 text-red-300",
  info: "border-neutral-800 text-neutral-400",
};

export const FAILURE_STYLE: Record<FailureCategory, string> = {
  auth: "border-rose-700 bg-rose-950/40 text-rose-200",
  quota: "border-orange-700 bg-orange-950/40 text-orange-200",
  rate_limit: "border-amber-700 bg-amber-950/40 text-amber-200",
  timeout: "border-yellow-700 bg-yellow-950/40 text-yellow-100",
  network: "border-sky-700 bg-sky-950/40 text-sky-100",
  input: "border-violet-700 bg-violet-950/40 text-violet-100",
  process: "border-red-700 bg-red-950/40 text-red-100",
  unknown: "border-neutral-700 bg-neutral-900 text-neutral-200",
};

export const FEED_FILTER_OPTIONS = ["all", "system", "stage", "progress", "saved", "error", "info"] as const;

export const DECISION_SCENARIO_OPTIONS = [
  { value: "dilemma_baseline_ab", label: "Dilemma Baseline AB" },
  { value: "dilemma_factorial_abcd", label: "Dilemma Factorial ABCD" },
  { value: "samarian_time_pressure", label: "Samarian Time Pressure" },
  { value: "samarian_priming_time", label: "Samarian Priming Time" },
] as const;

export const MAZE_LANGUAGE_OPTIONS = [
  { value: "en", label: "English (maze_pipeline_en.py)" },
  { value: "ko", label: "Korean (maze_pipeline_ko.py)" },
] as const;

export const SEQUENCE_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
] as const;

export const TASK_TYPE_LABELS: Record<RunTaskType, string> = {
  sequence: "Sequence",
  maze: "Maze",
  decision: "Decision",
};
