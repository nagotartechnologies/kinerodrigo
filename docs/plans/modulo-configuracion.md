# Módulo: Configuración

Archivo principal: `src/app/dashboard/components/ConfiguracionModule.tsx`
Tamaño: ~16 KB / ~391 líneas

Subcomponentes en `src/app/dashboard/components/config/`:

- `ConfigGeneral.tsx` (~3.4 KB)
- `ConfigCitas.tsx` (~6.6 KB)
- `ConfigPagos.tsx` (~3 KB)
- `ConfigWhatsApp.tsx` (~8 KB)
- `ConfigUsuarios.tsx` (~9.4 KB)
- `ConfigRespaldos.tsx` (~7.6 KB)

---

## Responsabilidad

Orquesta la configuración del sistema: carga todas las claves desde la BD, las distribuye a cada subcomponente, y expone un modal genérico para editar cualquier clave individualmente.

---

## Props

No recibe props; carga todo desde `/api/configuraciones`.

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `configuraciones` | `ConfigMap` | `Record<string, Configuracion>` indexado por `clave` |
| `modalConfig` | `Configuracion \| null` | Config que se está editando en el modal genérico |

El tipo `ConfigMap` y `Configuracion` están definidos en `src/app/dashboard/types/index.ts`.

---

## Endpoint que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/configuraciones` | Devuelve todas las configuraciones como array |
| `PUT` | `/api/configuraciones` | Guarda o actualiza una clave (upsert) |
| `POST` | `/api/upload` | Sube imagen de logo a Cloudinary |

---

## Modelo de datos — tabla `configuraciones`

```sql
id, clave TEXT UNIQUE, valor TEXT,
tipo TEXT (text/number/boolean/email/time/image/textarea),
categoria TEXT (general/citas/pagos/notificaciones/whatsapp),
descripcion TEXT, created_at, updated_at
```

---

## Claves configurables (seeded por defecto)

### Categoría `general`

| Clave | Tipo | Valor default |
|---|---|---|
| `nombre_centro` | text | `NAGO-KINE` |
| `logo_url` | image | `''` |
| `direccion` | text | `Av. Principal 123` |
| `telefono_contacto` | text | `+56 9 4888 1923` |
| `email_contacto` | email | `contacto@nagokine.cl` |
| `horario_apertura` | time | `09:00` |
| `horario_cierre` | time | `18:00` |

### Categoría `citas`

| Clave | Tipo | Valor default |
|---|---|---|
| `recordatorios_automaticos` | boolean | `true` |
| `recordatorios_horas_antes` | number | `24` |
| `cancelacion_horas_minimas` | number | `2` |
| `permitir_reagendar` | boolean | `true` |

### Categoría `pagos`

| Clave | Tipo | Valor default |
|---|---|---|
| `metodos_pago` | text | `Efectivo,Transferencia,Tarjeta` |
| `tarifa_evaluacion` | number | `25000` |
| `tarifa_tratamiento` | number | `20000` |
| `tarifa_control` | number | `15000` |
| `moneda` | text | `CLP` |

### Categoría `whatsapp`

| Clave | Tipo | Descripción |
|---|---|---|
| `whatsapp_activo` | boolean | Activa/desactiva envíos |
| `whatsapp_provider` | text | Proveedor activo (ej: `green-api`) |
| `whatsapp_mensaje_recordatorio` | textarea | Plantilla con variables `{paciente}`, `{fecha}`, `{hora}`, etc. |
| `whatsapp_mensaje_confirmacion` | textarea | Respuesta auto al confirmar |
| `whatsapp_mensaje_cancelacion` | textarea | Respuesta auto al cancelar |
| `whatsapp_mensaje_reagendamiento` | textarea | Respuesta auto al reagendar |

---

## Subcomponente `ConfigWhatsApp`

Es el más complejo. Gestiona:
- Selector de proveedor (Green API u otro).
- Campos específicos del proveedor (instance ID, token).
- Preview y edición de las 4 plantillas de mensajes.
- Botón de prueba de conexión (`POST /api/whatsapp/test`).

El proveedor activo se lee de la clave `whatsapp_provider` (valor unificado, migrado desde claves separadas por proveedor).

---

## Subcomponente `ConfigRespaldos`

Permite generar y descargar un backup de la BD vía `GET /api/backups`. Útil para exportar datos antes de cambios mayores.

---

## Subcomponente `ConfigUsuarios`

CRUD de usuarios del sistema (kinesiólogos con acceso al dashboard).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/usuarios` | Lista usuarios |
| `POST` | `/api/usuarios` | Crea usuario (bcrypt password) |
| `PUT` | `/api/usuarios/[id]` | Edita usuario |
| `DELETE` | `/api/usuarios/[id]` | Desactiva usuario |

---

## Patrón de acceso a config en otros módulos

`PacientesModule` recibe `configuraciones` como prop desde `page.tsx`. Para leer una clave usa:

```ts
const getConfigValue = (clave: string, defaultValue: any = '') =>
  configuraciones[clave]?.valor ?? defaultValue;
```

Esto permite, por ejemplo, saber la tarifa de evaluación al crear un pago.

---

## Archivos relacionados

```
src/app/dashboard/types/index.ts      -- tipos ConfigMap, Configuracion
src/app/api/configuraciones/route.ts
src/app/api/usuarios/route.ts
src/app/api/usuarios/[id]/route.ts
src/app/api/backups/route.ts
src/app/api/upload/route.ts
src/app/api/whatsapp/
```
