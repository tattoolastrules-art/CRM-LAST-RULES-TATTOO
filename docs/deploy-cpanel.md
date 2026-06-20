# Desplegar LAST RULES OS en cPanel (Node.js App)

El OS es una app Next.js. Tu cPanel tiene **Setup Node.js App**, así que se puede
desplegar ahí. El proyecto ya está configurado con `output: "standalone"`, que
genera un servidor autocontenido.

> Alternativa más fácil: **Vercel** (gratis, hecho para Next.js). Si el cPanel da
> guerra, lo subimos a Vercel en minutos y apuntamos un subdominio.

## 1. Build local (lo hago yo)
```
npm run build
```
Genera `.next/standalone/` (servidor + node_modules), `.next/static/` y se usa `public/`.
Para que funcione, se arma un bundle copiando:
- `.next/standalone/*`
- `.next/static`  → dentro de `.next/standalone/.next/static`
- `public`        → dentro de `.next/standalone/public`
- `.cpanel.env` y un `.env` con `DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_*`

(Yo puedo armar este bundle y subirlo por FTP a una carpeta del hosting, ej. `~/lastrules-os`.)

## 2. Subdominio
En cPanel → **Subdomains** crea, por ejemplo, **os.lastrulestattoo.com**
(document root puede ser cualquier carpeta; la app real correrá por Node).

## 3. Setup Node.js App (esto lo haces tú en cPanel)
cPanel → **Setup Node.js App** → **Create Application**:
- **Node.js version:** 18 o 20
- **Application mode:** Production
- **Application root:** la carpeta donde subimos el bundle (ej. `lastrules-os`)
- **Application URL:** el subdominio (os.lastrulestattoo.com)
- **Application startup file:** `server.js`

Luego, en esa misma pantalla:
- **Environment variables:** agrega `DATABASE_URL`, `ANTHROPIC_API_KEY`, `LANA_MODEL`,
  `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` y los `FTP_*` (para “Publicar”).
- (No hace falta `npm install`: el standalone ya trae sus dependencias.)
- **Run / Restart** la app.

## 4. Ajustes finales
- En Google Cloud agrega el redirect `https://os.lastrulestattoo.com/api/google/callback`.
- Cambia `GOOGLE_REDIRECT_URI` al subdominio.
- Passenger asigna el puerto solo (Next standalone respeta `PORT`).

## ¿Qué necesito de ti?
- El **subdominio** creado.
- Idealmente **SSH activado** (Manage Shell) para automatizar build + subida; si no,
  lo subo por FTP y tú haces los pasos del punto 3 (crear la Node App), que son de la UI.
