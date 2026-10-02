"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { z } from "zod";
import { signOut } from "@/auth";
import { db, schema } from "@/db";
import { PROVIDERS, type ProviderId } from "@/lib/ai/catalog";
import { buildModel } from "@/lib/ai/providers";
import { decrypt, encrypt } from "@/lib/crypto";
import { ANSWER_MAX } from "@/lib/profile";
import { currentUserId } from "@/lib/session";

async function mustUser() {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in");
  return id;
}

const avatarSchema = z.object({
  seed: z.string().max(64),
  head: z.string().max(32),
  face: z.string().max(32),
  accessories: z.string().max(32),
  facialHair: z.string().max(32),
  skinColor: z.string().regex(/^[0-9a-f]{6}$/i),
  clothingColor: z.string().regex(/^[0-9a-f]{6}$/i),
  headContrastColor: z.string().regex(/^[0-9a-f]{6}$/i),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  avatar: avatarSchema,
  profileType: z.enum(["personal", "research"]),
  answers: z.record(z.string(), z.union([z.string().max(ANSWER_MAX), z.array(z.string().max(100)).max(12)])),
});

export async function saveProfile(
  input: z.infer<typeof profileSchema>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const userId = await mustUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.at(-1);
    const message =
      issue.code === "too_big"
        ? `One of your answers${typeof where === "string" ? ` ("${where}")` : ""} is too long. Please keep it under ${ANSWER_MAX} characters.`
        : issue.path[0] === "displayName"
          ? "Please add your name (up to 60 characters)."
          : "Some of your answers couldn't be saved. Please check them and try again.";
    return { ok: false, message };
  }
  const data = parsed.data;
  await db
    .insert(schema.profiles)
    .values({ userId, ...data, onboarded: true })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: { ...data, onboarded: true, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
  return { ok: true } as const;
}

const providerIds = PROVIDERS.map((p) => p.id) as [ProviderId, ...ProviderId[]];

const aiSchema = z.object({
  provider: z.enum(providerIds),
  model: z.string().trim().max(100),
  apiKey: z.string().trim().max(400).optional(), // undefined = keep existing
  clearApiKey: z.boolean().optional(),
  baseUrl: z.string().trim().max(300).optional(),
  tavilyKey: z.string().trim().max(400).optional(),
  clearTavilyKey: z.boolean().optional(),
});

export async function saveAiSettings(input: z.infer<typeof aiSchema>) {
  const userId = await mustUser();
  const d = aiSchema.parse(input);
  const [existing] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.userId, userId));
  const row = {
    provider: d.provider,
    model: d.model,
    baseUrl: d.baseUrl || null,
    // Switching providers drops the old key: it belongs to the old provider.
    apiKeyEnc: d.clearApiKey
      ? null
      : d.apiKey
        ? encrypt(d.apiKey)
        : existing?.provider === d.provider
          ? existing.apiKeyEnc
          : null,
    tavilyKeyEnc: d.clearTavilyKey ? null : d.tavilyKey ? encrypt(d.tavilyKey) : (existing?.tavilyKeyEnc ?? null),
    updatedAt: new Date(),
  };
  await db
    .insert(schema.aiSettings)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: schema.aiSettings.userId, set: row });
  revalidatePath("/settings");
  return { ok: true };
}

/** Sends a tiny prompt to check the key/model/base URL actually work. */
export async function testAiConnection(input: z.infer<typeof aiSchema>) {
  const userId = await mustUser();
  const d = aiSchema.parse(input);
  if (d.provider === "demo") return { ok: true, message: "Demo mode is always ready. 🎭" };
  const [existing] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.userId, userId));
  const envKey: Record<string, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    xai: process.env.XAI_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
  const key =
    d.apiKey ||
    (existing?.provider === d.provider ? decrypt(existing.apiKeyEnc) : undefined) ||
    envKey[d.provider];
  try {
    const { model } = buildModel(d.provider, d.model, key, d.baseUrl);
    if (!model) return { ok: false, message: "Unknown provider." };
    const r = await generateText({
      model,
      prompt: "Reply with exactly: dots connected",
      maxOutputTokens: 20,
      maxRetries: 0,
      timeout: 30_000,
    });
    return { ok: true, message: `Connected! The model says: "${r.text.trim().slice(0, 60)}"` };
  } catch (e) {
    return { ok: false, message: (e as Error).message.slice(0, 300) };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
