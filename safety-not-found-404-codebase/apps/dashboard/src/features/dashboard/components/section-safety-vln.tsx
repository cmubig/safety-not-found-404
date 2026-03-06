import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SAFETY_VLN_JUDGE_MODE_OPTIONS, SAFETY_VLN_PROVIDER_OPTIONS } from "../constants";
import { RunTaskType } from "../types";
import { SectionProgress } from "./section-progress";

type SectionSafetyVlnProps = {
  isRunning: boolean;
  activeRunType: RunTaskType | null;
  taskProgressByType: Record<RunTaskType, number | null>;
  safetyVlnDatasetPath: string;
  safetyVlnProvider: string;
  safetyVlnModel: string;
  safetyVlnJudgeMode: string;
  safetyVlnJudgeProvider: string;
  safetyVlnJudgeModel: string;
  safetyVlnTrialsPerProblem: number;
  safetyVlnMinPerTrack: number;
  safetyVlnStrictValidation: boolean;
  safetyVlnGeneratePerTrack: number;
  safetyVlnGenerateEventRatio: number;
  safetyVlnGenerateSeed: number;
  onSafetyVlnDatasetPathChange: (nextPath: string) => void;
  onSafetyVlnProviderChange: (nextProvider: string) => void;
  onSafetyVlnModelChange: (nextModel: string) => void;
  onSafetyVlnJudgeModeChange: (nextMode: string) => void;
  onSafetyVlnJudgeProviderChange: (nextProvider: string) => void;
  onSafetyVlnJudgeModelChange: (nextModel: string) => void;
  onSafetyVlnTrialsPerProblemChange: (nextValue: number) => void;
  onSafetyVlnMinPerTrackChange: (nextValue: number) => void;
  onSafetyVlnStrictValidationChange: (nextValue: boolean) => void;
  onSafetyVlnGeneratePerTrackChange: (nextValue: number) => void;
  onSafetyVlnGenerateEventRatioChange: (nextValue: number) => void;
  onSafetyVlnGenerateSeedChange: (nextValue: number) => void;
  onGenerateSafetyVlnDataset: () => void;
  onValidateSafetyVlnDataset: () => void;
  onRunSafetyVln: () => void;
};

export function SectionSafetyVln({
  isRunning,
  activeRunType,
  taskProgressByType,
  safetyVlnDatasetPath,
  safetyVlnProvider,
  safetyVlnModel,
  safetyVlnJudgeMode,
  safetyVlnJudgeProvider,
  safetyVlnJudgeModel,
  safetyVlnTrialsPerProblem,
  safetyVlnMinPerTrack,
  safetyVlnStrictValidation,
  safetyVlnGeneratePerTrack,
  safetyVlnGenerateEventRatio,
  safetyVlnGenerateSeed,
  onSafetyVlnDatasetPathChange,
  onSafetyVlnProviderChange,
  onSafetyVlnModelChange,
  onSafetyVlnJudgeModeChange,
  onSafetyVlnJudgeProviderChange,
  onSafetyVlnJudgeModelChange,
  onSafetyVlnTrialsPerProblemChange,
  onSafetyVlnMinPerTrackChange,
  onSafetyVlnStrictValidationChange,
  onSafetyVlnGeneratePerTrackChange,
  onSafetyVlnGenerateEventRatioChange,
  onSafetyVlnGenerateSeedChange,
  onGenerateSafetyVlnDataset,
  onValidateSafetyVlnDataset,
  onRunSafetyVln,
}: SectionSafetyVlnProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Section 4: Safety-VLN (Three-Stage)</CardTitle>
        <CardDescription>
          Stage1/2 comprehension gate + Stage3 navigation scoring. You can generate dataset, validate fairness, and run benchmark in this panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">Dataset Path</label>
          <Input
            value={safetyVlnDatasetPath}
            onChange={(event) => onSafetyVlnDatasetPathChange(event.target.value)}
            placeholder="data/safety_vln/synthetic_v1.json"
            disabled={isRunning}
          />
        </div>

        <div className="border border-neutral-800 p-3 space-y-3">
          <p className="text-xs font-semibold text-neutral-300">Dataset Generation</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Per Track</label>
              <Input
                type="number"
                value={String(safetyVlnGeneratePerTrack)}
                onChange={(event) => onSafetyVlnGeneratePerTrackChange(Number(event.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Event Ratio (0-1)</label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={String(safetyVlnGenerateEventRatio)}
                onChange={(event) => onSafetyVlnGenerateEventRatioChange(Number(event.target.value) || 0)}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Seed</label>
              <Input
                type="number"
                value={String(safetyVlnGenerateSeed)}
                onChange={(event) => onSafetyVlnGenerateSeedChange(Number(event.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full" disabled={isRunning} onClick={onGenerateSafetyVlnDataset}>
            Generate Safety-VLN Dataset
          </Button>
        </div>

        <div className="border border-neutral-800 p-3 space-y-3">
          <p className="text-xs font-semibold text-neutral-300">Dataset Validation</p>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-500">Minimum Problems Per Track</label>
            <Input
              type="number"
              value={String(safetyVlnMinPerTrack)}
              onChange={(event) => onSafetyVlnMinPerTrackChange(Number(event.target.value) || 1)}
              disabled={isRunning}
            />
          </div>
          <Button type="button" variant="secondary" className="w-full" disabled={isRunning} onClick={onValidateSafetyVlnDataset}>
            Validate Safety-VLN Dataset
          </Button>
        </div>

        <div className="border border-neutral-800 p-3 space-y-3">
          <p className="text-xs font-semibold text-neutral-300">Benchmark Run</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Provider</label>
              <Select value={safetyVlnProvider} onChange={(event) => onSafetyVlnProviderChange(event.target.value)}>
                {SAFETY_VLN_PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Model</label>
              <Input value={safetyVlnModel} onChange={(event) => onSafetyVlnModelChange(event.target.value)} disabled={isRunning} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Trials Per Problem</label>
              <Input
                type="number"
                value={String(safetyVlnTrialsPerProblem)}
                onChange={(event) => onSafetyVlnTrialsPerProblemChange(Number(event.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-500">Judge Mode</label>
              <Select value={safetyVlnJudgeMode} onChange={(event) => onSafetyVlnJudgeModeChange(event.target.value)}>
                {SAFETY_VLN_JUDGE_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {safetyVlnJudgeMode === "llm" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-500">Judge Provider</label>
                <Select value={safetyVlnJudgeProvider} onChange={(event) => onSafetyVlnJudgeProviderChange(event.target.value)}>
                  {SAFETY_VLN_PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-500">Judge Model</label>
                <Input
                  value={safetyVlnJudgeModel}
                  onChange={(event) => onSafetyVlnJudgeModelChange(event.target.value)}
                  disabled={isRunning}
                />
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              className="h-4 w-4 border border-neutral-600 bg-neutral-950"
              checked={safetyVlnStrictValidation}
              onChange={(event) => onSafetyVlnStrictValidationChange(event.target.checked)}
              disabled={isRunning}
            />
            Strict dataset validation (enforce min-per-track and event/non-event constraints before run)
          </label>

          <Button className="w-full" variant="outline" disabled={isRunning} onClick={onRunSafetyVln}>
            Run Safety-VLN Benchmark
          </Button>
        </div>

        <SectionProgress
          sectionType="safety_vln"
          activeRunType={activeRunType}
          isRunning={isRunning}
          taskProgressByType={taskProgressByType}
        />
      </CardContent>
    </Card>
  );
}
