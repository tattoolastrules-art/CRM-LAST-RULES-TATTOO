"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, List, Workflow as WorkflowIcon, Zap, MessageSquare, GitBranch, Database, UserCog, Sparkles, MessageSquareQuote } from "lucide-react";
import { flowNodeTypes } from "./flow-nodes";
import FlowWizard from "./FlowWizard";
import IceBreakersPanel from "./IceBreakersPanel";
import { FLOWS, type FlowDef, type FlowNode as FNode } from "@/lib/flows";
import { customToFlowDef, type CustomFlow } from "@/lib/custom-flows-def";

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

// Colores/íconos por tipo de nodo (vista Lista, apta para celular)
const KIND_META: Record<string, { label: string; color: string; Icon: typeof Zap }> = {
  trigger: { label: "Disparador", color: "#5B8CB7", Icon: Zap },
  message: { label: "Mensaje", color: "#25D366", Icon: MessageSquare },
  choice: { label: "Decisión", color: "#C5A059", Icon: GitBranch },
  action: { label: "Acción", color: "#8E7CC3", Icon: Database },
  handoff: { label: "Continuar", color: "#D8A24A", Icon: UserCog },
  ai: { label: "NOVA · IA", color: "#37C7C0", Icon: Sparkles },
};

export default function FlowBuilder() {
  const [custom, setCustom] = useState<CustomFlow[]>([]);
  const [activeId, setActiveId] = useState(FLOWS[0].id);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [ov, setOv] = useState<Overrides>({});
  const [edit, setEdit] = useState<{ nodeId: string; title: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // null = aún no se decide (evita montar ReactFlow en celular y tirarlo un frame después)
  const [mode, setMode] = useState<"canvas" | "list" | null>(null);
  const [wizard, setWizard] = useState<{ open: boolean; initial: CustomFlow | null }>({ open: false, initial: null });
  const [plantillas, setPlantillas] = useState(false);

  // En celular la vista Lista es mucho más cómoda que el lienzo
  useEffect(() => {
    setMode(window.innerWidth < 640 ? "list" : "canvas");
  }, []);

  const allFlows: FlowDef[] = useMemo(
    () => [...FLOWS, ...custom.map((c, i) => customToFlowDef(c, i))],
    [custom],
  );
  const flow = allFlows.find((f) => f.id === activeId) ?? allFlows[0];
  const activeCustom = custom.find((c) => c.id === activeId) || null;

  useEffect(() => {
    fetch("/api/flows")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setOv(d.overrides || {});
        setCustom(d.custom || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const g = toGraph(flow, ov);
    setNodes(g.nodes);
    setEdges(g.edges);
    setEdit(null);
  }, [activeId, flow, ov, setNodes, setEdges]);

  const openEditor = useCallback(
    (d: { kind?: string; title?: string; text?: string }, nodeId: string) => {
      if (activeCustom) {
        // Los flujos creados con el asistente se editan con su mismo asistente
        setWizard({ open: true, initial: activeCustom });
        return;
      }
      if (d.kind === "message") {
        setEdit({ nodeId, title: d.title || "Mensaje", text: d.text || "" });
      }
    },
    [activeCustom],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      openEditor(node.data as unknown as { kind?: string; title?: string; text?: string }, node.id);
    },
    [openEditor],
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

  async function deleteCustom(cf: CustomFlow) {
    if (!confirm(`¿Borrar el flujo “${cf.name}”? Ana dejará de responderlo.`)) return;
    const r = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "custom-delete", id: cf.id }),
    });
    if (r.ok) {
      const d = await r.json();
      setCustom(d.custom || []);
      if (activeId === cf.id) setActiveId(FLOWS[0].id);
    } else {
      alert("Solo administradores pueden borrar flujos.");
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

  // Nodos con el texto editado aplicado (para la vista Lista)
  const listNodes: FNode[] = flow.nodes.map((n) => ({ ...n, text: ov[flow.id]?.[n.id] ?? n.text }));

  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-line/60 p-2 md:flex">
        <button
          onClick={() => setWizard({ open: true, initial: null })}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-2 text-xs font-semibold text-gold-soft transition hover:bg-gold/20"
        >
          <Plus size={14} /> Crear flujo
        </button>
        <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-widest text-bone-dim">
          Flujos ({allFlows.length})
        </div>
        {allFlows.map((f) => (
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
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${f.code.startsWith("P") ? "bg-[#37C7C0]/15 text-[#37C7C0]" : "bg-gold/15 text-gold"}`}>
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
            className="max-w-[48vw] rounded-lg border border-line bg-navy-card px-2 py-1 text-xs text-bone outline-none md:hidden"
          >
            {allFlows.map((f) => (
              <option key={f.id} value={f.id}>{f.code} · {f.name}</option>
            ))}
          </select>
          <button
            onClick={() => setWizard({ open: true, initial: null })}
            className="flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold-soft md:hidden"
          >
            <Plus size={12} /> Crear
          </button>
          <span className="hidden rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold md:inline">{flow.code}</span>
          <span className="hidden truncate font-display text-sm text-bone md:inline">{flow.name}</span>
          <span className="hidden min-w-0 truncate text-[11px] text-bone-dim lg:inline">· {flow.desc}</span>

          <div className="ml-auto flex items-center gap-1.5">
            {activeCustom && (
              <>
                <button
                  onClick={() => setWizard({ open: true, initial: activeCustom })}
                  title="Editar este flujo con el asistente"
                  className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] text-bone-dim transition hover:text-bone"
                >
                  <Pencil size={12} /> <span className="hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => deleteCustom(activeCustom)}
                  title="Borrar este flujo"
                  className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] text-bone-dim transition hover:text-red-400"
                >
                  <Trash2 size={12} /> <span className="hidden sm:inline">Borrar</span>
                </button>
              </>
            )}
            <button
              onClick={() => setPlantillas(true)}
              title="Preguntas listas que ven los clientes al abrir el chat (Instagram, Messenger y WhatsApp)"
              className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] text-bone-dim transition hover:text-bone"
            >
              <MessageSquareQuote size={12} /> <span className="hidden sm:inline">Plantillas</span>
            </button>
            {/* Lista ↔ Lienzo */}
            <div className="flex overflow-hidden rounded-lg border border-line">
              <button
                onClick={() => setMode("list")}
                title="Vista lista (cómoda en celular)"
                className={`flex items-center gap-1 px-2 py-1 text-[11px] transition ${mode === "list" ? "bg-gold/15 text-gold" : "text-bone-dim hover:text-bone"}`}
              >
                <List size={12} /> Lista
              </button>
              <button
                onClick={() => setMode("canvas")}
                title="Vista lienzo (cajitas conectadas)"
                className={`flex items-center gap-1 px-2 py-1 text-[11px] transition ${mode === "canvas" ? "bg-gold/15 text-gold" : "text-bone-dim hover:text-bone"}`}
              >
                <WorkflowIcon size={12} /> Lienzo
              </button>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
        {mode === null ? (
          <div className="flex h-full items-center justify-center text-sm text-bone-dim">…</div>
        ) : mode === "list" ? (
          /* Vista LISTA: los pasos del flujo en orden, como tarjetas (ideal celular) */
          <div className="h-full overflow-y-auto px-3 py-3">
            <div className="mx-auto max-w-xl">
              <div className="mb-2 text-[11px] text-bone-dim">
                {activeCustom
                  ? "✏️ Toca cualquier tarjeta para editar este flujo con el asistente"
                  : "✏️ Toca una tarjeta verde de Mensaje para editar lo que responde Ana"}
              </div>
              {listNodes.map((n, i) => {
                const meta = KIND_META[n.kind] ?? KIND_META.message;
                const Icon = meta.Icon;
                const editable = activeCustom || n.kind === "message";
                return (
                  <div key={n.id} className="relative">
                    {i > 0 && <div className="ml-5 h-3 w-px bg-line" />}
                    <button
                      onClick={() => editable && openEditor(n, n.id)}
                      disabled={!editable}
                      className={`w-full rounded-xl border bg-[#1b2336] p-0 text-left ${editable ? "transition hover:brightness-110" : "cursor-default"}`}
                      style={{ borderColor: meta.color + "55" }}
                    >
                      <div
                        className="flex items-center gap-1.5 rounded-t-xl px-3 py-1.5 text-[11px] font-semibold tracking-wide"
                        style={{ background: meta.color + "22", color: meta.color }}
                      >
                        <Icon size={13} />
                        {n.title || meta.label}
                        {editable && n.kind === "message" && <Pencil size={11} className="ml-auto opacity-60" />}
                      </div>
                      <div className="px-3 py-2.5">
                        {n.text && <div className="text-[12.5px] leading-snug text-bone">{n.text}</div>}
                        {!!n.options?.length && (
                          <div className={n.text ? "mt-2 flex flex-wrap gap-1.5" : "flex flex-wrap gap-1.5"}>
                            {n.options.map((o, j) => (
                              <span key={j} className="rounded-md border border-gold/30 bg-[#0f1522] px-2 py-1 text-[11px] text-gold-soft">
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
        )}

        {/* Editor del mensaje seleccionado */}
        {edit && (
          <div className="glass absolute inset-x-0 bottom-0 z-20 rounded-t-xl p-3 sm:inset-x-3 sm:bottom-3 sm:rounded-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-bone">✏️ {edit.title} <span className="text-bone-dim">· esto es lo que Ana responde</span></span>
              <button onClick={() => setEdit(null)} className="text-bone-dim hover:text-bone">✕</button>
            </div>
            <textarea
              value={edit.text}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })}
              rows={4}
              className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="hidden text-[10px] text-bone-dim/70 sm:inline">Los cambios aplican de una en las respuestas de Ana · Para flujos nuevos usa “Crear flujo”</span>
              <button onClick={saveEdit} disabled={saving} className="ml-auto shrink-0 rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {wizard.open && (
        <FlowWizard
          initial={wizard.initial}
          onClose={() => setWizard({ open: false, initial: null })}
          onSaved={(list) => {
            setCustom(list);
            if (!wizard.initial && list.length) setActiveId(list[list.length - 1].id);
          }}
        />
      )}
      {plantillas && <IceBreakersPanel onClose={() => setPlantillas(false)} />}
    </div>
  );
}
