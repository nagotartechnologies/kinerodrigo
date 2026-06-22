# Componente: FichaCompletaModal + Episodios

Archivo principal: `src/app/dashboard/components/FichaCompletaModal.tsx`
Tamaño: ~70 KB / ~1800 líneas aprox.

Librería de lógica de episodios: `src/lib/episodios.ts`

---

## Responsabilidad

Modal que concentra toda la historia clínica de un paciente, organizada por episodio de tratamiento. Es el componente "hoja de vida" del paciente. Se usa tanto desde `PacientesModule` como desde `SesionesModule`.

---

## Props

```ts
{
  pacienteId: number;
  onClose: () => void;
  onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void;
  configuraciones?: Record<string, { valor: any }>;
}
```

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `episodios` | `any[]` | Lista de todos los episodios del paciente |
| `episodioSeleccionado` | `any` | Episodio activo en el selector de chips |
| `episodioActualId` | `number \| null` | ID del episodio `en_tratamiento` actual |
| `sesiones` | `any[]` | Sesiones del episodio seleccionado |
| `showModalNuevoEpisodio` | `boolean` | Modal formulario nuevo episodio |
| `showModalReactivar` | `boolean` | Modal pregunta misma/nueva lesión |

---

## Endpoints que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pacientes/[id]/historial` | Episodios + sesiones + episodioActualId |
| `POST` | `/api/pacientes/[id]/episodios` | Crea un nuevo episodio |
| `PUT` | `/api/pacientes/[id]/episodios/[episodioId]` | Edita datos del episodio (evaluación final, etc.) |
| `PUT` | `/api/pacientes/[id]/estado` | Cambia estado del episodio activo |
| `GET` | `/api/pacientes/[id]/documentos` | Documentos Cloudinary del paciente |
| `POST` | `/api/pacientes/[id]/documentos` | Sube documento |
| `DELETE` | `/api/pacientes/[id]/documentos` | Elimina documento |

---

## Modelo de datos — tabla `episodios`

```sql
id, paciente_id, numero_episodio INTEGER,
motivo_lesion TEXT,   -- antes lesion_consulta en pacientes
objetivo TEXT,        -- antes objetivo_paciente en pacientes
evaluacion_fisica TEXT,
evaluacion_final TEXT,
estado TEXT (en_tratamiento / alta / receso),
fecha_inicio TEXT, fecha_cierre TEXT,
created_at, updated_at
FOREIGN KEY paciente_id → pacientes(id) ON DELETE CASCADE
```

---

## Endpoint `/api/pacientes/[id]/historial`

Devuelve:

```ts
{
  paciente: object,
  episodios: Episodio[],          // ordenados por numero_episodio DESC
  episodioActualId: number | null,
  sesiones: Array<Sesion & { episodioId: number }>
}
```

El frontend filtra `sesiones` en el cliente por `episodioId === episodioSeleccionado.id`.

---

## Selector de episodios (chips)

Se renderiza uno por episodio. El chip activo corresponde a `episodioSeleccionado`. Al cambiar:
- Las sesiones mostradas son las del episodio seleccionado.
- El gráfico de dolor usa solo esas sesiones.
- Los campos de evaluación final y motivo de consulta cambian al del episodio seleccionado.
- Si el episodio está cerrado, los campos son de solo lectura (badge "Histórico").

---

## Flujos de episodios

### Nuevo episodio (botón manual)

1. Clic en "Nuevo Episodio" → modal con `motivoLesion`, `objetivo`, `evaluacionFisica`.
2. `POST /api/pacientes/[id]/episodios` → crea episodio con `numero_episodio = MAX + 1`, `estado = 'en_tratamiento'`.
3. El episodio anterior queda con `estado = 'alta'` y `fecha_cierre = NOW`.

### Reactivar paciente de alta

1. El botón "Reactivar" solo aparece si `episodioActual.estado === 'alta'`.
2. Modal pregunta: **¿Misma lesión o nueva lesión?**
   - **Misma lesión** → `PUT /api/pacientes/[id]/estado` con `estado = 'activo'` → reabre el episodio (`estado = 'en_tratamiento'`, limpia `fecha_cierre`).
   - **Nueva lesión** → abre el modal de nuevo episodio (igual que el flujo manual).

### Dar de alta

`PUT /api/pacientes/[id]/estado` con `estado = 'alta'` → la API cierra el episodio actual (`fecha_cierre = NOW`, `estado = 'alta'`).

---

## Gráfico de dolor

Se calcula en el cliente a partir de las sesiones del episodio seleccionado. Para cada sesión con `estado = 'completada'` extrae:

- `dolor_inicial` — nivel al inicio de la sesión
- `dolor_final` — nivel al final de la sesión

Se renderiza como un gráfico de líneas SVG inline (sin librería externa).

---

## Librería `src/lib/episodios.ts`

Contiene las funciones de lógica de negocio de episodios, usadas por las rutas API:

```ts
getEpisodioActual(pacienteId): Promise<Episodio | null>
// Devuelve el episodio con estado 'en_tratamiento', o null

asegurarEpisodio(pacienteId): Promise<Episodio>
// Si no hay episodio activo, crea uno (Episodio 1 o migración perezosa).
// Usado en POST /api/sesiones antes de crear cada sesión.

mapearEstadoUI(estadoUI: string): string
// 'activo' → 'en_tratamiento' | 'alta' → 'alta' | 'abandono' → 'receso'

mapearEstadoDB(estadoDB: string): string
// Inverso del anterior
```

---

## Migración de datos existentes

Endpoint idempotente `GET /api/db/migrate/episodios`:

1. Por cada paciente sin episodios, crea Episodio 1 con los campos clínicos actuales de `pacientes`.
2. Reasigna todas sus sesiones a ese Episodio 1 (`UPDATE sesiones SET episodio_id = ?`).
3. Es idempotente: si ya existe un episodio para ese paciente, no hace nada.

Solo se debe correr una vez en producción después de desplegar.

---

## Archivos relacionados

```
src/lib/episodios.ts
src/app/api/pacientes/[id]/historial/route.ts
src/app/api/pacientes/[id]/episodios/route.ts
src/app/api/pacientes/[id]/episodios/[episodioId]/route.ts
src/app/api/pacientes/[id]/estado/route.ts
src/app/api/db/migrate/episodios/route.ts
```
