"use client";

import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { useMemo } from "react";
import { KIND_STYLE } from "@/components/ui";
import type { IdeaResult } from "@/lib/types";
import { optionColor } from "./shared";

type Data = { label: string; sub?: string; tone?: string; color?: string; strong?: boolean; head?: boolean };

function Box({ data }: NodeProps<Node<Data>>) {
  if (data.head)
    return <div className="w-[220px] text-center text-xs font-bold uppercase tracking-widest text-muted">{data.label}</div>;
  return (
    <div
      className={`w-[220px] rounded-2xl border-2 px-3 py-2 text-xs shadow-soft ${data.tone ?? "bg-white"} ${
        data.strong ? "shadow-pop" : ""
      }`}
      style={{ borderColor: data.color ?? "transparent" }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#c9b8ff", border: 0 }} />
      <div className="font-semibold leading-snug">{data.label}</div>
      {data.sub && <div className="mt-0.5 text-[11px] text-ink-soft">{data.sub}</div>}
      <Handle type="source" position={Position.Right} style={{ background: "#c9b8ff", border: 0 }} />
    </div>
  );
}

const nodeTypes = { box: Box };
const COL = 300;
const ROW = 78;

/**
 * The "architecture" of the decision, left to right:
 * idea → considerations → criteria (weighted) → options (scored) → decision.
 */
export function Blueprint({ result, title }: { result: IdeaResult; title: string }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node<Data>[] = [];
    const edges: Edge[] = [];
    const cols = [
      { head: "Idea", n: 1 },
      { head: "Considerations", n: result.consequences.length },
      { head: "Criteria", n: result.criteria.length },
      { head: "Options", n: result.options.length },
      { head: "Decision", n: 1 },
    ];
    const tallest = Math.max(...cols.map((c) => c.n));
    const y = (i: number, n: number) => ((tallest - n) * ROW) / 2 + i * ROW + 40;
    cols.forEach((c, ci) => nodes.push({ id: `h${ci}`, type: "box", position: { x: ci * COL, y: -10 }, data: { label: c.head, head: true }, draggable: false }));

    nodes.push({ id: "idea", type: "box", position: { x: 0, y: y(0, 1) }, data: { label: title, tone: "bg-lilac", strong: true } });

    result.consequences.forEach((c, i) => {
      nodes.push({
        id: c.id,
        type: "box",
        position: { x: COL, y: y(i, result.consequences.length) },
        data: { label: `${c.emoji} ${c.text}`, sub: KIND_STYLE[c.kind]?.label, tone: KIND_STYLE[c.kind]?.bg },
      });
      edges.push({ id: `idea-${c.id}`, source: "idea", target: c.id, style: { stroke: "#d9cffc" } });
    });

    result.criteria.forEach((k, i) => {
      nodes.push({
        id: k.id,
        type: "box",
        position: { x: COL * 2, y: y(i, result.criteria.length) },
        data: { label: k.name, sub: `Weight ${Math.round(k.weight * 100)}%`, tone: "bg-white" },
      });
      // A consideration feeds a criterion when any score on that criterion cites it.
      const linked = new Set(
        result.options.flatMap((o) => o.scores.filter((s) => s.criterionId === k.id).flatMap((s) => s.consequenceIds)),
      );
      for (const cid of linked) edges.push({ id: `${cid}-${k.id}`, source: cid, target: k.id, style: { stroke: "#d9cffc" } });
      if (!linked.size) edges.push({ id: `idea-${k.id}`, source: "idea", target: k.id, style: { stroke: "#ece5fb", strokeDasharray: "4 4" } });
    });

    const winner = result.options.find((o) => o.rank === 1)!;
    result.options.forEach((o, i) => {
      nodes.push({
        id: o.id,
        type: "box",
        position: { x: COL * 3, y: y(i, result.options.length) },
        data: { label: `${o.emoji} ${o.name}`, sub: `#${o.rank} · ${o.total}/100`, color: optionColor(o.id), strong: o.rank === 1 },
      });
      for (const s of o.scores) {
        // Edge thickness = how much this criterion contributed to the option's total.
        const k = result.criteria.find((c) => c.id === s.criterionId);
        const contrib = (k?.weight ?? 0) * s.score;
        edges.push({
          id: `${s.criterionId}-${o.id}`,
          source: s.criterionId,
          target: o.id,
          style: { stroke: optionColor(o.id), strokeWidth: 0.5 + contrib * 1.6, opacity: o.rank === 1 ? 0.75 : 0.3 },
        });
      }
      edges.push({
        id: `${o.id}-decision`,
        source: o.id,
        target: "decision",
        animated: o.rank === 1,
        label: o.rank === 1 ? "go" : o.violates.length ? "conflicts" : "backup",
        labelStyle: { fontSize: 10, fontWeight: 700, fill: o.rank === 1 ? "#2b2440" : "#958eaa" },
        style:
          o.rank === 1
            ? { stroke: optionColor(o.id), strokeWidth: 3 }
            : { stroke: "#d6d0e4", strokeDasharray: "5 5" },
      });
    });

    nodes.push({
      id: "decision",
      type: "box",
      position: { x: COL * 4, y: y(0, 1) },
      data: {
        label: `${winner.emoji} ${winner.name}`,
        sub: `Confidence ${result.confidence}%`,
        tone: "bg-mint",
        color: optionColor(winner.id),
        strong: true,
      },
    });
    return { nodes, edges };
  }, [result, title]);

  return (
    <div className="h-[480px] overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-white via-white to-mint/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.2}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ece5fb" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
