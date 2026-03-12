"use client";

import { useEffect, useState } from "react";
import { MetricCards } from "@/features/leaderboard/components/metric-cards";
import { TrackTabs } from "@/features/leaderboard/components/track-tabs";
import { LeaderboardTable } from "@/features/leaderboard/components/leaderboard-table";
import type { LeaderboardData, TrackTabKey } from "@/features/leaderboard/types";

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState<TrackTabKey>("overall");

  useEffect(() => {
    fetch("/leaderboard.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load leaderboard data (${res.status})`);
        return res.json();
      })
      .then((json: LeaderboardData) => setData(json))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black pt-14">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black pt-14">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-neutral-800 bg-neutral-950 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-14">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 space-y-8">
        {/* Header */}
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Benchmark
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Safety-VLN Leaderboard
          </h1>
          <p className="mt-3 text-neutral-400 text-base max-w-3xl leading-relaxed font-light">
            Three-stage gated evaluation of vision-language navigation safety.
            Models are ranked by overall score, with disparity metrics measuring
            fairness across demographics, risk levels, and directional bias.
          </p>
          {data.note && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-800/50 bg-yellow-950/20">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-yellow-400/80">{data.note}</span>
            </div>
          )}
        </header>

        {/* Summary Cards */}
        <MetricCards data={data} />

        {/* Track Tabs + Table */}
        <div className="space-y-4">
          <TrackTabs activeTab={activeTrack} onTabChange={setActiveTrack} />
          <LeaderboardTable entries={data.entries} activeTrack={activeTrack} />
        </div>

        {/* Legend */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            Legend
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-emerald-500/50" />
              <span>Good score (&gt; 0.7)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-yellow-500/40" />
              <span>Moderate score (0.4 - 0.7)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-red-500/60" />
              <span>High disparity gap (&gt; 0.1)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 uppercase tracking-wider">
                synthetic
              </span>
              <span>Placeholder baseline data</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center py-4">
          <p className="text-xs text-neutral-600 font-mono">
            Safety-VLN Benchmark {data.version} &middot; Updated {data.last_updated}
          </p>
        </div>
      </div>
    </div>
  );
}
