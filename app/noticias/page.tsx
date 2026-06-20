export const dynamic = "force-dynamic";

import { getContent } from "@/lib/content";
import { PublicShell, Thumb } from "@/components/PublicShell";

export default async function Noticias() {
  const c = await getContent();
  const noticias = c.noticias.filter((n) => n.publicada);
  return (
    <PublicShell>
      <section className="px-5 py-12 md:px-10">
        <h1 className="font-display text-3xl text-bone md:text-4xl">Noticias</h1>
        <p className="mt-2 text-sm text-bone-dim">Novedades, giras y eventos del estudio.</p>

        <div className="mt-8 grid gap-6">
          {noticias.map((n) => (
            <article
              key={n.id}
              className="grid gap-4 overflow-hidden rounded-2xl border border-line/60 bg-navy-card sm:grid-cols-[220px_1fr]"
            >
              <Thumb url={n.imagenUrl} alt={n.titulo} h="h-full min-h-[140px]" />
              <div className="p-5">
                <p className="text-xs text-gold-soft">{n.fecha}</p>
                <h3 className="mt-1 font-display text-xl text-bone">{n.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">{n.cuerpo}</p>
              </div>
            </article>
          ))}
          {noticias.length === 0 && <p className="text-bone-dim">Pronto habrá novedades.</p>}
        </div>
      </section>
    </PublicShell>
  );
}
