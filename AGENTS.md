# AGENTS.md — KINE-CITAS (kinerodrigo)

Contexto del proyecto para agentes y desarrolladores. Hay que leerlo antes de tocar código.

## Qué es

Sistema de gestión clínica para el kinesiólogo **Rodrigo Ulloa**. Lo desarrolla **Nagotar Tech SPA** (Thomas Landeros). Incluye pacientes, agenda de citas, sesiones de tratamiento por episodio, finanzas, configuración y recordatorios automáticos por WhatsApp con detección de la respuesta del paciente (confirmar, cancelar o reagendar). Se usa sobre todo desde el celular: es una PWA con navegación por swipe entre módulos.

- Producción: https://rodrigoulloakine.netlify.app (Netlify)
- Repo: rama `main`, remoto `origin`
- Idioma del código, de la UI, de los comentarios y de los commits: **español**
- Zona horaria de negocio: `America/Santiago`. Moneda: CLP

## Stack real (el README está desactualizado)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript, Turbopack |
| Estilos | CSS propio, sin Tailwind (`dashboard.css`, `calendario.css`, `login.css`, `globals.css`) |
| Base de datos | **Turso (libSQL)** mediante `@libsql/client/web`. `better-sqlite3` solo queda en código legacy |
| Auth | JWT (`jsonwebtoken`, 7 días) en la cookie httpOnly `auth-token`, con `bcryptjs` |
| Archivos | Cloudinary (documentos de pacientes en `kine-citas/pacientes/`, logo) |
| WhatsApp | Multi-proveedor: Green API, Ultramsg, Twilio, Meta Cloud API, Wassenger |
| PWA | `next-pwa` (deshabilitado en dev). `public/sw.js` y `workbox-*.js` son archivos generados |
| Deploy | Netlify, con Scheduled Functions en `netlify/functions/` |
| Alternativa | `server.js` (servidor HTTP propio) y scripts PM2 (`nago-kine`). Ojo: `ecosystem.config.js` **no existe** en el repo |

## Comandos

```bash
pnpm install
pnpm run dev            # desarrollo
pnpm run build          # build de producción
netlify deploy --prod   # deploy (solo cuando el usuario lo ordene)
```

- Los docs internos exigen **pnpm, no npm**. Ya existe `pnpm-lock.yaml` (además del `package-lock.json` legacy y un `deno.lock`).
- pnpm 11+ exige aprobar los build scripts en `pnpm-workspace.yaml` (`allowBuilds`). `better-sqlite3: false` porque es legacy y no compila con Node 26. `sharp` y `unrs-resolver` van en `true`. **No usar `npm install`**: intenta compilar `better-sqlite3` y falla.
- `npm run db:init` y `db:seed` (`scripts/init-db.js`, `seed-db.js`) son **legacy**: crean un `database.db` local con better-sqlite3 y **borran el archivo si ya existe**. No sirven con Turso.
- El schema real se crea o migra solo en `initDatabase()` de `src/lib/db.ts` (con `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ADD COLUMN` en try/catch).
- Migraciones puntuales por endpoint: `GET /api/db/migrate`, `/api/db/migrate/episodios` y `/api/db/migrate/ejercicios`.

## Variables de entorno (`.env.local`, nunca se commitea)

```
TURSO_DATABASE_URL, TURSO_AUTH_TOKEN          # obligatorias: db.ts lanza un error si faltan
JWT_SECRET                                    # en auth.ts hay un fallback inseguro hardcodeado
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
GREEN_API_INSTANCE_ID, GREEN_API_TOKEN, GREEN_API_URL, GREEN_API_TEST_MODE
WHATSAPP_TEST_MODE                            # true = TestProvider simulado, no envía nada
NEXT_PUBLIC_APP_URL
```

También están las credenciales de los otros proveedores de WhatsApp (Ultramsg, Twilio, Meta, Wassenger), que se leen en `src/lib/whatsapp/providers/*`. El detalle completo está en `docs/plans/variables-entorno-y-despliegue.md`.

## Estructura

```
src/
  middleware.ts               # redirige a /login si no hay cookie (excluye /api)
  app/
    page.tsx                  # redirect a /login
    login/                    # pantalla de login
    dashboard/
      page.tsx                # shell: tarjetas de stats, swipe entre módulos, carga dinámica
      components/
        PacientesModule.tsx   (~2.400 líneas)
        CitasModule.tsx       (~2.200 líneas, calendario semanal/mensual/hoy)
        SesionesModule.tsx    (~3.600 líneas)
        FinanzasModule.tsx, PagosModule.tsx
        ConfiguracionModule.tsx + config/Config{General,Usuarios,Citas,Pagos,Respaldos,WhatsApp}.tsx
        FichaCompletaModal.tsx  # ficha clínica por episodio
      hooks/useTouchDrag.ts, utils/generarFichaPDF.ts, types/, utils.ts
    api/                      # ~57 route handlers REST (ver abajo)
  lib/
    db.ts                     # cliente Turso + wrapper que imita a better-sqlite3 + initDatabase()
    auth.ts                   # JWT, cookies, verifyAuth(request)
    episodios.ts              # asegurarEpisodio(), mapeo de estados paciente <-> episodio
    cron.ts                   # enviarRecordatoriosAutomaticos()
    whatsapp.ts               # envío y formateo de plantillas
    whatsapp/factory.ts       # elige el proveedor (config 'whatsapp_provider' o 'auto')
    whatsapp/detectarIntencion.ts  # scoring de palabras (con chilenismos) -> CONFIRMAR/CANCELAR/REAGENDAR
    whatsapp/providers/*      # greenapi, ultramsg, twilio, meta, wassenger (interfaz base.ts)
    cloudinary.ts
    db-sqlite-backup.ts       # LEGACY better-sqlite3, no se usa
  components/DynamicFavicon.tsx
netlify/functions/
  recordatorios-cron.ts       # schedule '0 */2 * * *': recordatorios automáticos
  backup-diario.ts            # schedule '0 3 * * *': dump SQL de las tablas
  check-button-responses.ts   # DESACTIVADA (el webhook procesa las respuestas en tiempo real)
docs/
  plans/modulo-*.md, base-de-datos-schema.md, WHATSAPP_SETUP.md, WEBHOOK_DEBUG.md, ...
  bugs-rendimiento.md         # bugs de rendimiento detectados (algunos siguen pendientes)
page.tsx (raíz)               # ARCHIVO HUÉRFANO: copia vieja y monolítica del dashboard (~4.600 líneas). No es una ruta
```

## Uso del wrapper de base de datos

`db` imita a better-sqlite3, pero **todo es async**:

```ts
import db from '@/lib/db';
const fila = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
const filas = await db.prepare('SELECT ...').all(...params);
const { changes, lastInsertRowid } = await db.prepare('INSERT ...').run(...params);
```

- `lastInsertRowid` es un `bigint`: hay que convertirlo con `Number(...)`.
- `db.transaction()` **no es atómica**: solo ejecuta la función. Para operaciones atómicas hay que usar `tursoClient.batch`.
- `db.pragma()` no hace nada.
- Las fechas se guardan como texto `YYYY-MM-DD` y las horas como `HH:MM`. En el front hay que evitar `new Date('YYYY-MM-DD')`, porque produce un desfase de zona horaria. Conviene parsear los componentes por separado.

## Modelo de datos (tablas principales)

`usuarios`, `pacientes` (ficha clínica completa más `estado_paciente`: activo/alta/abandono), `episodios` (cada lesión nueva es un episodio y las sesiones se renumeran desde 1), `citas` (estado: pendiente/confirmada/cancelada/completada/reagendar), `sesiones` (dolor, Borg, movilidad, fuerza, ejercicios, `episodio_id`), `recordatorios` (envíos y respuestas de WhatsApp), `pagos`, `gastos`, `gastos_fijos`, `categorias_gastos`, `configuraciones` (clave/valor por categoría: general, citas, pagos, whatsapp, notificaciones), `horarios_bloqueados`, `documentos_paciente`, `historial_estados_paciente`, `ejercicios`, más `evaluaciones` y `planes_rehabilitacion` (legacy). El detalle está en `docs/plans/base-de-datos-schema.md`.

## Flujo de WhatsApp

1. El recordatorio sale de forma automática (Netlify cron cada 2 h, según `recordatorios_horas_antes`), manual (`/api/citas/[id]/recordatorio`) o masiva (`/api/citas/recordatorios-masivos`).
2. Se guarda en `recordatorios`. La plantilla está en `configuraciones.whatsapp_mensaje_recordatorio`, con placeholders `{paciente} {fecha} {hora} ...`.
3. El paciente responde y llega a `POST /api/webhook/whatsapp`. Ahí se busca el recordatorio por los **últimos 8 dígitos** del teléfono, `detectarIntencion` decide la intención, se actualiza el estado de la cita y se envía el mensaje de confirmación.
4. Diagnóstico: `/api/webhook/diagnostico`, `/api/whatsapp/diagnostico` y `/api/cron/diagnostico`. También están `DIAGNOSTICO_WHATSAPP.md` y `docs/plans/WEBHOOK_DEBUG.md`.

## Advertencias conocidas

- **Auth en la API**: el middleware excluye `/api`, así que cada route handler valida la sesión por su cuenta. Todas las rutas lo hacen, con `verifyAuth`/`getCurrentUser` o con el helper `requireAuth(request)` de `src/lib/auth.ts` (devuelve un 401 o `null`):

  ```ts
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  ```

  Solo quedan públicas `auth/login`, `auth/logout`, `icon`, `manifest` y el webhook `webhook/whatsapp` (lo llama el proveedor). Los diagnósticos, migraciones y `webhook/whatsapp/enviar-respuesta` exigen sesión: se abren desde el navegador con la sesión iniciada. `/api/usuarios` además impide eliminar o desactivar el propio usuario y el último activo. Toda ruta nueva debe validar la sesión, salvo los webhooks.
- El fallback de `JWT_SECRET` en `src/lib/auth.ts` es inseguro.
- Bugs de rendimiento pendientes en `CitasModule.tsx` (`esHorarioBloqueado` sin memoizar, IIFE de la vista "hoy", doble `filter` en el botón de recordatorios) y `console.log` excesivos en las APIs. Ver `docs/bugs-rendimiento.md`.
- Los módulos son componentes gigantes: hay que editarlos de forma quirúrgica y respetar su estilo (estado local con `useState`, `fetch` directo a `/api/*`).
- `README.md` y `docs/plans/modulos-documentacion.md` mencionan Next 14/15 y better-sqlite3. **La fuente de verdad es el código**.
- `check-button-responses` está desactivada a propósito: el proveedor actual (Ultramsg) entrega las respuestas por webhook.

## Marca

- Marca: **Rodrigo Ulloa · Kinesiólogo Deportivo**, con verde `#2AD636` (acento de toda la UI, `--accent`) y fondo de marca `#0E0F0E`. La fuente única es `src/lib/marca.ts` (`MARCA`, incluye las rutas de logos).
  - Usar `nombreMarca(valorConfig)` para el nombre visible: devuelve `nombre_centro` si fue personalizado. Los valores legacy sembrados (`NAGO-KINE`, `KINE-CITAS`) cuentan como "sin configurar".
- Assets oficiales en `/brand-kit` (ver su README):
  - Ya copiados: favicons, `apple-touch-icon`, `android-chrome-*`, `maskable-512` y `og-image` a `/public`, y los logos SVG a `/public/brand`.
  - Uso de logos: login con `logo-vertical-oscuro`, header con `logo-horizontal-oscuro`, pantalla de carga con `isotipo`.
  - El login no tiene tarjeta. El fondo es `public/brand/fondo-lineas.webp`, una textura de líneas de relieve generada para imitar el fondo del logo original, con un degradado radial que oscurece el centro.
  - `public/icon-*.png` se regeneran con sharp desde `brand-kit/svg/app-icon.svg`.
- No usar `#3FFF00` (era el verde neón anterior).
- `logo_url` de configuración ya no define favicon ni íconos; solo se usa en el PDF de la ficha.
- Sesión: "Mantener sesión iniciada" del login, 30 días marcado y 1 día sin marcar (`DIAS_SESION_*` en `auth.ts`).

## UI mobile-first (en curso)

- Los tokens de diseño están en `src/app/globals.css` (`--surface-*`, `--accent`, `--estado-*`, `--space-*`, `--tap`, `--sat/--sab` safe areas). Usarlos en CSS nuevo en vez de colores hardcodeados.
- El CSS nuevo va con base para móvil y `@media (min-width: 768px/769px)` para escritorio. Ya migrado: el shell del dashboard (al inicio de `dashboard.css`), los modales (bottom-sheet en móvil), los toasts (`.toast--ok/--error`) y el módulo Citas (`.citas-module` en `calendario.css`).
- Las zonas con scroll horizontal propio deben llevar `data-no-swipe` para no disparar el swipe entre módulos.
- La navegación entre módulos está en `components/SidebarNav.tsx`, un drawer que se abre con ☰ en el header o deslizando desde los 24 px del borde izquierdo (`BORDE_SIDEBAR_PX`). Ya no existe la fila de chips de módulos; el swipe entre módulos y la flecha ← se mantienen.
- La vista semanal de Citas es `components/SemanaCalendario.tsx`, al estilo Google Calendar: citas con posición absoluta por hora y duración, solapes en columnas y línea de hora actual. Interacciones:
  - Arrastrar mueve la cita y estirar cambia la duración, con pasos de 15 minutos.
  - En touch, el arrastre se activa con un toque largo de 400 ms.
  - Mueve y redimensiona con `moverCitaAPI(cita, fecha, hora, duracion?)`, que actualiza la pantalla antes de que responda la API.
  - `hooks/useTouchDrag.ts` ya no se usa.
- Pacientes (`.pac-*`), Sesiones (`.ses-*`), Finanzas (`.fin-*`) y Configuración (`.configuracion-module`) ya tienen cabecera, toolbar y listas mobile-first. Clases compartidas:
  - `.fab`: botón flotante, solo en móvil.
  - `.pac-buscador`: buscador.
  - `.pac-filtros` / `.pac-filtro`: chips de filtro, coloreados con `--filtro-color`.
  - `.toast`: mensajes.
- Las listas de tarjetas se paginan en el cliente, 10 por página, con `usePaginacion(items, claveReinicio)` y `<Paginacion />` de `components/Paginacion.tsx`. La página vuelve a 1 cuando cambia la clave (búsqueda, filtro, mes). Se usa en Pacientes, Sesiones y Finanzas (movimientos y gastos fijos).
- El interior de los modales ya tiene clases propias, en el bloque "INTERIOR DE MODALES" al final de `dashboard.css`:
  - Comunes: `.modal-body`, `.modal-actions`, `.modal-header h3`, `.modal-sm`, `.campo-input`, `.campo-ayuda`, `.modal-texto` y `.btn-confirmar--*`.
  - Formulario de sesión, evaluación y progreso: `.ses-*`.
  - Contenido de la ficha completa y sus sub-modales: `.ficha-*`.
  - Los colores dinámicos pasan por custom properties inline (`--dolor-color`, `--stat-color`, `--dato-color`, `--metrica-color`).
  - El violeta de episodios es el token `--episodio`.
- Los modales de `SesionesModule` (completar sesión, programar siguiente, biblioteca de ejercicios y cambio de estado) también usan esas clases. En Sesiones y en la ficha solo quedan estilos inline con valores dinámicos (custom properties, alturas del gráfico, color de badges y `zIndex`).

## Reglas de trabajo (preferencias del usuario)

- Hablar en español.
- Antes de codificar: correr `git fetch`, comparar con `origin/main` y hacer `git pull --ff-only` si hay cambios (avisar si hay cambios locales o divergencia). Reinstalar dependencias si cambió `package.json` o el lockfile.
- **No hacer testing** (tsc, lint, build, curl, Playwright, capturas) salvo que se pida explícitamente.
- **No commitear ni desplegar** por iniciativa propia: los cambios se acumulan en el árbol de trabajo hasta recibir la orden.
- Nunca commitear `.env*` ni credenciales.
