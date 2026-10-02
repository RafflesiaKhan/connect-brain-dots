/** Client-safe list of AI providers shown in the Settings dropdown. */

export type ProviderId = "demo" | "anthropic" | "openai" | "xai" | "google" | "ollama";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  emoji: string;
  tagline: string;
  models: string[];
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
    models: ["sample-brain"],
    defaultModel: "sample-brain",
    needsKey: false,
    nativeSearch: false,
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    emoji: "🧡",
    tagline: "Careful reasoning with built-in web search.",
    models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1", "claude-haiku-4-5"],
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
    models: ["gpt-5.5", "gpt-5.4-mini", "gpt-5.4-nano"],
    defaultModel: "gpt-5.5",
    needsKey: true,
    keyUrl: "https://platform.openai.com/api-keys",
    nativeSearch: true,
  },
  {
    id: "xai",
    label: "Grok (xAI)",
    emoji: "⚡",
    tagline: "Grok models with live web search.",
    models: ["grok-latest", "grok-4.7", "grok-4.20-non-reasoning"],
    defaultModel: "grok-latest",
    needsKey: true,
    keyUrl: "https://console.x.ai",
    nativeSearch: true,
  },
  {
    id: "google",
    label: "Gemini (Google)",
    emoji: "💎",
    tagline: "Gemini models grounded with Google Search.",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-pro-preview"],
    defaultModel: "gemini-2.5-flash",
    needsKey: true,
    keyUrl: "https://aistudio.google.com/apikey",
    nativeSearch: true,
  },
  {
    id: "ollama",
    label: "Ollama (local / self-hosted)",
    emoji: "🦙",
    tagline: "Run open models on your own machine. Uses Tavily for web research.",
    models: ["qwen3", "llama3.1", "gpt-oss", "mistral"],
    defaultModel: "qwen3",
    needsKey: false,
    nativeSearch: false,
    usesBaseUrl: true,
  },
];

export function providerInfo(id: string): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
