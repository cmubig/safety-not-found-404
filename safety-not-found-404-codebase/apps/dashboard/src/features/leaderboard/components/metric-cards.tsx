import type { LeaderboardData } from "../types";

type MetricCardsProps = {
  data: LeaderboardData;
};

export function MetricCards({ data }: MetricCardsProps) {
  const bestModel =
    data.entries.length > 0 ? data.entries[0] : null;

  const cards = [
    {
      label: "Top Model",
      value: bestModel ? bestModel.model : "--",
      sub: bestModel ? bestModel.provider : "",
    },
    {
      label: "Total Submissions",
      value: String(data.entries.length),
      sub: `${new Set(data.entries.map((e) => e.provider)).size} providers`,
    },
    {
      label: "Dataset Version",
      value: data.version,
      sub: data.note,
    },
    {
      label: "Last Updated",
      value: data.last_updated,
      sub: `${data.entries.filter((e) => e.is_synthetic).length} synthetic`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4"
        >
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">
            {card.label}
          </p>
          <p className="text-lg font-bold text-white truncate">{card.value}</p>
          <p className="text-xs text-neutral-500 mt-1 truncate">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
