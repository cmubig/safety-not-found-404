import { RunTaskType } from "../types";

type SectionProgressProps = {
  sectionType: RunTaskType;
  activeRunType: RunTaskType | null;
  isRunning: boolean;
  taskProgressByType: Record<RunTaskType, number | null>;
};

export function SectionProgress({ sectionType, activeRunType, isRunning, taskProgressByType }: SectionProgressProps) {
  if (activeRunType !== sectionType) return null;

  const percent = taskProgressByType[sectionType];
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
      <p className="text-[11px] text-neutral-500">{percent !== null ? `${percent}%` : isRunning ? "running" : "-"}</p>
    </div>
  );
}
