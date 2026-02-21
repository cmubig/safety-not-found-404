"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createAuthFlow, getAuthStatus, loadTokens, clearTokens, refreshAccessToken } from "@/lib/chatgpt-oauth";

type RunTaskType = "sequence" | "maze" | "decision";

type RunPayload = Record<string, string>;

type FeedKind = "system" | "stage" | "progress" | "saved" | "error" | "info";

type LogFeedItem = {
  id: number;
  kind: FeedKind;
  text: string;
};

type DecisionModelOption = {
  value: string;
  label: string;
  provider: ModelProvider;
};

type ModelProvider = "openai" | "gemini" | "anthropic";

type ModelCatalogResponse = {
  providers?: Partial<Record<ModelProvider, Array<Partial<DecisionModelOption>>>>;
  warnings?: string[];
};

type FailureCategory =
  | "auth"
  | "quota"
  | "rate_limit"
  | "timeout"
  | "network"
  | "input"
  | "process"
  | "unknown";

type FailureInsight = {
  category: FailureCategory;
  title: string;
  hint: string;
  line: string;
};

type RunProgress = {
  stage: string;
  scope: string;
  current: number;
  total: number;
  percent: number | null;
};

const MODEL_FETCH_DEBOUNCE_MS = 350;

const FEED_KIND_STYLE: Record<FeedKind, string> = {
  system: "border-neutral-700 text-neutral-200",
  stage: "border-sky-800 text-sky-300",
  progress: "border-amber-700 text-amber-300",
  saved: "border-emerald-800 text-emerald-300",
  error: "border-red-800 text-red-300",
  info: "border-neutral-800 text-neutral-400",
};

const FAILURE_STYLE: Record<FailureCategory, string> = {
  auth: "border-rose-700 bg-rose-950/40 text-rose-200",
  quota: "border-orange-700 bg-orange-950/40 text-orange-200",
  rate_limit: "border-amber-700 bg-amber-950/40 text-amber-200",
  timeout: "border-yellow-700 bg-yellow-950/40 text-yellow-100",
  network: "border-sky-700 bg-sky-950/40 text-sky-100",
  input: "border-violet-700 bg-violet-950/40 text-violet-100",
  process: "border-red-700 bg-red-950/40 text-red-100",
  unknown: "border-neutral-700 bg-neutral-900 text-neutral-200",
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function classifyLine(line: string): FeedKind {
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

function categorizeFailure(line: string): FailureInsight {
  const lowered = line.toLowerCase();

  if (
    lowered.includes("unauthorized") ||
    lowered.includes("401") ||
    lowered.includes("invalid api key") ||
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
    lowered.includes("usage:")
  ) {
    return {
      category: "input",
      title: "Invalid Input",
      hint: "Review selected scenario/model/provider parameters.",
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

function detectStage(line: string): string | null {
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

function extractScope(line: string): string | null {
  const match = line.match(/^Processing\s+([0-9]+x[0-9]+)\.\.\./i);
  return match ? match[1] : null;
}

function extractProgress(line: string): { current: number; total: number; percent: number } | null {
  const match = line.match(/progress:\s*(\d+)\s*\/\s*(\d+)/i);
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;

  const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return { current, total, percent };
}

function extractArtifactPath(line: string): string | null {
  const match = line.match(/^(saved(?: report)?|csv|summary json|summary txt|output):\s*(.+)$/i);
  if (!match) return null;

  const cleaned = match[2].trim().replace(/\s+\([^)]*\)$/, "");
  if (!cleaned.startsWith("/")) return null;
  return cleaned;
}

function fileHref(path: string): string {
  return `file://${encodeURI(path)}`;
}

function normalizeModelId(value: string): string {
  return value.trim();
}

function inferModelProvider(modelId: string): ModelProvider {
  const lowered = modelId.trim().toLowerCase();

  if (lowered.startsWith("gemini")) return "gemini";
  if (lowered.startsWith("claude")) return "anthropic";
  return "openai";
}

function sanitizeDecisionModelOptions(
  options: Array<Partial<DecisionModelOption>> | undefined,
  fallbackProvider: ModelProvider
): DecisionModelOption[] {
  if (!options) return [];

  return options
    .map((option) => {
      const value = option.value?.trim();
      if (!value) return null;
      return {
        value,
        label: option.label?.trim() || value,
        provider: option.provider ?? fallbackProvider,
      };
    })
    .filter((option): option is DecisionModelOption => option !== null);
}

function dedupeDecisionModelOptions(options: DecisionModelOption[]): DecisionModelOption[] {
  const seen = new Set<string>();
  const deduped: DecisionModelOption[] = [];

  for (const option of options) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    deduped.push(option);
  }

  return deduped;
}

function sortDecisionModelOptions(options: DecisionModelOption[], oauthMode: boolean): DecisionModelOption[] {
  const providerOrder: Record<ModelProvider, number> = {
    openai: 0,
    gemini: 1,
    anthropic: 2,
  };

  return [...options].sort((a, b) => {
    const providerDelta = providerOrder[a.provider] - providerOrder[b.provider];
    if (providerDelta !== 0) return providerDelta;

    if (oauthMode && a.provider === "openai" && b.provider === "openai") {
      const aCodex = a.value.toLowerCase().startsWith("codex") ? 0 : 1;
      const bCodex = b.value.toLowerCase().startsWith("codex") ? 0 : 1;
      if (aCodex !== bCodex) return aCodex - bCodex;
    }

    return a.value.localeCompare(b.value, "en", { numeric: true, sensitivity: "base" });
  });
}

function providerBadgeText(modelId: string): string {
  const lowered = modelId.trim().toLowerCase();
  if (lowered.startsWith("codex")) return "openai/codex";
  return inferModelProvider(modelId);
}

function isValidModelId(modelId: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}$/.test(modelId);
}

export default function Dashboard() {
  const [logs, setLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [authStatus, setAuthStatus] = useState(false);
  const [runType, setRunType] = useState<RunTaskType | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<LogFeedItem[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedKind | "all">("all");
  const [artifactPaths, setArtifactPaths] = useState<string[]>([]);
  const [latestFailure, setLatestFailure] = useState<FailureInsight | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState<RunProgress>({
    stage: "Idle",
    scope: "",
    current: 0,
    total: 0,
    percent: null,
  });
  const [progressByTask, setProgressByTask] = useState<Record<RunTaskType, number | null>>({
    sequence: null,
    maze: null,
    decision: null,
  });

  const lineBufferRef = useRef("");
  const feedSequenceRef = useRef(0);
  const activeRunRef = useRef<RunTaskType | null>(null);

  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
    anthropic: "",
  });

  const [seqProvider, setSeqProvider] = useState("openai");
  const [mazeLang, setMazeLang] = useState("ko");
  const [decScenario, setDecScenario] = useState("dilemma_baseline_ab");
  const [decModels, setDecModels] = useState<string[]>([]);
  const [decisionModelOptions, setDecisionModelOptions] = useState<DecisionModelOption[]>([]);
  const [modelCatalogWarnings, setModelCatalogWarnings] = useState<string[]>([]);
  const [modelCatalogError, setModelCatalogError] = useState<string | null>(null);
  const [modelCatalogLoading, setModelCatalogLoading] = useState(false);
  const [modelCatalogUpdatedAt, setModelCatalogUpdatedAt] = useState<number | null>(null);
  const [modelCatalogRevision, setModelCatalogRevision] = useState(0);
  const [decModelInput, setDecModelInput] = useState("");
  const [decModelInputError, setDecModelInputError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      let status = getAuthStatus().authenticated;
      if (!status) {
        const refreshed = await refreshAccessToken();
        if (refreshed) status = true;
      }
      setAuthStatus(status);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setModelCatalogLoading(true);
      setModelCatalogError(null);

      try {
        const tokens = loadTokens();
        const response = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            oauthToken: tokens?.access_token ?? "",
            apiKeys,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(`Model catalog request failed (${response.status}): ${bodyText}`);
        }

        const payload = (await response.json()) as ModelCatalogResponse;
        const openaiModels = sanitizeDecisionModelOptions(payload.providers?.openai, "openai");
        const geminiModels = sanitizeDecisionModelOptions(payload.providers?.gemini, "gemini");
        const anthropicModels = sanitizeDecisionModelOptions(payload.providers?.anthropic, "anthropic");
        const mergedModels = sortDecisionModelOptions(
          dedupeDecisionModelOptions([...openaiModels, ...geminiModels, ...anthropicModels]),
          authStatus
        );

        if (!active) return;

        setDecisionModelOptions(mergedModels);
        setModelCatalogWarnings((payload.warnings ?? []).filter((warning) => Boolean(warning?.trim())));
        setModelCatalogUpdatedAt(Date.now());
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) return;
        setDecisionModelOptions([]);
        setModelCatalogWarnings([]);
        setModelCatalogError(toErrorMessage(error));
      } finally {
        if (active) setModelCatalogLoading(false);
      }
    }, MODEL_FETCH_DEBOUNCE_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [apiKeys, authStatus, modelCatalogRevision]);

  useEffect(() => {
    if (decisionModelOptions.length === 0) return;
    setDecModels((prev) => {
      if (prev.length > 0) return prev;
      return [decisionModelOptions[0].value];
    });
  }, [decisionModelOptions]);

  const handleChatGPTConnect = async () => {
    try {
      if (authStatus) {
        clearTokens();
        setAuthStatus(false);
        return;
      }
      const { authUrl } = await createAuthFlow();
      window.location.href = authUrl;
    } catch (err) {
      console.error(err);
      alert("Failed to initiate login flow.");
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath((current) => (current === path ? null : current)), 1200);
    } catch {
      setCopiedPath(null);
    }
  };

  const refreshModelCatalog = () => {
    setModelCatalogRevision((prev) => prev + 1);
  };

  const processChunk = (chunk: string) => {
    setLogs((prev) => prev + chunk);

    const combined = lineBufferRef.current + chunk;
    const lines = combined.split(/\r?\n/);
    lineBufferRef.current = lines.pop() ?? "";

    const parsed: LogFeedItem[] = [];
    const discoveredPaths: string[] = [];

    let stageUpdate: string | null = null;
    let scopeUpdate: string | null = null;
    let progressUpdate: { current: number; total: number; percent: number } | null = null;
    let failureUpdate: FailureInsight | null = null;

    for (const rawLine of lines) {
      const text = rawLine.trim();
      if (!text || /^=+$/.test(text)) continue;

      const kind = classifyLine(text);
      parsed.push({
        id: ++feedSequenceRef.current,
        kind,
        text,
      });

      const stage = detectStage(text);
      if (stage) stageUpdate = stage;

      const scope = extractScope(text);
      if (scope) scopeUpdate = scope;

      const progress = extractProgress(text);
      if (progress) progressUpdate = progress;

      const artifactPath = extractArtifactPath(text);
      if (artifactPath) discoveredPaths.push(artifactPath);

      if (kind === "error") {
        failureUpdate = categorizeFailure(text);
      }
    }

    if (parsed.length > 0) {
      setFeedItems((prev) => [...prev, ...parsed].slice(-800));
    }

    if (discoveredPaths.length > 0) {
      setArtifactPaths((prev) => {
        const merged = [...prev];
        for (const path of discoveredPaths) {
          if (!merged.includes(path)) merged.push(path);
        }
        return merged.slice(-200);
      });
    }

    if (failureUpdate) {
      setLatestFailure(failureUpdate);
    }

    if (stageUpdate || scopeUpdate || progressUpdate) {
      setRunProgress((prev) => ({
        stage: stageUpdate ?? prev.stage,
        scope: scopeUpdate ?? prev.scope,
        current: progressUpdate?.current ?? prev.current,
        total: progressUpdate?.total ?? prev.total,
        percent: progressUpdate?.percent ?? prev.percent,
      }));
    }

    const currentRun = activeRunRef.current;
    if (currentRun && progressUpdate) {
      setProgressByTask((prev) => ({
        ...prev,
        [currentRun]: progressUpdate.percent,
      }));
    }
  };

  const resetRunState = (type: RunTaskType) => {
    activeRunRef.current = type;
    setRunType(type);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);
    setLogs("");
    setFeedItems([]);
    setFeedFilter("all");
    setArtifactPaths([]);
    setLatestFailure(null);
    setCopiedPath(null);
    setRunProgress({ stage: "Initialization", scope: "", current: 0, total: 0, percent: 0 });
    setProgressByTask((prev) => ({
      ...prev,
      [type]: 0,
    }));
    lineBufferRef.current = "";
    feedSequenceRef.current = 0;
  };

  const finishRun = (successful: boolean) => {
    if (lineBufferRef.current.trim()) {
      processChunk("\n");
    }

    const currentRun = activeRunRef.current;
    if (successful && currentRun) {
      setProgressByTask((prev) => ({ ...prev, [currentRun]: 100 }));
      setRunProgress((prev) => ({ ...prev, percent: 100 }));
    }

    setRunFinishedAt(Date.now());
    activeRunRef.current = null;
  };

  const handleRun = async (type: RunTaskType, payload: RunPayload) => {
    if (isRunning) return;
    setIsRunning(true);
    resetRunState(type);

    const tokens = loadTokens();
    const oauthToken = tokens?.access_token;
    const oauthAccountId = tokens?.account_id;

    processChunk(`[SYSTEM] Initializing task: ${type}...\n`);

    const usingChatGptPath = Boolean(oauthToken) && (type === "decision" || (type === "sequence" && payload.provider === "openai"));

    if (usingChatGptPath) {
      processChunk(`[SYSTEM] ChatGPT OAuth active (Account: ${oauthAccountId}).\n`);
    } else if (type === "maze") {
      processChunk("[SYSTEM] Maze pipeline is local compute; no LLM provider call is required.\n");
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          apiKeys,
          oauthToken,
          oauthAccountId,
          ...payload,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        processChunk(`[SYSTEM ERROR] Request failed (${response.status}): ${bodyText}\n`);
        finishRun(false);
        return;
      }

      if (!response.body) {
        processChunk("[SYSTEM ERROR] No response body.\n");
        finishRun(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          processChunk(decoder.decode(value, { stream: true }));
        }
      }

      processChunk("\n[SYSTEM] Task completed successfully.\n");
      finishRun(true);
    } catch (error: unknown) {
      processChunk(`\n[SYSTEM ERROR] ${toErrorMessage(error)}\n`);
      finishRun(false);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleDecisionModel = (model: string) => {
    setDecModels((prev) => {
      if (prev.includes(model)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== model);
      }
      return [...prev, model];
    });
    setDecModelInputError(null);
  };

  const removeDecisionModel = (model: string) => {
    setDecModels((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item !== model);
    });
  };

  const addCustomDecisionModel = () => {
    const model = normalizeModelId(decModelInput);
    if (!model) return;

    if (!isValidModelId(model)) {
      setDecModelInputError("Invalid model id format.");
      return;
    }

    setDecModels((prev) => (prev.includes(model) ? prev : [...prev, model]));
    setDecModelInput("");
    setDecModelInputError(null);
  };

  const feedStats = useMemo(() => {
    return feedItems.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.kind] += 1;
        return acc;
      },
      {
        total: 0,
        system: 0,
        stage: 0,
        progress: 0,
        saved: 0,
        error: 0,
        info: 0,
      }
    );
  }, [feedItems]);

  const filteredFeed = useMemo(() => {
    if (feedFilter === "all") return feedItems;
    return feedItems.filter((item) => item.kind === feedFilter);
  }, [feedFilter, feedItems]);

  const runDurationText = useMemo(() => {
    if (!runStartedAt) return "-";
    if (!runFinishedAt) return isRunning ? "running" : "-";
    return `${((runFinishedAt - runStartedAt) / 1000).toFixed(1)}s`;
  }, [isRunning, runFinishedAt, runStartedAt]);

  const recentArtifacts = useMemo(() => artifactPaths.slice(-20).reverse(), [artifactPaths]);

  const activeTaskPercent = runType ? progressByTask[runType] : null;

  const renderSectionProgress = (type: RunTaskType) => {
    if (runType !== type) return null;

    const percent = progressByTask[type];
    const showIndeterminate = isRunning && percent === null;

    return (
      <div className="space-y-1">
        <div className="h-1.5 bg-neutral-800 overflow-hidden border border-neutral-700">
          {percent !== null ? (
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${percent}%` }} />
          ) : showIndeterminate ? (
            <div className="h-full w-1/3 bg-white/70 animate-pulse" />
          ) : (
            <div className="h-full w-0" />
          )}
        </div>
        <p className="text-[11px] text-neutral-500">
          {percent !== null ? `${percent}%` : isRunning ? "running" : "-"}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Safety Not Found 404</h1>
          <p className="text-neutral-400">Project Benchmark &amp; Experiment Control Center</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant={authStatus ? "outline" : "primary"}
            onClick={handleChatGPTConnect}
            className="w-full sm:w-auto overflow-hidden text-ellipsis px-2"
          >
            {authStatus ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10a37f]"></div>
                ChatGPT Configured (Click to Logout)
              </span>
            ) : (
              "Connect ChatGPT (OAuth)"
            )}
          </Button>

          <Input
            type="password"
            placeholder="or OpenAI API Key"
            className="w-full sm:w-48"
            value={apiKeys.openai}
            onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
            disabled={authStatus}
          />
          <Input
            type="password"
            placeholder="Gemini API Key"
            className="w-full sm:w-48"
            value={apiKeys.gemini}
            onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Execution Architecture</CardTitle>
          <CardDescription>
            Sequence and Decision sections call AI models. Maze section is local data generation and processing only.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section 1: Sequence</CardTitle>
              <CardDescription>AI-driven sequence benchmark runner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Provider</label>
                <Select value={seqProvider} onChange={(e) => setSeqProvider(e.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </Select>
              </div>
              <Button className="w-full" disabled={isRunning} onClick={() => handleRun("sequence", { provider: seqProvider })}>
                Run Sequence
              </Button>
              {renderSectionProgress("sequence")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 2: Maze</CardTitle>
              <CardDescription>Local pipeline for maze generation and visualization (no LLM call).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Language</label>
                <Select value={mazeLang} onChange={(e) => setMazeLang(e.target.value)}>
                  <option value="en">English (maze_pipeline_en.py)</option>
                  <option value="ko">Korean (maze_pipeline_ko.py)</option>
                </Select>
              </div>
              <Button
                className="w-full"
                variant="secondary"
                disabled={isRunning}
                onClick={() => handleRun("maze", { lang: mazeLang })}
              >
                Run Maze Pipeline
              </Button>
              {renderSectionProgress("maze")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 3: Decision Experiments</CardTitle>
              <CardDescription>AI decision runner with live model catalog from connected providers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Scenario</label>
                <Select value={decScenario} onChange={(e) => setDecScenario(e.target.value)}>
                  <option value="dilemma_baseline_ab">Dilemma Baseline AB</option>
                  <option value="dilemma_factorial_abcd">Dilemma Factorial ABCD</option>
                  <option value="samarian_time_pressure">Samarian Time Pressure</option>
                  <option value="samarian_priming_time">Samarian Priming Time</option>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-neutral-400">Models</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={refreshModelCatalog}
                    disabled={isRunning || modelCatalogLoading}
                  >
                    {modelCatalogLoading ? "Syncing..." : "Refresh"}
                  </Button>
                </div>
                {authStatus ? (
                  <p className="text-xs text-neutral-500">
                    OAuth mode active: live OpenAI catalog is loaded and Codex models are prioritized.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Catalog is fetched live from connected provider credentials.
                  </p>
                )}
                <p className="text-xs text-neutral-500">
                  {modelCatalogLoading
                    ? "Loading model catalog..."
                    : `Loaded ${decisionModelOptions.length} model(s)${
                        modelCatalogUpdatedAt ? ` • synced ${new Date(modelCatalogUpdatedAt).toLocaleTimeString()}` : ""
                      }`}
                </p>
                {modelCatalogError ? <p className="text-xs text-red-300">{modelCatalogError}</p> : null}
                {modelCatalogWarnings.length > 0 ? (
                  <div className="space-y-1">
                    {modelCatalogWarnings.map((warning) => (
                      <p key={warning} className="text-xs text-amber-300">
                        {warning}
                      </p>
                    ))}
                  </div>
                ) : null}
                {decisionModelOptions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                    {decisionModelOptions.map((option) => {
                      const selected = decModels.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleDecisionModel(option.value)}
                          className={`text-left px-3 py-2 border transition-colors ${
                            selected
                              ? "border-white bg-white text-black"
                              : "border-neutral-700 bg-transparent text-neutral-200 hover:border-neutral-400"
                          }`}
                          disabled={isRunning}
                        >
                          <div className="text-sm font-semibold">{option.label}</div>
                          <div className={`text-xs ${selected ? "text-neutral-700" : "text-neutral-500"}`}>{option.provider}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-neutral-800 p-3 text-xs text-neutral-500">
                    No provider models loaded yet. Connect OAuth or set API keys, or add custom model id below.
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={decModelInput}
                    onChange={(event) => setDecModelInput(event.target.value)}
                    placeholder="Add custom model id (e.g. codex-mini-latest)"
                    disabled={isRunning}
                  />
                  <Button type="button" variant="secondary" size="sm" disabled={isRunning} onClick={addCustomDecisionModel}>
                    Add
                  </Button>
                </div>
                {decModelInputError ? <p className="text-xs text-red-300">{decModelInputError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {decModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => removeDecisionModel(model)}
                      disabled={isRunning || decModels.length === 1}
                      className={`px-2 py-1 border text-xs font-mono ${
                        decModels.length === 1
                          ? "border-neutral-700 text-neutral-400"
                          : "border-neutral-600 text-neutral-200 hover:border-white"
                      }`}
                    >
                      {model} ({providerBadgeText(model)}) x
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">Selected: {decModels.length > 0 ? decModels.join(", ") : "-"}</p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                disabled={isRunning || decModels.length === 0}
                onClick={() => handleRun("decision", { scenario: decScenario, models: decModels.join(",") })}
              >
                Run Decision Experiment
              </Button>
              {renderSectionProgress("decision")}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col h-full bg-[#050505] border border-neutral-800 rounded-md overflow-hidden relative shadow-lg">
          <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-white animate-pulse" : "bg-neutral-600"}`} />
              Execution Console
            </h3>
            <span className="text-xs text-neutral-500 font-mono">/api/run</span>
          </div>

          <div className="p-4 border-b border-neutral-800 grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="border border-neutral-800 p-3">
              <div className="text-neutral-500">Task</div>
              <div className="text-white mt-1">{runType ?? "-"}</div>
            </div>
            <div className="border border-neutral-800 p-3">
              <div className="text-neutral-500">Duration</div>
              <div className="text-white mt-1">{runDurationText}</div>
            </div>
            <div className="border border-neutral-800 p-3">
              <div className="text-neutral-500">Saved</div>
              <div className="text-emerald-300 mt-1">{feedStats.saved}</div>
            </div>
            <div className="border border-neutral-800 p-3">
              <div className="text-neutral-500">Errors</div>
              <div className="text-red-300 mt-1">{feedStats.error}</div>
            </div>
          </div>

          <div className="p-4 border-b border-neutral-800 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Pipeline Progress</span>
                <span>
                  {activeTaskPercent !== null
                    ? `${activeTaskPercent}%`
                    : isRunning
                    ? "running"
                    : "-"}
                </span>
              </div>
              <div className="mt-2 h-2 bg-neutral-900 border border-neutral-800 overflow-hidden">
                {activeTaskPercent !== null ? (
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${activeTaskPercent}%` }} />
                ) : isRunning ? (
                  <div className="h-full w-1/3 bg-white/70 animate-pulse" />
                ) : (
                  <div className="h-full w-0" />
                )}
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">
                Stage: {runProgress.stage}
                {runProgress.scope ? ` • Scope: ${runProgress.scope}` : ""}
                {runProgress.total > 0 ? ` • ${runProgress.current}/${runProgress.total}` : ""}
              </div>
            </div>

            <div className={`border px-3 py-2 text-xs ${latestFailure ? FAILURE_STYLE[latestFailure.category] : "border-neutral-800 text-neutral-500"}`}>
              {latestFailure ? (
                <div className="space-y-1">
                  <p className="font-semibold">Failure Insight: {latestFailure.title}</p>
                  <p className="text-[11px] opacity-90">{latestFailure.hint}</p>
                  <p className="font-mono text-[11px] break-all">{latestFailure.line}</p>
                </div>
              ) : (
                <p>No failure detected in current run.</p>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-neutral-800 flex flex-wrap gap-2">
            {(["all", "system", "stage", "progress", "saved", "error", "info"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFeedFilter(kind)}
                className={`px-2 py-1 text-xs border ${
                  feedFilter === kind
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {kind === "all" ? "all" : `${kind} (${feedStats[kind]})`}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-b border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-300">Artifacts</p>
              <p className="text-xs text-neutral-500">{artifactPaths.length}</p>
            </div>
            {recentArtifacts.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-auto pr-1">
                {recentArtifacts.map((path) => (
                  <div key={path} className="border border-neutral-800 p-2 text-xs font-mono text-neutral-400 space-y-2">
                    <p className="break-all">{path}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={fileHref(path)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 border border-neutral-700 hover:border-neutral-400 text-neutral-300"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPath(path)}
                        className="px-2 py-1 border border-neutral-700 hover:border-neutral-400 text-neutral-300"
                      >
                        {copiedPath === path ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-600">No artifacts captured yet.</p>
            )}
          </div>

          <div className="p-4 flex-1 overflow-auto bg-[#000000] font-mono whitespace-pre-wrap text-sm leading-relaxed max-h-[420px]">
            {filteredFeed.length > 0 ? (
              <div className="space-y-2">
                {filteredFeed.map((item) => (
                  <div key={item.id} className={`border-l-2 pl-3 py-1 ${FEED_KIND_STYLE[item.kind]}`}>
                    <span className="uppercase text-[10px] tracking-wide">[{item.kind}] </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-neutral-600 italic">Waiting for execution...</span>
            )}
          </div>

          <details className="border-t border-neutral-800">
            <summary className="cursor-pointer select-none px-4 py-3 text-xs text-neutral-400 hover:text-white">
              Raw Terminal Output ({feedStats.total} lines)
            </summary>
            <div className="px-4 pb-4 pt-1 bg-black">
              <pre className="text-xs text-neutral-500 whitespace-pre-wrap">{logs || "(empty)"}</pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
