"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Peep } from "@/components/Peep";
import { Button } from "@/components/ui";
import { providerInfo } from "@/lib/ai/catalog";
import { DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import type { IdeaResult } from "@/lib/types";
import { Blueprint } from "./Blueprint";
import { CriteriaWeights, EffortRisk, RadarCompare, ScoreBars } from "./Charts";
import { DecisionPath, EvidenceBoard, OptionCards } from "./Details";
import { IdeaMap } from "./IdeaMap";
import { Matrix } from "./Matrix";
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

  return (
    <div className="space-y-6">
      {/* ── Hero verdict ── */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="card relative overflow-hidden p-6 sm:p-8"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25" style={{ background: optionColor(winner.id) }} />
        <p className="text-sm font-semibold text-muted">&ldquo;{prompt.length > 140 ? prompt.slice(0, 140) + "..." : prompt}&rdquo;</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{s.headline}</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-4 rounded-3xl border-2 bg-white p-4" style={{ borderColor: optionColor(winner.id) }}>
              <motion.div
                className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl sm:flex"
                style={{ background: `${optionColor(winner.id)}22` }}
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 1.2, delay: 0.6 }}
              >
                {winner.emoji}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-muted">🏆 Recommended</div>
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
              {onRerun && (
                <Button variant="soft" onClick={onRerun}>
                  🔁 Tweak considerations & rethink
                </Button>
              )}
            </div>
            {chosen && chosen !== winner.id && (
              <p className="mt-3 text-sm text-ink-soft">
                You picked {result.options.find((o) => o.id === chosen)?.name}. Rebel! I&rsquo;ll remember that for next time. 😄
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-3">
              <Peep config={avatar} size={70} mood={chosen ? "happy" : "surprised"} />
              <Peep config={DOT_AVATAR} size={76} mood="talking" />
              <p className="mb-6 rounded-3xl rounded-bl-md bg-butter px-4 py-2.5 text-sm font-semibold">{s.quip}</p>
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
          </div>
        </div>
      </motion.section>

      <Panel emoji="🧭" title="How we got here" hint="The decision path, step by step">
        <DecisionPath result={result} />
      </Panel>

      <Panel emoji="🕸️" title="Idea map" hint="Drag, zoom and toggle layers. Hover a dot to read the evidence.">
        <ClientOnly h={560}>
          <IdeaMap result={result} title={title} />
        </ClientOnly>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel emoji="📊" title="Scoreboard" hint="Weighted total out of 100">
          <ClientOnly>
            <ScoreBars result={result} />
          </ClientOnly>
        </Panel>
        <Panel emoji="⚖️" title="What matters most" hint="Criteria weights, tuned to you">
          <CriteriaWeights result={result} />
        </Panel>
        <Panel emoji="🕷️" title="Head to head" hint="Top 3 across every criterion">
          <ClientOnly>
            <RadarCompare result={result} />
          </ClientOnly>
        </Panel>
        <Panel emoji="🎯" title="Effort vs risk" hint="Bottom-left is the comfy corner">
          <ClientOnly>
            <EffortRisk result={result} />
          </ClientOnly>
        </Panel>
      </div>

      <Panel emoji="🧮" title="Decision matrix" hint="Every score, its reasoning and its receipts">
        <Matrix result={result} />
      </Panel>

      <Panel emoji="🏗️" title="Decision blueprint" hint="Idea → considerations → criteria → options → decision. Thicker lines = bigger contribution.">
        <ClientOnly h={480}>
          <Blueprint result={result} title={title} />
        </ClientOnly>
      </Panel>

      <Panel emoji="💡" title="All the options" hint="Including when each alternative is the smarter move">
        <OptionCards result={result} />
      </Panel>

      <Panel emoji="🔬" title="Evidence board" hint={`${result.evidence.filter((e) => e.sourceId).length} of ${result.evidence.length} claims linked to a source`}>
        <EvidenceBoard result={result} />
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel emoji="⚠️" title="Watch out for">
          <ul className="space-y-2 text-sm">
            {s.watchOuts.map((w) => (
              <li key={w} className="rounded-2xl bg-peach/60 px-3 py-2">
                {w}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel emoji="🕳️" title="Blind spots & fact-check notes">
          <ul className="space-y-2 text-sm">
            {[...result.critique.blindSpots, ...result.critique.issues].map((w) => (
              <li key={w} className="rounded-2xl bg-sky/60 px-3 py-2">
                {w}
              </li>
            ))}
            {!result.critique.blindSpots.length && !result.critique.issues.length && (
              <li className="text-muted">Nothing major found. Suspiciously tidy!</li>
            )}
          </ul>
        </Panel>
      </div>

      <p className="pb-4 text-center text-xs text-muted">
        Thought up by {providerInfo(result.provider).emoji} {providerInfo(result.provider).label} ({result.model}) · research:{" "}
        {result.searchMode} · {new Date(result.generatedAt).toLocaleString()}
        {result.provider === "demo" && " · Demo mode shows a sample analysis. Connect an AI in Settings for the real thing."}
      </p>
    </div>
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
