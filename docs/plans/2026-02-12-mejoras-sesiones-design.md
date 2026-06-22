# Mejoras Módulo de Sesiones — 2026-02-12

## Resumen
Flujo rápido para completar sesiones, numeración automática, copiar ejercicios, y simplificación del formulario.

## Features

### 1. Mini-modal "Completar Sesión"
- Botón "✓ Completar" en cada sesión programada/confirmada
- Modal compacto con: sliders dolor (0-10), progreso con chips, movilidad+fuerza, ejercicios precargados, observaciones, recomendaciones
- Estado se cambia a "completada" automáticamente
- Endpoint: `PUT /api/sesiones/:id/completar`

### 2. Numeración Automática
- `numero_sesion = COUNT(*) + 1` en POST /api/sesiones
- UI: "Sesión #3 de 10" (10 = sesiones_programadas del paciente)

### 3. Copiar Última Sesión
- Botón "Copiar de sesión anterior" en formularios
- Precarga ejerciciosRealizados de la última sesión completada del paciente

### 4. Simplificar Textareas
- Eliminar `notasSesion` del formulario (fusionar con `observaciones`)
- Mantener solo: Observaciones + Recomendaciones

### 5. Fix Duplicación Cita↔Sesión
- Quitar auto-creación de cita cuando no hay citaId en POST /api/sesiones

## Decisiones
- Plantillas de rutina: DESCARTADAS por ahora (YAGNI). Se puede agregar después.
- Campo `notas_sesion` se mantiene en DB pero no en el form.
