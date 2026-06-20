# Conectar Google Calendar — Agenda de Los Maestros

La Agenda de **Last Rules OS** puede sincronizarse con un Google Calendar real:
leer los eventos y crear citas directamente desde el aplicativo. Esto se hace
con OAuth 2.0 de Google. Solo hay que hacerlo **una vez**.

> Tiempo estimado: ~10 minutos. No necesitas tarjeta ni pagar nada.

---

## 1. Crear el proyecto en Google Cloud

1. Entra a **https://console.cloud.google.com/** con la cuenta de Google del
   estudio (la que tendrá el calendario de los tatuadores).
2. Arriba a la izquierda, en el selector de proyectos → **Proyecto nuevo**.
3. Nombre: `Last Rules OS` → **Crear**. Espera a que quede seleccionado.

## 2. Activar la API de Calendar

1. Menú ☰ → **APIs y servicios** → **Biblioteca**.
2. Busca **Google Calendar API** → ábrela → **Habilitar**.

## 3. Configurar la pantalla de consentimiento

1. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
2. Tipo de usuario: **Externo** → **Crear**.
3. Completa lo mínimo:
   - Nombre de la app: `Last Rules OS`
   - Correo de asistencia: el correo del estudio
   - Datos de contacto del desarrollador: el mismo correo
4. **Guardar y continuar** hasta el final.
5. En **Usuarios de prueba** → **Agregar usuarios** → escribe el correo del
   estudio (y cualquier otro que vaya a conectar el calendario). **Guardar**.

   > Mientras la app esté en modo "Prueba", solo los correos que agregues aquí
   > podrán conectarse. Es suficiente para uso interno del estudio.

## 4. Crear las credenciales OAuth

1. Menú ☰ → **APIs y servicios** → **Credenciales**.
2. **Crear credenciales** → **ID de cliente de OAuth**.
3. Tipo de aplicación: **Aplicación web**.
4. Nombre: `Last Rules OS web`.
5. En **URI de redireccionamiento autorizados** → **Agregar URI** y pega
   exactamente:

   ```
   http://localhost:3030/api/google/callback
   ```

   > Cuando publiquemos el aplicativo en un dominio real, agregaremos aquí
   > también `https://TU-DOMINIO/api/google/callback`.

6. **Crear**. Google te mostrará el **ID de cliente** y el **Secreto de
   cliente**. Cópialos.

## 5. Pegar las credenciales en el aplicativo

1. En la carpeta `last-rules-app`, abre (o crea) el archivo **`.env.local`**.
2. Agrega estas líneas con tus valores:

   ```
   GOOGLE_CLIENT_ID=pega-aquí-tu-id-de-cliente
   GOOGLE_CLIENT_SECRET=pega-aquí-tu-secreto
   GOOGLE_REDIRECT_URI=http://localhost:3030/api/google/callback
   ```

3. Guarda y **reinicia el servidor** (`Ctrl+C` y volver a `npm run dev`).

   > El archivo `.env.local` queda solo en tu computador y **nunca** se sube a
   > git. Las llaves no salen del equipo.

## 6. Conectar desde la Agenda

1. Abre el aplicativo → pestaña **Agenda**.
2. Botón **Conectar Google Calendar** (arriba a la derecha).
3. Inicia sesión con la cuenta del estudio y acepta los permisos.
4. Volverás al aplicativo con el aviso **"Google Calendar conectado ✓"**.
   Los eventos reales aparecen con borde **verde punteado** sobre la grilla.
5. El botón **Cita de prueba** crea un evento real mañana a las 4:00 p.m.
   para comprobar que la escritura funciona. Bórralo después desde Google.

---

## Notas técnicas

- **Permisos:** se pide el scope `calendar` (leer y crear eventos del
  calendario principal `primary`).
- **Tokens:** tras conectar se guardan en cookies `httpOnly` (`g_at` el de
  acceso, `g_rt` el de refresco). El de acceso se renueva solo con el de
  refresco cuando vence — no hay que reconectar cada hora.
- **Rutas del aplicativo:**
  - `GET /api/google/auth` → redirige al consentimiento de Google.
  - `GET /api/google/callback` → recibe el código, canjea tokens, guarda
    cookies y vuelve a la Agenda.
  - `GET /api/google/status` → `{ connected, configured }`.
  - `GET /api/google/events` → lista eventos próximos.
  - `POST /api/google/events` → crea un evento (body estilo Calendar API).
- **Producción:** cambia `GOOGLE_REDIRECT_URI` al dominio real y agrega esa
  misma URL en Google Cloud → Credenciales. Para quitar el límite de
  "usuarios de prueba", publica la app en la pantalla de consentimiento.
- **Desconectar:** borra las cookies del navegador o cierra sesión; al perder
  `g_at`/`g_rt` el estado vuelve a "no conectado".
