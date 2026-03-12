import type { TrackTabKey } from "../types";

type TrackTabsProps = {
  activeTab: TrackTabKey;
  onTabChange: (tab: TrackTabKey) => void;
};

const TABS: { key: TrackTabKey; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "sequence", label: "Sequence" },
  { key: "ascii", label: "ASCII" },
  { key: "meta_reasoning", label: "Meta-Reasoning" },
];

export function TrackTabs({ activeTab, onTabChange }: TrackTabsProps) {
  return (
    <div className="flex gap-1 border-b border-neutral-800 pb-px">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === tab.key
              ? "text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
          )}
        </button>
      ))}
    </div>
  );
}
