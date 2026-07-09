export const dynamic = "force-dynamic";

import { getContent } from "@/lib/content";
import { PublicShell, Thumb } from "@/components/PublicShell";

export default async function Tatuadores() {
  const c = await getContent();
  const tatuadores = c.tatuadores.filter((t) => t.activo);
  return (
    <PublicShell>
      <section className="px-5 py-12 md:px-10">
        <h1 className="font-display text-3xl text-bone md:text-4xl">Nuestros artistas</h1>
        <p className="mt-2 text-sm text-bone-dim">El equipo de Last Rules.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tatuadores.map((t) => (
            <article key={t.id} className="overflow-hidden rounded-2xl border border-line/60 bg-navy-card">
              <Thumb url={t.fotoUrl} alt={t.nombre} h="h-56" />
              <div className="p-4">
                <h3 className="font-display text-lg text-bone">{t.nombre}</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.estilos.map((e) => (
                    <span key={e} className="rounded-full border border-gold/30 px-2 py-0.5 text-[11px] text-gold-soft">
                      {e}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 text-sm text-bone-dim">{t.bio}</p>
                {t.instagram && <p className="mt-2 text-xs text-gold-soft">{t.instagram}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
