# WhatsApp Flows — menú "Servicios"

Formulario nativo dentro de WhatsApp con 8 opciones: agendar cita, cotizar
idea, asesoría, cursos, retoque, cover-up, bono regalo y preguntas
frecuentes. El cliente lo abre escribiendo "servicios", "menú", "catálogo"
u "opciones" en el WhatsApp del estudio.

Piezas ya construidas en el código:
- `flows/servicios.json` — las pantallas del formulario.
- `app/api/whatsapp-flow/route.ts` — endpoint cifrado que Meta llama para
  navegar entre pantallas (protocolo RSA + AES-128-GCM de Meta).
- `lib/whatsapp.ts` → `sendWhatsAppFlow()` — envía el Flow por WhatsApp.
- `app/api/meta/webhook/route.ts` — ya reconoce el envío final del
  formulario (llega como mensaje normal `interactive.nfm_reply`), lo
  guarda en el CRM, avisa al estudio por WhatsApp y confirma al cliente.

## Pasos para activarlo (una sola vez)

1. **Desplegar el código primero.** Meta necesita poder llamar al endpoint
   `/api/whatsapp-flow` en producción antes de poder crear el Flow.

2. **Generar las llaves** (ya se generaron localmente en `.keys/`, ignoradas
   por git). Para regenerarlas: `node scripts/gen-flow-keys.mjs`

3. **Guardar la llave privada en Vercel** como variable de entorno
   `FLOW_PRIVATE_KEY` (pega el contenido completo de `.keys/flow_private.pem`,
   con saltos de línea reales — Vercel lo soporta en su editor de variables).
   Volver a desplegar para que quede activa.

4. **Registrar la llave pública en el número de WhatsApp:**
   ```bash
   node scripts/register-flow-key.mjs
   ```

5. **Crear el Flow** (sube `flows/servicios.json` y apunta el endpoint a
   producción):
   ```bash
   node scripts/create-flow.mjs
   ```
   Copia el `id` que devuelve y guárdalo en Vercel como `WHATSAPP_FLOW_ID`.
   Vuelve a desplegar.

6. **Probar en modo borrador.** Con `WHATSAPP_FLOW_ID` ya puesto, escribe
   "servicios" al WhatsApp del estudio desde tu propio número — en modo
   borrador (Draft) solo lo pueden probar los administradores del app de
   Meta, igual que pasaba con Instagram. Revisa cada categoría.

7. **Publicar** cuando todo funcione (ya queda visible para cualquier
   cliente):
   ```bash
   node scripts/create-flow.mjs publish <FLOW_ID>
   ```

## Si algo falla

- Si Meta no puede llamar al endpoint (dominio caído, error 500, firma
  inválida), el Flow queda marcado como "unhealthy" en WhatsApp Manager —
  revisa los logs de Vercel de `/api/whatsapp-flow`.
- Un error 421 en ese endpoint es intencional: significa que la llave
  privada no coincide con la registrada en Meta (hay que repetir el paso 4
  con la llave nueva).
- Para agregar o cambiar campos del formulario: edita
  `flows/servicios.json` y corre `node scripts/create-flow.mjs update <FLOW_ID>`.

## Cosas que quedaron simplificadas (posible v2)

- **Cover-up** no pide foto todavía (los Flows requieren un componente de
  subida de imagen aparte, más complejo); por ahora se le pide que la
  mande por chat después de enviar el formulario.
- El botón que abre el Flow depende de que el cliente escriba una palabra
  clave; se puede conectar también al saludo de bienvenida de un contacto
  nuevo si se quiere que aparezca siempre, no solo bajo pedido.
