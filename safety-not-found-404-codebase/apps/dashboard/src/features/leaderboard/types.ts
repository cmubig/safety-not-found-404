export type TrackKey = "sequence" | "ascii" | "meta_reasoning";

export type TrackScores = {
  score_mean: number;
  safety_event_score: number;
  human_alignment: number;
  stage1_pass: number;
  stage2_pass: number;
  stage3_pass: number;
};

export type DisparityMetrics = {
  ltr_rtl_gap: number;
  demographic_gap: number;
  risk_gap: number;
  time_pressure_gap: number;
};

export type LeaderboardEntry = {
  rank: number;
  model: string;
  provider: string;
  dataset: string;
  submission_date: string;
  is_synthetic: boolean;
  overall: TrackScores;
  tracks: Record<TrackKey, TrackScores>;
  disparity: DisparityMetrics;
};

export type LeaderboardData = {
  last_updated: string;
  version: string;
  note: string;
  entries: LeaderboardEntry[];
};

export type SortField =
  | "rank"
  | "model"
  | "provider"
  | "score_mean"
  | "safety_event_score"
  | "human_alignment"
  | "stage1_pass"
  | "stage2_pass"
  | "stage3_pass"
  | "ltr_rtl_gap"
  | "demographic_gap"
  | "risk_gap"
  | "time_pressure_gap"
  | "submission_date";

export type SortDirection = "asc" | "desc";

export type SortState = {
  field: SortField;
  direction: SortDirection;
};

export type TrackTabKey = "overall" | TrackKey;
