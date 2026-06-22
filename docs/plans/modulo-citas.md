# Módulo: Citas

Archivo: `src/app/dashboard/components/CitasModule.tsx`
Tamaño: ~93 KB / ~2147 líneas

---

## Responsabilidad

Agenda del kinesiólogo: creación, edición y eliminación de citas, vistas de calendario (mes/semana/hoy/lista), citas recurrentes, bloqueo de horarios y envío de recordatorios WhatsApp (manual y masivo).

---

## Props

Este componente no recibe props; carga todos sus datos internamente.

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `vistaCalendario` | `'mes' \| 'semana' \| 'lista' \| 'hoy'` | Vista activa |
| `fechaActual` | `Date` | Mes/semana que se está visualizando |
| `citas` | `any[]` | Citas cargadas desde API |
| `pacientes` | `any[]` | Para el selector del formulario |
| `horariosBloqueados` | `any[]` | Bloques que se marcan como ocupados en calendario |
| `enviandoMasivo` | `boolean` | Lock durante envío masivo de recordatorios |
| `resultadoMasivo` | `any` | Resumen del resultado del envío masivo |

---

## Endpoints que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/citas` | Lista citas (con LEFT JOINs a recordatorios y sesiones) |
| `POST` | `/api/citas` | Crea cita (valida conflictos de horario con CAST/substr) |
| `PUT` | `/api/citas/[id]` | Edita cita |
| `DELETE` | `/api/citas/[id]` | Elimina cita + cascade: recordatorios + sesiones |
| `POST` | `/api/citas/recurrentes` | Crea N citas semanales para un paciente |
| `POST` | `/api/citas/recordatorios-masivos` | Envía WhatsApp a todos los pacientes del día |
| `GET` | `/api/citas/recordatorios-masivos` | Resumen de recordatorios del día |
| `GET` | `/api/horarios-bloqueados` | Lista bloqueos |
| `POST` | `/api/horarios-bloqueados` | Crea bloqueo |
| `DELETE` | `/api/horarios-bloqueados/[id]` | Elimina bloqueo |
| `GET` | `/api/pacientes` | Para el selector de pacientes |

---

## Modelo de datos — tabla `citas`

```sql
id, paciente_id, fecha TEXT, hora TEXT, duracion INTEGER (minutos),
tipo TEXT, estado TEXT (pendiente/confirmada/cancelada/completada),
notas TEXT, created_at, updated_at
FOREIGN KEY paciente_id → pacientes(id) ON DELETE CASCADE
```

---

## Modelo de datos — tabla `recordatorios`

```sql
id, cita_id, mensaje_id, telefono, mensaje,
estado TEXT (enviado/confirmado/cancelado/reagendar),
respuesta TEXT, respuesta_at, mensaje_respuesta_id,
mensaje_respuesta_enviado INTEGER, error_respuesta, enviado_at
FOREIGN KEY cita_id → citas(id) ON DELETE CASCADE
```

---

## Flujos clave

### Detección de conflictos de horario
El backend en `POST /api/citas` calcula el intervalo con:
```sql
CAST(substr(hora, 1, 2) AS INTEGER) * 60 + CAST(substr(hora, 4, 2) AS INTEGER)
```
Compatible con Turso/SQLite (no usa `time()` con modificadores dinámicos).

### Citas recurrentes
`POST /api/citas/recurrentes` recibe `diasSemana[]`, `cantidadSemanas`, `horaInicio`, `duracion`, `tipo`. Genera N citas en batch.

### Recordatorios masivos
`POST /api/citas/recordatorios-masivos` busca todas las citas del día con estado `pendiente` y sin recordatorio enviado, llama a la API de WhatsApp por cada una, y devuelve un resumen `{ enviados, errores, omitidos }`.

### Badge de estado recordatorio
El `GET /api/citas` retorna por cada cita el estado del recordatorio más reciente mediante LEFT JOIN:
- `📤` enviado — `✅` confirmado — `❌` cancelado — `📅` reagendar

### Webhook de respuesta WhatsApp
Separado en `src/app/api/webhook/`. Cuando el paciente responde al recordatorio, el webhook actualiza el campo `estado` en `recordatorios`. Ventana de respuesta: 24 horas desde el envío.

---

## Hook auxiliar

`useTouchDrag` — `src/app/dashboard/hooks/useTouchDrag.ts`
Detecta swipe horizontal en móvil para cambiar de semana/mes en el calendario.

---

## Archivos relacionados

```
src/app/api/citas/route.ts
src/app/api/citas/[id]/route.ts
src/app/api/citas/recurrentes/route.ts
src/app/api/citas/recordatorios-masivos/route.ts
src/app/api/citas/estadisticas/route.ts
src/app/api/horarios-bloqueados/route.ts
src/app/api/horarios-bloqueados/[id]/route.ts
src/app/api/webhook/
src/app/dashboard/hooks/useTouchDrag.ts
```
