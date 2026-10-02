"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo, useState } from "react";
import { KIND_STYLE } from "@/components/ui";
import type { IdeaResult } from "@/lib/types";
import { optionColor } from "./shared";

type Data = { label: string; sub?: string; color?: string; tone?: string; winner?: boolean; title?: string };

const hidden = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 };
const Hs = () => (
  <>
    <Handle type="target" position={Position.Top} style={{ ...hidden, top: "50%", left: "50%" }} />
    <Handle type="source" position={Position.Top} style={{ ...hidden, top: "50%", left: "50%" }} />
  </>
);

function IdeaNode({ data }: NodeProps<Node<Data>>) {
  return (
    <div className="relative">
      <div className="absolute inset-0 animate-ping rounded-full bg-violet/20" />
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-violet p-4 text-center font-display text-sm font-semibold leading-tight text-white shadow-pop">
        {data.label}
      </div>
      <Hs />
    </div>
  );
}

function BubbleNode({ data }: NodeProps<Node<Data>>) {
  return (
    <div
      title={data.title}
      className={`max-w-[190px] rounded-2xl px-3 py-2 text-xs font-semibold shadow-soft ${data.tone ?? "bg-white"}`}
    >
      {data.label}
      {data.sub && <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">{data.sub}</div>}
      <Hs />
    </div>
  );
}

function OptionNode({ data }: NodeProps<Node<Data>>) {
  return (
    <div
      className={`relative w-[200px] rounded-3xl border-[3px] bg-white px-4 py-3 text-center shadow-soft ${
        data.winner ? "shadow-pop" : ""
      }`}
      style={{ borderColor: data.color }}
    >
      {data.winner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-butter px-2 py-0.5 text-[10px] font-bold">
          🏆 TOP PICK
        </div>
      )}
      <div className="font-display text-sm font-semibold leading-tight">{data.label}</div>
      <div className="mt-1 text-xs font-bold" style={{ color: data.color }}>
        {data.sub}
      </div>
      <Hs />
    </div>
  );
}

function EvidenceNode({ data }: NodeProps<Node<Data>>) {
  return (
    <div title={data.title} className="group relative">
      <div className={`h-5 w-5 rounded-full border-2 border-white shadow-soft ${data.tone}`} />
      <div className="pointer-events-none absolute left-1/2 top-6 z-10 w-48 -translate-x-1/2 rounded-xl bg-white p-2 text-[11px] opacity-0 shadow-soft transition group-hover:opacity-100">
        {data.label}
      </div>
      <Hs />
    </div>
  );
}

const nodeTypes = { idea: IdeaNode, bubble: BubbleNode, option: OptionNode, evidence: EvidenceNode };

const EV_TONE: Record<string, string> = {
  research: "bg-[#7c5cff]",
  experience: "bg-[#ff9a76]",
  fact: "bg-[#2cc3a5]",
  profile: "bg-[#ffc93c]",
  "common-sense": "bg-[#c9c3d8]",
};

const polar = (r: number, deg: number) => ({ x: r * Math.cos((deg * Math.PI) / 180), y: r * Math.sin((deg * Math.PI) / 180) });
const spread = (n: number, from: number, to: number) =>
  Array.from({ length: n }, (_, i) => (n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1)));

/** Radial "brain dots" network: considerations on the left, options on the right, evidence on the rim. */
export function IdeaMap({ result, title }: { result: IdeaResult; title: string }) {
  const [layers, setLayers] = useState({ considerations: true, evidence: true, conflicts: true });

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<Data>[] = [{ id: "idea", type: "idea", position: { x: 0, y: 0 }, data: { label: title } }];
    const edges: Edge[] = [];
    const soft = { stroke: "#d9cffc", strokeWidth: 1.5 };

    const opts = result.options;
    const optAngles = spread(opts.length, -55, 55);
    opts.forEach((o, i) => {
      nodes.push({
        id: o.id,
        type: "option",
        position: polar(310, optAngles[i]),
        data: { label: `${o.emoji} ${o.name}`, sub: `${o.total}/100`, color: optionColor(o.id), winner: o.rank === 1 },
      });
      edges.push({
        id: `idea-${o.id}`,
        source: "idea",
        target: o.id,
        animated: o.rank === 1,
        style: o.rank === 1 ? { stroke: optionColor(o.id), strokeWidth: 3 } : soft,
      });
    });

    if (layers.considerations) {
      const cAngles = spread(result.consequences.length, 130, 230);
      result.consequences.forEach((c, i) => {
        nodes.push({
          id: c.id,
          type: "bubble",
          position: polar(270, cAngles[i]),
          data: { label: `${c.emoji} ${c.text}`, sub: KIND_STYLE[c.kind]?.label, tone: KIND_STYLE[c.kind]?.bg },
        });
        edges.push({ id: `idea-${c.id}`, source: "idea", target: c.id, style: soft });
      });
      if (layers.conflicts) {
        for (const o of opts) {
          for (const cid of o.addresses)
            edges.push({
              id: `${cid}-${o.id}-ok`,
              source: cid,
              target: o.id,
              style: { stroke: "#2cc3a5", strokeWidth: 1.5, opacity: 0.55 },
            });
          for (const cid of o.violates)
            edges.push({
              id: `${cid}-${o.id}-x`,
              source: cid,
              target: o.id,
              label: "✕",
              labelStyle: { fill: "#d03b3b", fontWeight: 700 },
              labelBgStyle: { fill: "#fff" },
              style: { stroke: "#d03b3b", strokeWidth: 1.5, strokeDasharray: "6 5" },
            });
        }
      }
    }

    if (layers.evidence) {
      const eAngles = spread(result.evidence.length, -75, 75);
      result.evidence.forEach((e, i) => {
        const src = result.sources.find((s) => s.id === e.sourceId);
        nodes.push({
          id: e.id,
          type: "evidence",
          position: polar(500, eAngles[i]),
          data: { label: `${e.claim}${src ? ` (${src.title})` : ""}`, tone: EV_TONE[e.kind], title: e.claim },
        });
        for (const o of opts) {
          if (o.scores.some((s) => s.evidenceIds.includes(e.id)))
            edges.push({
              id: `${e.id}-${o.id}`,
              source: e.id,
              target: o.id,
              style: { stroke: "#c9b8ff", strokeWidth: 1, strokeDasharray: "2 4" },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#c9b8ff", width: 12, height: 12 },
            });
        }
      });
    }
    return { nodes, edges };
  }, [result, title, layers]);

  const toggle = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {(
          [
            ["considerations", "🫧 Considerations"],
            ["conflicts", "⚡ Fits & conflicts"],
            ["evidence", "🔬 Evidence"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            aria-pressed={layers[k]}
            className={`cursor-pointer rounded-full border-2 px-3 py-1 font-semibold transition ${
              layers[k] ? "border-violet bg-lilac/50" : "border-line bg-white text-muted"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5 bg-[#2cc3a5]" /> fits
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 border-t-2 border-dashed border-[#d03b3b]" /> conflicts
          </span>
          {Object.entries(EV_TONE).map(([k, cls]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} /> {k}
            </span>
          ))}
        </span>
      </div>
      <div className="h-[560px] overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white to-lilac/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodeOrigin={[0.5, 0.5]}
          fitViewOptions={{ padding: 0.06 }}
          minZoom={0.2}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e4dbff" gap={22} size={2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
