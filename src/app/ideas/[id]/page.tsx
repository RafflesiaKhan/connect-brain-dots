import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { db, schema } from "@/db";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { requireUser } from "@/lib/session";
import { IdeaFlow } from "./IdeaFlow";

export default async function IdeaPage(props: PageProps<"/ideas/[id]">) {
  const { id } = await props.params;
  const { userId, profile } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [idea] = await db
    .select()
    .from(schema.ideas)
    .where(and(eq(schema.ideas.id, id), eq(schema.ideas.userId, userId)));
  if (!idea) notFound();

  return (
    <AppShell avatar={profile.avatar} name={profile.displayName}>
      <IdeaFlow
        idea={{
          id: idea.id,
          title: idea.title,
          prompt: idea.prompt,
          status: idea.status,
          reflection: idea.reflection,
          consequences: idea.consequences,
          result: idea.result,
          chosenOptionId: idea.chosenOptionId,
          error: idea.error,
        }}
        avatar={profile.avatar ?? DEFAULT_AVATAR}
      />
    </AppShell>
  );
}
