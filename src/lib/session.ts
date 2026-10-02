import "server-only";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { profileToText } from "@/lib/profile";

export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getProfile(userId: string) {
  const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  return p ?? null;
}

/** For pages: signed in AND onboarded, or redirect. */
export async function requireUser() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const profile = await getProfile(userId);
  if (!profile?.onboarded) redirect("/onboarding");
  return { userId, profile };
}

/** Profile + recent decisions, as text for the agent. */
export async function agentContext(userId: string, excludeIdeaId?: string) {
  const profile = await getProfile(userId);
  const recent = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.userId, userId))
    .orderBy(desc(schema.ideas.updatedAt))
    .limit(8);
  const memory = recent
    .filter((i) => i.id !== excludeIdeaId && i.result)
    .slice(0, 5)
    .map((i) => {
      const chosen = i.result!.options.find((o) => o.id === i.chosenOptionId);
      const top = i.result!.options[0];
      return chosen
        ? `- "${i.title}": the user chose "${chosen.name}"${chosen.id !== top.id ? ` over the top pick "${top.name}"` : ""}.`
        : `- "${i.title}": recommended "${top.name}" (user hasn't confirmed).`;
    })
    .join("\n");
  return {
    profile: profile ? profileToText(profile) : "",
    memory,
  };
}
