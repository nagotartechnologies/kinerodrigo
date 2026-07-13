# Bugs de Rendimiento - Análisis Systematic Debugging

## Metodología
Fase 1: Root Cause Investigation — completada  
Fase 2: Pattern Analysis — completada  
Fase 3: Hypothesis — confirmada para cada bug  
Fase 4: Implementation — pendiente

---

## Bugs ya corregidos (sesión anterior)

### Bug 1: IIFE con console.log en cada render (vista semanal)
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx` (líneas ~1008)
- **Causa:** IIFE que ejecutaba `console.log` del array completo de citas en cada render de la vista semanal
- **Impacto:** Bloqueo del hilo principal con cientos de citas
- **Estado:** ✅ Corregido

### Bug 2: `obtenerCitasDia` sin memoizar
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx` (líneas ~783-800)
- **Causa:** `citas.filter()` se ejecutaba 98 veces por render (14 horas × 7 días)
- **Impacto:** Cada click disparaba 98 recorridos completos del array
- **Estado:** ✅ Corregido con `useMemo` + Map por fecha

### Bug 3: API de citas sin filtro de fecha
- **Archivo:** `src/app/api/citas/route.ts` (líneas ~73-90)
- **Causa:** La API devolvía TODAS las citas históricas sin LIMIT ni paginación
- **Impacto:** JSON enorme de transferir y procesar en el frontend
- **Estado:** ✅ Corregido con filtro por defecto de 8 semanas

### Bug 4: `cargarCitas()` con loading=true en operaciones post-click
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx` (8 llamadas)
- **Causa:** Cada operación (crear, editar, mover, eliminar) ponía `loading=true`, desmontando todo el calendario
- **Impacto:** Remount completo del calendario → freeze visual
- **Estado:** ✅ Corregido a `cargarCitas(false)`

---

## Bugs pendientes de corregir

### Bug 5: `console.log` en APIs de producción
- **Archivos:**
  - `src/app/api/pacientes/route.ts:19` — `console.log('📊 Pacientes obtenidos:', pacientes?.length || 0)` en cada request
  - `src/app/api/citas/[id]/recordatorio/route.ts:31-48` — múltiples console.log con datos completos de la cita
  - `src/app/api/whatsapp/check-responses/route.ts:22-218` — **30+ console.log** por cada llamada, incluyendo `JSON.stringify` de notificaciones completas
  - `src/app/dashboard/page.tsx:211,220` — console.log en `inicializarCronAutomatico` en cada carga del dashboard
- **Causa:** Logging de debug leftover en código de producción
- **Impacto:** Cada llamada a la API de pacientes imprime en consola del servidor. La API de check-responses hace 30+ console.log con JSON.stringify de objetos grandes, ralentizando el procesamiento de respuestas de WhatsApp
- **Prioridad:** Alta
- **Fix propuesto:** Eliminar o envolver en `if (process.env.NODE_ENV === 'development')` todos los console.log en APIs

### Bug 6: `esHorarioBloqueado` sin memoizar
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx:280-291`
- **Causa:** Función que se llama 98 veces por render (14 horas × 7 días en vista semanal). Cada llamada ejecuta:
  1. `fechaAString(fecha)` — conversión de fecha a string
  2. `horariosBloqueados.find()` — búsqueda lineal sobre todos los bloqueos
- **Impacto:** Cada click en el calendario dispara 98 búsquedas lineales sin cache
- **Prioridad:** Alta
- **Fix propuesto:** Crear `Map<string, any[]>` agrupando horarios bloqueados por fecha con `useMemo`, similar al fix aplicado a `obtenerCitasDia`

### Bug 7: IIFE de vista "hoy" sin memoizar
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx:1233-1241`
- **Causa:** En cada render de la vista "hoy" se ejecuta dentro de un IIFE:
  1. `citas.filter(c => c.fecha === hoyStr)` — filtra todas las citas
  2. `.sort((a, b) => a.hora.localeCompare(b.hora))` — ordena
  3. `citasHoy.filter(c => c.estado === 'confirmada').length` — cuenta confirmadas
  4. `citasHoy.filter(c => c.estado === 'pendiente').length` — cuenta pendientes
  5. `citasHoy.filter(c => c.estado === 'completada').length` — cuenta completadas
  6. `citasHoy.filter(c => c.estado === 'cancelada').length` — cuenta canceladas
- **Impacto:** 5 recorridos completos del array filtrado en cada render. Como `cargarCitas(false)` ya no remonta, cada recarga dispara este cómputo
- **Prioridad:** Alta
- **Fix propuesto:** Extraer a `useMemo` con dependencias `[citas]` y reutilizar `citasPorFecha` ya memoizado

### Bug 8: Doble `filter` en botón recordatorios
- **Archivo:** `src/app/dashboard/components/CitasModule.tsx:926`
- **Causa:** La línea:
  ```tsx
  {enviandoMasivo ? 'Enviando...' : `Recordatorios${citas.filter(c => c.estado === 'pendiente' && !c.recordatorio && c.telefono).length > 0 ? ` (${citas.filter(c => c.estado === 'pendiente' && !c.recordatorio && c.telefono).length})` : ''}`}
  ```
  Ejecuta `citas.filter(...)` **2 veces** en la misma expresión para obtener el mismo valor
- **Impacto:** Doble recorrido del array completo de citas en cada render del header
- **Prioridad:** Alta
- **Fix propuesto:** Usar `citasSinRecordatorio.length` (ya memoizado en línea 763) en lugar del doble filter

### Bug 9: `console.log` en `inicializarCronAutomatico`
- **Archivo:** `src/app/dashboard/page.tsx:211,220`
- **Causa:** Console.log en cada carga del dashboard:
  ```ts
  console.log('Iniciando sistema de recordatorios automaticos...');
  console.log('Sistema de recordatorios iniciado:', data);
  ```
- **Impacto:** Log innecesario en producción en cada carga de página
- **Prioridad:** Media
- **Fix propuesto:** Eliminar o envolver en `if (process.env.NODE_ENV === 'development')`

### Bug 10: 30+ `console.log` en `whatsapp/check-responses`
- **Archivo:** `src/app/api/whatsapp/check-responses/route.ts:22-218`
- **Causa:** Cada llamada a esta API produce 30+ console.log incluyendo:
  - `JSON.stringify(notification, null, 2)` de cada notificación
  - `JSON.stringify(msg, null, 2)` de cada mensaje
  - Log de URLs, tokens parciales, estados, etc.
- **Impacto:** Ralentiza el procesamiento de respuestas de WhatsApp. En producción con tráfico real, esto puede agregar segundos de latencia
- **Prioridad:** Media
- **Fix propuesto:** Eliminar todos los console.log de debug o reemplazar con un logger condicional

---

## Resumen de impacto

| Bug | Archivo | Líneas afectadas | Prioridad | Estado |
|-----|---------|-----------------|-----------|--------|
| 1 | CitasModule.tsx | ~1008 | Alta | ✅ Corregido |
| 2 | CitasModule.tsx | ~783-800 | Alta | ✅ Corregido |
| 3 | api/citas/route.ts | ~73-90 | Alta | ✅ Corregido |
| 4 | CitasModule.tsx | 8 llamadas | Media | ✅ Corregido |
| 5 | Múltiples APIs | ~5 archivos | Alta | Pendiente |
| 6 | CitasModule.tsx | 280-291 | Alta | Pendiente |
| 7 | CitasModule.tsx | 1233-1241 | Alta | Pendiente |
| 8 | CitasModule.tsx | 926 | Alta | Pendiente |
| 9 | page.tsx | 211,220 | Media | Pendiente |
| 10 | check-responses | 22-218 | Media | Pendiente |
