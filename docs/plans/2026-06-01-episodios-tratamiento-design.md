# Diseño: Episodios de Tratamiento

Fecha: 2026-06-01
Estado: Aprobado (pendiente de implementar)

## Problema

Hoy el sistema trata al **paciente como una sola unidad permanente**:

- **Ficha clínica única**: los campos `lesion_consulta`, `objetivo_paciente`, `evaluacion_fisica` y
  `evaluacion_final` son una sola columna en la tabla `pacientes`. No se puede tener "lesión 1" y "lesión 2".
- **Sesiones pegadas al paciente para siempre**: en `src/app/api/sesiones/route.ts` el número de sesión se
  calcula como `COUNT(*) de TODAS las sesiones del paciente + 1`. Al volver, el paciente sigue en "sesión 15"
  en vez de "sesión 1".
- **Dar de alta / reactivar solo cambia `estado_paciente`**, pero no separa el tratamiento viejo del nuevo.
  Todo queda mezclado: gráficos de dolor, progreso, historial.

Falta el concepto de **episodio de tratamiento** (o "caso" / "motivo de consulta"). Un paciente debe poder
tener varios episodios a lo largo del tiempo, cada uno con su propia lesión, sus sesiones numeradas desde 1 y
su evaluación final.

## Decisiones tomadas

- **Historial separado por episodios**: el tratamiento anterior queda como un episodio cerrado y consultable.
- **Inicio de episodio nuevo: ambas vías** — al reactivar un paciente de alta (con pregunta) y mediante un
  botón manual "Nuevo episodio".
- **Migración de datos existentes: todos a un "Episodio 1"** — ningún dato se pierde.

## Modelo de datos

### Paciente (datos permanentes)
- Datos personales: nombre, RUT, teléfono, email, fecha de nacimiento, dirección.
- Antecedentes generales que no cambian con la lesión: deportes, alimentación, agua, descanso, estado
  psicológico, digestión.

### Episodio (datos por tratamiento) — nueva tabla `episodios`
- `id`
- `paciente_id`
- `numero_episodio` (1, 2, 3...)
- `motivo_lesion` (antes `lesion_consulta`)
- `objetivo` (antes `objetivo_paciente`)
- `evaluacion_fisica`
- `evaluacion_final`
- `estado` (`en_tratamiento` / `alta` / `receso`) — se mueve desde el paciente al episodio
- `fecha_inicio`
- `fecha_cierre`
- `created_at`

### Sesiones
- Se agrega columna `episodio_id`.
- `numero_sesion` se calcula como `COUNT(*) de sesiones de ESE episodio + 1` (vuelve a empezar en 1 por
  episodio).

### Migración (Episodio 1)
- A cada paciente existente se le crea automáticamente un "Episodio 1" con su lesión/objetivo/evaluación y
  estado actuales.
- Todas sus sesiones actuales se reasignan a ese Episodio 1, conservando su numeración.

## Flujos e interfaz

### Flujo A — Reactivar un paciente de alta
- Al reactivar un paciente "de alta" aparece la pregunta: *¿Vuelve por la misma lesión o por una nueva?*
  - **Misma lesión** → reabre el episodio actual (sigue numeración de sesiones).
  - **Nueva lesión** → cierra el episodio anterior (histórico) y abre uno nuevo pidiendo nueva lesión,
    objetivo y evaluación física. Sesiones desde 1.

### Flujo B — Botón manual "Nuevo episodio / Nueva lesión"
- Disponible siempre en la ficha del paciente.
- Cierra el episodio en curso (si lo hay) y abre uno nuevo con su formulario de lesión/objetivo.

### Interfaz del paciente
- Selector de episodios (ej: "Episodio 2 — Esguince tobillo (actual)" / "Episodio 1 — Lumbalgia (cerrado)").
- Al cambiar de episodio se ven solo las sesiones, evaluación y gráficos de dolor de ESE episodio.
- El episodio actual es el que se usa al crear sesiones nuevas.

### Módulo de sesiones
- Al crear una sesión, se asocia automáticamente al episodio activo del paciente.
- Numeración y gráficos de progreso por episodio, no por paciente.

### Estados
- El estado (en tratamiento / alta / receso) pasa a ser del episodio.
- Un paciente con todos sus episodios cerrados se considera "sin tratamiento activo".

## Resumen de impacto

| Área | Cambio |
|---|---|
| Base de datos | Nueva tabla `episodios` + columna `episodio_id` en `sesiones` + migración Episodio 1 |
| API | `sesiones` numera por episodio; nuevos endpoints para crear/cerrar episodios; `estado` se mueve al episodio |
| UI Pacientes | Selector de episodios, botón "Nuevo episodio", pregunta al reactivar |
| UI Sesiones | Filtrado y numeración por episodio |

## Archivos involucrados (referencia)

- `src/lib/db.ts` — schema + migración
- `src/app/api/sesiones/route.ts` — numeración por episodio
- `src/app/api/pacientes/[id]/estado/route.ts` — estado a nivel episodio
- `src/app/api/pacientes/[id]/historial/route.ts` — historial agrupado por episodio
- `src/app/dashboard/components/PacientesModule.tsx` — selector + botón nuevo episodio
- `src/app/dashboard/components/FichaCompletaModal.tsx` — vista por episodio
- `src/app/dashboard/components/SesionesModule.tsx` — filtrado/numeración por episodio
- Nuevos endpoints: `src/app/api/pacientes/[id]/episodios/` (crear/cerrar/listar)
