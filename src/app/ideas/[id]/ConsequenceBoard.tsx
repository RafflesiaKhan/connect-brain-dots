"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Peep } from "@/components/Peep";
import { Button, KIND_STYLE } from "@/components/ui";
import { DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import type { Consequence, ConsequenceKind, Reflection } from "@/lib/types";

const KIND_EMOJI: Record<ConsequenceKind, string> = {
  constraint: "🚧",
  worry: "😟",
  preference: "💜",
  goal: "🎯",
  unknown: "❓",
};

export function ConsequenceBoard({
  prompt,
  reflection,
  initial,
  avatar,
  onGo,
}: {
  prompt: string;
  reflection: Reflection;
  initial: Consequence[];
  avatar: AvatarConfig;
  onGo: (c: Consequence[]) => void;
}) {
  const [items, setItems] = useState<Consequence[]>(initial);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<ConsequenceKind>("constraint");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((xs) => [...xs, { id: `u${Date.now()}`, text: t, kind, emoji: KIND_EMOJI[kind], userAdded: true }]);
    setText("");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start gap-4">
        <Peep config={avatar} size={72} mood="worried" />
        <div className="rounded-3xl rounded-tl-md bg-white px-5 py-3 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">You said</p>
          <p className="mt-0.5 text-lg">&ldquo;{prompt}&rdquo;</p>
        </div>
      </div>

      <div className="mt-5 flex items-start justify-end gap-4">
        <div className="rounded-3xl rounded-tr-md bg-lilac/60 px-5 py-3 shadow-soft">
          <p className="font-display text-lg font-semibold">{reflection.quip}</p>
          <p className="mt-1 text-ink-soft">
            So really: <strong>{reflection.restatement}</strong> Here&rsquo;s what I think is also buzzing in your head. Pop
            the ones that are wrong, and add anything I missed.
          </p>
        </div>
        <Peep config={DOT_AVATAR} size={72} mood="talking" />
      </div>

      <div className="card relative mt-8 min-h-[220px] p-6">
        <div className="flex flex-wrap justify-center gap-3">
          <AnimatePresence>
            {items.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.4, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0, scale: 1.4, filter: "blur(4px)" }}
                transition={{
                  opacity: { delay: i * 0.08 },
                  scale: { type: "spring", stiffness: 260, damping: 16, delay: i * 0.08 },
                  y: { duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
                }}
                className={`group relative flex items-center gap-2 rounded-full ${KIND_STYLE[c.kind].bg} py-2 pl-3 pr-2 shadow-soft`}
              >
                <span aria-hidden className="text-lg">
                  {c.emoji}
                </span>
                <span className="text-[15px] font-semibold">{c.text}</span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                  {KIND_STYLE[c.kind].label}
                </span>
                <button
                  type="button"
                  aria-label={`Remove "${c.text}"`}
                  onClick={() => setItems((xs) => xs.filter((x) => x.id !== c.id))}
                  className="ml-1 h-6 w-6 cursor-pointer rounded-full bg-white/70 text-xs font-bold text-ink-soft opacity-60 transition hover:bg-white hover:opacity-100"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {items.length === 0 && (
          <p className="py-10 text-center text-muted">All popped! Add your own considerations, or just let me run with the idea.</p>
        )}

        <form
          className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ConsequenceKind)}
            className="cursor-pointer rounded-full border border-line bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet"
            aria-label="Kind of consideration"
          >
            {(Object.keys(KIND_EMOJI) as ConsequenceKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_EMOJI[k]} {KIND_STYLE[k].label}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="Something else on your mind? e.g. 'We only have chicken'"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 outline-none focus:border-violet"
          />
          <Button type="submit" variant="soft">
            + Add
          </Button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button className="px-8 py-4 text-lg" onClick={() => onGo(items)}>
          Looks right. Go connect the dots! 🚀
        </Button>
        <p className="text-sm text-muted">
          {reflection.complexity === "complex"
            ? "This one's meaty. Deep research might take a couple of minutes."
            : "Usually takes under a minute."}
        </p>
      </div>
    </div>
  );
}
