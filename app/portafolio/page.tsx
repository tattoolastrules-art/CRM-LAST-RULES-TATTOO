export const dynamic = "force-dynamic";

import { getContent } from "@/lib/content";
import { PublicShell, Thumb } from "@/components/PublicShell";

export default async function Portafolio() {
  const c = await getContent();
  return (
    <PublicShell>
      <section className="px-5 py-12 md:px-10">
        <h1 className="font-display text-3xl text-bone md:text-4xl">Portafolio</h1>
        <p className="mt-2 text-sm text-bone-dim">Trabajos del equipo de LAST RULES.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.publicaciones.map((p) => (
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
    </PublicShell>
  );
}
