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

function toGraph(flow: FlowDef): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = flow.nodes.map((n) => ({
    id: n.id,
    type: "flowbox",
    position: { x: n.x, y: n.y },
    data: n as unknown as Record<string, unknown>,
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

  useEffect(() => {
    const g = toGraph(flow);
    setNodes(g.nodes);
    setEdges(g.edges);
  }, [activeId, flow, setNodes, setEdges]);

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
        </div>

        <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
        </div>
      </div>
    </div>
  );
}
