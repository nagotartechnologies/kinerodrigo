# Base de Datos — Schema y Documentación

> El sistema usa **Turso** (SQLite distribuido en la nube) como base de datos de producción.
> En el repositorio existen 3 archivos `.db` locales usados durante el desarrollo. Este documento los explica y documenta todas las tablas.

---

## Los 3 archivos `.db` del proyecto

| Archivo | Tablas | Registros clave | Estado |
|---|---|---|---|
| `database.db` | 10 tablas (schema v1) | 6 pacientes, 8 sesiones | Obsoleto — versión de desarrollo temprano, sin episodios ni gastos |
| `kine-citas.db` | 16 tablas (schema v2) | 73 pacientes, 665 sesiones, 71 episodios | Schema completo actual.

**El archivo activo en producción es Turso**, no estos archivos locales. Los `.db` son backups/snapshots de desarrollo y no deben confundirse con la fuente de verdad.

> ⚠️ `database.db` es la versión 1 del schema. Le faltan las tablas: `episodios`, `gastos`, `gastos_fijos`, `categorias_gastos`, `documentos_paciente`, `historial_estados_paciente`, `ejercicios`.

---

## Diagrama de relaciones

```
usuarios
    └── evaluaciones (usuario_id)
    └── planes_rehabilitacion (usuario_id)

pacientes
    ├── citas (paciente_id)  ──→  recordatorios (cita_id)
    │                        ──→  sesiones (cita_id, opcional)
    ├── sesiones (paciente_id)
    │       └── pagos (sesion_id, opcional)
    ├── pagos (paciente_id)
    ├── episodios (paciente_id)
    │       └── sesiones.episodio_id → episodios.id
    ├── documentos_paciente (paciente_id)
    └── historial_estados_paciente (paciente_id)

gastos_fijos
    └── gastos (gasto_fijo_id, opcional)

categorias_gastos  (referenciada por texto en gastos y gastos_fijos)

horarios_bloqueados  (tabla independiente)
configuraciones      (tabla independiente, clave-valor)
ejercicios           (catálogo independiente)
```

---

## Tablas — detalle completo

---

### `usuarios`

Personas con acceso al dashboard (kinesiólogos o administradores).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `email` | TEXT UNIQUE | Email de login |
| `password` | TEXT | Hash bcrypt |
| `nombre` | TEXT | Nombre |
| `apellido` | TEXT | Apellido |
| `telefono` | TEXT | Opcional |
| `fecha_nacimiento` | TEXT | Opcional |
| `activo` | INTEGER | `1` = activo, `0` = desactivado |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

---

### `pacientes`

Registro permanente de cada paciente. Los datos clínicos por lesión viven en `episodios`, no aquí.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `nombre` | TEXT NOT NULL | Nombre completo |
| `rut` | TEXT | RUT (único en v1, no único en v2) |
| `telefono` | TEXT | Teléfono de contacto |
| `edad` | INTEGER | Edad |
| `altura` | REAL | Altura en cm |
| `peso` | REAL | Peso en kg |
| `ocupacion` | TEXT | Ocupación |
| `enfermedades` | TEXT | Antecedentes patológicos |
| `enfermedades_hereditarias` | TEXT | Antecedentes familiares |
| `medicamentos` | TEXT | Medicamentos actuales |
| `alergias` | TEXT | Alergias conocidas |
| `cirugias` | TEXT | Cirugías previas |
| `deportes` | TEXT | Actividad física que realiza |
| `alimentacion` | TEXT | Descripción del hábito alimentario |
| `consumo_agua` | TEXT | Litros aproximados por día |
| `descanso` | TEXT | Calidad y horas de sueño |
| `psicologicamente` | TEXT | Estado emocional/psicológico |
| `digestion` | TEXT | Estado digestivo |
| `lesion_consulta` | TEXT | **Heredado (v1).** En v2 vive en `episodios.motivo_lesion` |
| `objetivo_paciente` | TEXT | **Heredado (v1).** En v2 vive en `episodios.objetivo` |
| `evaluacion_fisica` | TEXT | **Heredado (v1).** En v2 vive en `episodios.evaluacion_fisica` |
| `evaluacion_final` | TEXT | **Heredado (v1).** En v2 vive en `episodios.evaluacion_final` |
| `sesiones_programadas` | INTEGER | Total de sesiones del plan (referencial) |
| `estado_tratamiento` | TEXT | **Heredado (v1).** En v2 el estado vive en `episodios.estado` |
| `estado_paciente` | TEXT | **Heredado (v1).** Valores: `activo / alta / abandono` |
| `activo` | INTEGER | `1` = visible, `0` = soft-delete |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

> Los campos "heredado (v1)" se mantienen por compatibilidad hacia atrás pero el sistema los sincroniza desde/hacia `episodios` al leer/escribir.

---

### `episodios`

Cada vez que un paciente inicia tratamiento por una lesión, se crea un episodio. Un paciente puede tener N episodios a lo largo del tiempo.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `numero_episodio` | INTEGER | 1, 2, 3… por paciente |
| `motivo_lesion` | TEXT | Descripción de la lesión/motivo de consulta |
| `objetivo` | TEXT | Meta del tratamiento |
| `evaluacion_fisica` | TEXT | Evaluación inicial del kinesiólogo |
| `evaluacion_final` | TEXT | Resultado al cerrar el episodio |
| `estado` | TEXT | `en_tratamiento` / `alta` / `receso` |
| `fecha_inicio` | TEXT | ISO 8601 |
| `fecha_cierre` | TEXT | ISO 8601, null si está activo |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

**Regla de negocio:** solo puede haber un episodio con `estado = 'en_tratamiento'` por paciente a la vez. Al crear uno nuevo, el anterior se cierra con `fecha_cierre = NOW` y `estado = 'alta'`.

---

### `citas`

Agenda del kinesiólogo. Cada cita es un bloque de tiempo reservado para un paciente.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `fecha` | TEXT | Formato `YYYY-MM-DD` |
| `hora` | TEXT | Formato `HH:MM` |
| `duracion` | INTEGER | Minutos (default 60) |
| `tipo` | TEXT | `Kinesioterapia`, `Evaluación`, `Control`, etc. |
| `estado` | TEXT | `pendiente` / `confirmada` / `cancelada` / `completada` |
| `notas` | TEXT | Observaciones opcionales |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

**Restricción de horario:** la API valida que no existan dos citas del mismo día que se solapen en el tiempo, usando cálculo de minutos con `CAST(substr(hora,1,2)*60 + substr(hora,4,2))`.

---

### `sesiones`

Registro clínico de cada atención. Una sesión puede estar asociada a una cita (agenda) o crearse directamente.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `episodio_id` | INTEGER FK | → `episodios.id` (agregado en v2) |
| `cita_id` | INTEGER FK | → `citas.id` ON DELETE SET NULL (opcional) |
| `fecha` | TEXT | Formato `YYYY-MM-DD` |
| `hora` | TEXT | Formato `HH:MM` |
| `duracion` | INTEGER | Minutos |
| `tipo` | TEXT | Tipo de sesión |
| `estado` | TEXT | `programada` / `completada` / `cancelada` |
| `numero_sesion` | INTEGER | Numeración automática **por episodio** (1, 2, 3…) |
| `notas_sesion` | TEXT | Notas generales |
| `ejercicios_realizados` | TEXT | JSON serializado: array de `{ejercicioId, nombre, peso, repeticiones, tiempo, carga, notas}` |
| `observaciones` | TEXT | Observaciones clínicas |
| `dolor_inicial` | INTEGER | Escala 0-10 al inicio |
| `dolor_final` | INTEGER | Escala 0-10 al final |
| `borg_percepcion` | INTEGER | Escala de esfuerzo percibido 0-10 |
| `movilidad` | TEXT | `Normal` / `Limitada` / `Muy limitada` |
| `fuerza` | TEXT | `Normal` / `Reducida` / `Muy reducida` |
| `progreso_general` | TEXT | `Mejoría` / `Sin cambios` / `Empeoramiento` |
| `recomendaciones` | TEXT | Indicaciones al paciente |
| `proxima_sesion` | TEXT | Fecha sugerida siguiente sesión |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

---

### `recordatorios`

Mensajes de WhatsApp enviados por cada cita, y su estado de respuesta.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `cita_id` | INTEGER FK | → `citas.id` ON DELETE CASCADE |
| `mensaje_id` | TEXT | ID del mensaje devuelto por Green API |
| `telefono` | TEXT | Número de destino (con código de país) |
| `mensaje` | TEXT | Texto enviado |
| `estado` | TEXT | `enviado` / `confirmado` / `cancelado` / `reagendar` |
| `respuesta` | TEXT | Texto de la respuesta del paciente |
| `respuesta_at` | TEXT | Timestamp de la respuesta |
| `mensaje_respuesta_id` | TEXT | ID del mensaje de respuesta automática enviado |
| `mensaje_respuesta_enviado` | INTEGER | `1` si ya se envió la respuesta automática |
| `error_respuesta` | TEXT | Error al enviar la respuesta automática |
| `enviado_at` / `created_at` | TEXT | ISO 8601 |

**Ventana de respuesta:** el webhook acepta respuestas hasta 24 horas después de `enviado_at`.

---

### `pagos`

Ingresos por atención de pacientes (módulo Finanzas, pestaña movimientos tipo "ingreso").

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `sesion_id` | INTEGER FK | → `sesiones.id` ON DELETE SET NULL (opcional) |
| `monto` | REAL | Monto en CLP |
| `metodo_pago` | TEXT | `Efectivo` / `Transferencia` / `Tarjeta` |
| `estado` | TEXT | `pendiente` / `completado` |
| `fecha_pago` | TEXT | Formato `YYYY-MM-DD` |
| `concepto` | TEXT | Descripción del pago |
| `notas` | TEXT | Observaciones |
| `numero_factura` | TEXT | Referencia de factura si aplica |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

---

### `gastos`

Egresos de la clínica (arriendo, insumos, servicios, etc.).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `categoria` | TEXT | Nombre de la categoría (texto libre, referencia a `categorias_gastos.nombre`) |
| `descripcion` | TEXT | Descripción del gasto |
| `monto` | REAL | Monto en CLP |
| `estado` | TEXT | `pendiente` / `pagado` |
| `fecha_gasto` | TEXT | Formato `YYYY-MM-DD` |
| `metodo_pago` | TEXT | Cómo se pagó |
| `notas` | TEXT | Observaciones |
| `gasto_fijo_id` | INTEGER FK | → `gastos_fijos.id` ON DELETE SET NULL (si fue generado automáticamente) |
| `created_at` | TEXT | ISO 8601 |

---

### `gastos_fijos`

Plantillas de gastos recurrentes que se auto-generan en `gastos` cada mes.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `categoria` | TEXT | Categoría del gasto |
| `descripcion` | TEXT | Ej: "Arriendo local" |
| `monto` | REAL | Monto mensual fijo |
| `activo` | INTEGER | `1` = se genera cada mes, `0` = pausado |
| `dia_generacion` | INTEGER | Día del mes en que se genera (1-28) |
| `created_at` | TEXT | ISO 8601 |

---

### `categorias_gastos`

Catálogo de categorías de gastos, personalizable con color.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `nombre` | TEXT UNIQUE | Nombre de la categoría |
| `color` | TEXT | Color hex (ej: `#ef4444`) |
| `created_at` | TEXT | ISO 8601 |

Categorías por defecto: `Arriendo`, `Servicios`, `Insumos`, `Materiales`, `Otros`.

---

### `ejercicios`

Catálogo de ejercicios disponibles para asignar en sesiones.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `nombre` | TEXT UNIQUE | Nombre del ejercicio |
| `descripcion` | TEXT | Descripción opcional |
| `categoria` | TEXT | Agrupación (ej: "Fuerza", "Movilidad") |
| `created_at` | TEXT | ISO 8601 |

Los ejercicios realizados en una sesión se guardan como JSON en `sesiones.ejercicios_realizados`, referenciando el `id` de esta tabla.

---

### `documentos_paciente`

Archivos subidos a la ficha del paciente (imágenes, PDFs). El archivo real vive en Cloudinary; aquí se guarda la referencia.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `nombre` | TEXT | Nombre del archivo |
| `tipo` | TEXT | `imagen` / `pdf` / `documento` |
| `url` | TEXT | URL pública de Cloudinary |
| `public_id` | TEXT | ID de Cloudinary para poder eliminar el archivo |
| `formato` | TEXT | Extensión (jpg, png, pdf…) |
| `tamano` | INTEGER | Tamaño en bytes |
| `created_at` | TEXT | ISO 8601 |

---

### `horarios_bloqueados`

Franjas horarias en las que no se puede agendar citas (vacaciones, feriados, hora de almuerzo, etc.).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `fecha` | TEXT | Formato `YYYY-MM-DD` |
| `hora_inicio` | TEXT | Formato `HH:MM` |
| `hora_fin` | TEXT | Formato `HH:MM` |
| `motivo` | TEXT | Descripción del bloqueo |
| `tipo` | TEXT | `bloqueo` / `feriado` / `vacaciones` |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

---

### `configuraciones`

Tabla clave-valor para toda la configuración del sistema (una sola fila por ajuste).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `clave` | TEXT UNIQUE | Identificador (ej: `horario_apertura`) |
| `valor` | TEXT | Valor actual |
| `tipo` | TEXT | `text` / `number` / `boolean` / `email` / `time` / `image` / `textarea` |
| `categoria` | TEXT | `general` / `citas` / `pagos` / `notificaciones` / `whatsapp` |
| `descripcion` | TEXT | Explicación del ajuste |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

---

### `historial_estados_paciente`

Log de auditoría de cada cambio de estado de un paciente (activo → alta → receso, etc.).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `paciente_id` | INTEGER FK | → `pacientes.id` ON DELETE CASCADE |
| `estado_anterior` | TEXT | Estado previo (puede ser null si es el primero) |
| `estado_nuevo` | TEXT | Estado después del cambio |
| `motivo` | TEXT | Razón del cambio |
| `notas` | TEXT | Observaciones adicionales |
| `created_at` | TEXT | ISO 8601 |

---

### `evaluaciones` y `planes_rehabilitacion`

Tablas del schema v1 que quedaron del diseño inicial. **No están siendo usadas actualmente** por ningún módulo del dashboard. La información clínica se gestiona directamente en `episodios` y `sesiones`.

---

## Resumen de conteos actuales (kine-citas.db / rodrigo.db)

| Tabla | Registros |
|---|---|
| pacientes | 73 |
| citas | 713 |
| sesiones | 665 |
| episodios | 71 |
| recordatorios | 658 |
| ejercicios | 186 |
| pagos | 22 |
| usuarios | 2 |
| categorias_gastos | 5 |
| documentos_paciente | 2 |
| horarios_bloqueados | 2 |
| historial_estados_paciente | 45 |
| gastos | 0 |
| gastos_fijos | 0 |

---

## Evolución del schema (versiones)

| Versión | Archivo local | Tablas nuevas respecto a la anterior |
|---|---|---|
| v1 | `database.db` | Schema original: `usuarios`, `pacientes`, `citas`, `sesiones`, `recordatorios`, `pagos`, `configuraciones`, `evaluaciones`, `planes_rehabilitacion`, `horarios_bloqueados` |
| v2 | `kine-citas.db` / `rodrigo.db` | `episodios`, `ejercicios`, `gastos`, `gastos_fijos`, `categorias_gastos`, `documentos_paciente`, `historial_estados_paciente` + columnas `borg_percepcion` y `episodio_id` en `sesiones` |
