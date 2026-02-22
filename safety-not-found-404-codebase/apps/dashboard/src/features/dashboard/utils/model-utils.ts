import { DecisionModelOption, ModelProvider } from "../types";

export function normalizeModelId(value: string): string {
  return value.trim();
}

export function inferModelProvider(modelId: string): ModelProvider {
  const lowered = modelId.trim().toLowerCase();

  if (lowered.startsWith("gemini")) return "gemini";
  if (lowered.startsWith("claude")) return "anthropic";
  return "openai";
}

export function providerBadgeText(modelId: string): string {
  const lowered = modelId.trim().toLowerCase();
  if (lowered.startsWith("codex")) return "openai/codex";
  return inferModelProvider(modelId);
}

export function isValidModelId(modelId: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,127}$/.test(modelId);
}

export function sanitizeDecisionModelOptions(
  options: Array<Partial<DecisionModelOption>> | undefined,
  fallbackProvider: ModelProvider
): DecisionModelOption[] {
  if (!options) return [];

  return options
    .map((option) => {
      const value = option.value?.trim();
      if (!value) return null;

      return {
        value,
        label: option.label?.trim() || value,
        provider: option.provider ?? fallbackProvider,
      };
    })
    .filter((option): option is DecisionModelOption => option !== null);
}

export function dedupeDecisionModelOptions(options: DecisionModelOption[]): DecisionModelOption[] {
  const seen = new Set<string>();
  const deduped: DecisionModelOption[] = [];

  for (const option of options) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    deduped.push(option);
  }

  return deduped;
}

export function sortDecisionModelOptions(options: DecisionModelOption[], prioritizeCodex: boolean): DecisionModelOption[] {
  const providerOrder: Record<ModelProvider, number> = {
    openai: 0,
    gemini: 1,
    anthropic: 2,
  };

  return [...options].sort((first, second) => {
    const providerDelta = providerOrder[first.provider] - providerOrder[second.provider];
    if (providerDelta !== 0) return providerDelta;

    if (prioritizeCodex && first.provider === "openai" && second.provider === "openai") {
      const firstCodexScore = first.value.toLowerCase().startsWith("codex") ? 0 : 1;
      const secondCodexScore = second.value.toLowerCase().startsWith("codex") ? 0 : 1;
      if (firstCodexScore !== secondCodexScore) return firstCodexScore - secondCodexScore;
    }

    return first.value.localeCompare(second.value, "en", { numeric: true, sensitivity: "base" });
  });
}
