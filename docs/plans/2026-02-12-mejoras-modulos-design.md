# Plan de Mejoras: Pacientes, Citas y Sesiones

## Estado: En progreso

## Arquitectura Actual

```
PACIENTES (1) ──→ (N) CITAS ──→ (1) SESIONES
    │                  │
    │                  └──→ (N) RECORDATORIOS
    └──→ (N) PAGOS
```

---

## Bloque 1: Seguridad y Bugs (✅ COMPLETADO)

### 1.1 Auth en APIs ✅
- Agregado `verifyAuth` a `citas/route.ts` (GET, POST)
- Agregado `verifyAuth` a `citas/[id]/route.ts` (GET, PUT, DELETE)
- Agregado `verifyAuth` a `sesiones/route.ts` (GET, POST)
- Agregado `verifyAuth` a `sesiones/[id]/route.ts` (GET, PUT, DELETE)

### 1.2 Cascade Delete ✅
- Al eliminar cita, ahora elimina recordatorios y sesiones asociados

### 1.3 Conflictos Horarios ✅
- POST y PUT de citas ahora verifican solapamiento con duración
- Detecta: cita empieza durante otra, termina durante otra, o envuelve otra

---

## Bloque 2: Rendimiento y Estructura (PENDIENTE)

### 2.1 Dividir dashboard monolítico (7636 líneas)
```
src/app/dashboard/
├── page.tsx              (~320 líneas - layout principal)
├── components/
│   ├── PacientesModule.tsx
│   ├── CitasModule.tsx
│   ├── SesionesModule.tsx
│   ├── PagosModule.tsx
│   └── ConfiguracionModule.tsx
├── types/
│   └── index.ts
```

### 2.2 Interfaces TypeScript
- Crear tipos: Paciente, Cita, Sesion, Pago
- Eliminar uso de `any`

### 2.3 Paginación en APIs
- Agregar `?page=1&limit=20` a endpoints GET
- Conteo total para paginación frontend

### 2.4 Reducir duplicación Cita↔Sesión
- Sesión hereda fecha/hora/tipo de su cita
- Solo guardar datos clínicos propios

---

## Bloque 3: Funcionalidad Clínica (PENDIENTE)

### 3.1 Historial Consolidado del Paciente
- Vista completa: citas, sesiones, progreso, pagos, recordatorios

### 3.2 Gráficos de Progreso
- Evolución del dolor por sesión
- Indicador de progreso general
- Mejoría porcentual

### 3.3 Citas Recurrentes
- Frecuencia: semanal/bisemanal
- Día, hora y cantidad de repeticiones

### 3.4 Estado de Tratamiento
- Nuevo campo: en_tratamiento, alta, seguimiento, abandonado
