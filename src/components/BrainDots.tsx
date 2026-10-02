"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#7c5cff", "#ff9a76", "#2cc3a5", "#ffc93c", "#ff7eb6", "#6cb8ff"];

type Dot = { x: number; y: number; vx: number; vy: number; r: number; c: string; phase: number };

/**
 * Drifting pastel "brain dots" that link up when close and lean toward the cursor.
 * `energy` speeds things up while the agent is thinking.
 */
export function BrainDots({
  density = 0.00009,
  energy = 1,
  className = "",
}: {
  density?: number;
  energy?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(energy);
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(18, Math.min(110, Math.round(w * h * density)));
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 2 + Math.random() * 3.5,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const frame = (t: number) => {
      const e = energyRef.current;
      ctx.clearRect(0, 0, w, h);
      const linkDist = 120;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        if (!reduce) {
          a.x += a.vx * e;
          a.y += a.vy * e;
          const dx = mouse.x - a.x;
          const dy = mouse.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 160 * 160) {
            a.x += dx * 0.0025;
            a.y += dy * 0.0025;
          }
          if (a.x < -10) a.x = w + 10;
          if (a.x > w + 10) a.x = -10;
          if (a.y < -10) a.y = h + 10;
          if (a.y > h + 10) a.y = -10;
        }
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            ctx.strokeStyle = a.c;
            ctx.globalAlpha = (1 - d / linkDist) * 0.28;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        const pulse = reduce ? 1 : 1 + Math.sin(t / 600 + d.phase) * 0.18 * e;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ev.clientX - rect.left;
      mouse.y = ev.clientY - rect.top;
    };
    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
