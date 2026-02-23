import { FEED_FILTER_OPTIONS, FEED_KIND_STYLE, FAILURE_STYLE } from "../constants";
import { FailureInsight, FeedKind, FeedStats, LogFeedItem, PipelineProgress, RunTaskType } from "../types";
import { toFileHref } from "../utils/log-utils";

type ExecutionConsoleProps = {
  isRunning: boolean;
  activeRunType: RunTaskType | null;
  runDurationText: string;
  feedStats: FeedStats;
  activeTaskPercent: number | null;
  pipelineProgress: PipelineProgress;
  latestFailureInsight: FailureInsight | null;
  logFeedFilter: FeedKind | "all";
  onLogFeedFilterChange: (nextFilter: FeedKind | "all") => void;
  filteredFeedItems: LogFeedItem[];
  recentArtifacts: string[];
  artifactCount: number;
  copiedArtifactPath: string | null;
  onCopyArtifactPath: (path: string) => void;
  rawLogs: string;
};

export function ExecutionConsole({
  isRunning,
  activeRunType,
  runDurationText,
  feedStats,
  activeTaskPercent,
  pipelineProgress,
  latestFailureInsight,
  logFeedFilter,
  onLogFeedFilterChange,
  filteredFeedItems,
  recentArtifacts,
  artifactCount,
  copiedArtifactPath,
  onCopyArtifactPath,
  rawLogs,
}: ExecutionConsoleProps) {
  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden relative">
      <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-white animate-pulse" : "bg-neutral-600"}`} />
          Execution Console
        </h3>
        <span className="text-xs text-neutral-500 font-mono">/api/run</span>
      </div>

      <div className="p-4 border-b border-neutral-800 grid grid-cols-2 gap-3 text-xs font-mono bg-black/30">
        <div className="rounded-md border border-neutral-800 p-3">
          <div className="text-neutral-500">Task</div>
          <div className="text-white mt-1">{activeRunType ?? "-"}</div>
        </div>
        <div className="rounded-md border border-neutral-800 p-3">
          <div className="text-neutral-500">Duration</div>
          <div className="text-white mt-1">{runDurationText}</div>
        </div>
        <div className="rounded-md border border-neutral-800 p-3">
          <div className="text-neutral-500">Saved</div>
          <div className="text-emerald-300 mt-1">{feedStats.saved}</div>
        </div>
        <div className="rounded-md border border-neutral-800 p-3">
          <div className="text-neutral-500">Errors</div>
          <div className="text-red-300 mt-1">{feedStats.error}</div>
        </div>
      </div>

      <div className="p-4 border-b border-neutral-800 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Pipeline Progress</span>
            <span>{activeTaskPercent !== null ? `${activeTaskPercent}%` : isRunning ? "running" : "-"}</span>
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
            Stage: {pipelineProgress.stage}
            {pipelineProgress.scope ? ` • Scope: ${pipelineProgress.scope}` : ""}
            {pipelineProgress.total > 0 ? ` • ${pipelineProgress.current}/${pipelineProgress.total}` : ""}
          </div>
        </div>

        <div
          className={`border px-3 py-2 text-xs ${
            latestFailureInsight ? FAILURE_STYLE[latestFailureInsight.category] : "border-neutral-800 text-neutral-500"
          }`}
        >
          {latestFailureInsight ? (
            <div className="space-y-1">
              <p className="font-semibold">Failure Insight: {latestFailureInsight.title}</p>
              <p className="text-[11px] opacity-90">{latestFailureInsight.hint}</p>
              <p className="font-mono text-[11px] break-all">{latestFailureInsight.line}</p>
            </div>
          ) : (
            <p>No failure detected in current run.</p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-neutral-800 flex flex-wrap gap-2">
        {FEED_FILTER_OPTIONS.map((filterValue) => (
          <button
            key={filterValue}
            type="button"
            onClick={() => onLogFeedFilterChange(filterValue)}
            className={`px-2 py-1 text-xs border ${
              logFeedFilter === filterValue
                ? "border-white bg-white text-black"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
            }`}
          >
            {filterValue === "all" ? "all" : `${filterValue} (${feedStats[filterValue]})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-b border-neutral-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-300">Artifacts</p>
          <p className="text-xs text-neutral-500">{artifactCount}</p>
        </div>
        {recentArtifacts.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {recentArtifacts.map((path) => (
              <div key={path} className="border border-neutral-800 p-2 text-xs font-mono text-neutral-400 space-y-2">
                <p className="break-all">{path}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={toFileHref(path)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 border border-neutral-700 hover:border-neutral-400 text-neutral-300"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => onCopyArtifactPath(path)}
                    className="px-2 py-1 border border-neutral-700 hover:border-neutral-400 text-neutral-300"
                  >
                    {copiedArtifactPath === path ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-600">No artifacts captured yet.</p>
        )}
      </div>

      <div className="p-4 flex-1 overflow-auto bg-black font-mono whitespace-pre-wrap text-sm leading-relaxed max-h-[420px]">
        {filteredFeedItems.length > 0 ? (
          <div className="space-y-2">
            {filteredFeedItems.map((feedItem) => (
              <div key={feedItem.id} className={`border-l-2 pl-3 py-1 ${FEED_KIND_STYLE[feedItem.kind]}`}>
                <span className="uppercase text-[10px] tracking-wide">[{feedItem.kind}] </span>
                <span>{feedItem.text}</span>
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
          <pre className="text-xs text-neutral-500 whitespace-pre-wrap">{rawLogs || "(empty)"}</pre>
        </div>
      </details>
    </div>
  );
}
