import { NextRequest, NextResponse } from "next/server";

type ModelProvider = "openai" | "gemini" | "anthropic";

type DecisionModelOption = {
  value: string;
  label: string;
  provider: ModelProvider;
};

type ProviderModelMap = Record<ModelProvider, DecisionModelOption[]>;

type ModelsRequest = {
  oauthToken?: string;
  apiKeys?: Partial<Record<ModelProvider, string>>;
};

type OpenAIModelsResponse = {
  data?: Array<{
    id?: string;
  }>;
};

type GeminiModelsResponse = {
  models?: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
};

type AnthropicModelsResponse = {
  data?: Array<{
    id?: string;
    display_name?: string;
  }>;
};

const OPENAI_ALLOWED_PREFIXES = ["codex", "gpt-", "o1", "o3", "o4", "chatgpt"];
const OPENAI_EXCLUDED_FRAGMENTS = [
  "embedding",
  "moderation",
  "audio",
  "realtime",
  "transcribe",
  "tts",
  "whisper",
  "image",
  "dall-e",
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeCredential(value: string | undefined): string {
  return value?.trim() ?? "";
}

function uniqueByValue(models: DecisionModelOption[]): DecisionModelOption[] {
  const seen = new Set<string>();
  const deduped: DecisionModelOption[] = [];

  for (const model of models) {
    if (!model.value || seen.has(model.value)) continue;
    seen.add(model.value);
    deduped.push(model);
  }

  return deduped;
}

function sortOpenAIModels(models: DecisionModelOption[]): DecisionModelOption[] {
  const score = (modelId: string): number => {
    const lowered = modelId.toLowerCase();
    if (lowered.startsWith("codex")) return 0;
    if (lowered.startsWith("gpt-5")) return 1;
    if (lowered.startsWith("gpt-4")) return 2;
    if (lowered.startsWith("o")) return 3;
    return 4;
  };

  return [...models].sort((a, b) => {
    const scoreDelta = score(a.value) - score(b.value);
    if (scoreDelta !== 0) return scoreDelta;
    return a.value.localeCompare(b.value, "en", { numeric: true, sensitivity: "base" });
  });
}

function isOpenAIDecisionModel(modelId: string): boolean {
  const lowered = modelId.toLowerCase();
  if (!OPENAI_ALLOWED_PREFIXES.some((prefix) => lowered.startsWith(prefix))) return false;
  return !OPENAI_EXCLUDED_FRAGMENTS.some((fragment) => lowered.includes(fragment));
}

function isGeminiDecisionModel(modelId: string): boolean {
  const lowered = modelId.toLowerCase();
  if (!lowered.startsWith("gemini")) return false;
  return !lowered.includes("embedding");
}

function isAnthropicDecisionModel(modelId: string): boolean {
  return modelId.toLowerCase().startsWith("claude");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function responseError(response: Response, provider: ModelProvider): Promise<Error> {
  const raw = (await response.text()).trim();
  const snippet = raw ? `: ${raw.slice(0, 180)}` : "";
  return new Error(`${provider} model request failed (${response.status})${snippet}`);
}

async function fetchOpenAIModels(accessToken: string): Promise<DecisionModelOption[]> {
  const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await responseError(response, "openai");
  }

  const payload = (await response.json()) as OpenAIModelsResponse;
  const mapped = (payload.data ?? [])
    .map((entry) => entry.id?.trim() ?? "")
    .filter((id) => id.length > 0)
    .filter(isOpenAIDecisionModel)
    .map((id) => ({ value: id, label: id, provider: "openai" as const }));

  return sortOpenAIModels(uniqueByValue(mapped));
}

async function fetchGeminiModels(apiKey: string): Promise<DecisionModelOption[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw await responseError(response, "gemini");
  }

  const payload = (await response.json()) as GeminiModelsResponse;
  const mapped = (payload.models ?? [])
    .filter((entry) => (entry.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((entry) => {
      const id = (entry.name ?? "").replace(/^models\//, "").trim();
      const label = entry.displayName?.trim() || id;
      return {
        value: id,
        label,
        provider: "gemini" as const,
      };
    })
    .filter((entry) => entry.value.length > 0)
    .filter((entry) => isGeminiDecisionModel(entry.value));

  return uniqueByValue(mapped).sort((a, b) =>
    a.value.localeCompare(b.value, "en", { numeric: true, sensitivity: "base" })
  );
}

async function fetchAnthropicModels(apiKey: string): Promise<DecisionModelOption[]> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!response.ok) {
    throw await responseError(response, "anthropic");
  }

  const payload = (await response.json()) as AnthropicModelsResponse;
  const mapped = (payload.data ?? [])
    .map((entry) => {
      const id = entry.id?.trim() ?? "";
      const label = entry.display_name?.trim() || id;
      return {
        value: id,
        label,
        provider: "anthropic" as const,
      };
    })
    .filter((entry) => entry.value.length > 0)
    .filter((entry) => isAnthropicDecisionModel(entry.value));

  return uniqueByValue(mapped).sort((a, b) =>
    a.value.localeCompare(b.value, "en", { numeric: true, sensitivity: "base" })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as ModelsRequest;

    const oauthToken = normalizeCredential(body.oauthToken);
    const openaiCredential = oauthToken || normalizeCredential(body.apiKeys?.openai) || normalizeCredential(process.env.OPENAI_API_KEY);
    const geminiCredential = normalizeCredential(body.apiKeys?.gemini) || normalizeCredential(process.env.GEMINI_API_KEY);
    const anthropicCredential = normalizeCredential(body.apiKeys?.anthropic) || normalizeCredential(process.env.ANTHROPIC_API_KEY);

    const providers: ProviderModelMap = {
      openai: [],
      gemini: [],
      anthropic: [],
    };
    const warnings: string[] = [];

    if (!openaiCredential && !geminiCredential && !anthropicCredential) {
      warnings.push("No OAuth/API credentials found. Connect OAuth or provide keys to load live model catalog.");
      return NextResponse.json({ providers, warnings });
    }

    if (openaiCredential) {
      try {
        providers.openai = await fetchOpenAIModels(openaiCredential);
      } catch (error: unknown) {
        warnings.push(`OpenAI catalog unavailable: ${toErrorMessage(error)}`);
      }
    }

    if (geminiCredential) {
      try {
        providers.gemini = await fetchGeminiModels(geminiCredential);
      } catch (error: unknown) {
        warnings.push(`Gemini catalog unavailable: ${toErrorMessage(error)}`);
      }
    }

    if (anthropicCredential) {
      try {
        providers.anthropic = await fetchAnthropicModels(anthropicCredential);
      } catch (error: unknown) {
        warnings.push(`Anthropic catalog unavailable: ${toErrorMessage(error)}`);
      }
    }

    return NextResponse.json({ providers, warnings });
  } catch (error: unknown) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
