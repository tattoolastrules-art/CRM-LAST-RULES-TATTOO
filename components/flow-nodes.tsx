"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, MessageSquare, GitBranch, Database, UserCog, Sparkles } from "lucide-react";
import type { FlowNode as FNode } from "@/lib/flows";

const HEAD: Record<
  string,
  { label: string; color: string; Icon: typeof Zap }
> = {
  trigger: { label: "Disparador", color: "#5B8CB7", Icon: Zap },
  message: { label: "Mensaje", color: "#25D366", Icon: MessageSquare },
  choice: { label: "Decisión", color: "#C5A059", Icon: GitBranch },
  action: { label: "Acción", color: "#8E7CC3", Icon: Database },
  handoff: { label: "Continuar", color: "#D8A24A", Icon: UserCog },
  ai: { label: "ANOVA · IA", color: "#37C7C0", Icon: Sparkles },
};

const dot = "!h-3 !w-3 !rounded-full !bg-gold !border-2 !border-[#0f1522]";

export function FlowBox({ data }: NodeProps) {
  const d = data as unknown as FNode;
  const h = HEAD[d.kind] ?? HEAD.message;
  const Icon = h.Icon;
  const hasOptions = !!d.options?.length;

  return (
    <div
      className="w-[236px] overflow-hidden rounded-xl border bg-[#1b2336] shadow-lg"
      style={{ borderColor: h.color + "55" }}
    >
      {d.kind !== "trigger" && (
        <Handle type="target" position={Position.Left} className={dot} />
      )}

      <div
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-wide"
        style={{ background: h.color + "22", color: h.color }}
      >
        <Icon size={13} />
        {d.title || h.label}
      </div>

      <div className="px-3 py-2.5">
        {d.text && (
          <div className="text-[11.5px] leading-snug text-bone">{d.text}</div>
        )}

        {hasOptions && (
          <div className={d.text ? "mt-2.5 space-y-1.5" : "space-y-1.5"}>
            {d.options!.map((o, i) => (
              <div
                key={i}
                className="relative rounded-md border border-gold/30 bg-[#0f1522] px-2 py-1 text-[11px] text-gold-soft"
              >
                {o}
                <Handle
                  id={`opt-${i}`}
                  type="source"
                  position={Position.Right}
                  className={dot}
                  style={{ right: -16, top: "50%" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasOptions && d.kind !== "handoff" && (
        <Handle id="out" type="source" position={Position.Right} className={dot} />
      )}
    </div>
  );
}

export const flowNodeTypes = { flowbox: FlowBox };
