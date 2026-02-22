"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { clearTokens, createAuthFlow, getAuthStatus, refreshAccessToken } from "@/lib/chatgpt-oauth";
import { ExecutionConsole } from "@/features/dashboard/components/execution-console";
import { ExperimentControls } from "@/features/dashboard/components/experiment-controls";
import { useExperimentRunner } from "@/features/dashboard/hooks/use-experiment-runner";
import { useModelCatalog } from "@/features/dashboard/hooks/use-model-catalog";
import { ApiKeys } from "@/features/dashboard/types";
import { isValidModelId, normalizeModelId } from "@/features/dashboard/utils/model-utils";

export default function DashboardPage() {
  const [isOauthAuthenticated, setIsOauthAuthenticated] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: "",
    gemini: "",
    anthropic: "",
  });

  const [sequenceProvider, setSequenceProvider] = useState("openai");
  const [mazeLanguage, setMazeLanguage] = useState("ko");
  const [decisionScenario, setDecisionScenario] = useState("dilemma_baseline_ab");
  const [selectedDecisionModelIds, setSelectedDecisionModelIds] = useState<string[]>([]);
  const [customDecisionModelInput, setCustomDecisionModelInput] = useState("");
  const [customDecisionModelInputError, setCustomDecisionModelInputError] = useState<string | null>(null);

  const {
    modelOptions: decisionModelOptions,
    catalogWarnings: modelCatalogWarnings,
    catalogError: modelCatalogError,
    isCatalogLoading: isModelCatalogLoading,
    catalogUpdatedAt: modelCatalogUpdatedAt,
    isModelReadScopeMissing,
    refreshModelCatalog,
  } = useModelCatalog({
    apiKeys,
    isOauthAuthenticated,
  });

  const {
    rawLogs,
    isRunning,
    activeRunType,
    logFeedFilter,
    artifactPaths,
    latestFailureInsight,
    copiedArtifactPath,
    pipelineProgress,
    taskProgressByType,
    feedStats,
    filteredFeedItems,
    runDurationText,
    recentArtifacts,
    activeTaskPercent,
    setLogFeedFilter,
    runExperiment,
    copyArtifactPath,
  } = useExperimentRunner({ apiKeys });

  useEffect(() => {
    const checkAuthentication = async () => {
      let authenticated = getAuthStatus().authenticated;
      if (!authenticated) {
        const refreshed = await refreshAccessToken();
        if (refreshed) authenticated = true;
      }
      setIsOauthAuthenticated(authenticated);
    };

    void checkAuthentication();
  }, []);

  const effectiveSelectedDecisionModelIds = useMemo(() => {
    if (selectedDecisionModelIds.length > 0) return selectedDecisionModelIds;
    if (decisionModelOptions.length > 0) return [decisionModelOptions[0].value];
    return [] as string[];
  }, [decisionModelOptions, selectedDecisionModelIds]);

  const connectChatGptOAuth = async () => {
    const { authUrl } = await createAuthFlow();
    window.location.href = authUrl;
  };

  const handleChatGptConnectToggle = async () => {
    try {
      if (isOauthAuthenticated) {
        clearTokens();
        setIsOauthAuthenticated(false);
        return;
      }

      await connectChatGptOAuth();
    } catch (error) {
      console.error(error);
      alert("Failed to initiate login flow.");
    }
  };

  const handleOAuthReconnect = async () => {
    try {
      clearTokens();
      setIsOauthAuthenticated(false);
      await connectChatGptOAuth();
    } catch (error) {
      console.error(error);
      alert("Failed to re-initiate login flow.");
    }
  };

  const updateApiKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys((previousKeys) => ({
      ...previousKeys,
      [provider]: value,
    }));
  };

  const toggleDecisionModel = (modelId: string) => {
    setSelectedDecisionModelIds((previousModelIds) => {
      const currentModelIds =
        previousModelIds.length > 0
          ? previousModelIds
          : decisionModelOptions.length > 0
          ? [decisionModelOptions[0].value]
          : [];

      if (currentModelIds.includes(modelId)) {
        if (currentModelIds.length === 1) return previousModelIds;
        return currentModelIds.filter((value) => value !== modelId);
      }

      return [...currentModelIds, modelId];
    });

    setCustomDecisionModelInputError(null);
  };

  const removeDecisionModel = (modelId: string) => {
    setSelectedDecisionModelIds((previousModelIds) => {
      const currentModelIds =
        previousModelIds.length > 0
          ? previousModelIds
          : decisionModelOptions.length > 0
          ? [decisionModelOptions[0].value]
          : [];

      if (currentModelIds.length === 1) return previousModelIds;
      return currentModelIds.filter((value) => value !== modelId);
    });
  };

  const addCustomDecisionModel = () => {
    const modelId = normalizeModelId(customDecisionModelInput);
    if (!modelId) return;

    if (!isValidModelId(modelId)) {
      setCustomDecisionModelInputError("Invalid model id format.");
      return;
    }

    setSelectedDecisionModelIds((previousModelIds) =>
      previousModelIds.includes(modelId) ? previousModelIds : [...previousModelIds, modelId]
    );
    setCustomDecisionModelInput("");
    setCustomDecisionModelInputError(null);
  };

  const runSequenceExperiment = () => {
    void runExperiment("sequence", { provider: sequenceProvider });
  };

  const runMazeExperiment = () => {
    void runExperiment("maze", { lang: mazeLanguage });
  };

  const runDecisionExperiment = () => {
    void runExperiment("decision", {
      scenario: decisionScenario,
      models: effectiveSelectedDecisionModelIds.join(","),
    });
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Safety Not Found 404</h1>
          <p className="text-neutral-400">Project Benchmark &amp; Experiment Control Center</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant={isOauthAuthenticated ? "outline" : "primary"}
            onClick={handleChatGptConnectToggle}
            className="w-full sm:w-auto overflow-hidden text-ellipsis px-2"
          >
            {isOauthAuthenticated ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10a37f]" />
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
            onChange={(event) => updateApiKey("openai", event.target.value)}
            disabled={isOauthAuthenticated}
          />

          <Input
            type="password"
            placeholder="Gemini API Key"
            className="w-full sm:w-48"
            value={apiKeys.gemini}
            onChange={(event) => updateApiKey("gemini", event.target.value)}
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Execution Architecture</CardTitle>
          <CardDescription>
            Sequence and Decision sections call AI models. Maze section is local data generation and processing only.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ExperimentControls
          isRunning={isRunning}
          isOauthAuthenticated={isOauthAuthenticated}
          sequenceProvider={sequenceProvider}
          mazeLanguage={mazeLanguage}
          decisionScenario={decisionScenario}
          selectedDecisionModelIds={effectiveSelectedDecisionModelIds}
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
          onSequenceProviderChange={setSequenceProvider}
          onMazeLanguageChange={setMazeLanguage}
          onDecisionScenarioChange={setDecisionScenario}
          onDecisionModelToggle={toggleDecisionModel}
          onDecisionModelRemove={removeDecisionModel}
          onCustomDecisionModelInputChange={setCustomDecisionModelInput}
          onAddCustomDecisionModel={addCustomDecisionModel}
          onRefreshModelCatalog={refreshModelCatalog}
          onReconnectOAuth={handleOAuthReconnect}
          onRunSequence={runSequenceExperiment}
          onRunMaze={runMazeExperiment}
          onRunDecision={runDecisionExperiment}
        />

        <ExecutionConsole
          isRunning={isRunning}
          activeRunType={activeRunType}
          runDurationText={runDurationText}
          feedStats={feedStats}
          activeTaskPercent={activeTaskPercent}
          pipelineProgress={pipelineProgress}
          latestFailureInsight={latestFailureInsight}
          logFeedFilter={logFeedFilter}
          onLogFeedFilterChange={setLogFeedFilter}
          filteredFeedItems={filteredFeedItems}
          recentArtifacts={recentArtifacts}
          artifactCount={artifactPaths.length}
          copiedArtifactPath={copiedArtifactPath}
          onCopyArtifactPath={(path) => {
            void copyArtifactPath(path);
          }}
          rawLogs={rawLogs}
        />
      </div>
    </div>
  );
}
