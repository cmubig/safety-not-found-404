import { HandlerResult, normalize, normalizeAny, parsePositiveInt, parseRatio } from "./common";

const SAFETY_VLN_PROVIDERS = new Set(["mock", "openai", "gemini", "anthropic"]);

export function buildSafetyVlnArgs(
  payload: Record<string, unknown>,
  openaiKey: string,
  geminiKey: string,
  anthropicKey: string,
): HandlerResult {
  const action = normalizeAny(payload.action) || "run_benchmark";
  const datasetPath = normalize(payload.datasetPath as string | undefined);
  if (!datasetPath) return { args: [], error: "datasetPath is required for safety_vln" };

  if (action === "generate_dataset") {
    const perTrack = parsePositiveInt(payload.perTrack, 100);
    const eventRatio = parseRatio(payload.eventRatio, 0.5);
    const seed = parsePositiveInt(payload.seed, 20260304);

    return {
      args: [
        "scripts/generate_safety_vln_dataset.py",
        "--out", datasetPath,
        "--per-track", String(perTrack),
        "--event-ratio", String(eventRatio),
        "--seed", String(seed),
      ],
    };
  }

  if (action === "validate_dataset") {
    const minPerTrack = parsePositiveInt(payload.minPerTrack, 100);
    return {
      args: ["scripts/validate_safety_vln_dataset.py", "--dataset", datasetPath, "--min-per-track", String(minPerTrack)],
    };
  }

  if (action === "run_benchmark") {
    const provider = normalize(payload.provider as string | undefined) || "openai";
    const model = normalize(payload.model as string | undefined) || "gpt-5.2";
    const judgeMode = normalize(payload.judgeMode as string | undefined) || "rule";
    const judgeProvider = normalize(payload.judgeProvider as string | undefined) || "openai";
    const judgeModel = normalize(payload.judgeModel as string | undefined) || "gpt-4.1-mini";
    const trialsPerProblem = parsePositiveInt(payload.trialsPerProblem, 1);
    const minPerTrack = parsePositiveInt(payload.minPerTrack, 100);
    const strictValidation = payload.strictValidation === true;

    if (!SAFETY_VLN_PROVIDERS.has(provider)) {
      return { args: [], error: `Unsupported safety_vln provider: ${provider}` };
    }

    if (provider === "openai" && !openaiKey.trim()) {
      return { args: [], error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for safety_vln provider=openai" };
    }
    if (provider === "gemini" && !geminiKey.trim()) {
      return { args: [], error: "GEMINI_API_KEY is required for safety_vln provider=gemini" };
    }
    if (provider === "anthropic" && !anthropicKey.trim()) {
      return { args: [], error: "ANTHROPIC_API_KEY is required for safety_vln provider=anthropic" };
    }

    if (judgeMode === "llm") {
      if (!SAFETY_VLN_PROVIDERS.has(judgeProvider)) {
        return { args: [], error: `Unsupported safety_vln judgeProvider: ${judgeProvider}` };
      }
      if (judgeProvider === "openai" && !openaiKey.trim()) {
        return { args: [], error: "OPENAI_API_KEY (or ChatGPT OAuth) is required for judgeProvider=openai in llm judge mode" };
      }
      if (judgeProvider === "gemini" && !geminiKey.trim()) {
        return { args: [], error: "GEMINI_API_KEY is required for judgeProvider=gemini in llm judge mode" };
      }
      if (judgeProvider === "anthropic" && !anthropicKey.trim()) {
        return { args: [], error: "ANTHROPIC_API_KEY is required for judgeProvider=anthropic in llm judge mode" };
      }
    }

    const args = [
      "scripts/run_safety_vln_benchmark.py",
      "--dataset", datasetPath,
      "--provider", provider,
      "--model", model,
      "--trials-per-problem", String(trialsPerProblem),
      "--judge-mode", judgeMode,
      "--judge-provider", judgeProvider,
      "--judge-model", judgeModel,
      "--min-per-track", String(minPerTrack),
    ];

    if (strictValidation) args.push("--strict-dataset-validation");
    return { args };
  }

  return { args: [], error: `Unsupported safety_vln action: ${action}` };
}
