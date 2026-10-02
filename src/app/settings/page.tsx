import { AiSettingsForm } from "@/components/AiSettingsForm";
import { AppShell } from "@/components/AppShell";
import { Peep } from "@/components/Peep";
import { LinkButton } from "@/components/ui";
import { getAiSettingsView } from "@/lib/ai/providers";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { questionsFor } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const { userId, profile } = await requireUser();
  const ai = await getAiSettingsView(userId);
  const qs = questionsFor(profile.profileType);

  return (
    <AppShell avatar={profile.avatar} name={profile.displayName}>
      <h1 className="mb-6 font-display text-3xl font-bold">⚙️ Settings</h1>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-6 sm:p-8">
          <h2 className="mb-1 font-display text-xl font-semibold">🧠 AI brain</h2>
          <p className="mb-5 text-sm text-ink-soft">
            Choose which model powers Dot. Keys are encrypted at rest and never sent to the browser.
          </p>
          <AiSettingsForm initial={ai} />
        </section>

        <section id="profile" className="card p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <Peep config={profile.avatar ?? DEFAULT_AVATAR} size={88} mood="happy" />
            <div>
              <h2 className="font-display text-xl font-semibold">{profile.displayName}</h2>
              <p className="text-sm text-ink-soft">
                {profile.profileType === "research" ? "🔬 Research & work profile" : "🏡 Personal profile"}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-2.5 text-sm">
            {qs.map((q) => {
              const a = profile.answers[q.id];
              if (!a || (Array.isArray(a) && !a.length)) return null;
              return (
                <div key={q.id} className="rounded-2xl bg-white px-4 py-2.5">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{q.id}</dt>
                  <dd>{Array.isArray(a) ? a.join(", ") : a}</dd>
                </div>
              );
            })}
          </dl>
          <LinkButton href="/onboarding" variant="soft" className="mt-5">
            Edit avatar & profile
          </LinkButton>
        </section>
      </div>
    </AppShell>
  );
}
