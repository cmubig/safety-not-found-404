import { DecisionModelOption, RunTaskType } from "../types";
import { SectionDecision } from "./section-decision";
import { SectionMaze } from "./section-maze";
import { SectionSafetyVln } from "./section-safety-vln";
import { SectionSequence } from "./section-sequence";

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
  return (
    <div className="space-y-6">
      <SectionSequence
        isRunning={isRunning}
        sequenceProvider={sequenceProvider}
        activeRunType={activeRunType}
        taskProgressByType={taskProgressByType}
        onSequenceProviderChange={onSequenceProviderChange}
        onRunSequence={onRunSequence}
      />

      <SectionMaze
        isRunning={isRunning}
        mazeLanguage={mazeLanguage}
        activeRunType={activeRunType}
        taskProgressByType={taskProgressByType}
        onMazeLanguageChange={onMazeLanguageChange}
        onRunMaze={onRunMaze}
      />

      <SectionDecision
        isRunning={isRunning}
        isOauthAuthenticated={isOauthAuthenticated}
        decisionScenario={decisionScenario}
        selectedDecisionModelIds={selectedDecisionModelIds}
        decisionModelOptions={decisionModelOptions}
        modelCatalogWarnings={modelCatalogWarnings}
        modelCatalogError={modelCatalogError}
        isModelCatalogLoading={isModelCatalogLoading}
        modelCatalogUpdatedAt={modelCatalogUpdatedAt}
        isModelReadScopeMissing={isModelReadScopeMissing}
        customDecisionModelInput={customDecisionModelInput}
        customDecisionModelInputError={customDecisionModelInputError}
        activeRunType={activeRunType}
        taskProgressByType={taskProgressByType}
        onDecisionScenarioChange={onDecisionScenarioChange}
        onDecisionModelToggle={onDecisionModelToggle}
        onDecisionModelRemove={onDecisionModelRemove}
        onCustomDecisionModelInputChange={onCustomDecisionModelInputChange}
        onAddCustomDecisionModel={onAddCustomDecisionModel}
        onRefreshModelCatalog={onRefreshModelCatalog}
        onReconnectOAuth={onReconnectOAuth}
        onRunDecision={onRunDecision}
      />

      <SectionSafetyVln
        isRunning={isRunning}
        activeRunType={activeRunType}
        taskProgressByType={taskProgressByType}
        safetyVlnDatasetPath={safetyVlnDatasetPath}
        safetyVlnProvider={safetyVlnProvider}
        safetyVlnModel={safetyVlnModel}
        safetyVlnJudgeMode={safetyVlnJudgeMode}
        safetyVlnJudgeProvider={safetyVlnJudgeProvider}
        safetyVlnJudgeModel={safetyVlnJudgeModel}
        safetyVlnTrialsPerProblem={safetyVlnTrialsPerProblem}
        safetyVlnMinPerTrack={safetyVlnMinPerTrack}
        safetyVlnStrictValidation={safetyVlnStrictValidation}
        safetyVlnGeneratePerTrack={safetyVlnGeneratePerTrack}
        safetyVlnGenerateEventRatio={safetyVlnGenerateEventRatio}
        safetyVlnGenerateSeed={safetyVlnGenerateSeed}
        onSafetyVlnDatasetPathChange={onSafetyVlnDatasetPathChange}
        onSafetyVlnProviderChange={onSafetyVlnProviderChange}
        onSafetyVlnModelChange={onSafetyVlnModelChange}
        onSafetyVlnJudgeModeChange={onSafetyVlnJudgeModeChange}
        onSafetyVlnJudgeProviderChange={onSafetyVlnJudgeProviderChange}
        onSafetyVlnJudgeModelChange={onSafetyVlnJudgeModelChange}
        onSafetyVlnTrialsPerProblemChange={onSafetyVlnTrialsPerProblemChange}
        onSafetyVlnMinPerTrackChange={onSafetyVlnMinPerTrackChange}
        onSafetyVlnStrictValidationChange={onSafetyVlnStrictValidationChange}
        onSafetyVlnGeneratePerTrackChange={onSafetyVlnGeneratePerTrackChange}
        onSafetyVlnGenerateEventRatioChange={onSafetyVlnGenerateEventRatioChange}
        onSafetyVlnGenerateSeedChange={onSafetyVlnGenerateSeedChange}
        onGenerateSafetyVlnDataset={onGenerateSafetyVlnDataset}
        onValidateSafetyVlnDataset={onValidateSafetyVlnDataset}
        onRunSafetyVln={onRunSafetyVln}
      />
    </div>
  );
}
