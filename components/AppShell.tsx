"use client";

import { useEffect, useState } from "react";
import {
  Workflow,
  MessageCircleMore,
  LayoutDashboard,
  CalendarDays,
  Globe,
  Users,
  Inbox,
  Megaphone,
  Monitor,
  Moon,
  Sun,
  Cog,
  X,
  Bell,
  BellOff,
  LogOut,
} from "lucide-react";
import SistemaAdmin from "./SistemaAdmin";
import BootSequence from "./BootSequence";
import { Logo } from "./Logo";
import FlowBuilder from "./FlowBuilder";
import OmniInbox from "./OmniInbox";
import CrmDashboard from "./CrmDashboard";
import Agenda from "./Agenda";
import SiteAdmin from "./SiteAdmin";
import UsersAdmin from "./UsersAdmin";
import ReservasAdmin from "./ReservasAdmin";
import Planner from "./Planner";
import Login from "./Login";

type View = "flujos" | "omni" | "crm" | "reservas" | "planner" | "agenda" | "sitio" | "usuarios" | "sistema";

// Insinuaciones contextuales: aparecen en el módulo donde el usuario podría
// querer algo más (cosas que requieren desarrollo PRODY-G)
const HINTS: Partial<Record<string, string>> = {
  flujos: "¿Te gustaría crear flujos nuevos o ramas completas? Eso ya es desarrollo… PRODY-G puede ampliarlo",
  omni: "¿Notas de voz enviadas desde aquí y transcripción automática de audios? Se puede desarrollar",
  crm: "¿Un reporte semanal automático de leads y cierres al WhatsApp del equipo? Se puede montar",
  reservas: "¿Que Ana responda audios transcribiéndolos y envíe fotos del portafolio sola? Es desarrollable",
  planner: "¿Publicación automática de estas campañas en IG/FB con un clic? Se puede construir",
  agenda: "¿Recordatorios de cita automáticos por WhatsApp 24h antes? Reducirían inasistencias",
  sitio: "¿Un blog con SEO automático para salir en Google? El sitio está listo para crecer",
};
type Theme = "normal" | "dark" | "light";
const THEME_META: Record<Theme, { Icon: typeof Monitor; label: string }> = {
  normal: { Icon: Monitor, label: "Normal" },
  dark: { Icon: Moon, label: "Oscuro" },
  light: { Icon: Sun, label: "Claro" },
};
type AuthUser = { email: string; role: string; name: string; owner?: boolean } | null;

const ITEMS = [
  { id: "flujos" as const, label: "Flujos", Icon: Workflow },
  { id: "omni" as const, label: "Omnicanal", Icon: MessageCircleMore },
  { id: "crm" as const, label: "CRM", Icon: LayoutDashboard },
  { id: "reservas" as const, label: "Reservas", Icon: Inbox },
  { id: "planner" as const, label: "Planner", Icon: Megaphone },
  { id: "agenda" as const, label: "Agenda", Icon: CalendarDays },
  { id: "sitio" as const, label: "Sitio", Icon: Globe },
  { id: "usuarios" as const, label: "Usuarios", Icon: Users },
];

export default function AppShell() {
  const [view, setView] = useState<View>("flujos");
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [nuevas, setNuevas] = useState(0);
  const [theme, setTheme] = useState<Theme>("normal");

  useEffect(() => {
    const saved = (localStorage.getItem("lr_theme") as Theme) || "normal";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: Theme) {
    if (t === "normal") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  function cycleTheme() {
    const order: Theme[] = ["normal", "dark", "light"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem("lr_theme", next);
    applyTheme(next);
  }

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [mods, setMods] = useState<Record<string, boolean> | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintShown, setHintShown] = useState<Record<string, boolean>>({});
  const [pushOn, setPushOn] = useState(false);
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("lr_push") === "on") {
      setPushOn(true);
    }
    if (!sessionStorage.getItem("lr_boot")) setBooting(true);
  }, []);

  // Notificaciones de ESTE dispositivo (cada quien las activa donde quiera)
  async function togglePush() {
    try {
      if (pushOn) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }) });
          await sub.unsubscribe();
        }
        localStorage.setItem("lr_push", "off");
        setPushOn(false);
        return;
      }
      if (!("serviceWorker" in navigator) || typeof Notification === "undefined") {
        alert("Este navegador no soporta notificaciones. En iPhone: instala primero la app (Compartir → Añadir a pantalla de inicio).");
        return;
      }
      const d = await (await fetch("/api/push")).json();
      if (!d.publicKey) { alert("Faltan las llaves VAPID en Vercel (avísale a PRODY-G)."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: d.publicKey });
      await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", sub: sub.toJSON() }) });
      localStorage.setItem("lr_push", "on");
      setPushOn(true);
      new Notification("Last Rules OS 🖤", { body: "Notificaciones activadas en este dispositivo", icon: "/icon-192.png" });
    } catch {
      alert("No se pudieron activar las notificaciones en este dispositivo.");
    }
  }

  useEffect(() => {
    if (!user) return;
    fetch("/api/lead")
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((d) => setNuevas((d.leads || []).filter((l: { estado: string }) => l.estado === "nuevo").length))
      .catch(() => {});
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setMods(s.modules || {}))
      .catch(() => {});
  }, [user]);

  // La insinuación aparece tras un buen rato en el módulo, desaparece sola en
  // segundos y máximo salen 2 por sesión (para no cansar)
  useEffect(() => {
    if (!user) return;
    const text = HINTS[view];
    if (!text || hintShown[view] || Object.keys(hintShown).length >= 2) return;
    const show = setTimeout(() => {
      setHint(text);
      setHintShown((p) => ({ ...p, [view]: true }));
    }, 40000);
    const hide = setTimeout(() => setHint(null), 49000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [view, user, hintShown]);

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setUser(null);
    setView("flujos");
  }

  if (loading) return <div className="flex h-screen w-screen items-center justify-center bg-navy text-bone-dim">…</div>;
  if (!user) return <Login onLogin={setUser} />;
  if (booting) return <BootSequence userName={user.name} onDone={() => { sessionStorage.setItem("lr_boot", "1"); setBooting(false); }} />;

  const isAdmin = user.role === "admin";
  const base = ITEMS.filter((it) => {
    if (it.id === "usuarios") return isAdmin;
    // módulos apagados por PRODY-G desaparecen para todos menos el dueño
    return user.owner || !mods || mods[it.id] !== false;
  });
  const items: { id: View; label: string; Icon: typeof Workflow }[] = user.owner
    ? [...base, { id: "sistema" as const, label: "Sistema", Icon: Cog }]
    : base;
  const current = items.some((it) => it.id === view) ? view : (items[0]?.id ?? "flujos");

  return (
    <div className="flex h-screen w-screen flex-col-reverse overflow-hidden sm:flex-row" style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top)" }}>
      <nav className="flex min-h-[60px] w-full shrink-0 flex-row items-center gap-1 overflow-x-auto border-t border-line/60 bg-navy-soft px-2 pb-[env(safe-area-inset-bottom)] sm:h-auto sm:min-h-0 sm:w-[78px] sm:flex-col sm:overflow-y-auto sm:border-r sm:border-t-0 sm:px-0 sm:py-4 sm:pb-4">
        <div className="mb-0 hidden sm:mb-4 sm:block">
          <Logo size={42} />
        </div>
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`relative flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 transition sm:w-[62px] sm:gap-1 sm:py-2.5 ${
              current === id ? "bg-gold/15 text-gold" : "text-bone-dim hover:bg-white/5 hover:text-bone"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {id === "reservas" && nuevas > 0 && (
              <span className="absolute right-1.5 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#5B8CB7] px-1 text-[9px] font-bold text-white">{nuevas}</span>
            )}
          </button>
        ))}
        <button
          onClick={togglePush}
          title={pushOn ? "Notificaciones activas en este dispositivo (clic para apagar)" : "Activar notificaciones en este dispositivo"}
          className={`ml-auto flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 transition hover:bg-white/5 sm:ml-0 sm:mt-auto sm:w-[62px] sm:gap-1 sm:py-2.5 ${pushOn ? "text-gold" : "text-bone-dim hover:text-bone"}`}
        >
          {pushOn ? <Bell size={18} /> : <BellOff size={18} />}
          <span className="text-[10px] font-medium">Avisos</span>
        </button>
        <button
          onClick={cycleTheme}
          title={"Tema: " + THEME_META[theme].label + " (clic para cambiar)"}
          className="flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-bone-dim transition hover:bg-white/5 hover:text-bone sm:w-[62px] sm:gap-1 sm:py-2.5"
        >
          {(() => { const I = THEME_META[theme].Icon; return <I size={18} />; })()}
          <span className="text-[10px] font-medium">{THEME_META[theme].label}</span>
        </button>
        <button
          onClick={logout}
          title={"Salir · " + user.name}
          className="flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-bone-dim transition hover:bg-white/5 hover:text-bone sm:w-[62px] sm:gap-1 sm:py-2.5"
        >
          <LogOut size={18} />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
        <div className="hidden px-1 text-center font-display text-[9px] leading-tight tracking-widest text-gold-soft sm:block">
          LAST
          <br />
          RULES
          <br />
          OS
        </div>
      </nav>

      <main className="min-h-0 flex-1 overflow-hidden">
        {current === "flujos" && <FlowBuilder />}
        {current === "omni" && <OmniInbox />}
        {current === "crm" && <CrmDashboard />}
        {current === "reservas" && <ReservasAdmin />}
        {current === "planner" && <Planner />}
        {current === "agenda" && <Agenda />}
        {current === "sitio" && <SiteAdmin />}
        {current === "usuarios" && isAdmin && <UsersAdmin />}
        {current === "sistema" && user.owner && <SistemaAdmin />}
      </main>

      {/* Insinuación contextual sutil (según el módulo en uso) */}
      {hint && (
        <div className="pointer-events-auto fixed bottom-[74px] right-3 z-40 flex max-w-[280px] items-start gap-2 rounded-xl border border-line/50 bg-navy-soft/85 px-3 py-2 backdrop-blur sm:bottom-3">
          <span className="text-[10.5px] leading-snug text-bone-dim/80">
            💡 {hint} <span className="text-gold-soft/60">— PRODY-G</span>
          </span>
          <button onClick={() => setHint(null)} className="mt-0.5 shrink-0 text-bone-dim/50 hover:text-bone-dim" aria-label="Cerrar">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
