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
  LogOut,
} from "lucide-react";
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

type View = "flujos" | "omni" | "crm" | "reservas" | "planner" | "agenda" | "sitio" | "usuarios";
type Theme = "normal" | "dark" | "light";
const THEME_META: Record<Theme, { Icon: typeof Monitor; label: string }> = {
  normal: { Icon: Monitor, label: "Normal" },
  dark: { Icon: Moon, label: "Oscuro" },
  light: { Icon: Sun, label: "Claro" },
};
type AuthUser = { email: string; role: string; name: string } | null;

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

  useEffect(() => {
    if (!user) return;
    fetch("/api/lead")
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((d) => setNuevas((d.leads || []).filter((l: { estado: string }) => l.estado === "nuevo").length))
      .catch(() => {});
  }, [user]);

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setUser(null);
    setView("flujos");
  }

  if (loading) return <div className="flex h-screen w-screen items-center justify-center bg-navy text-bone-dim">…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const isAdmin = user.role === "admin";
  const items = ITEMS.filter((it) => it.id !== "usuarios" || isAdmin);
  const current = items.some((it) => it.id === view) ? view : "flujos";

  return (
    <div className="flex h-screen w-screen flex-col-reverse overflow-hidden sm:flex-row" style={{ height: "100dvh" }}>
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
          onClick={cycleTheme}
          title={"Tema: " + THEME_META[theme].label + " (clic para cambiar)"}
          className="ml-auto flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-bone-dim transition hover:bg-white/5 hover:text-bone sm:ml-0 sm:mt-auto sm:w-[62px] sm:gap-1 sm:py-2.5"
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
      </main>
    </div>
  );
}
