// Envoltura de la web pública: nav + footer con la marca. Server component.
import Link from "next/link";
import { Logo } from "./Logo";

const LINKS: [string, string][] = [
  ["/", "Inicio"],
  ["/portafolio", "Portafolio"],
  ["/noticias", "Noticias"],
  ["/tatuadores", "Tatuadores"],
];

const WA = "573227062595";

export function Thumb({ url, alt, h = "h-52" }: { url?: string; alt: string; h?: string }) {
  if (url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`w-full ${h} object-cover`} />;
  return (
    <div className={`flex w-full ${h} items-center justify-center bg-gradient-to-br from-[#1B2336] to-[#0F1522]`}>
      <span className="font-display text-3xl text-gold/40">{(alt || "?").charAt(0).toUpperCase()}</span>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-navy text-bone"
      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
    >
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/60 bg-navy/80 px-5 py-3 backdrop-blur md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display text-base tracking-widest text-bone">LAST RULES</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-bone-dim sm:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="transition hover:text-gold-soft">
              {label}
            </Link>
          ))}
        </nav>
        <a
          href={`https://wa.me/${WA}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-sm text-gold-soft transition hover:bg-gold/20"
        >
          Agendar
        </a>
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-line/60 px-5 py-8 text-sm text-bone-dim md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display tracking-widest text-bone-dim">LAST RULES · El Templo de la Piel</span>
          </div>
          <div className="flex gap-5">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-gold-soft">
                {label}
              </Link>
            ))}
            <Link href="/os" className="text-bone-dim/60 hover:text-gold-soft">
              Panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
