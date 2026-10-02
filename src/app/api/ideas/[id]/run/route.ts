import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { runAgent } from "@/lib/ai/agent";
import { resolveAi } from "@/lib/ai/providers";
import { agentContext, currentUserId } from "@/lib/session";
import type { RunEvent } from "@/lib/types";

export const maxDuration = 300;

const consequence = z.object({
  id: z.string(),
  text: z.string().trim().min(1).max(200),
  kind: z.enum(["constraint", "worry", "preference", "goal", "unknown"]),
  emoji: z.string().max(16),
  userAdded: z.boolean().optional(),
});
const body = z.object({ consequences: z.array(consequence).max(16) });

/** Runs the full agent pipeline and streams progress as Server-Sent Events. */
export async function POST(req: Request, ctx: RouteContext<"/api/ideas/[id]/run">) {
  const userId = await currentUserId();
  if (!userId) return new Response("Not signed in", { status: 401 });
  const { id } = await ctx.params;
  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId)));
  if (!idea?.reflection) return new Response("Idea not found", { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const consequences = parsed.data.consequences;
  await db
    .update(schema.ideas)
    .set({ consequences, status: "running", error: null, updatedAt: new Date() })
    .where(eq(schema.ideas.id, id));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: RunEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* client went away; keep working so the result is still saved */
        }
      };
      try {
        const ai = await resolveAi(userId);
        const result = await runAgent(
          ai,
          { idea: idea.prompt, reflection: idea.reflection!, consequences },
          await agentContext(userId, id),
          send,
        );
        await db
          .update(schema.ideas)
          .set({ result, status: "done", chosenOptionId: null, updatedAt: new Date() })
          .where(eq(schema.ideas.id, id));
        send({ type: "result", result });
      } catch (e) {
        const message = (e as Error).message || "Something went wrong while thinking.";
        console.error("[run]", e);
        await db.update(schema.ideas).set({ status: "error", error: message }).where(eq(schema.ideas.id, id));
        send({ type: "error", message });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
