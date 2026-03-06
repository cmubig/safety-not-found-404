import { HandlerResult, inferProviderFromModelId, MODEL_ID_PATTERN, ModelProvider, normalize } from "./common";

const DECISION_SCENARIOS = new Set([
  "dilemma_baseline_ab",
  "dilemma_factorial_abcd",
  "samarian_time_pressure",
  "samarian_priming_time",
]);

function parseDecisionModels(rawModels: string): { models: string[]; invalidModel: string | null } {
  const models = rawModels.split(",").map((v) => v.trim()).filter((v) => v.length > 0);
  const uniqueModels: string[] = [];
  const seen = new Set<string>();

  for (const modelId of models) {
    if (!MODEL_ID_PATTERN.test(modelId)) return { models: [], invalidModel: modelId };
    if (seen.has(modelId)) continue;
    seen.add(modelId);
    uniqueModels.push(modelId);
  }

  return { models: uniqueModels, invalidModel: null };
}

export function buildDecisionArgs(
  payload: Record<string, unknown>,
  openaiKey: string,
  geminiKey: string,
  anthropicKey: string,
): HandlerResult {
  const scenario = normalize(payload.scenario as string | undefined);
  const rawModels = normalize(payload.models as string | undefined);

  if (!scenario || !rawModels) return { args: [], error: "Scenario and models are required" };
  if (!DECISION_SCENARIOS.has(scenario)) return { args: [], error: `Unsupported scenario: ${scenario}` };

  const { models, invalidModel } = parseDecisionModels(rawModels);
  if (invalidModel) return { args: [], error: `Invalid model id: ${invalidModel}` };
  if (models.length === 0) return { args: [], error: "At least one model is required" };

  const requiredProviders = new Set<ModelProvider>(models.map(inferProviderFromModelId));
  if (requiredProviders.has("openai") && !openaiKey.trim()) {
    return { args: [], error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for selected OpenAI model(s)" };
  }
  if (requiredProviders.has("gemini") && !geminiKey.trim()) {
    return { args: [], error: "GEMINI_API_KEY is required for selected Gemini model(s)" };
  }
  if (requiredProviders.has("anthropic") && !anthropicKey.trim()) {
    return { args: [], error: "ANTHROPIC_API_KEY is required for selected Anthropic model(s)" };
  }

  return { args: ["scripts/run_decision_experiment.py", "--scenario", scenario, "--models", models.join(",")] };
}
