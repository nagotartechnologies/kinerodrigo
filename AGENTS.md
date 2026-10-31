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

- **Auth en la API inconsistente**: el middleware excluye `/api`, y solo ~21 de ~57 rutas llaman a `verifyAuth`/`getCurrentUser`. Pagos, gastos, finanzas, usuarios, configuraciones, migraciones, diagnósticos y otras rutas quedan expuestas sin sesión. Hay que tenerlo en cuenta antes de agregar o modificar endpoints. Las rutas nuevas deben validar la sesión, salvo los webhooks.
- El fallback de `JWT_SECRET` en `src/lib/auth.ts` es inseguro.
- Bugs de rendimiento pendientes en `CitasModule.tsx` (`esHorarioBloqueado` sin memoizar, IIFE de la vista "hoy", doble `filter` en el botón de recordatorios) y `console.log` excesivos en las APIs. Ver `docs/bugs-rendimiento.md`.
- Los módulos son componentes gigantes: hay que editarlos de forma quirúrgica y respetar su estilo (estado local con `useState`, `fetch` directo a `/api/*`).
- `README.md` y `docs/plans/modulos-documentacion.md` mencionan Next 14/15 y better-sqlite3. **La fuente de verdad es el código**.
- `check-button-responses` está desactivada a propósito: el proveedor actual (Ultramsg) entrega las respuestas por webhook.

## UI mobile-first (en curso)

- Los tokens de diseño están en `src/app/globals.css` (`--surface-*`, `--accent`, `--estado-*`, `--space-*`, `--tap`, `--sat/--sab` safe areas). Usarlos en CSS nuevo en vez de colores hardcodeados.
- El CSS nuevo va con base para móvil y `@media (min-width: 768px/769px)` para escritorio. Ya migrado: el shell del dashboard (al inicio de `dashboard.css`), los modales (bottom-sheet en móvil), los toasts (`.toast--ok/--error`) y el módulo Citas (`.citas-module` en `calendario.css`).
- Las zonas con scroll horizontal propio deben llevar `data-no-swipe` para no disparar el swipe entre módulos.
- Pendiente de migrar: Pacientes, Sesiones, Finanzas, Configuración y Login.

## Reglas de trabajo (preferencias del usuario)

- Hablar en español.
- Antes de codificar: correr `git fetch`, comparar con `origin/main` y hacer `git pull --ff-only` si hay cambios (avisar si hay cambios locales o divergencia). Reinstalar dependencias si cambió `package.json` o el lockfile.
- **No hacer testing** (tsc, lint, build, curl, Playwright, capturas) salvo que se pida explícitamente.
- **No commitear ni desplegar** por iniciativa propia: los cambios se acumulan en el árbol de trabajo hasta recibir la orden.
- Nunca commitear `.env*` ni credenciales.
