"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { LocalTime } from "@/components/LocalTime";
import { Peep } from "@/components/Peep";
import { Button } from "@/components/ui";
import { providerInfo } from "@/lib/ai/catalog";
import { DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import type { IdeaResult } from "@/lib/types";
import { Blueprint } from "./Blueprint";
import { CriteriaWeights, EffortRisk, RadarCompare, ScoreBars } from "./Charts";
import { ConsequenceExplorer } from "./Consequences";
import { DecisionPath, OptionCards } from "./Details";
import { IdeaMap } from "./IdeaMap";
import { Matrix } from "./Matrix";
import { ConstraintMatrix, Overview } from "./Overview";
import { FactCheck, ResearchReport } from "./Research";
import { Contributions, HeadToHead, Robustness, WhatIf } from "./Validate";
import { optionColor, Panel } from "./shared";

/** Charts measure the DOM, so render them only after mount. */
const noopSubscribe = () => () => {};

function ClientOnly({ children, h = 300 }: { children: ReactNode; h?: number }) {
  const ok = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return ok ? <>{children}</> : <div style={{ height: h }} className="animate-pulse rounded-3xl bg-lilac/20" />;
}

export function Dashboard({
  ideaId,
  title,
  prompt,
  result,
  chosenOptionId,
  avatar,
  onRerun,
}: {
  ideaId: string;
  title: string;
  prompt: string;
  result: IdeaResult;
  chosenOptionId: string | null;
  avatar: AvatarConfig;
  onRerun?: () => void;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState(chosenOptionId);
  const winner = result.options[0];
  const s = result.synthesis;

  const choose = async (id: string | null) => {
    setChosen(id);
    await fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chosenOptionId: id }),
    });
    router.refresh();
  };

  const sections = [
    ["overview", "🗺️", "Overview"],
    ["constraints", "🚧", "Your constraints"],
    ["consequences", "🌳", "Consequences"],
    ["compare", "📊", "Compare"],
    ["validate", "🎚️", "Validate"],
    ["research", "🔬", "Research"],
    ["reasoning", "🧭", "Reasoning"],
    ["verdict", "🏆", "Verdict"],
  ] as const;

  return (
    <div className="space-y-6">
      {/* ── Intro: the question and the scope of the analysis, not the answer ── */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="card relative isolate overflow-hidden p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-lilac opacity-60" />
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Your question</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">&ldquo;{prompt}&rdquo;</h1>
        <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-lg leading-relaxed text-ink-soft">
              Dot weighed <strong className="text-ink">{result.options.length} options</strong> against{" "}
              <strong className="text-ink">{result.criteria.length} criteria</strong>,{" "}
              <strong className="text-ink">{result.consequences.length} of your considerations</strong> and{" "}
              <strong className="text-ink">{result.evidence.length} pieces of evidence</strong> from {result.sources.length} sources.
              Explore how every option holds up; the verdict waits at the end.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" })}>Start exploring ↓</Button>
              <Button variant="soft" onClick={() => document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth" })}>
                Skip to verdict
              </Button>
              {onRerun && (
                <Button variant="ghost" onClick={onRerun}>
                  🔁 Tweak considerations & rethink
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <Peep config={avatar} size={70} mood="thinking" />
            <Peep config={DOT_AVATAR} size={76} mood="talking" />
            <p className="mb-6 rounded-3xl rounded-bl-md bg-butter px-4 py-2.5 text-sm font-semibold">
              Let&rsquo;s walk through it together. No peeking at the last page! 🙈
            </p>
          </div>
        </div>
      </motion.section>

      <SectionNav sections={sections} />

      <Section id="overview" emoji="🗺️" title="The landscape" hint="Every option and its percentages. Hover a bar to see what it means.">
        <Overview result={result} />
      </Section>

      <Section id="constraints" emoji="🚧" title="Your constraints, option by option" hint="Which choices respect what matters to you, and which break it">
        <ConstraintMatrix result={result} />
        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">🕸️ Constraint network</h3>
        <ClientOnly h={560}>
          <IdeaMap result={result} title={title} />
        </ClientOnly>
      </Section>

      <Section id="consequences" emoji="🌳" title="What happens next?" hint="Pick an option to see its likely consequences, good and bad">
        <ClientOnly h={360}>
          <ConsequenceExplorer result={result} />
        </ClientOnly>
      </Section>

      <Section id="compare" emoji="📊" title="Side by side" hint="Scores, weights and where the points come from">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold">Fit score (out of 100)</h3>
            <ClientOnly>
              <ScoreBars result={result} />
            </ClientOnly>
          </div>
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold">What matters most to you</h3>
            <CriteriaWeights result={result} />
          </div>
        </div>
        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">Where each option&rsquo;s points come from</h3>
        <ClientOnly>
          <Contributions result={result} />
        </ClientOnly>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold">Head to head (pick up to 3)</h3>
            <ClientOnly>
              <RadarCompare result={result} />
            </ClientOnly>
          </div>
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold">Effort vs risk</h3>
            <ClientOnly>
              <EffortRisk result={result} />
            </ClientOnly>
          </div>
        </div>
        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">🧮 Decision matrix</h3>
        <Matrix result={result} />
      </Section>

      <Section id="validate" emoji="🎚️" title="Stress-test the answer" hint="Change what matters and see if the ranking holds">
        <h3 className="mb-3 font-display text-lg font-semibold">What if your priorities were different?</h3>
        <WhatIf result={result} />
        <h3 className="mb-3 mt-10 font-display text-lg font-semibold">How solid is the leader?</h3>
        <ClientOnly>
          <Robustness result={result} />
        </ClientOnly>
      </Section>

      <Section id="research" emoji="🔬" title="Research report" hint={`${result.evidence.filter((e) => e.sourceId).length} of ${result.evidence.length} claims linked to a source · research: ${result.searchMode}`}>
        <ClientOnly>
          <ResearchReport result={result} />
        </ClientOnly>
      </Section>

      <Section id="reasoning" emoji="🧭" title="How the decision was reached" hint="The logical sequence from your thought to the answer">
        <DecisionPath result={result} />
        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">🏗️ Decision blueprint</h3>
        <p className="-mt-2 mb-3 text-sm text-muted">Idea → considerations → criteria → options → decision. Thicker lines = bigger contribution.</p>
        <ClientOnly h={480}>
          <Blueprint result={result} title={title} />
        </ClientOnly>
        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">🧐 Fact-check & blind spots</h3>
        <FactCheck result={result} />
      </Section>

      {/* ── Verdict, last ── */}
      <motion.section
        id="verdict"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="card relative isolate scroll-mt-24 overflow-hidden p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full opacity-25" style={{ background: optionColor(winner.id) }} />
        <p className="text-xs font-bold uppercase tracking-wide text-muted">🏆 The verdict</p>
        <h2 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">{s.headline}</h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-4 rounded-3xl border-2 bg-white p-4" style={{ borderColor: optionColor(winner.id) }}>
              <motion.div
                className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl sm:flex"
                style={{ background: `${optionColor(winner.id)}22` }}
                whileInView={{ rotate: [0, -8, 8, 0] }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3 }}
              >
                {winner.emoji}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-muted">Recommended</div>
                <div className="font-display text-xl font-semibold">{winner.name}</div>
                <div className="text-sm text-ink-soft">{winner.summary}</div>
              </div>
              <ScoreRing value={winner.total} label="score" color={optionColor(winner.id)} />
            </div>
            <p className="mt-4 leading-relaxed">{s.why}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => choose(chosen === winner.id ? null : winner.id)} variant={chosen === winner.id ? "soft" : "primary"}>
                {chosen === winner.id ? "✅ Going with this!" : "I'm going with this"}
              </Button>
              {result.options.slice(1).map((o) => (
                <Button key={o.id} variant={chosen === o.id ? "soft" : "ghost"} onClick={() => choose(chosen === o.id ? null : o.id)}>
                  {chosen === o.id ? "✅ " : ""}
                  {o.emoji} {o.name}
                </Button>
              ))}
            </div>
            {chosen && chosen !== winner.id && (
              <p className="mt-3 text-sm text-ink-soft">
                You picked {result.options.find((o) => o.id === chosen)?.name}. Rebel! I&rsquo;ll remember that for next time. 😄
              </p>
            )}
            <div className="mt-6 rounded-3xl bg-white p-4">
              <h3 className="mb-3 font-display text-lg font-semibold">Why #1 beats #2</h3>
              <HeadToHead result={result} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-3">
              <Peep config={avatar} size={64} mood={chosen ? "happy" : "surprised"} />
              <Peep config={DOT_AVATAR} size={70} mood="talking" />
              <p className="mb-5 rounded-3xl rounded-bl-md bg-butter px-4 py-2.5 text-sm font-semibold">{s.quip}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Confidence" value={`${result.confidence}%`} />
              <Stat label="Evidence" value={String(result.evidence.length)} />
              <Stat label="Sources" value={String(result.sources.length)} />
            </div>
            <div className="rounded-2xl bg-mint/60 p-4">
              <div className="mb-2 font-display font-semibold">🚀 First steps</div>
              <FirstSteps steps={s.firstSteps} storageKey={`steps-${ideaId}`} />
            </div>
            {s.watchOuts.length > 0 && (
              <div className="rounded-2xl bg-peach/60 p-4">
                <div className="mb-2 font-display font-semibold">⚠️ Watch out for</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {s.watchOuts.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <h3 className="mb-3 mt-8 font-display text-lg font-semibold">💡 Promising alternatives, and when they win</h3>
        <OptionCards result={result} />
      </motion.section>

      <p className="pb-4 text-center text-xs text-muted">
        Thought up by {providerInfo(result.provider).emoji} {providerInfo(result.provider).label} ({result.model}) · research:{" "}
        {result.searchMode} · <LocalTime iso={result.generatedAt} />
        {result.provider === "demo" && " · Demo mode shows a sample analysis. Connect an AI in Settings for the real thing."}
      </p>
    </div>
  );
}

function Section({ id, ...rest }: { id: string } & Parameters<typeof Panel>[0]) {
  return (
    <div id={id} className="scroll-mt-24">
      <Panel {...rest} />
    </div>
  );
}

/** Sticky section menu that highlights where you are. */
function SectionNav({ sections }: { sections: readonly (readonly [string, string, string])[] }) {
  const [active, setActive] = useState<string>(sections[0][0]);
  useEffect(() => {
    const els = sections.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav className="sticky top-[57px] z-30 -mx-1 overflow-x-auto rounded-full bg-cream/85 px-1 py-1.5 backdrop-blur-md" aria-label="Dashboard sections">
      <ol className="flex w-max gap-1">
        {sections.map(([id, emoji, label], i) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                active === id ? "bg-violet text-white shadow-pop" : "bg-white/70 text-ink-soft hover:bg-white"
              }`}
              aria-current={active === id ? "true" : undefined}
            >
              <span className="text-[10px] opacity-70">{i + 1}</span> <span aria-hidden>{emoji}</span> {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-2 py-3 shadow-soft">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`${label} ${value} out of 100`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ece5fb" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-base font-bold">{Math.round(value)}</div>
    </div>
  );
}

function FirstSteps({ steps, storageKey }: { steps: string[]; storageKey: string }) {
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const [override, setDone] = useState<number[] | null>(null);
  let done: number[] = override ?? [];
  if (!override && stored) {
    try {
      done = JSON.parse(stored);
    } catch {}
  }
  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  return (
    <ul className="space-y-1.5 text-sm">
      {steps.map((st, i) => (
        <li key={st}>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="mt-1 accent-[#7c5cff]" />
            <span className={done.includes(i) ? "text-muted line-through" : ""}>{st}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
