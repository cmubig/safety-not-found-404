export type RunTaskType = "sequence" | "maze" | "decision";

export type RunPayload = Record<string, string>;

export type FeedKind = "system" | "stage" | "progress" | "saved" | "error" | "info";

export type LogFeedItem = {
  id: number;
  kind: FeedKind;
  text: string;
};

export type ModelProvider = "openai" | "gemini" | "anthropic";

export type DecisionModelOption = {
  value: string;
  label: string;
  provider: ModelProvider;
};

export type ModelCatalogResponse = {
  providers?: Partial<Record<ModelProvider, Array<Partial<DecisionModelOption>>>>;
  warnings?: string[];
};

export type FailureCategory =
  | "auth"
  | "quota"
  | "rate_limit"
  | "timeout"
  | "network"
  | "input"
  | "process"
  | "unknown";

export type FailureInsight = {
  category: FailureCategory;
  title: string;
  hint: string;
  line: string;
};

export type PipelineProgress = {
  stage: string;
  scope: string;
  current: number;
  total: number;
  percent: number | null;
};

export type ApiKeys = {
  openai: string;
  gemini: string;
  anthropic: string;
};

export type FeedStats = {
  total: number;
  system: number;
  stage: number;
  progress: number;
  saved: number;
  error: number;
  info: number;
};
