"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Peep } from "@/components/Peep";
import { Button } from "@/components/ui";
import { DOT_AVATAR } from "@/lib/avatar";

const EXAMPLES = [
  "I want to cook rice and meat curry for lunch, but my husband doesn't like curry. Frying is unhealthy though...",
  "Should I do a part-time master's or switch jobs first?",
  "Which approach for my thesis: fine-tune a small model or prompt a large one? Limited GPU budget.",
  "Weekend plan: visit my parents, catch up on work, or finally rest?",
];

const LOADING_LINES = [
  "Reading between your lines...",
  "Spotting the 'but what if's...",
  "Counting the hidden worries...",
  "Untangling the yarn ball...",
];

export function BrainDump() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1600);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (data.id) router.push(`/ideas/${data.id}`);
      else throw new Error(data.error ?? "Something went wrong.");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    } finally {
      clearInterval(t);
    }
  };

  return (
    <section className="card relative mt-8 overflow-hidden p-5 sm:p-7">
      <label htmlFor="dump" className="mb-3 block font-display text-xl font-semibold">
        🧠 Brain dump
        <span className="ml-2 text-sm font-normal text-muted">Type it exactly like it sounds in your head. Messy is welcome.</span>
      </label>
      <textarea
        id="dump"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={4}
        disabled={busy}
        placeholder="e.g. I want to cook lunch... maybe curry? But..."
        className="w-full resize-none rounded-3xl border-2 border-line bg-white/90 px-5 py-4 text-lg outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={busy}
            onClick={() => setText(ex)}
            className="max-w-xs cursor-pointer truncate rounded-full bg-lilac/40 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-lilac"
          >
            {ex}
          </button>
        ))}
        <Button className="ml-auto px-6" onClick={submit} disabled={busy || text.trim().length < 3}>
          {busy ? "Thinking..." : "Connect the dots ✨"}
        </Button>
      </div>
      {error && <p className="mt-3 rounded-2xl bg-pink px-4 py-2 text-sm font-semibold">⚠️ {error}</p>}

      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm"
          >
            <Peep config={DOT_AVATAR} size={100} mood="thinking" />
            <AnimatePresence mode="wait">
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="font-display text-lg font-semibold text-violet"
              >
                {LOADING_LINES[line]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
