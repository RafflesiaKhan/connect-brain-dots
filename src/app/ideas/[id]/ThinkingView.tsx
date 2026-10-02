"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { BrainDots } from "@/components/BrainDots";
import { Peep } from "@/components/Peep";
import { DOT_AVATAR } from "@/lib/avatar";
import { STAGES, type StageId } from "@/lib/types";

export type StageState = "active" | "done";

export function ThinkingView({
  stages,
  logs,
  title,
  stale,
}: {
  stages: Record<StageId, StageState>;
  logs: { stage: StageId; text: string }[];
  title: string;
  stale?: boolean;
}) {
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollIntoView,
    // and React treats any value returned from an effect as its cleanup.
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);
  const doneCount = STAGES.filter((s) => stages[s.id] === "done").length;
  const pct = stale ? 50 : Math.round((doneCount / STAGES.length) * 100);

  return (
    <div className="card relative mx-auto max-w-4xl overflow-hidden p-6 sm:p-10">
      <BrainDots density={0.00022} energy={3} />
      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <Peep config={DOT_AVATAR} size={130} mood="thinking" />
          <h1 className="mt-3 font-display text-2xl font-bold">Thinking about &ldquo;{title}&rdquo;</h1>
          <p className="text-ink-soft">
            {stale ? "Still working on it in the background. This page will update by itself." : "Grab a tea. I'm connecting the dots..."}
          </p>
          <div className="mt-4 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-lilac/60">
            <motion.div className="h-full rounded-full bg-violet" animate={{ width: `${Math.max(6, pct)}%` }} transition={{ type: "spring" }} />
          </div>
        </div>

        {!stale && (
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <ol className="space-y-2">
              {STAGES.map((s) => {
                const st = stages[s.id];
                return (
                  <motion.li
                    key={s.id}
                    animate={{ scale: st === "active" ? 1.03 : 1 }}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      st === "active" ? "bg-white shadow-pop" : st === "done" ? "bg-mint/70" : "bg-white/50"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {st === "done" ? "✅" : s.emoji}
                    </span>
                    <div className="flex-1">
                      <div className="font-display font-semibold">{s.label}</div>
                      <div className="text-xs text-ink-soft">{s.blurb}</div>
                    </div>
                    {st === "active" && (
                      <span className="flex gap-1" aria-label="in progress">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="block h-2 w-2 rounded-full bg-violet"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ol>

            <div className="h-[340px] overflow-y-auto rounded-3xl bg-ink/90 p-4 font-mono text-[13px] text-white/90" aria-live="polite">
              <p className="mb-2 text-white/50">{"// Dot's inner monologue"}</p>
              <AnimatePresence initial={false}>
                {logs.map((l, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="py-0.5"
                  >
                    <span className="text-[#c9b8ff]">{STAGES.find((s) => s.id === l.stage)?.emoji}</span> {l.text}
                  </motion.p>
                ))}
              </AnimatePresence>
              <motion.span
                className="inline-block h-4 w-2 bg-[#c9b8ff]"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <div ref={logEnd} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
