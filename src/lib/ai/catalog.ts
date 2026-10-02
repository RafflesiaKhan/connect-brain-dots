/** Client-safe list of AI providers shown in the Settings dropdown. */

export type ProviderId = "demo" | "anthropic" | "openai" | "xai" | "google" | "ollama";

/** How big (and token-hungry) a model is. Bigger thinks deeper but costs more per run. */
export type ModelTier = "big" | "balanced" | "quick" | "tiny";

export const TIERS: Record<ModelTier, { label: string; emoji: string; rank: number; hint: string }> = {
  big: { label: "Big brain", emoji: "🧠", rank: 4, hint: "Deepest reasoning, uses the most tokens" },
  balanced: { label: "Balanced", emoji: "⚖️", rank: 3, hint: "Strong quality, moderate token use" },
  quick: { label: "Quick", emoji: "⚡", rank: 2, hint: "Fast and light on tokens" },
  tiny: { label: "Tiny", emoji: "🐣", rank: 1, hint: "Fewest tokens, fine for simple decisions" },
};

export type ModelOption = {
  id: string;
  label: string;
  tier: ModelTier;
  /** Context window in tokens. */
  context?: number;
  /** USD per 1M tokens: [input, output]. */
  price?: [number, number];
  note?: string;
};

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  emoji: string;
  tagline: string;
  /** Sorted biggest (most tokens per run) to smallest. */
  models: ModelOption[];
  defaultModel: string;
  needsKey: boolean;
  keyUrl?: string;
  /** Has built-in web search. Others use Tavily when a key is configured. */
  nativeSearch: boolean;
  usesBaseUrl?: boolean;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "demo",
    label: "Demo mode",
    emoji: "🎭",
    tagline: "No key needed. Shows a sample analysis so you can explore the dashboard.",
    models: [{ id: "sample-brain", label: "Sample brain", tier: "tiny", note: "Scripted, free" }],
    defaultModel: "sample-brain",
    needsKey: false,
    nativeSearch: false,
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    emoji: "🧡",
    tagline: "Careful reasoning with built-in web search.",
    models: [
      { id: "claude-fable-5-1", label: "Claude Fable 5.1", tier: "big", context: 1_000_000, price: [10, 50], note: "Most capable, slowest" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5", tier: "big", context: 1_000_000, price: [4, 20] },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", tier: "balanced", context: 1_000_000, price: [2, 10], note: "Recommended" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", tier: "quick", context: 200_000, price: [1, 5] },
    ],
    defaultModel: "claude-sonnet-5-5",
    needsKey: true,
    keyUrl: "https://console.anthropic.com/settings/keys",
    nativeSearch: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    emoji: "🟢",
    tagline: "GPT models with built-in web search.",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", tier: "big", context: 1_000_000, price: [5, 30] },
      { id: "gpt-5.4", label: "GPT-5.4", tier: "balanced", context: 1_050_000, price: [2.5, 15], note: "Recommended" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini", tier: "quick", context: 400_000, price: [0.75, 4.5] },
      { id: "gpt-5.4-nano", label: "GPT-5.4 nano", tier: "tiny", context: 400_000, price: [0.2, 1.25] },
    ],
    defaultModel: "gpt-5.4",
    needsKey: true,
    keyUrl: "https://platform.openai.com/api-keys",
    nativeSearch: true,
  },
  {
    id: "xai",
    label: "Grok (xAI)",
    emoji: "⚡",
    tagline: "Grok models with live web search.",
    models: [
      { id: "grok-4.7", label: "Grok 4.7", tier: "big", context: 500_000, price: [2, 6], note: "Recommended" },
      { id: "grok-4-1-fast-reasoning", label: "Grok 4.1 Fast (reasoning)", tier: "quick", context: 2_000_000, price: [0.2, 0.5] },
      { id: "grok-4-1-fast-non-reasoning", label: "Grok 4.1 Fast (instant)", tier: "tiny", context: 2_000_000, price: [0.2, 0.5], note: "No thinking step" },
    ],
    defaultModel: "grok-4.7",
    needsKey: true,
    keyUrl: "https://console.x.ai",
    nativeSearch: true,
  },
  {
    id: "google",
    label: "Gemini (Google)",
    emoji: "💎",
    tagline: "Gemini models grounded with Google Search.",
    models: [
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", tier: "big", context: 1_000_000, price: [2, 12], note: "Preview" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "balanced", context: 1_000_000, price: [1.5, 9], note: "Recommended" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", tier: "quick", context: 1_000_000, price: [0.3, 2.5] },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", tier: "tiny", context: 1_000_000, price: [0.1, 0.4], note: "Free tier friendly" },
    ],
    defaultModel: "gemini-3.5-flash",
    needsKey: true,
    keyUrl: "https://aistudio.google.com/apikey",
    nativeSearch: true,
  },
  {
    id: "ollama",
    label: "Ollama (local / self-hosted)",
    emoji: "🦙",
    tagline: "Run open models on your own machine. Uses Tavily for web research.",
    models: [
      { id: "gpt-oss:120b", label: "gpt-oss 120B", tier: "big", note: "Needs a big GPU" },
      { id: "gpt-oss:20b", label: "gpt-oss 20B", tier: "balanced", note: "16 GB+ memory" },
      { id: "qwen3:8b", label: "Qwen3 8B", tier: "quick", note: "Runs on most laptops" },
      { id: "llama3.2:3b", label: "Llama 3.2 3B", tier: "tiny", note: "Very light" },
    ],
    defaultModel: "qwen3:8b",
    needsKey: false,
    nativeSearch: false,
    usesBaseUrl: true,
  },
];

/** Finds a listed model, or undefined for a custom model id. */
export function modelOption(provider: ProviderId, id: string): ModelOption | undefined {
  return providerInfo(provider).models.find((m) => m.id === id);
}

/** "1M" / "400K" style label for a context window. */
export function formatContext(tokens: number): string {
  return tokens >= 1_000_000 ? `${+(tokens / 1_000_000).toFixed(2)}M` : `${Math.round(tokens / 1000)}K`;
}

export function providerInfo(id: string): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
