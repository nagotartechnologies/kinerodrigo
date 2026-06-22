# Módulo: Finanzas

Archivo: `src/app/dashboard/components/FinanzasModule.tsx`
Tamaño: ~40 KB / ~815 líneas

> Reemplaza al `PagosModule.tsx` legacy (archivo aún existe pero no se importa en `page.tsx`).

---

## Responsabilidad

Control económico de la clínica: ingresos de pacientes, gastos operativos, gastos fijos recurrentes y balance mensual. Todo navegable mes a mes.

---

## Props

No recibe props; carga todos sus datos internamente.

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `mesActual` | `string` | Formato `YYYY-MM`; inicia en el mes corriente |
| `resumen` | `any` | Datos del endpoint `/api/finanzas/resumen` |
| `categorias` | `any[]` | Categorías de gastos con color |
| `gastosFijos` | `any[]` | Lista de gastos fijos configurados |
| `vista` | `'movimientos' \| 'gastos-fijos'` | Pestaña activa |
| `filtroTipo` | `'' \| 'ingreso' \| 'gasto'` | Filtro sobre la tabla de movimientos |

---

## Endpoints que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/finanzas/resumen?mes=YYYY-MM` | Balance mensual unificado |
| `GET` | `/api/pagos` | Ingresos (pagos de pacientes) |
| `POST` | `/api/pagos` | Registra ingreso |
| `PUT` | `/api/pagos/[id]` | Edita ingreso |
| `DELETE` | `/api/pagos/[id]` | Elimina ingreso |
| `GET` | `/api/gastos` | Lista gastos del mes |
| `POST` | `/api/gastos` | Registra gasto |
| `PUT` | `/api/gastos/[id]` | Edita gasto |
| `DELETE` | `/api/gastos/[id]` | Elimina gasto |
| `GET` | `/api/gastos-fijos` | Lista gastos fijos |
| `POST` | `/api/gastos-fijos` | Crea gasto fijo |
| `PUT` | `/api/gastos-fijos/[id]` | Edita gasto fijo |
| `DELETE` | `/api/gastos-fijos/[id]` | Elimina gasto fijo |
| `PATCH` | `/api/gastos-fijos?mes=YYYY-MM` | Auto-genera registros del mes para todos los activos |
| `GET` | `/api/categorias-gastos` | Lista categorías |
| `POST` | `/api/categorias-gastos` | Crea categoría nueva |
| `GET` | `/api/pacientes` | Para el selector del modal de ingreso |

---

## Modelos de datos

### Tabla `pagos` (ingresos)

```sql
id, paciente_id, sesion_id, monto REAL,
metodo_pago TEXT (Efectivo/Transferencia/Tarjeta),
estado TEXT (pendiente/completado),
fecha_pago TEXT, concepto TEXT, notas TEXT,
numero_factura TEXT, created_at, updated_at
FOREIGN KEY paciente_id → pacientes(id) ON DELETE CASCADE
FOREIGN KEY sesion_id   → sesiones(id) ON DELETE SET NULL
```

### Tabla `gastos`

```sql
id, categoria TEXT, descripcion TEXT, monto REAL,
estado TEXT (pendiente/pagado), fecha_gasto TEXT,
metodo_pago TEXT, notas TEXT, gasto_fijo_id INTEGER,
created_at
FOREIGN KEY gasto_fijo_id → gastos_fijos(id) ON DELETE SET NULL
```

### Tabla `gastos_fijos`

```sql
id, categoria TEXT, descripcion TEXT, monto REAL,
activo INTEGER (0/1), dia_generacion INTEGER (1-28),
created_at
```

### Tabla `categorias_gastos`

```sql
id, nombre TEXT UNIQUE, color TEXT (hex), created_at
```

Categorías por defecto (seeded al inicializar BD):
`Arriendo (#ef4444)`, `Servicios (#3b82f6)`, `Insumos (#10b981)`, `Materiales (#f59e0b)`, `Otros (#6b7280)`

---

## Endpoint resumen `/api/finanzas/resumen`

Recibe `?mes=YYYY-MM` y devuelve un objeto con:

```ts
{
  ingresos: number,          // SUM de pagos.monto donde estado='completado'
  gastos: number,            // SUM de gastos.monto donde estado='pagado'
  balance: number,           // ingresos - gastos
  gastosPendientes: number,  // SUM de gastos.monto donde estado='pendiente'
  movimientos: Array<{
    tipo: 'ingreso' | 'gasto',
    descripcion: string,
    monto: number,
    fecha: string,
    estado: string,
    // ...más campos según tipo
  }>
}
```

Los movimientos son el JOIN unificado de `pagos` + `gastos` del mes, ordenados por fecha DESC.

---

## Flujo de gastos fijos

1. El kinesiólogo define un gasto fijo (ej: Arriendo, $500.000, día 1).
2. Al cambiar de mes en la UI (o manualmente), se llama `PATCH /api/gastos-fijos?mes=YYYY-MM`.
3. La API genera un registro en `gastos` con `estado = 'pendiente'` por cada gasto fijo `activo = 1`, si aún no existe ese mes.
4. Esos gastos aparecen en "Gastos Pendientes" en el resumen hasta que se marquen como pagados.

---

## Carga de datos

Al montar usa `Promise.allSettled` para cargar en paralelo categorías, pacientes y gastos fijos:

```ts
const [catRes, pacRes, gfRes] = await Promise.allSettled([
  fetch('/api/categorias-gastos').then(r => r.json()),
  fetch('/api/pacientes').then(r => r.json()),
  fetch('/api/gastos-fijos').then(r => r.json())
]);
```

El resumen mensual se recarga en un `useEffect` separado que depende de `mesActual`.

---

## Archivos relacionados

```
src/app/api/finanzas/resumen/route.ts
src/app/api/pagos/route.ts
src/app/api/pagos/[id]/route.ts
src/app/api/gastos/route.ts
src/app/api/gastos/[id]/route.ts
src/app/api/gastos-fijos/route.ts
src/app/api/gastos-fijos/[id]/route.ts
src/app/api/categorias-gastos/route.ts
src/app/dashboard/components/PagosModule.tsx  (legacy, no importado)
```
