# Módulo: Sesiones

Archivo: `src/app/dashboard/components/SesionesModule.tsx`
Tamaño: ~175 KB / ~3576 líneas

---

## Responsabilidad

Registro y seguimiento de las sesiones de tratamiento. Muestra una vista de acordeón por paciente, permite completar sesiones con datos clínicos (dolor, movilidad, fuerza, ejercicios), copiar ejercicios de sesiones anteriores y programar la siguiente sesión.

---

## Props

```ts
{
  onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void;
  initialPacienteId?: number; // expande automáticamente ese paciente al montar
}
```

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `sesiones` | `any[]` | Todas las sesiones cargadas desde API |
| `pacientes` | `any[]` | Lista de pacientes para el selector/filtro |
| `pacienteExpandido` | `string \| null` | ID del paciente cuyo acordeón está abierto |
| `completarForm` | `object` | Datos del mini-modal "Completar sesión" |
| `showModalCompletar` | `boolean` | Controla visibilidad del mini-modal |
| `showFichaModal` | `boolean` | Abre `FichaCompletaModal` desde sesiones |

---

## Endpoints que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/sesiones` | Lista sesiones con datos del paciente (LEFT JOIN) |
| `POST` | `/api/sesiones` | Crea sesión; asigna `episodio_id` automáticamente via `asegurarEpisodio` |
| `PUT` | `/api/sesiones/[id]` | Edita sesión |
| `DELETE` | `/api/sesiones/[id]` | Elimina sesión |
| `PUT` | `/api/sesiones/[id]/completar` | Solo campos clínicos; auto-setea `estado = 'completada'` |
| `GET` | `/api/ejercicios` | Catálogo de ejercicios disponibles |
| `POST` | `/api/ejercicios` | Crea ejercicio nuevo desde el mini-modal |
| `GET` | `/api/pacientes` | Para el filtro de nombre |
| `PUT` | `/api/pacientes/[id]/estado` | Cambia estado del episodio activo desde sesiones |

---

## Modelo de datos — tabla `sesiones`

```sql
id, paciente_id, episodio_id, cita_id,
fecha TEXT, hora TEXT, duracion INTEGER,
tipo TEXT, estado TEXT (programada/completada/cancelada),
numero_sesion INTEGER,          -- se cuenta por episodio_id
notas_sesion TEXT,
ejercicios_realizados TEXT,     -- JSON serializado
observaciones TEXT,
dolor_inicial INTEGER (0-10),
dolor_final INTEGER (0-10),
borg_percepcion INTEGER (0-10), -- escala de esfuerzo percibido
movilidad TEXT,
fuerza TEXT,
progreso_general TEXT,
recomendaciones TEXT,
proxima_sesion TEXT,
created_at, updated_at
```

---

## Lógica de numeración por episodio

Al hacer `POST /api/sesiones`, el backend llama a `asegurarEpisodio(pacienteId)` de `src/lib/episodios.ts` para obtener o crear el episodio activo. Luego calcula:

```sql
SELECT COUNT(*) FROM sesiones
WHERE episodio_id = ? AND estado != 'cancelada'
```

El resultado + 1 es el `numero_sesion` de la nueva sesión. Si el paciente inicia un Episodio 2, las sesiones vuelven a empezar desde 1.

---

## `useMemo` de métricas por paciente

El componente agrupa sesiones por `paciente_id` con `useMemo` y calcula por cada grupo:

- `totalCompletadas` — conteo de sesiones `estado = 'completada'`
- `tendenciaDolor` — compara `dolor_final` de las últimas 2 sesiones completadas (↑↓↔)
- `ultimaMovilidad` / `ultimaFuerza` — valor de la sesión completada más reciente
- `proximaPendiente` — sesión con `estado != 'completada'` más próxima en fecha

Ordenamiento: pacientes con sesión pendiente primero, luego alfabético por nombre.

---

## Mini-modal "Completar Sesión"

Campos del form `completarForm`:

```ts
{
  dolorInicial: number,      // slider 0-10
  dolorFinal: number,        // slider 0-10
  borgPercepcion: number,    // slider 0-10
  movilidad: string,         // 'Normal' | 'Limitada' | 'Muy limitada'
  fuerza: string,            // 'Normal' | 'Reducida' | 'Muy reducida'
  progresoGeneral: string,   // chips: 'Mejoría' | 'Sin cambios' | 'Empeoramiento'
  ejerciciosRealizados: Array<{
    ejercicioId: number;
    nombre: string;
    peso?: string;
    repeticiones?: string;
    tiempo?: string;
    carga?: string;
    notas?: string;
  }>,
  observaciones: string,
  recomendaciones: string
}
```

**Copiar ejercicios**: al abrir el modal, si el paciente tiene una sesión completada anterior, se ofrece copiar su lista de `ejercicios_realizados` como punto de partida.

---

## Mini-modal "Programar Siguiente Sesión"

Aparece automáticamente después de completar una sesión. Solo pide `fecha` y `hora`. Crea una nueva sesión con `estado = 'programada'` asociada al mismo paciente y episodio.

---

## Tabla `ejercicios`

```sql
id, nombre TEXT, descripcion TEXT, categoria TEXT, created_at
```

Los ejercicios realizados en una sesión se almacenan como JSON en `sesiones.ejercicios_realizados`, referenciando el `ejercicioId` del catálogo.

---

## Archivos relacionados

```
src/app/api/sesiones/route.ts
src/app/api/sesiones/[id]/route.ts
src/app/api/sesiones/[id]/completar/route.ts
src/app/api/sesiones/estadisticas/route.ts
src/app/api/ejercicios/route.ts
src/app/api/ejercicios/[id]/route.ts
src/lib/episodios.ts           -- asegurarEpisodio()
```
