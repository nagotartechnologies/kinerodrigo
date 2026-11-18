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
| Base de datos | **Turso (libSQL)** mediante `@libsql/client/web` |
| Validación | **Zod 4**: esquemas en `src/lib/schemas/*`, aplicados con `validarBody()` de `src/lib/validacion.ts` |
| Auth | JWT (`jsonwebtoken`) en la cookie httpOnly `auth-token`, con `bcryptjs` (costo 12; los hashes viejos de costo 8 siguen validando) |
| Archivos | Cloudinary (documentos de pacientes en `kine-citas/pacientes/`, máx. 4 MB por el límite de body de Netlify; logo en `kine-citas/logo/`) |
| WhatsApp | Multi-proveedor: Green API, Ultramsg, Twilio, Meta Cloud API, Wassenger |
| PWA | Service worker propio y escrito a mano en `public/sw.js` (network-first solo para páginas y limpieza de cachés viejas). `next-pwa` se desinstaló: su plugin de webpack no corre con Turbopack. La lógica cliente está en `src/lib/pwa.ts` y `components/AppPwa.tsx` (ver "PWA: instalación y versiones") |
| Deploy | Netlify, con Scheduled Functions en `netlify/functions/` |
| Alternativa | `server.js` (servidor HTTP propio, `pnpm start`). Los scripts PM2 se quitaron porque `ecosystem.config.js` no existía |

## Comandos

```bash
pnpm install
pnpm run dev            # desarrollo
pnpm run build          # build de producción
netlify deploy --prod   # deploy (solo cuando el usuario lo ordene)
```

- **Siempre pnpm**, nunca npm ni yarn. El único lockfile es `pnpm-lock.yaml` (`package-lock.json` y `deno.lock` se borraron).
- pnpm 11+ exige aprobar los build scripts en `pnpm-workspace.yaml` (`allowBuilds`): `sharp` y `unrs-resolver` van en `true`.
- `better-sqlite3`, `next-pwa` y los scripts `db:init`/`db:seed` se eliminaron: no hay base local, todo va contra Turso.
- `pnpm lint` (`next lint`) **no funciona**: Next 16 quitó ese comando. Migrar a ESLint 9 + flat config está pendiente.
- El schema real se crea o migra solo en `initDatabase()` de `src/lib/db.ts` (con `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ADD COLUMN` en try/catch).
- Migraciones puntuales por endpoint: `GET /api/db/migrate`, `/api/db/migrate/episodios` y `/api/db/migrate/ejercicios`.

## Variables de entorno (`.env.local`, nunca se commitea)

```
TURSO_DATABASE_URL, TURSO_AUTH_TOKEN          # obligatorias: db.ts lanza un error si faltan
JWT_SECRET                                    # obligatoria: sin ella no se puede iniciar sesión (ya no hay fallback). Generar con openssl rand -base64 48
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
GREEN_API_INSTANCE_ID, GREEN_API_TOKEN, GREEN_API_URL, GREEN_API_TEST_MODE
WHATSAPP_TEST_MODE                            # true = TestProvider simulado, no envía nada
NEXT_PUBLIC_APP_URL
CRON_SECRET                                   # la Netlify Scheduled Function lo manda en x-cron-secret a /api/cron/recordatorios
GREEN_API_WEBHOOK_TOKEN                       # si está definido, el webhook exige Authorization: Bearer <token> (configurar el mismo valor en "Webhook URL Token" de Green API)
```

La plantilla completa está en `.env.example`. También están las credenciales de los otros proveedores de WhatsApp (Ultramsg, Twilio, Meta, Wassenger), que se leen en `src/lib/whatsapp/providers/*`. El detalle completo está en `docs/plans/variables-entorno-y-despliegue.md`.

## Estructura

```
src/
  middleware.ts               # redirige a /login si no hay cookie (excluye /api)
  app/
    page.tsx                  # redirect a /login
    login/                    # pantalla de login
    dashboard/
      layout.tsx              # envuelve el dashboard en <ConfirmProvider>
      page.tsx                # shell: tarjetas de stats, swipe entre módulos, carga dinámica
      components/
        PacientesModule.tsx   (~2.250 líneas, pendiente de dividir)
        CitasModule.tsx       (~1.700 líneas, calendario semanal/mensual/hoy)
        citas/                # piezas extraídas de Citas: AgendaCard, ListaCitas, ModalRespuestas, formato.ts, iconos.tsx
        SesionesModule.tsx    (~3.000 líneas, pendiente de dividir)
        FinanzasModule.tsx
        ConfiguracionModule.tsx + config/Config{General,Usuarios,Citas,Pagos,Respaldos,WhatsApp}.tsx
        FichaCompletaModal.tsx  # ficha clínica por episodio
      hooks/useRespuestasPendientes.ts, utils/generarFichaPDF.ts, utils/accesible.ts, types/, utils.ts
    api/                      # route handlers delgados: auth -> validar (Zod) -> servicio -> respuesta
  services/                   # lógica de negocio y acceso a datos, por dominio (ver "Capas del backend")
    citas/{consultas,mutaciones,conflictos,recurrentes}.ts
    pacientes/{fichas,estados,episodios,documentos}.ts
    sesiones/{consultas,mutaciones}.ts
    finanzas/{pagos,gastos,gastosFijos,categorias}.ts
    usuarios.ts, autenticacion.ts, limiteLogin.ts, configuraciones.ts, logo.ts, agenda.ts, whatsappProveedores.ts
  lib/
    db.ts                     # cliente Turso + wrapper que imita a better-sqlite3 + batch() + initDatabase()
    auth.ts                   # JWT, cookies, verifyAuth(request), requireAuth(request)
    schemas/*.ts              # esquemas Zod por dominio (comunes, citas, pacientes, sesiones, finanzas, configuracion, whatsapp, usuarios, auth)
    validacion.ts             # validar(schema, datos) y validarBody(request, schema) -> 400 con mensaje en español
    errores.ts                # ErrorNegocio, noEncontrado(), respuestaError(), idDeParams()
    sql.ts                    # sentenciaUpdate(): UPDATE parcial con columnas de lista blanca
    episodios.ts              # asegurarEpisodio(), mapeo de estados paciente <-> episodio
    cron.ts                   # enviarRecordatoriosAutomaticos()
    whatsapp.ts               # envío y formateo de plantillas
    whatsapp/factory.ts       # elige el proveedor (config 'whatsapp_provider' o 'auto')
    whatsapp/detectarIntencion.ts  # scoring de palabras (con chilenismos) -> CONFIRMAR/CANCELAR/REAGENDAR
    whatsapp/providers/*      # greenapi, ultramsg, twilio, meta, wassenger (interfaz base.ts)
    cloudinary.ts
  components/DynamicFavicon.tsx, AppPwa.tsx
  components/ConfirmDialog.tsx  # ConfirmProvider + useConfirm(): reemplazo accesible de confirm()/alert()
  components/VigilanteSesion.tsx  # en el layout del dashboard: si una /api/* responde 401, borra la cookie y manda a /login?expirada=1 (el middleware solo mira que exista la cookie, no si el JWT es válido)
netlify/functions/
  recordatorios-cron.ts       # schedule '0 */2 * * *': solo llama a POST /api/cron/recordatorios con CRON_SECRET (la lógica vive en src/lib/cron.ts)
  backup-diario.ts            # schedule '0 3 * * *': dump SQL de las tablas
  check-button-responses.ts   # DESACTIVADA (el webhook procesa las respuestas en tiempo real)
docs/
  plans/modulo-*.md, base-de-datos-schema.md, WHATSAPP_SETUP.md, WEBHOOK_DEBUG.md, ...
  bugs-rendimiento.md         # bugs de rendimiento detectados (algunos siguen pendientes)
```

## Capas del backend (obligatorio en rutas nuevas)

```ts
export async function POST(request: NextRequest) {
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  try {
    const validacion = await validarBody(request, crearCitaSchema);   // Zod -> 400 si no calza
    if (!validacion.ok) return validacion.response;
    const cita = await crearCita(validacion.data);                    // src/services/...
    return NextResponse.json({ success: true, cita }, { status: 201 });
  } catch (error) {
    return respuestaError(error, 'Error al crear la cita');           // ErrorNegocio -> su status; otro -> 500 genérico + log
  }
}
```

- La ruta no tiene SQL ni reglas de negocio: solo auth, validación, llamada al servicio y respuesta.
- Los servicios lanzan `ErrorNegocio(mensaje, status)` (o `noEncontrado(mensaje)`) con textos en español aptos para el usuario. Nunca devolver `error.message` de errores inesperados al cliente.
- Los ids de la URL pasan por `idDeParams()` (400 si no son enteros positivos).
- Todas las respuestas incluyen `success: true|false`.
- Operaciones de varios pasos van en `db.batch([...])` (atómico). Nada de consultas dentro de bucles: leer en una consulta y escribir en un batch.
- Formularios que mandan `''`: los esquemas lo convierten a `null` (fichas) o a "no cambiar" (ediciones de finanzas) con `z.preprocess`.
- Login: máximo 5 intentos fallidos por email + IP en 15 minutos (`services/limiteLogin.ts`, tabla `intentos_login`), responde 429.
- Rutas que todavía no siguen el patrón: `webhook/whatsapp` (payload del proveedor), `whatsapp/diagnostico`, `cron/diagnostico`, `backups`, `db/migrate/*`, las de estadísticas y `citas/[id]/recordatorio`.

## Uso del wrapper de base de datos

`db` imita a better-sqlite3, pero **todo es async**:

```ts
import db from '@/lib/db';
const fila = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
const filas = await db.prepare('SELECT ...').all(...params);
const { changes, lastInsertRowid } = await db.prepare('INSERT ...').run(...params);
```

- `lastInsertRowid` es un `bigint`: hay que convertirlo con `Number(...)`.
- `db.transaction()` **no es atómica**: solo ejecuta la función. Para operaciones atómicas usar `db.batch([{ sql, args }, ...])`, que devuelve un `ResultSet` por sentencia (con su `lastInsertRowid`).
- `db.pragma()` no hace nada.
- **El schema real de Turso no coincide del todo con `initDatabase()`**: la tabla `pacientes` en producción tiene `NOT NULL` en `telefono, edad, altura, peso, lesion_consulta, objetivo_paciente`. Por eso `services/pacientes/fichas.ts` guarda `''` en vez de `NULL` en esas columnas. Ante dudas, consultar `sqlite_master` en Turso antes de asumir el schema.
- Las fechas se guardan como texto `YYYY-MM-DD` y las horas como `HH:MM`. En el front hay que evitar `new Date('YYYY-MM-DD')`, porque produce un desfase de zona horaria. Conviene parsear los componentes por separado.

## Modelo de datos (tablas principales)

`usuarios`, `pacientes` (ficha clínica completa más `estado_paciente`: activo/alta/abandono), `episodios` (cada lesión nueva es un episodio y las sesiones se renumeran desde 1), `citas` (estado: pendiente/confirmada/cancelada/completada/reagendar), `sesiones` (dolor, Borg, movilidad, fuerza, ejercicios, `episodio_id`), `recordatorios` (envíos y respuestas de WhatsApp), `pagos`, `gastos`, `gastos_fijos`, `categorias_gastos`, `configuraciones` (clave/valor por categoría: general, citas, pagos, whatsapp, notificaciones), `horarios_bloqueados`, `documentos_paciente`, `historial_estados_paciente`, `ejercicios`, más `evaluaciones` y `planes_rehabilitacion` (legacy). El detalle está en `docs/plans/base-de-datos-schema.md`.

## Flujo de WhatsApp

1. El recordatorio sale de forma automática, manual (`/api/citas/[id]/recordatorio`) o masiva (`/api/citas/recordatorios-masivos`).
   - Automático: Netlify cron cada 2 h → `enviarRecordatoriosAutomaticos()`. Toma las citas cuyo `fecha || ' ' || hora` cae entre ahora y ahora + `recordatorios_horas_antes`, **en hora de Chile** (`src/lib/horaChile.ts`).
2. Se guarda en `recordatorios`. La plantilla está en `configuraciones.whatsapp_mensaje_recordatorio`, con placeholders `{paciente} {fecha} {hora} ...`.
   - `recordatorios.estado` puede ser `enviado`, `error` (fallo de envío, con `error_envio`; se reintenta) u `obsoleto` (la cita se movió de día u hora). Solo `enviado` evita que se reenvíe.
   - Al mover una cita (PUT `/api/citas/[id]`), sus recordatorios pasan a `obsoleto` y, si estaba `confirmada` o en `reagendar`, la cita vuelve a `pendiente`.
3. El paciente responde y llega a `POST /api/webhook/whatsapp`:
   - Valida `GREEN_API_WEBHOOK_TOKEN` si está definido. Deduplica por `idMessage` en la tabla `webhook_mensajes`.
   - Busca el recordatorio por los **últimos 8 dígitos** del teléfono y `detectarIntencion` decide la intención (compara palabras completas y la negación solo mira las 3 palabras previas).
   - No modifica citas cerradas o pasadas. CONFIRMAR → `confirmada`. CANCELAR → `cancelada` (también la sesión vinculada), con `cancelacion_tardia=1` si faltan menos de `cancelacion_horas_minimas` h. REAGENDAR → `reagendar` (solo si `permitir_reagendar`).
   - El re-prompt por respuesta no reconocida se envía **una sola vez** por recordatorio (`reprompts`).
4. Aviso al profesional en CANCELAR o REAGENDAR:
   - WhatsApp con `notificarProfesional()` a `notif_whatsapp_telefono` (o a `telefono_contacto`), activable con `notif_whatsapp`.
   - Badge "Respuestas" en Citas, alimentado por `GET/POST /api/recordatorios/pendientes` (columna `revisado`).
5. Diagnóstico: `/api/webhook/diagnostico`, `/api/whatsapp/diagnostico` y `/api/cron/diagnostico`. También están `DIAGNOSTICO_WHATSAPP.md` y `docs/plans/WEBHOOK_DEBUG.md`.

## Advertencias conocidas

- **Auth en la API**: el middleware excluye `/api`, así que cada route handler valida la sesión por su cuenta. Todas las rutas lo hacen, con `verifyAuth`/`getCurrentUser` o con el helper `requireAuth(request)` de `src/lib/auth.ts` (devuelve un 401 o `null`):

  ```ts
  const noAutorizado = await requireAuth(request);
  if (noAutorizado) return noAutorizado;
  ```

  Solo quedan públicas `auth/login`, `auth/logout`, `icon`, `manifest` y el webhook `webhook/whatsapp` (lo llama el proveedor). Los diagnósticos, migraciones y `webhook/whatsapp/enviar-respuesta` exigen sesión: se abren desde el navegador con la sesión iniciada. `/api/usuarios` además impide eliminar o desactivar el propio usuario y el último activo. Toda ruta nueva debe validar la sesión, salvo los webhooks.
- Quedan `console.log` excesivos en las APIs de WhatsApp (`check-responses`, `citas/[id]/recordatorio`, webhook). Ver `docs/bugs-rendimiento.md`.
- Los módulos son componentes gigantes: hay que editarlos de forma quirúrgica y respetar su estilo (estado local con `useState`, `fetch` directo a `/api/*`).
- `README.md` y `docs/plans/modulos-documentacion.md` mencionan Next 14/15 y better-sqlite3. **La fuente de verdad es el código**.
- `check-button-responses` está desactivada a propósito: el proveedor actual (Green API) entrega las respuestas por webhook.

## Marca

- Marca: **Rodrigo Ulloa · Kinesiólogo Deportivo**, con verde `#2AD636` (acento de toda la UI, `--accent`) y fondo de marca `#0E0F0E`. La fuente única es `src/lib/marca.ts` (`MARCA`, incluye las rutas de logos).
  - Usar `nombreMarca(valorConfig)` para el nombre visible: devuelve `nombre_centro` si fue personalizado. Los valores legacy sembrados (`NAGO-KINE`, `KINE-CITAS`) cuentan como "sin configurar".
- Assets oficiales en `/brand-kit` (ver su README):
  - Ya copiados: favicons, `apple-touch-icon`, `android-chrome-*`, `maskable-512` y `og-image` a `/public`, y los logos SVG a `/public/brand`.
  - Uso de logos: login con `logo-vertical-oscuro`, header con `logo-horizontal-oscuro`, pantalla de carga con `isotipo`.
  - El login no tiene tarjeta. El fondo es `public/brand/fondo-lineas.webp`, una textura de líneas de relieve generada para imitar el fondo del logo original, con un degradado radial que oscurece el centro.
  - `public/icon-*.png` se regeneran con sharp desde `brand-kit/svg/app-icon.svg`.
- No usar `#3FFF00` (era el verde neón anterior).
- `logo_url` de configuración ya no define favicon ni íconos; solo se usa en el PDF de la ficha. Se sube a Cloudinary (`services/logo.ts`, guarda también `logo_public_id`): el disco de Netlify es efímero, así que nunca escribir en `public/` desde una ruta.
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
- **Confirmaciones y avisos:** nunca `window.confirm`/`alert`. Usar `const confirmar = useConfirm()` y `if (!(await confirmar('¿Eliminar…?', { peligro: true }))) return;`. Opciones: `titulo`, `textoConfirmar`, `textoCancelar`, `peligro` (botón rojo), `soloAviso` (un solo botón, reemplaza a `alert`).
- **Accesibilidad:** botones de solo ícono con `aria-label`. Si un elemento clickeable no puede ser `<button>` (tarjeta, opción de lista), usar `{...propsActivable(accion, 'button' | 'option')}` de `utils/accesible.ts`, que agrega `role`, `tabIndex` y Enter/Espacio.
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

## PWA: instalación y versiones

- **Versión del build:** `next.config.js` define `APP_VERSION` por build (`DEPLOY_ID` o un timestamp) y la incrusta en el bundle. `GET /api/version` (pública, `no-store`) devuelve la versión desplegada.
- **Detección de versión nueva:** `src/lib/pwa.ts` compara ambas al abrir la app, al volver a ella (`visibilitychange`) y cada 5 minutos. Si difieren, `AppPwa` muestra el aviso "Hay una nueva versión disponible". El botón **Actualizar** borra las cachés y recarga.
- **Instalación:** el login muestra **"Descargar la app"**.
  - Chrome, Edge y Android: usa `beforeinstallprompt`.
  - iOS/iPadOS: muestra los pasos de Safari (Compartir → Agregar a inicio).
  - El botón se oculta si la app ya está instalada (`display-mode: standalone`) o si el navegador no permite instalar.
- El service worker solo se registra en producción.

## Reglas de trabajo (preferencias del usuario)

- Hablar en español.
- Antes de codificar: correr `git fetch`, comparar con `origin/main` y hacer `git pull --ff-only` si hay cambios (avisar si hay cambios locales o divergencia). Reinstalar dependencias si cambió `package.json` o el lockfile.
- **No hacer testing** (tsc, lint, build, curl, Playwright, capturas) salvo que se pida explícitamente.
- **No commitear ni desplegar** por iniciativa propia: los cambios se acumulan en el árbol de trabajo hasta recibir la orden.
- Nunca commitear `.env*` ni credenciales.
