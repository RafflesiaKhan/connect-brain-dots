import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { reflect } from "@/lib/ai/agent";
import { resolveAi } from "@/lib/ai/providers";
import { agentContext, currentUserId } from "@/lib/session";

export const maxDuration = 120;

const body = z.object({ prompt: z.string().trim().min(3).max(4000) });

/** Create an idea and run the "you're probably also thinking..." reflection. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Tell me a little more (at least 3 characters)." }, { status: 400 });

  const [idea] = await db
    .insert(schema.ideas)
    .values({ userId, prompt: parsed.data.prompt, title: parsed.data.prompt.slice(0, 60) })
    .returning();

  try {
    const ai = await resolveAi(userId);
    const reflection = await reflect(ai, parsed.data.prompt, await agentContext(userId, idea.id));
    await db
      .update(schema.ideas)
      .set({ reflection, title: reflection.title, status: "awaiting", updatedAt: new Date() })
      .where(eq(schema.ideas.id, idea.id));
    return NextResponse.json({ id: idea.id });
  } catch (e) {
    const message = (e as Error).message || "The AI provider failed.";
    await db.update(schema.ideas).set({ status: "error", error: message }).where(eq(schema.ideas.id, idea.id));
    return NextResponse.json({ id: idea.id, error: message }, { status: 502 });
  }
}
