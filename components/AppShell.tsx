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
import Login from "./Login";

type View = "flujos" | "omni" | "crm" | "reservas" | "agenda" | "sitio" | "usuarios";
type AuthUser = { email: string; role: string; name: string } | null;

const ITEMS = [
  { id: "flujos" as const, label: "Flujos", Icon: Workflow },
  { id: "omni" as const, label: "Omnicanal", Icon: MessageCircleMore },
  { id: "crm" as const, label: "CRM", Icon: LayoutDashboard },
  { id: "reservas" as const, label: "Reservas", Icon: Inbox },
  { id: "agenda" as const, label: "Agenda", Icon: CalendarDays },
  { id: "sitio" as const, label: "Sitio", Icon: Globe },
  { id: "usuarios" as const, label: "Usuarios", Icon: Users },
];

export default function AppShell() {
  const [view, setView] = useState<View>("flujos");
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    <div className="flex h-screen w-screen overflow-hidden">
      <nav className="flex w-[78px] shrink-0 flex-col items-center gap-1 border-r border-line/60 bg-[#0d1320] py-4">
        <div className="mb-4">
          <Logo size={42} />
        </div>
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex w-[62px] flex-col items-center gap-1 rounded-xl py-2.5 transition ${
              current === id ? "bg-gold/15 text-gold" : "text-bone-dim hover:bg-white/5 hover:text-bone"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <button
          onClick={logout}
          title={"Salir · " + user.name}
          className="mt-auto flex w-[62px] flex-col items-center gap-1 rounded-xl py-2.5 text-bone-dim transition hover:bg-white/5 hover:text-bone"
        >
          <LogOut size={18} />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
        <div className="px-1 text-center font-display text-[9px] leading-tight tracking-widest text-gold-soft">
          LAST
          <br />
          RULES
          <br />
          OS
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {current === "flujos" && <FlowBuilder />}
        {current === "omni" && <OmniInbox />}
        {current === "crm" && <CrmDashboard />}
        {current === "reservas" && <ReservasAdmin />}
        {current === "agenda" && <Agenda />}
        {current === "sitio" && <SiteAdmin />}
        {current === "usuarios" && isAdmin && <UsersAdmin />}
      </main>
    </div>
  );
}
