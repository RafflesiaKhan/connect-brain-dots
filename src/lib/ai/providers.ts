import "server-only";
import type { LanguageModel, ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt, maskKey } from "@/lib/crypto";
import { providerInfo, type ProviderId } from "./catalog";

export type ResolvedAi = {
  provider: ProviderId;
  modelId: string;
  model: LanguageModel | null; // null in demo mode
  nativeSearch: ToolSet | null;
  tavilyKey: string | undefined;
};

const ENV_KEY: Partial<Record<ProviderId, string>> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export type AiSettingsView = {
  provider: ProviderId;
  model: string;
  baseUrl: string;
  apiKeyMasked: string | null;
  tavilyKeyMasked: string | null;
  houseKeys: Partial<Record<ProviderId, boolean>>;
  houseTavily: boolean;
};

export async function getAiSettingsView(userId: string): Promise<AiSettingsView> {
  const [row] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.userId, userId));
  const houseKeys: Partial<Record<ProviderId, boolean>> = {};
  for (const [p, env] of Object.entries(ENV_KEY)) houseKeys[p as ProviderId] = !!process.env[env];
  houseKeys.ollama = !!process.env.OLLAMA_BASE_URL;
  const provider = (row?.provider ?? "demo") as ProviderId;
  return {
    provider,
    model: row?.model || providerInfo(provider).defaultModel,
    baseUrl: row?.baseUrl ?? "",
    apiKeyMasked: maskKey(decrypt(row?.apiKeyEnc)),
    tavilyKeyMasked: maskKey(decrypt(row?.tavilyKeyEnc)),
    houseKeys,
    houseTavily: !!process.env.TAVILY_API_KEY,
  };
}

export function buildModel(
  provider: ProviderId,
  modelId: string,
  apiKey: string | undefined,
  baseUrl: string | undefined,
): { model: LanguageModel | null; nativeSearch: ToolSet | null } {
  switch (provider) {
    case "anthropic": {
      const p = createAnthropic({ apiKey });
      return {
        model: p(modelId),
        nativeSearch: { web_search: p.tools.webSearch_20250305({ maxUses: 6 }) },
      };
    }
    case "openai": {
      const p = createOpenAI({ apiKey });
      return { model: p(modelId), nativeSearch: { web_search: p.tools.webSearch({}) } };
    }
    case "xai": {
      const p = createXai({ apiKey });
      return { model: p(modelId), nativeSearch: { web_search: p.tools.webSearch({}) } };
    }
    case "google": {
      const p = createGoogleGenerativeAI({ apiKey });
      return { model: p(modelId), nativeSearch: { google_search: p.tools.googleSearch({}) } };
    }
    case "ollama": {
      // A user-supplied URL makes the server fetch arbitrary addresses (SSRF), so in
      // production it is only honored when the operator explicitly opts in.
      const allowCustom = process.env.NODE_ENV !== "production" || process.env.OLLAMA_ALLOW_CUSTOM_URL === "true";
      const p = createOllama({
        baseURL: (allowCustom && baseUrl) || process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
      });
      return { model: p(modelId), nativeSearch: null };
    }
    default:
      return { model: null, nativeSearch: null };
  }
}

export async function resolveAi(userId: string): Promise<ResolvedAi> {
  const [row] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.userId, userId));
  const provider = (row?.provider ?? "demo") as ProviderId;
  const info = providerInfo(provider);
  const modelId = row?.model || info.defaultModel;
  const envName = ENV_KEY[provider];
  const apiKey = decrypt(row?.apiKeyEnc) ?? (envName ? process.env[envName] : undefined);
  if (info.needsKey && !apiKey) {
    throw new Error(`No API key for ${info.label}. Add one in Settings, or switch to Demo mode.`);
  }
  const { model, nativeSearch } = buildModel(provider, modelId, apiKey, row?.baseUrl ?? undefined);
  return {
    provider,
    modelId,
    model,
    nativeSearch,
    tavilyKey: decrypt(row?.tavilyKeyEnc) ?? (process.env.TAVILY_API_KEY || undefined),
  };
}
