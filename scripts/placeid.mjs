// Calcula el Place ID (ChIJ...) desde el FID de la ficha de Google Maps y lo valida.
const first = 0x8e3f9b907d900ff3n;
const second = 0x0637f057b607dc74n;

function le64(v) {
  const b = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) b[i] = Number((v >> BigInt(8 * i)) & 0xffn);
  return b;
}

const payload = Buffer.concat([Buffer.from([0x0a, 0x12, 0x09]), le64(first), Buffer.from([0x11]), le64(second)]);
const placeId = payload.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
console.log("Place ID:", placeId);

// Validación: la URL con place_id debe resolver a la ficha de Last Rules
const res = await fetch("https://www.google.com/maps/place/?q=place_id:" + placeId, {
  redirect: "follow",
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
});
console.log("resuelve a:", res.url.slice(0, 130));
const okName = /Last\+Rules|Last%20Rules|lastrules/i.test(res.url);
console.log(okName ? "VALIDADO: es la ficha de Last Rules" : "OJO: no pude confirmar el nombre en la URL");
console.log("");
console.log("LINK DE RESEÑAS: https://search.google.com/local/writereview?placeid=" + placeId);
