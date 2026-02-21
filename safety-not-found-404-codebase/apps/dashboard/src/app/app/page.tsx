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
  provider: "openai" | "gemini" | "anthropic";
};

const DECISION_MODEL_OPTIONS: DecisionModelOption[] = [
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai" },
  { value: "gpt-4.1-mini", label: "GPT-4.1-mini", provider: "openai" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "gemini" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "gemini" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "anthropic" },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function classifyLine(line: string): FeedKind {
  const lowered = line.toLowerCase();

  if (lowered.startsWith("[system error]") || lowered.includes("traceback") || lowered.includes(" failed")) {
    return "error";
  }
  if (lowered.startsWith("[system]")) {
    return "system";
  }
  if (lowered.includes("progress:")) {
    return "progress";
  }
  if (lowered.startsWith("saved:") || lowered.includes(" saved:")) {
    return "saved";
  }
  if (lowered.includes("단계") || lowered.startsWith("processing ") || lowered.startsWith("scenario:")) {
    return "stage";
  }

  return "info";
}

const FEED_KIND_STYLE: Record<FeedKind, string> = {
  system: "border-neutral-700 text-neutral-200",
  stage: "border-sky-800 text-sky-300",
  progress: "border-amber-700 text-amber-300",
  saved: "border-emerald-800 text-emerald-300",
  error: "border-red-800 text-red-300",
  info: "border-neutral-800 text-neutral-400",
};

export default function Dashboard() {
  const [logs, setLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [authStatus, setAuthStatus] = useState(false);
  const [runType, setRunType] = useState<RunTaskType | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<LogFeedItem[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedKind | "all">("all");

  const lineBufferRef = useRef("");
  const feedSequenceRef = useRef(0);

  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
    anthropic: "",
  });

  const [seqProvider, setSeqProvider] = useState("openai");
  const [mazeLang, setMazeLang] = useState("ko");
  const [decScenario, setDecScenario] = useState("dilemma_baseline_ab");
  const [decModels, setDecModels] = useState<string[]>(["gpt-5.2"]);

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

  const processChunk = (chunk: string) => {
    setLogs((prev) => prev + chunk);

    const combined = lineBufferRef.current + chunk;
    const lines = combined.split(/\r?\n/);
    lineBufferRef.current = lines.pop() ?? "";

    const parsed: LogFeedItem[] = [];
    for (const rawLine of lines) {
      const text = rawLine.trim();
      if (!text || /^=+$/.test(text)) continue;

      parsed.push({
        id: ++feedSequenceRef.current,
        kind: classifyLine(text),
        text,
      });
    }

    if (parsed.length > 0) {
      setFeedItems((prev) => [...prev, ...parsed].slice(-600));
    }
  };

  const resetRunState = (type: RunTaskType) => {
    setRunType(type);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);
    setLogs("");
    setFeedItems([]);
    setFeedFilter("all");
    lineBufferRef.current = "";
    feedSequenceRef.current = 0;
  };

  const finishRun = () => {
    if (lineBufferRef.current.trim()) {
      processChunk("\n");
    }
    setRunFinishedAt(Date.now());
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
        finishRun();
        return;
      }

      if (!response.body) {
        processChunk("[SYSTEM ERROR] No response body.\n");
        finishRun();
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
      finishRun();
    } catch (error: unknown) {
      processChunk(`\n[SYSTEM ERROR] ${toErrorMessage(error)}\n`);
      finishRun();
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
            Sequence and Decision sections call AI models. Maze section is local data generation/processing only.
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 3: Decision Experiments</CardTitle>
              <CardDescription>AI decision runner with selectable model set.</CardDescription>
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
                <label className="text-xs font-medium text-neutral-400">Models</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DECISION_MODEL_OPTIONS.map((option) => {
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
                <p className="text-xs text-neutral-500">Selected: {decModels.join(", ")}</p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                disabled={isRunning || decModels.length === 0}
                onClick={() => handleRun("decision", { scenario: decScenario, models: decModels.join(",") })}
              >
                Run Decision Experiment
              </Button>
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

          <div className="p-4 flex-1 overflow-auto bg-[#000000] font-mono whitespace-pre-wrap text-sm leading-relaxed max-h-[650px]">
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
