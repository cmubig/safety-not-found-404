import { useEffect, useMemo, useState } from "react";
import { loadTokens } from "@/lib/chatgpt-oauth";
import { MODEL_CATALOG_FETCH_DEBOUNCE_MS } from "../constants";
import { ApiKeys, DecisionModelOption, ModelCatalogResponse } from "../types";
import {
  dedupeDecisionModelOptions,
  sanitizeDecisionModelOptions,
  sortDecisionModelOptions,
} from "../utils/model-utils";
import { toErrorMessage } from "../utils/log-utils";

type UseModelCatalogArgs = {
  apiKeys: ApiKeys;
  isOauthAuthenticated: boolean;
};

export function useModelCatalog({ apiKeys, isOauthAuthenticated }: UseModelCatalogArgs) {
  const [modelOptions, setModelOptions] = useState<DecisionModelOption[]>([]);
  const [catalogWarnings, setCatalogWarnings] = useState<string[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<number | null>(null);
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      setIsCatalogLoading(true);
      setCatalogError(null);

      try {
        const tokens = loadTokens();
        const response = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            oauthToken: tokens?.access_token ?? "",
            apiKeys,
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(`Model catalog request failed (${response.status}): ${bodyText}`);
        }

        const payload = (await response.json()) as ModelCatalogResponse;
        const openaiModels = sanitizeDecisionModelOptions(payload.providers?.openai, "openai");
        const geminiModels = sanitizeDecisionModelOptions(payload.providers?.gemini, "gemini");
        const anthropicModels = sanitizeDecisionModelOptions(payload.providers?.anthropic, "anthropic");

        const mergedModels = sortDecisionModelOptions(
          dedupeDecisionModelOptions([...openaiModels, ...geminiModels, ...anthropicModels]),
          isOauthAuthenticated
        );

        if (!isActive) return;

        setModelOptions(mergedModels);
        setCatalogWarnings((payload.warnings ?? []).filter((warning) => Boolean(warning?.trim())));
        setCatalogUpdatedAt(Date.now());
      } catch (error: unknown) {
        if (!isActive || controller.signal.aborted) return;

        setModelOptions([]);
        setCatalogWarnings([]);
        setCatalogError(toErrorMessage(error));
      } finally {
        if (isActive) setIsCatalogLoading(false);
      }
    }, MODEL_CATALOG_FETCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [apiKeys, isOauthAuthenticated, refreshRevision]);

  const isModelReadScopeMissing = useMemo(
    () => catalogWarnings.some((warning) => warning.toLowerCase().includes("api.model.read")),
    [catalogWarnings]
  );

  const refreshModelCatalog = () => {
    setRefreshRevision((previousRevision) => previousRevision + 1);
  };

  return {
    modelOptions,
    catalogWarnings,
    catalogError,
    isCatalogLoading,
    catalogUpdatedAt,
    isModelReadScopeMissing,
    refreshModelCatalog,
  };
}
