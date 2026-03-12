"use client";

import { useState, useMemo } from "react";
import type {
  LeaderboardEntry,
  TrackTabKey,
  TrackScores,
  SortField,
  SortDirection,
  SortState,
} from "../types";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  activeTrack: TrackTabKey;
};

function getTrackScores(entry: LeaderboardEntry, track: TrackTabKey): TrackScores {
  if (track === "overall") return entry.overall;
  return entry.tracks[track];
}

function getSortValue(entry: LeaderboardEntry, field: SortField, track: TrackTabKey): string | number {
  const scores = getTrackScores(entry, track);

  switch (field) {
    case "rank":
      return entry.rank;
    case "model":
      return entry.model;
    case "provider":
      return entry.provider;
    case "score_mean":
      return scores.score_mean;
    case "safety_event_score":
      return scores.safety_event_score;
    case "human_alignment":
      return scores.human_alignment;
    case "stage1_pass":
      return scores.stage1_pass;
    case "stage2_pass":
      return scores.stage2_pass;
    case "stage3_pass":
      return scores.stage3_pass;
    case "ltr_rtl_gap":
      return entry.disparity.ltr_rtl_gap;
    case "demographic_gap":
      return entry.disparity.demographic_gap;
    case "risk_gap":
      return entry.disparity.risk_gap;
    case "time_pressure_gap":
      return entry.disparity.time_pressure_gap;
    case "submission_date":
      return entry.submission_date;
    default:
      return 0;
  }
}

function ScoreValue({ value, isDisparity = false }: { value: number; isDisparity?: boolean }) {
  const pct = Math.min(Math.abs(value) * 100, 100);
  const barColor = isDisparity
    ? value > 0.1
      ? "bg-red-500/60"
      : value > 0.05
      ? "bg-yellow-500/50"
      : "bg-emerald-500/40"
    : value > 0.7
    ? "bg-emerald-500/50"
    : value > 0.4
    ? "bg-yellow-500/40"
    : "bg-neutral-700/50";

  return (
    <div className="flex items-center justify-end gap-2 font-mono text-sm tabular-nums">
      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={isDisparity && value > 0.1 ? "text-red-400" : "text-neutral-300"}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field) {
    return <span className="text-neutral-700 ml-1">&#8597;</span>;
  }
  return (
    <span className="text-white ml-1">
      {sort.direction === "asc" ? "\u2191" : "\u2193"}
    </span>
  );
}

type Column = {
  field: SortField;
  label: string;
  isDisparity?: boolean;
  hideOnMobile?: boolean;
};

const SCORE_COLUMNS: Column[] = [
  { field: "score_mean", label: "Score" },
  { field: "safety_event_score", label: "Safety" },
  { field: "human_alignment", label: "Human Align" },
  { field: "stage1_pass", label: "S1 Pass", hideOnMobile: true },
  { field: "stage2_pass", label: "S2 Pass", hideOnMobile: true },
  { field: "stage3_pass", label: "S3 Pass", hideOnMobile: true },
];

const DISPARITY_COLUMNS: Column[] = [
  { field: "ltr_rtl_gap", label: "LTR-RTL", isDisparity: true, hideOnMobile: true },
  { field: "demographic_gap", label: "Demo Gap", isDisparity: true, hideOnMobile: true },
  { field: "risk_gap", label: "Risk Gap", isDisparity: true, hideOnMobile: true },
  { field: "time_pressure_gap", label: "Time Gap", isDisparity: true, hideOnMobile: true },
];

export function LeaderboardTable({ entries, activeTrack }: LeaderboardTableProps) {
  const [sort, setSort] = useState<SortState>({ field: "rank", direction: "asc" });

  const toggleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      const defaultDesc: SortField[] = [
        "score_mean",
        "safety_event_score",
        "human_alignment",
        "stage1_pass",
        "stage2_pass",
        "stage3_pass",
      ];
      return { field, direction: defaultDesc.includes(field) ? "desc" : "asc" };
    });
  };

  const sortedEntries = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sort.field, activeTrack);
      const bVal = getSortValue(b, sort.field, activeTrack);
      let cmp: number;
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sort, activeTrack]);

  const ThButton = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 ${className}`}>
      <button
        onClick={() => toggleSort(field)}
        className="inline-flex items-center hover:text-neutral-300 transition-colors cursor-pointer"
      >
        {label}
        <SortIcon field={field} sort={sort} />
      </button>
    </th>
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-neutral-800">
              <ThButton field="rank" label="#" />
              <ThButton field="model" label="Model" />
              <ThButton field="provider" label="Provider" />
              {SCORE_COLUMNS.map((col) => (
                <ThButton
                  key={col.field}
                  field={col.field}
                  label={col.label}
                  className={col.hideOnMobile ? "hidden lg:table-cell" : ""}
                />
              ))}
              {DISPARITY_COLUMNS.map((col) => (
                <ThButton
                  key={col.field}
                  field={col.field}
                  label={col.label}
                  className="hidden xl:table-cell"
                />
              ))}
              <ThButton field="submission_date" label="Date" className="hidden md:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {sortedEntries.map((entry) => {
              const scores = getTrackScores(entry, activeTrack);
              return (
                <tr
                  key={`${entry.model}-${entry.provider}`}
                  className="hover:bg-neutral-900/50 transition-colors"
                >
                  <td className="px-3 py-3 font-mono text-sm text-neutral-500 w-12">
                    <span
                      className={
                        entry.rank <= 3
                          ? "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold " +
                            (entry.rank === 1
                              ? "bg-yellow-500/20 text-yellow-400"
                              : entry.rank === 2
                              ? "bg-neutral-400/20 text-neutral-300"
                              : "bg-amber-700/20 text-amber-500")
                          : ""
                      }
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {entry.model}
                      </span>
                      {entry.is_synthetic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 uppercase tracking-wider">
                          synthetic
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-neutral-400">
                    {entry.provider}
                  </td>
                  {SCORE_COLUMNS.map((col) => (
                    <td
                      key={col.field}
                      className={`px-3 py-3 text-right ${col.hideOnMobile ? "hidden lg:table-cell" : ""}`}
                    >
                      <ScoreValue
                        value={scores[col.field as keyof TrackScores]}
                      />
                    </td>
                  ))}
                  {DISPARITY_COLUMNS.map((col) => (
                    <td
                      key={col.field}
                      className="hidden xl:table-cell px-3 py-3 text-right"
                    >
                      <ScoreValue
                        value={
                          entry.disparity[
                            col.field as keyof typeof entry.disparity
                          ]
                        }
                        isDisparity
                      />
                    </td>
                  ))}
                  <td className="hidden md:table-cell px-3 py-3 text-xs font-mono text-neutral-500">
                    {entry.submission_date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length === 0 && (
        <div className="text-center py-16 text-neutral-500 text-sm">
          No submissions yet.
        </div>
      )}
    </div>
  );
}
