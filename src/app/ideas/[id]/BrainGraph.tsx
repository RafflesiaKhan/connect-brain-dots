"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Peep } from "@/components/Peep";
import { KIND_STYLE } from "@/components/ui";
import type { AvatarConfig } from "@/lib/avatar";
import type { Consequence } from "@/lib/types";

/** Line + signal colors per kind (stronger than the pastel bubble fills). */
const KIND_LINE: Record<string, string> = {
  constraint: "#ff9a76",
  worry: "#ff7eb6",
  preference: "#6cb8ff",
  goal: "#2cc3a5",
  unknown: "#e0b400",
};

type Layout = {
  w: number;
  h: number;
  head: { x: number; y: number };
  peep: { x: number; y: number; size: number };
  spots: { x: number; y: number; maxW: number }[];
  mobile: boolean;
};

function layout(w: number, n: number): Layout {
  if (w < 640) {
    // Phone: persona on top, thoughts branch downward in a column.
    const size = 120;
    const top = 16;
    const spacing = 78;
    const firstY = top + size + 70;
    return {
      w,
      h: firstY + Math.max(n, 1) * spacing,
      head: { x: w / 2, y: top + size * 0.32 },
      peep: { x: w / 2, y: top + size / 2, size },
      spots: Array.from({ length: n }, (_, i) => ({ x: w / 2, y: firstY + i * spacing, maxW: w - 8 })),
      mobile: true,
    };
  }
  // Desktop: persona in the middle, thoughts orbit on an ellipse.
  const h = 560 + Math.max(0, n - 8) * 45;
  const size = Math.min(170, w * 0.17);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 130;
  const ry = h / 2 - 50;
  // Start at the top and walk clockwise; offset by half a step so no bubble sits
  // directly on top of (or under) the persona.
  const spots = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), maxW: 230 };
  });
  return { w, h, head: { x: cx, y: cy - size * 0.18 }, peep: { x: cx, y: cy, size }, spots, mobile: false };
}

/** Curved "synapse" from the brain to a thought. */
function synapse(from: { x: number; y: number }, to: { x: number; y: number }, i: number) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = (i % 2 ? 1 : -1) * 0.18;
  return `M ${from.x} ${from.y} Q ${mx - dy * bend} ${my + dx * bend} ${to.x} ${to.y}`;
}

export function BrainGraph({
  items,
  avatar,
  onRemove,
}: {
  items: Consequence[];
  avatar: AvatarConfig;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = w ? layout(w, items.length) : null;

  return (
    <div ref={ref} className="relative w-full overflow-clip" style={{ height: L?.h ?? 560 }}>
      {L && (
        <>
          {/* synapses */}
          <svg className="pointer-events-none absolute inset-0" width={L.w} height={L.h} aria-hidden>
            <AnimatePresence>
              {items.map((c, i) => {
                const d = synapse(L.head, L.spots[i], i);
                const color = KIND_LINE[c.kind] ?? "#c9b8ff";
                return (
                  <motion.g key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeOpacity={0.55}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1, d }}
                      exit={{ pathLength: 0 }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                    />
                    {/* little thoughts travelling from the brain */}
                    {[0, 1].map((k) => (
                      <circle key={k} r={3.5} fill={color}>
                        <animateMotion dur={`${2.6 + (i % 3) * 0.5}s`} begin={`${k * 1.3 + i * 0.2}s`} repeatCount="indefinite" path={d} />
                      </circle>
                    ))}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>

          {/* the persona and their brain */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: L.peep.x, top: L.peep.y, width: L.peep.size, height: L.peep.size }}
          >
            <motion.div
              className="absolute inset-[-18%] rounded-full bg-gradient-to-br from-lilac via-pink/60 to-sky/70"
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-violet/25 blur-md"
              style={{ top: "4%", width: "52%", height: "30%" }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <div className="relative h-full w-full rounded-full bg-white/80 p-2 shadow-pop">
              <Peep config={avatar} size={L.peep.size - 16} mood="thinking" ring={false} />
            </div>
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-xs font-bold text-violet shadow-soft">
              🧠 your brain right now
            </span>
          </div>

          {/* thoughts */}
          <AnimatePresence>
            {items.map((c, i) => {
              const s = L.spots[i];
              return (
                <motion.div
                  key={c.id}
                  className="absolute"
                  initial={{ left: L.head.x, top: L.head.y, opacity: 0, scale: 0.3 }}
                  animate={{ left: s.x, top: s.y, opacity: 1, scale: 1 }}
                  exit={{ left: L.head.x, top: L.head.y, opacity: 0, scale: 0.3 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16, delay: i * 0.08 }}
                >
                  {/* Centering lives on a plain div: Motion's transforms would override it. */}
                  <div className="-translate-x-1/2 -translate-y-1/2" style={L.mobile ? { width: s.maxW } : { width: "max-content", maxWidth: s.maxW }}>
                    <motion.div
                      className={`flex items-start gap-2 rounded-2xl ${KIND_STYLE[c.kind].bg} py-2 pl-3 pr-2 shadow-soft`}
                      animate={L.mobile ? undefined : { y: [0, -5, 0] }}
                      transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                    >
                      <span aria-hidden className="text-lg leading-6">
                        {c.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug">{c.text}</p>
                        <span className="mt-1 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                          {KIND_STYLE[c.kind].label}
                          {c.userAdded && " · you"}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove "${c.text}"`}
                        onClick={() => onRemove(c.id)}
                        className="h-6 w-6 shrink-0 cursor-pointer rounded-full bg-white/70 text-xs font-bold text-ink-soft opacity-60 transition hover:bg-white hover:opacity-100"
                      >
                        ✕
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {items.length === 0 && (
            <p className="absolute inset-x-0 bottom-6 text-center text-muted">
              All popped! Add your own thoughts below, or just let me run with the idea.
            </p>
          )}
        </>
      )}
    </div>
  );
}
