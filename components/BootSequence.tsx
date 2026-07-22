"use client";

// Experiencia de encendido del sistema: botón de poder + voz femenina latina
// que va anunciando cada sistema hasta el "TODO FUNCIONANDO" final.

import { useEffect, useMemo, useRef, useState } from "react";
import { Power, Check } from "lucide-react";
import { Logo } from "./Logo";

// Hoja de ginkgo (abanico con muesca y tallo) para la lluvia dorada
const GINKGO_PATH =
  "M50 100 C49 78 47 68 42 60 C18 54 6 34 10 14 C24 28 36 34 47 36 L44 12 L50 22 L56 12 L53 36 C64 34 76 28 90 14 C94 34 82 54 58 60 C53 68 51 78 50 100 Z";

const PASOS = [
  "Sistema de mensajes: activo",
  "Ana, asesora comercial: en línea",
  "NOVA, inteligencia del sistema: operativa",
  "CRM y reservas: sincronizados",
  "Agenda de los tatuadores: cargada",
  "Sitio web: en vivo",
];

const FINAL = "Todos los sistemas se encuentran arriba. Sistema Telaraña: activo. Todo funcionando. Bienvenido al Templo.";

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const prefer = ["sabina", "dalia", "paulina", "camila", "francisca", "helena", "es-mx", "es-co", "es-us", "es-419"];
  for (const p of prefer) {
    const v = voices.find((x) => (x.name + " " + x.lang).toLowerCase().includes(p));
    if (v) return v;
  }
  return voices.find((x) => x.lang?.toLowerCase().startsWith("es")) || null;
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || "es-MX";
      u.rate = 1.02;
      u.pitch = 1.05;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      // respaldo por si onend nunca dispara
      setTimeout(resolve, Math.max(2500, text.length * 90));
    } catch {
      resolve();
    }
  });
}

export default function BootSequence({ userName, onDone }: { userName: string; onDone: () => void }) {
  const [fase, setFase] = useState<"off" | "corriendo" | "final">("off");
  const [hechos, setHechos] = useState(0);
  const corriendo = useRef(false);

  // Lluvia de hojas de ginkgo (posiciones y tiempos pseudoaleatorios estables)
  const hojas = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 59 + 13) % 100,
        delay: ((i * 1.7) % 7).toFixed(1),
        dur: (8 + (i % 5) * 2.2).toFixed(1),
        size: 14 + (i % 4) * 9,
        op: 0.2 + (i % 3) * 0.18,
      })),
    [],
  );

  // precarga las voces (algunos navegadores las cargan async)
  useEffect(() => {
    try { window.speechSynthesis?.getVoices?.(); } catch {}
  }, []);

  async function encender() {
    if (corriendo.current) return;
    corriendo.current = true;
    setFase("corriendo");
    const nombre = (userName || "").split(" ")[0];
    await speak(`Bienvenido${nombre ? ", " + nombre : ""}. Iniciando Last Rules O Ese.`);
    for (let i = 0; i < PASOS.length; i++) {
      setHechos(i + 1);
      await speak(PASOS[i]);
    }
    setFase("final");
    await speak(FINAL);
    setTimeout(onDone, 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-navy px-6" style={{ height: "100dvh" }}>
      {/* resplandor de fondo */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 500px at 50% 30%, rgba(197,160,89,0.10), transparent 70%)" }} />

      {/* lluvia de hojas de ginkgo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000" style={{ opacity: fase === "off" ? 0.45 : 1 }}>
        {hojas.map((h, i) => (
          <svg
            key={i}
            viewBox="0 0 100 110"
            className="absolute top-0"
            style={{
              left: h.left + "%",
              width: h.size,
              opacity: h.op,
              color: i % 4 === 0 ? "#D8BE86" : "#C5A059",
              animation: `leafFall ${h.dur}s linear ${h.delay}s infinite`,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            }}
          >
            <path fill="currentColor" d={GINKGO_PATH} />
          </svg>
        ))}
      </div>

      {/* circuito dorado que se enciende alrededor del logo */}
      {fase !== "off" && (
        <svg viewBox="0 0 400 400" className="pointer-events-none absolute h-[440px] w-[440px] max-w-[95vw]" style={{ filter: "drop-shadow(0 0 6px rgba(197,160,89,0.55))" }}>
          <g stroke="#C5A059" strokeWidth="1.4" fill="none">
            {Array.from({ length: 8 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 45} 200 200)`}>
                <path className="circuit-line" d="M200 152 L200 112 L226 86 L226 54" style={{ animationDelay: i * 0.12 + "s" }} />
                <circle className="circuit-dot" cx="226" cy="54" r="3.5" fill="#C5A059" stroke="none" style={{ animationDelay: 1.4 + i * 0.12 + "s" }} />
                <circle className="circuit-dot" cx="200" cy="112" r="2" fill="#D8BE86" stroke="none" style={{ animationDelay: 1.1 + i * 0.12 + "s" }} />
              </g>
            ))}
            <circle className="circuit-line" cx="200" cy="200" r="62" style={{ animationDelay: "0.3s", strokeDasharray: 390, strokeDashoffset: 390 }} />
          </g>
        </svg>
      )}

      {/* destello final */}
      {fase === "final" && <div className="boot-flash pointer-events-none absolute h-[500px] w-[500px] rounded-full" />}

      <div className={`relative transition-all duration-700 ${fase === "off" ? "scale-100" : "scale-90"}`}>
        <Logo size={fase === "off" ? 90 : 64} />
      </div>

      {fase === "off" && (
        <>
          <div className="mt-6 text-center font-display text-xl tracking-[0.3em] text-bone">LAST RULES OS</div>
          <div className="mt-1 text-[11px] tracking-widest text-bone-dim">EL TEMPLO DE LA PIEL</div>
          <button
            onClick={encender}
            className="group mt-12 flex h-28 w-28 items-center justify-center rounded-full border-2 border-gold/50 bg-gold/10 text-gold shadow-[0_0_60px_-10px_rgba(197,160,89,0.5)] transition hover:scale-105 hover:bg-gold/20 hover:shadow-[0_0_90px_-10px_rgba(197,160,89,0.8)]"
            aria-label="Encender sistema"
          >
            <Power size={44} className="transition group-hover:scale-110" />
          </button>
          <div className="mt-5 animate-pulse text-[11px] uppercase tracking-[0.25em] text-gold-soft">Encender sistema</div>
          <button onClick={onDone} className="mt-8 text-[10px] text-bone-dim/50 underline-offset-2 hover:underline">omitir</button>
        </>
      )}

      {fase !== "off" && (
        <div className="mt-8 w-full max-w-sm">
          {PASOS.map((p, i) => (
            <div
              key={i}
              className={`mb-2.5 flex items-center gap-2.5 transition-all duration-500 ${i < hechos ? "translate-x-0 opacity-100" : "translate-x-3 opacity-15"}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${i < hechos ? "bg-[#3FB37F]/20 text-[#3FB37F]" : "bg-line/30 text-bone-dim"}`}>
                {i < hechos ? <Check size={12} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />}
              </span>
              <span className={`text-sm ${i < hechos ? "text-bone" : "text-bone-dim"}`}>{p}</span>
            </div>
          ))}

          {/* barra de progreso dorada */}
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-line/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-soft transition-all duration-700"
              style={{ width: `${(hechos / PASOS.length) * 100}%` }}
            />
          </div>

          {fase === "final" && (
            <div className="mt-7 animate-pulse text-center">
              <div className="font-display text-lg tracking-widest text-gold">TODOS LOS SISTEMAS ARRIBA</div>
              <div className="mt-1 text-[12px] tracking-[0.2em] text-bone-dim">SISTEMA TELARAÑA ACTIVO · TODO FUNCIONANDO</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
