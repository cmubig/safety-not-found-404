import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  DECISION_SCENARIO_OPTIONS,
  MAZE_LANGUAGE_OPTIONS,
  SAFETY_VLN_JUDGE_MODE_OPTIONS,
  SAFETY_VLN_PROVIDER_OPTIONS,
  SEQUENCE_PROVIDER_OPTIONS,
} from "../constants";
import { DecisionModelOption, RunTaskType } from "../types";
import { providerBadgeText } from "../utils/model-utils";
import { SectionProgress } from "./section-progress";

type ExperimentControlsProps = {
  isRunning: boolean;
  isOauthAuthenticated: boolean;
  sequenceProvider: string;
  mazeLanguage: string;
  decisionScenario: string;
  selectedDecisionModelIds: string[];
  decisionModelOptions: DecisionModelOption[];
  modelCatalogWarnings: string[];
  modelCatalogError: string | null;
  isModelCatalogLoading: boolean;
  modelCatalogUpdatedAt: number | null;
  isModelReadScopeMissing: boolean;
  customDecisionModelInput: string;
  customDecisionModelInputError: string | null;
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

  onSequenceProviderChange: (nextProvider: string) => void;
  onMazeLanguageChange: (nextLanguage: string) => void;
  onDecisionScenarioChange: (nextScenario: string) => void;
  onDecisionModelToggle: (modelId: string) => void;
  onDecisionModelRemove: (modelId: string) => void;
  onCustomDecisionModelInputChange: (nextValue: string) => void;
  onAddCustomDecisionModel: () => void;
  onRefreshModelCatalog: () => void;
  onReconnectOAuth: () => void;
  onRunSequence: () => void;
  onRunMaze: () => void;
  onRunDecision: () => void;

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

export function ExperimentControls({
  isRunning,
  isOauthAuthenticated,
  sequenceProvider,
  mazeLanguage,
  decisionScenario,
  selectedDecisionModelIds,
  decisionModelOptions,
  modelCatalogWarnings,
  modelCatalogError,
  isModelCatalogLoading,
  modelCatalogUpdatedAt,
  isModelReadScopeMissing,
  customDecisionModelInput,
  customDecisionModelInputError,
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

  onSequenceProviderChange,
  onMazeLanguageChange,
  onDecisionScenarioChange,
  onDecisionModelToggle,
  onDecisionModelRemove,
  onCustomDecisionModelInputChange,
  onAddCustomDecisionModel,
  onRefreshModelCatalog,
  onReconnectOAuth,
  onRunSequence,
  onRunMaze,
  onRunDecision,

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
}: ExperimentControlsProps) {
  const showOauthScopeAction = isOauthAuthenticated && isModelReadScopeMissing && decisionModelOptions.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Section 1: Sequence</CardTitle>
          <CardDescription>AI-driven sequence benchmark runner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Provider</label>
            <Select value={sequenceProvider} onChange={(event) => onSequenceProviderChange(event.target.value)}>
              {SEQUENCE_PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button className="w-full" disabled={isRunning} onClick={onRunSequence}>
            Run Sequence
          </Button>
          <SectionProgress
            sectionType="sequence"
            activeRunType={activeRunType}
            isRunning={isRunning}
            taskProgressByType={taskProgressByType}
          />
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
            <Select value={mazeLanguage} onChange={(event) => onMazeLanguageChange(event.target.value)}>
              {MAZE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button className="w-full" variant="secondary" disabled={isRunning} onClick={onRunMaze}>
            Run Maze Pipeline
          </Button>
          <SectionProgress
            sectionType="maze"
            activeRunType={activeRunType}
            isRunning={isRunning}
            taskProgressByType={taskProgressByType}
          />
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
            <Select value={decisionScenario} onChange={(event) => onDecisionScenarioChange(event.target.value)}>
              {DECISION_SCENARIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-neutral-400">Models</label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onRefreshModelCatalog}
                disabled={isRunning || isModelCatalogLoading}
              >
                {isModelCatalogLoading ? "Syncing..." : "Refresh"}
              </Button>
            </div>

            {isOauthAuthenticated ? (
              <p className="text-xs text-neutral-500">
                OAuth mode active: OpenAI live catalog is used when available, otherwise a compatibility profile is loaded and Codex models are prioritized.
              </p>
            ) : (
              <p className="text-xs text-neutral-500">Catalog is fetched live from connected provider credentials.</p>
            )}

            <p className="text-xs text-neutral-500">
              {isModelCatalogLoading
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

            {showOauthScopeAction ? (
              <div className="border border-amber-400/60 bg-amber-500/10 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-200">
                  Model catalog scope is unavailable in this OAuth session.
                </p>
                <p className="text-xs text-amber-100">
                  Current OAuth token cannot read <code>/v1/models</code> (missing <code>api.model.read</code>). Use OpenAI API key for catalog sync, or add custom model ids and run directly.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={onReconnectOAuth} disabled={isRunning}>
                    Retry OAuth
                  </Button>
                  <a
                    href="/docs#oauth-model-scope"
                    className="inline-flex items-center justify-center h-8 px-3 text-xs border border-amber-300/60 text-amber-100 hover:bg-amber-500/10 transition-colors"
                  >
                    Scope Guide
                  </a>
                </div>
              </div>
            ) : null}

            {decisionModelOptions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                {decisionModelOptions.map((option) => {
                  const selected = selectedDecisionModelIds.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onDecisionModelToggle(option.value)}
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
                value={customDecisionModelInput}
                onChange={(event) => onCustomDecisionModelInputChange(event.target.value)}
                placeholder="Add custom model id (e.g. codex-mini-latest)"
                disabled={isRunning}
              />
              <Button type="button" variant="secondary" size="sm" disabled={isRunning} onClick={onAddCustomDecisionModel}>
                Add
              </Button>
            </div>

            {customDecisionModelInputError ? <p className="text-xs text-red-300">{customDecisionModelInputError}</p> : null}

            <div className="flex flex-wrap gap-2">
              {selectedDecisionModelIds.map((modelId) => (
                <button
                  key={modelId}
                  type="button"
                  onClick={() => onDecisionModelRemove(modelId)}
                  disabled={isRunning || selectedDecisionModelIds.length === 1}
                  className={`px-2 py-1 border text-xs font-mono ${
                    selectedDecisionModelIds.length === 1
                      ? "border-neutral-700 text-neutral-400"
                      : "border-neutral-600 text-neutral-200 hover:border-white"
                  }`}
                >
                  {modelId} ({providerBadgeText(modelId)}) x
                </button>
              ))}
            </div>

            <p className="text-xs text-neutral-500">
              Selected: {selectedDecisionModelIds.length > 0 ? selectedDecisionModelIds.join(", ") : "-"}
            </p>
          </div>

          <Button className="w-full" variant="outline" disabled={isRunning || selectedDecisionModelIds.length === 0} onClick={onRunDecision}>
            Run Decision Experiment
          </Button>
          <SectionProgress
            sectionType="decision"
            activeRunType={activeRunType}
            isRunning={isRunning}
            taskProgressByType={taskProgressByType}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
