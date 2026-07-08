"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { flowNodeTypes } from "./flow-nodes";
import { FLOWS, type FlowDef } from "@/lib/flows";

type Overrides = Record<string, Record<string, string>>;

function toGraph(flow: FlowDef, ov: Overrides): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = flow.nodes.map((n) => ({
    id: n.id,
    type: "flowbox",
    position: { x: n.x, y: n.y },
    data: { ...n, text: ov[flow.id]?.[n.id] ?? n.text } as unknown as Record<string, unknown>,
  }));
  const edges: Edge[] = flow.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    sourceHandle: e.fromOption != null ? `opt-${e.fromOption}` : "out",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#C5A059aa", strokeWidth: 1.6 },
  }));
  return { nodes, edges };
}

export default function FlowBuilder() {
  const [activeId, setActiveId] = useState(FLOWS[0].id);
  const flow = FLOWS.find((f) => f.id === activeId)!;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [ov, setOv] = useState<Overrides>({});
  const [edit, setEdit] = useState<{ nodeId: string; title: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/flows").then((r) => (r.ok ? r.json() : null)).then((d) => d && setOv(d.overrides || {})).catch(() => {});
  }, []);

  useEffect(() => {
    const g = toGraph(flow, ov);
    setNodes(g.nodes);
    setEdges(g.edges);
    setEdit(null);
  }, [activeId, flow, ov, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const d = node.data as unknown as { kind?: string; title?: string; text?: string };
      if (d.kind === "message") {
        setEdit({ nodeId: node.id, title: d.title || "Mensaje", text: d.text || "" });
      }
    },
    [],
  );

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    try {
      const r = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId: flow.id, nodeId: edit.nodeId, text: edit.text }),
      });
      if (r.ok) {
        const d = await r.json();
        setOv(d.overrides || {});
        setEdit(null);
      } else {
        alert("Solo administradores pueden editar los mensajes.");
      }
    } finally {
      setSaving(false);
    }
  }

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...c, type: "smoothstep", animated: true, style: { stroke: "#C5A059aa", strokeWidth: 1.6 } },
          eds,
        ),
      ),
    [setEdges],
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-line/60 p-2 md:block">
        <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-widest text-bone-dim">
          Flujos ({FLOWS.length})
        </div>
        {FLOWS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveId(f.id)}
            className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left transition ${
              f.id === activeId
                ? "gold-ring bg-[#1b2336]"
                : "hover:bg-[#161d2e]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                {f.code}
              </span>
              <span className="truncate text-xs font-medium text-bone">
                {f.name}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[10px] text-bone-dim">
              {f.desc}
            </div>
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra del flujo activo (fuera del lienzo: ya no se cruza con los nodos) */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-line/60 bg-navy-soft/70 px-3 py-2 backdrop-blur">
          {/* Selector en celular (la lista lateral se oculta) */}
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="max-w-[60vw] rounded-lg border border-line bg-navy-card px-2 py-1 text-xs text-bone outline-none md:hidden"
          >
            {FLOWS.map((f) => (
              <option key={f.id} value={f.id}>{f.code} · {f.name}</option>
            ))}
          </select>
          <span className="hidden rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold md:inline">{flow.code}</span>
          <span className="hidden truncate font-display text-sm text-bone md:inline">{flow.name}</span>
          <span className="hidden min-w-0 truncate text-[11px] text-bone-dim lg:inline">· {flow.desc}</span>
          <span className="ml-auto rounded-full border border-line/60 px-2 py-0.5 text-[10px] text-bone-dim">
            ✏️ Toca un mensaje verde para editarlo
          </span>
        </div>

        <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={flowNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
          minZoom={0.3}
          maxZoom={1.6}
          nodesConnectable
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#2a3346" />
          <MiniMap
            pannable
            zoomable
            className="!hidden !bg-[#0f1522] sm:!block"
            maskColor="rgba(15,21,34,0.7)"
            nodeColor="#C5A059"
          />
          <Controls showInteractive={false} className="!border-line !bg-[#1b2336]" />
        </ReactFlow>

        {/* Editor del mensaje seleccionado */}
        {edit && (
          <div className="glass absolute inset-x-3 bottom-3 z-20 rounded-xl p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-bone">✏️ {edit.title} <span className="text-bone-dim">· esto es lo que Ana responde</span></span>
              <button onClick={() => setEdit(null)} className="text-bone-dim hover:text-bone">✕</button>
            </div>
            <textarea
              value={edit.text}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-bone-dim/70">Los cambios aplican de una en las respuestas de Ana · Crear flujos o ramas nuevas requiere desarrollo (PRODY-G)</span>
              <button onClick={saveEdit} disabled={saving} className="shrink-0 rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
