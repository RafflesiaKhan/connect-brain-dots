import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { currentUserId } from "@/lib/session";

const patch = z.object({ chosenOptionId: z.string().nullable() });

/** Record which option the user actually went with (feeds the agent's memory). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/ideas/[id]">) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await db
    .update(schema.ideas)
    .set({ chosenOptionId: parsed.data.chosenOptionId, updatedAt: new Date() })
    .where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/ideas/[id]">) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  await db.delete(schema.ideas).where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId)));
  return NextResponse.json({ ok: true });
}
