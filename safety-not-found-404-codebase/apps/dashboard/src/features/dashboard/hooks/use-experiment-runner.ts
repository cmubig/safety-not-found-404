import { useMemo, useRef, useState } from "react";
import { getValidTokens } from "@/lib/chatgpt-oauth";
import { FeedStats, FailureInsight, LogFeedItem, PipelineProgress, RunPayload, RunTaskType, ApiKeys } from "../types";
import {
  categorizeFailureLine,
  classifyLogLine,
  detectStageLabel,
  extractArtifactPath,
  extractProgressValue,
  extractScopeLabel,
  toErrorMessage,
} from "../utils/log-utils";

type UseExperimentRunnerArgs = {
  apiKeys: ApiKeys;
};

const INITIAL_PIPELINE_PROGRESS: PipelineProgress = {
  stage: "Idle",
  scope: "",
  current: 0,
  total: 0,
  percent: null,
};

const INITIAL_FEED_STATS: FeedStats = {
  total: 0,
  system: 0,
  stage: 0,
  progress: 0,
  saved: 0,
  error: 0,
  info: 0,
};

const INITIAL_TASK_PROGRESS: Record<RunTaskType, number | null> = {
  sequence: null,
  maze: null,
  decision: null,
};

export function useExperimentRunner({ apiKeys }: UseExperimentRunnerArgs) {
  const [rawLogs, setRawLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunType, setActiveRunType] = useState<RunTaskType | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const [logFeedItems, setLogFeedItems] = useState<LogFeedItem[]>([]);
  const [logFeedFilter, setLogFeedFilter] = useState<LogFeedItem["kind"] | "all">("all");
  const [artifactPaths, setArtifactPaths] = useState<string[]>([]);
  const [latestFailureInsight, setLatestFailureInsight] = useState<FailureInsight | null>(null);
  const [copiedArtifactPath, setCopiedArtifactPath] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>(INITIAL_PIPELINE_PROGRESS);
  const [taskProgressByType, setTaskProgressByType] = useState<Record<RunTaskType, number | null>>(INITIAL_TASK_PROGRESS);

  const lineBufferRef = useRef("");
  const feedSequenceRef = useRef(0);
  const activeRunTypeRef = useRef<RunTaskType | null>(null);
  const hasRunErrorRef = useRef(false);

  const processLogChunk = (chunk: string) => {
    setRawLogs((previousLogs) => previousLogs + chunk);

    const combined = lineBufferRef.current + chunk;
    const lines = combined.split(/\r?\n/);
    lineBufferRef.current = lines.pop() ?? "";

    const nextFeedItems: LogFeedItem[] = [];
    const discoveredArtifacts: string[] = [];

    let stageUpdate: string | null = null;
    let scopeUpdate: string | null = null;
    let progressUpdate: { current: number; total: number; percent: number } | null = null;
    let failureUpdate: FailureInsight | null = null;

    for (const rawLine of lines) {
      const text = rawLine.trim();
      if (!text || /^=+$/.test(text)) continue;

      const kind = classifyLogLine(text);
      nextFeedItems.push({
        id: ++feedSequenceRef.current,
        kind,
        text,
      });

      if (kind === "error") {
        hasRunErrorRef.current = true;
      }

      const stage = detectStageLabel(text);
      if (stage) stageUpdate = stage;

      const scope = extractScopeLabel(text);
      if (scope) scopeUpdate = scope;

      const progress = extractProgressValue(text);
      if (progress) progressUpdate = progress;

      const artifactPath = extractArtifactPath(text);
      if (artifactPath) discoveredArtifacts.push(artifactPath);

      if (kind === "error") {
        failureUpdate = categorizeFailureLine(text);
      }
    }

    if (nextFeedItems.length > 0) {
      setLogFeedItems((previousItems) => [...previousItems, ...nextFeedItems].slice(-800));
    }

    if (discoveredArtifacts.length > 0) {
      setArtifactPaths((previousPaths) => {
        const merged = [...previousPaths];
        for (const artifactPath of discoveredArtifacts) {
          if (!merged.includes(artifactPath)) {
            merged.push(artifactPath);
          }
        }
        return merged.slice(-200);
      });
    }

    if (failureUpdate) {
      setLatestFailureInsight(failureUpdate);
    }

    if (stageUpdate || scopeUpdate || progressUpdate) {
      setPipelineProgress((previousProgress) => ({
        stage: stageUpdate ?? previousProgress.stage,
        scope: scopeUpdate ?? previousProgress.scope,
        current: progressUpdate?.current ?? previousProgress.current,
        total: progressUpdate?.total ?? previousProgress.total,
        percent: progressUpdate?.percent ?? previousProgress.percent,
      }));
    }

    const currentRunType = activeRunTypeRef.current;
    if (currentRunType && progressUpdate) {
      setTaskProgressByType((previousProgress) => ({
        ...previousProgress,
        [currentRunType]: progressUpdate.percent,
      }));
    }
  };

  const resetRunState = (runType: RunTaskType) => {
    activeRunTypeRef.current = runType;
    hasRunErrorRef.current = false;

    setActiveRunType(runType);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);
    setRawLogs("");
    setLogFeedItems([]);
    setLogFeedFilter("all");
    setArtifactPaths([]);
    setLatestFailureInsight(null);
    setCopiedArtifactPath(null);
    setPipelineProgress({ stage: "Initialization", scope: "", current: 0, total: 0, percent: 0 });
    setTaskProgressByType((previousProgress) => ({ ...previousProgress, [runType]: 0 }));

    lineBufferRef.current = "";
    feedSequenceRef.current = 0;
  };

  const finishRun = (successfulRequested: boolean) => {
    if (lineBufferRef.current.trim()) {
      processLogChunk("\n");
    }

    const successful = successfulRequested && !hasRunErrorRef.current;

    const currentRunType = activeRunTypeRef.current;
    if (successful && currentRunType) {
      setTaskProgressByType((previousProgress) => ({ ...previousProgress, [currentRunType]: 100 }));
      setPipelineProgress((previousProgress) => ({ ...previousProgress, percent: 100 }));
    }

    setRunFinishedAt(Date.now());
    activeRunTypeRef.current = null;
  };

  const runExperiment = async (runType: RunTaskType, runPayload: RunPayload) => {
    if (isRunning) return;

    setIsRunning(true);
    resetRunState(runType);

    const prefersOpenAiApiKey = apiKeys.openai.trim().length > 0;
    const needsOpenAiPath =
      runType === "decision" || (runType === "sequence" && runPayload.provider === "openai");
    const oauthTokens = needsOpenAiPath && !prefersOpenAiApiKey ? await getValidTokens() : null;
    const oauthToken = oauthTokens?.access_token;
    const oauthAccountId = oauthTokens?.account_id;

    processLogChunk(`[SYSTEM] Initializing task: ${runType}...\n`);

    const usesChatGptOAuthPath = Boolean(oauthToken) && needsOpenAiPath;

    if (usesChatGptOAuthPath) {
      processLogChunk(`[SYSTEM] ChatGPT OAuth active (Account: ${oauthAccountId}).\n`);
    } else if (needsOpenAiPath && prefersOpenAiApiKey) {
      processLogChunk("[SYSTEM] OpenAI API key path active.\n");
    } else if (runType === "maze") {
      processLogChunk("[SYSTEM] Maze pipeline is local compute; no LLM provider call is required.\n");
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: runType,
          apiKeys,
          oauthToken,
          oauthAccountId,
          ...runPayload,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        processLogChunk(`[SYSTEM ERROR] Request failed (${response.status}): ${bodyText}\n`);
        finishRun(false);
        return;
      }

      if (!response.body) {
        processLogChunk("[SYSTEM ERROR] No response body.\n");
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
          processLogChunk(decoder.decode(value, { stream: true }));
        }
      }

      const runFailed = hasRunErrorRef.current;
      if (runFailed) {
        processLogChunk("\n[SYSTEM ERROR] Task finished with errors.\n");
      } else {
        processLogChunk("\n[SYSTEM] Task completed successfully.\n");
      }
      finishRun(!runFailed);
    } catch (error: unknown) {
      processLogChunk(`\n[SYSTEM ERROR] ${toErrorMessage(error)}\n`);
      finishRun(false);
    } finally {
      setIsRunning(false);
    }
  };

  const copyArtifactPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedArtifactPath(path);
      setTimeout(() => setCopiedArtifactPath((currentPath) => (currentPath === path ? null : currentPath)), 1200);
    } catch {
      setCopiedArtifactPath(null);
    }
  };

  const feedStats = useMemo(() => {
    return logFeedItems.reduce(
      (currentStats, feedItem) => {
        currentStats.total += 1;
        currentStats[feedItem.kind] += 1;
        return currentStats;
      },
      { ...INITIAL_FEED_STATS }
    );
  }, [logFeedItems]);

  const filteredFeedItems = useMemo(() => {
    if (logFeedFilter === "all") return logFeedItems;
    return logFeedItems.filter((feedItem) => feedItem.kind === logFeedFilter);
  }, [logFeedFilter, logFeedItems]);

  const runDurationText = useMemo(() => {
    if (!runStartedAt) return "-";
    if (!runFinishedAt) return isRunning ? "running" : "-";

    return `${((runFinishedAt - runStartedAt) / 1000).toFixed(1)}s`;
  }, [isRunning, runFinishedAt, runStartedAt]);

  const recentArtifacts = useMemo(() => artifactPaths.slice(-20).reverse(), [artifactPaths]);
  const activeTaskPercent = activeRunType ? taskProgressByType[activeRunType] : null;

  return {
    rawLogs,
    isRunning,
    activeRunType,
    logFeedItems,
    logFeedFilter,
    artifactPaths,
    latestFailureInsight,
    copiedArtifactPath,
    pipelineProgress,
    taskProgressByType,
    feedStats,
    filteredFeedItems,
    runDurationText,
    recentArtifacts,
    activeTaskPercent,
    setLogFeedFilter,
    runExperiment,
    copyArtifactPath,
  };
}
