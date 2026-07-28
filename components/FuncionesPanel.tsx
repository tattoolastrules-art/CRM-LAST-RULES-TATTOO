"use client";

// Vitrina de capacidades del sistema: lo que ya está funcionando y lo que se
// puede habilitar (con desarrollo PRODY-G) — pensado para que el equipo vea el
// potencial y lo coordine con el administrador del sistema.

import { Check, Lock } from "lucide-react";

const ACTIVAS = [
  { icon: "💬", nombre: "Omnicanal con Ana", desc: "WhatsApp, Instagram y Messenger en un solo inbox. Ana responde sola: texto, fotos (las mira de verdad), stickers, audios, ubicaciones y más." },
  { icon: "💭", nombre: "Comentarios inteligentes", desc: "Responde en público los comentarios de IG/FB y, si detecta interés (precio, cita, info), le escribe DM automático al cliente." },
  { icon: "🔔", nombre: "Notificaciones del negocio", desc: "Push en tus dispositivos + avisos al WhatsApp del estudio: reservas, citas, posibles abonos y chats por vencerse (ventana de 24h)." },
  { icon: "🗓️", nombre: "Citas y seguimientos", desc: "Agenda de tatuadores con Google Calendar, confirmación con botones, controles post-tatuaje (días 1-30) y encuesta que lleva a reseñas de Google." },
  { icon: "🌐", nombre: "Web administrable", desc: "La página pública se edita desde aquí: tatuadores, portafolio, noticias y fotos. Las reservas caen al CRM y el píxel de Meta mide todo para pautar." },
  { icon: "📋", nombre: "Planner de marketing", desc: "Tablero y calendario de campañas: ideas, diseño, programadas y publicadas, con canales y fechas." },
];

const DISPONIBLES = [
  { icon: "🚀", nombre: "Publicación automática", desc: "Programas el post o reel en el Planner y el sistema lo publica solo en Instagram y Facebook el día y hora exactos." },
  { icon: "📊", nombre: "Estadísticas del negocio", desc: "Alcance, seguidores, mejores horas para publicar y qué publicaciones traen más clientes — directo en el panel." },
  { icon: "📣", nombre: "Historias y menciones", desc: "Cuando alguien mencione al estudio en su historia, el sistema la comparte y le responde automático." },
  { icon: "🎯", nombre: "Leads de anuncios al CRM", desc: "Los formularios de las campañas de Meta caen directo al CRM con aviso al instante — cero leads perdidos." },
  { icon: "🎙️", nombre: "Transcripción de audios", desc: "Las notas de voz de los clientes se transcriben solas y Ana las responde como si fueran texto." },
  { icon: "📈", nombre: "Reporte semanal automático", desc: "Cada lunes llega al WhatsApp un resumen: leads nuevos, cierres, citas de la semana y comentarios destacados." },
  { icon: "🛍️", nombre: "Catálogo y tienda", desc: "Productos del estudio (cuidado del tatuaje, merch) en WhatsApp e Instagram Shopping, conectados al CRM." },
  { icon: "🎵", nombre: "Comentarios de TikTok", desc: "Los comentarios de TikTok entran a la misma bandeja que los de IG/FB, con respuesta desde el panel. (En trámite con TikTok)" },
];

export default function FuncionesPanel({ isOwner }: { isOwner?: boolean }) {
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mx-auto max-w-4xl">
        <div className="font-display text-lg text-bone">Funciones del sistema</div>
        <p className="mt-1 text-xs text-bone-dim">
          Lo que LAST RULES OS ya hace por el estudio — y lo que puede llegar a hacer. Las funciones en gris ya son
          técnicamente posibles con los permisos actuales: se habilitan con desarrollo.
        </p>

        <div className="mt-5 mb-2 text-[11px] uppercase tracking-widest text-[#3FB37F]">✓ Activas</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIVAS.map((f) => (
            <div key={f.nombre} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium text-bone">{f.nombre}</span>
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#3FB37F]/20 text-[#3FB37F]">
                  <Check size={12} />
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 mb-2 text-[11px] uppercase tracking-widest text-bone-dim">🔒 Disponibles para activar</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DISPONIBLES.map((f) => (
            <div key={f.nombre} className="glass rounded-xl p-4 opacity-60 saturate-50 transition hover:opacity-90 hover:saturate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl grayscale">{f.icon}</span>
                <span className="text-sm font-medium text-bone">{f.nombre}</span>
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-line/40 text-bone-dim">
                  <Lock size={11} />
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">{f.desc}</p>
              <p className="mt-2 rounded-lg bg-gold/10 px-2 py-1 text-[10px] text-gold-soft">
                Se puede habilitar para el estudio — coordínala con Chato (PRODY-G).
              </p>
            </div>
          ))}
        </div>

        {isOwner && (
          <p className="mt-6 text-center text-[10px] text-bone-dim/60">
            PRODY-G · estas tarjetas son la vitrina comercial: cuando Alejandro pida una, se cotiza y se desarrolla.
          </p>
        )}
      </div>
    </div>
  );
}
