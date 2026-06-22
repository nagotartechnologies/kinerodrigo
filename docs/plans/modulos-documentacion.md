# Documentación de Módulos — KINE CITAS

> Una guía humana para entender qué hace cada parte del sistema, sin necesidad de leer código.

---

## ¿Qué es KINE CITAS?

Es un sistema de gestión clínica para kinesiólogos. Permite manejar pacientes, agendar citas, registrar sesiones de tratamiento, controlar finanzas y configurar el sistema. Todo desde un dashboard web, pensado para ser usado también desde el celular.

---

## Módulos principales

### 1. Pacientes

**¿Qué hace?**
Es el corazón del sistema. Acá está toda la información de cada persona que llega a la clínica.

**¿Qué podés hacer?**
- Registrar un paciente nuevo con sus datos personales (nombre, RUT, teléfono, email, dirección).
- Ver y editar su ficha clínica: qué deporte hace, cómo duerme, cómo come, su estado psicológico.
- Ver sus **episodios de tratamiento** (cada vez que vuelve por una lesión nueva es un episodio distinto).
- Subir documentos o imágenes (radiografías, informes, fotos), que se guardan en la nube.
- Cambiar el estado del paciente (en tratamiento, de alta, en receso).
- Ver todo el historial clínico organizado por episodio.

**¿Cómo se ve?**
Lista de pacientes con buscador. Al hacer clic en uno, se abre la **Ficha Completa** (ver más abajo).

---

### 2. Citas

**¿Qué hace?**
Maneja la agenda del kinesiólogo: qué paciente viene, cuándo y para qué.

**¿Qué podés hacer?**
- Crear citas con fecha, hora, duración y tipo (evaluación, sesión, control).
- Ver el calendario semanal o mensual con las citas del día.
- Ver badges visuales en cada cita: si se envió recordatorio por WhatsApp, si el paciente confirmó, si canceló o quiere reagendar.
- Enviar recordatorios masivos por WhatsApp a todos los pacientes del día con un solo botón.
- Detectar conflictos de horario automáticamente (no podés agendar dos citas al mismo tiempo).
- Eliminar citas (y se eliminan también sus recordatorios automáticamente).

**¿Cómo se ve?**
Un calendario visual con las citas. Hay un botón verde "Recordatorios (N)" que muestra cuántos pacientes faltan de notificar.

---

### 3. Sesiones

**¿Qué hace?**
Registra cada vez que se atiende a un paciente: qué se hizo, cómo evolucionó, qué ejercicios se indicaron.

**¿Qué podés hacer?**
- Ver todas las sesiones agrupadas por paciente (tipo acordeón: hacés clic en el paciente y se despliegan sus sesiones).
- Completar una sesión rápidamente con un mini-modal: nivel de dolor (slider), progreso, movilidad, fuerza, ejercicios realizados.
- Copiar los ejercicios de la sesión anterior del mismo paciente con un botón.
- Ver el gráfico de dolor de cada paciente a lo largo de sus sesiones.
- Filtrar por nombre de paciente o estado (pendiente/completada).
- Las sesiones se numeran automáticamente **por episodio** (si el paciente vuelve por una lesión nueva, las sesiones empiezan desde 1 de nuevo).

**¿Cómo se ve?**
Tarjetas por paciente. Los que tienen sesión pendiente aparecen primero. Cada tarjeta muestra un resumen: cuántas sesiones completadas, nivel de dolor actual con tendencia (↑↓), movilidad y fuerza.

---

### 4. Finanzas

**¿Qué hace?**
Lleva el control económico de la clínica: cuánto entró, cuánto salió, y cómo queda el balance del mes.

**¿Qué podés hacer?**
- Ver el resumen mensual: ingresos, gastos, balance neto y gastos pendientes de pagar.
- Registrar pagos de pacientes (quién pagó, cuánto, por qué sesión).
- Registrar gastos (arriendo, insumos, servicios, materiales, etc.).
- Crear y gestionar **gastos fijos** recurrentes (ej: arriendo mensual) que se generan automáticamente cada mes.
- Crear categorías de gastos personalizadas con color.
- Ver un listado unificado de movimientos (ingresos y gastos juntos) con filtros.
- Navegar por meses anteriores con flechas ◀ ▶.

**¿Cómo se ve?**
4 tarjetas con los números del mes arriba. Abajo, dos pestañas: "Movimientos" y "Gastos Fijos".

---

### 5. Configuración

**¿Qué hace?**
Permite personalizar el sistema para que se adapte al kinesiólogo.

**¿Qué podés hacer?**
- Configurar los horarios de atención (días y horas disponibles).
- Bloquear fechas u horarios específicos (vacaciones, feriados, etc.).
- Conectar o cambiar el proveedor de WhatsApp para envío de recordatorios (Green API u otro).
- Ajustar datos del perfil (nombre del profesional, etc.).

---

## Componentes compartidos

### Ficha Completa del Paciente (`FichaCompletaModal`)

No es un módulo propiamente tal, sino una ventana (modal) que se abre cuando seleccionás un paciente. Concentra toda la información clínica en un solo lugar.

**¿Qué tiene adentro?**
- **Selector de episodios**: chips en la parte superior. Cada episodio representa un período de tratamiento distinto (ej: "Episodio 1 — Lumbalgia" / "Episodio 2 — Esguince tobillo"). Al cambiar de episodio, toda la vista cambia: sesiones, gráfico de dolor y evaluación final corresponden solo a ese episodio.
- **Motivo de consulta y objetivo del episodio**.
- **Evaluación física inicial y evaluación final**.
- **Gráfico de dolor**: línea de tiempo del nivel de dolor en cada sesión del episodio seleccionado.
- **Lista de sesiones** del episodio, con posibilidad de agregar nuevas.
- **Documentos e imágenes**: archivos subidos al perfil del paciente (radiografías, informes).
- **Estado del tratamiento**: botones para cambiar el estado, abrir un nuevo episodio o reactivar al paciente.

---

### Episodios de Tratamiento

No es un módulo visible por sí solo, sino un concepto que atraviesa todo el sistema.

**¿Qué es un episodio?**
Cada vez que un paciente llega por una lesión distinta, se crea un episodio nuevo. Esto permite que:
- Las sesiones vuelvan a numerarse desde 1.
- El historial quede ordenado y separado.
- Los gráficos y evaluaciones no mezclen lesiones distintas.

**¿Cómo se crea uno nuevo?**
- Manualmente: botón "Nuevo Episodio" en la ficha del paciente.
- Al reactivar a un paciente de alta: el sistema pregunta si vuelve por la misma lesión o una nueva.

---

## Flujos comunes

### Atender un paciente nuevo
1. Ir a **Pacientes** → Crear paciente.
2. Agendar una cita en **Citas**.
3. El día de la atención, ir a **Sesiones** → Completar la sesión.
4. Registrar el pago en **Finanzas**.

### Paciente que vuelve después de mucho tiempo
1. Buscarlo en **Pacientes** → abrir su ficha.
2. Si estaba de alta → hacer clic en "Reactivar" → elegir si es la misma lesión o una nueva.
3. Si es nueva lesión → se crea un Episodio 2 automáticamente, sesiones desde 1.

### Enviar recordatorios del día
1. Ir a **Citas**.
2. Ver el botón verde "Recordatorios (N)" en el encabezado.
3. Hacer clic → se envían por WhatsApp a todos los pacientes del día con cita pendiente.

---

## Tecnología (para quien le interese)

- **Frontend**: Next.js 14, React, TypeScript, CSS propio (sin Tailwind).
- **Base de datos**: Turso (SQLite distribuido en la nube).
- **Almacenamiento de archivos**: Cloudinary.
- **Mensajería**: WhatsApp vía Green API.
- **Deploy**: Netlify (https://rodrigoulloakine.netlify.app).
- **Build**: siempre con `pnpm run build`, nunca con `npm`.
