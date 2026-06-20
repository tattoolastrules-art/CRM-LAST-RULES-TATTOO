// Logo oficial LAST RULES — isologo (hoja de ginkgo) en dorado #C5A059.
// Fuente: public/logo.svg (vector oficial entregado por el estudio).

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Last Rules Tattoo"
      style={{ display: "block" }}
    />
  );
}
