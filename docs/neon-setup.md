# Conectar Neon (base de datos Postgres)

El sistema funciona con **archivos JSON** por defecto. Cuando pongas una
`DATABASE_URL` de Neon, el contenido del sitio y los usuarios pasan a guardarse
en **Postgres** automáticamente (más robusto y sobrevive a redeploys).

## 1. Crear la base en Neon
1. Entra a **https://neon.tech** y crea una cuenta (gratis).
2. **New Project** → nombre `last-rules` → región cercana → **Create**.
3. Copia la **Connection string** (formato `postgresql://usuario:clave@host/db?sslmode=require`).

## 2. Conectarla
1. En `last-rules-app/.env.local` agrega:
   ```
   DATABASE_URL=postgresql://...   (la que copiaste)
   ```
2. Reinicia el servidor.

Al arrancar, el sistema crea solo la tabla `app_data` y siembra el contenido y
los usuarios por defecto.

## 3. Migrar lo que ya tienes (opcional)
Si ya editaste contenido/usuarios en modo JSON (`data/content.json`,
`data/users.json`) y quieres pasarlo a Neon, avísame con la `DATABASE_URL`
puesta y corro una importación única (subo esos JSON a la tabla `app_data`).

## Notas
- Sin `DATABASE_URL` no pasa nada: sigue en JSON.
- Driver: `@neondatabase/serverless` (HTTP, sirve también desde cPanel).
- Capa de datos: `lib/store.ts` (misma API para JSON y Neon).
