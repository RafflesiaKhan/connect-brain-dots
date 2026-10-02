import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Peep } from "@/components/Peep";
import { db, schema } from "@/db";
import { providerInfo } from "@/lib/ai/catalog";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { requireUser } from "@/lib/session";
import { BrainDump } from "./BrainDump";

const STATUS: Record<string, { label: string; cls: string }> = {
  reflecting: { label: "Reflecting", cls: "bg-sky" },
  awaiting: { label: "Needs your input", cls: "bg-butter" },
  running: { label: "Thinking...", cls: "bg-lilac" },
  done: { label: "Mapped", cls: "bg-mint" },
  error: { label: "Hiccup", cls: "bg-pink" },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const { userId, profile } = await requireUser();
  const [list, [ai]] = await Promise.all([
    db.select().from(schema.ideas).where(eq(schema.ideas.userId, userId)).orderBy(desc(schema.ideas.updatedAt)).limit(30),
    db.select().from(schema.aiSettings).where(eq(schema.aiSettings.userId, userId)),
  ]);
  const provider = providerInfo(ai?.provider ?? "demo");

  return (
    <AppShell avatar={profile.avatar} name={profile.displayName}>
      <section className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <Peep config={profile.avatar ?? DEFAULT_AVATAR} size={120} mood="happy" />
        <div>
          <h1 className="font-display text-4xl font-bold">
            {greeting()}, <span className="text-violet">{profile.displayName}</span>!
          </h1>
          <p className="mt-1 text-lg text-ink-soft">What&rsquo;s rattling around in that brilliant brain today?</p>
          <p className="mt-2 text-xs font-semibold text-muted">
            Thinking with {provider.emoji} {provider.label}
            {provider.id === "demo" && (
              <>
                {" "}
                ·{" "}
                <Link href="/settings" className="text-violet underline">
                  connect a real AI
                </Link>
              </>
            )}
          </p>
        </div>
      </section>

      <BrainDump />

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-semibold">🗂️ Your thought library</h2>
        {list.length === 0 ? (
          <p className="card p-8 text-center text-ink-soft">
            No ideas yet. Your first tangled thought is going to look <em>great</em> as a graph.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((idea) => {
              const st = STATUS[idea.status] ?? STATUS.error;
              const top = idea.result?.options[0];
              const chosen = idea.result?.options.find((o) => o.id === idea.chosenOptionId);
              return (
                <li key={idea.id}>
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="card group block h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                      <time className="text-xs text-muted">{idea.updatedAt.toLocaleDateString()}</time>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold leading-snug group-hover:text-violet">
                      {idea.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{idea.prompt}</p>
                    {top && (
                      <p className="mt-3 text-sm font-semibold">
                        {chosen ? "✅ Went with" : "🏆 Top pick"}: {(chosen ?? top).emoji} {(chosen ?? top).name}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
