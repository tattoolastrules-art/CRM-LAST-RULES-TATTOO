export const dynamic = "force-dynamic";

import Link from "next/link";
import { getContent } from "@/lib/content";
import { Logo } from "@/components/Logo";
import { PublicShell, Thumb } from "@/components/PublicShell";

export default async function Home() {
  const c = await getContent();
  const destacadas = c.publicaciones.filter((p) => p.destacado).slice(0, 3);
  const noticias = c.noticias.filter((n) => n.publicada).slice(0, 2);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="flex flex-col items-center px-5 py-16 text-center md:py-24">
        <Logo size={108} />
        <h1 className="mt-6 font-display text-4xl tracking-wide text-bone md:text-6xl">{c.info.nombre}</h1>
        <p className="mt-2 text-sm tracking-[0.35em] text-gold-soft md:text-base">
          {c.info.lema.toUpperCase()}
        </p>
        <p className="mt-3 text-sm text-bone-dim">
          {c.info.ciudad} · {c.info.horario}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://wa.me/${c.info.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-gold-soft"
          >
            Agenda tu Pieza
          </a>
          <Link
            href="/portafolio"
            className="rounded-xl border border-line px-6 py-3 text-sm text-bone transition hover:border-gold/50 hover:text-gold-soft"
          >
            Ver portafolio
          </Link>
        </div>
      </section>

      {/* Obras destacadas */}
      <section className="px-5 md:px-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl text-bone">Obras destacadas</h2>
          <Link href="/portafolio" className="text-sm text-gold-soft hover:underline">
            Ver todo →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destacadas.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-line/60 bg-navy-card">
              <Thumb url={p.imagenUrl} alt={p.titulo} />
              <div className="p-4">
                <h3 className="font-display text-lg text-bone">{p.titulo}</h3>
                <p className="mt-1 text-sm text-bone-dim">{p.descripcion}</p>
                <p className="mt-2 text-xs text-gold-soft">{p.tatuador}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Noticias */}
      {noticias.length > 0 && (
        <section className="mt-14 px-5 md:px-10">
          <h2 className="mb-5 font-display text-2xl text-bone">Noticias</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {noticias.map((n) => (
              <article key={n.id} className="rounded-2xl border border-line/60 bg-navy-card p-5">
                <p className="text-xs text-gold-soft">{n.fecha}</p>
                <h3 className="mt-1 font-display text-lg text-bone">{n.titulo}</h3>
                <p className="mt-2 text-sm text-bone-dim">{n.cuerpo}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
