# Módulo: Pacientes

Archivo: `src/app/dashboard/components/PacientesModule.tsx`
Tamaño: ~106 KB / ~2432 líneas

---

## Responsabilidad

Gestión completa del registro clínico de pacientes: CRUD de datos personales y antecedentes, cambios de estado de tratamiento, subida de documentos, y apertura de la ficha completa.

---

## Props

```ts
{
  configuraciones?: Record<string, { valor: any }>;
  onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void;
  initialPacienteId?: number; // abre ficha directamente al montar
}
```

---

## Estado principal

| Estado | Tipo | Descripción |
|---|---|---|
| `pacientes` | `any[]` | Lista completa cargada desde API |
| `filtroEstado` | `string` | Filtro activo: `todos / en_tratamiento / alta / receso` |
| `busqueda` | `string` | Texto para filtrar por nombre |
| `pacienteSeleccionado` | `any` | Paciente abierto en modal de edición |
| `showFichaCompleta` | `boolean` | Abre `FichaCompletaModal` |
| `documentosPaciente` | `any[]` | Documentos Cloudinary del paciente seleccionado |
| `estadisticasEstados` | `any` | Conteo por estado para los badges del header |

---

## Endpoints que consume

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pacientes` | Lista todos los pacientes activos |
| `POST` | `/api/pacientes` | Crea paciente + Episodio 1 automáticamente |
| `PUT` | `/api/pacientes/[id]` | Actualiza datos personales y sincroniza episodio actual |
| `DELETE` | `/api/pacientes/[id]` | Soft-delete (`activo = 0`) |
| `GET` | `/api/pacientes/estadisticas-estados` | Conteo por estado para badges |
| `GET` | `/api/pacientes/[id]/documentos` | Lista documentos Cloudinary |
| `POST` | `/api/pacientes/[id]/documentos` | Sube archivo a Cloudinary |
| `DELETE` | `/api/pacientes/[id]/documentos` | Elimina archivo de Cloudinary + BD |
| `PUT` | `/api/pacientes/[id]/estado` | Cambia estado del episodio activo |

---

## Modelo de datos — tabla `pacientes`

```sql
id, nombre, rut, telefono, edad, altura, peso, ocupacion,
enfermedades, enfermedades_hereditarias, medicamentos, alergias,
cirugias, deportes, alimentacion, consumo_agua, descanso,
psicologicamente, digestion, lesion_consulta, objetivo_paciente,
evaluacion_fisica, evaluacion_final, sesiones_programadas,
estado_tratamiento, activo, created_at, updated_at
```

Los campos clínicos por episodio (`lesion_consulta`, `objetivo_paciente`, `evaluacion_fisica`) se duplican en la tabla `episodios` para mantener historial. Al hacer `PUT`, el endpoint sincroniza ambos.

---

## Flujos clave

### Crear paciente
1. `POST /api/pacientes` con los datos del form.
2. La API inserta en `pacientes` y crea automáticamente un `episodios` con `numero_episodio = 1` y `estado = 'en_tratamiento'`.
3. Tras guardar, se ofrece mini-modal para crear la primera sesión.

### Cambiar estado
- `PUT /api/pacientes/[id]/estado` opera sobre el episodio activo (no sobre `pacientes` directamente).
- Mapeo: `activo → en_tratamiento`, `alta → alta`, `abandono → receso`.
- Si se da de alta, el episodio se cierra (`fecha_cierre = NOW`).

### Subida de documentos
- `POST /api/pacientes/[id]/documentos` recibe `multipart/form-data`.
- El backend usa el SDK de Cloudinary para subir a `kine-citas/pacientes/{pacienteId}/`.
- Se guarda `url` y `public_id` en tabla `documentos_paciente`.

---

## Componente hijo clave

`FichaCompletaModal` se importa y se renderiza dentro de `PacientesModule`. Recibe `pacienteId` y callbacks para navegar o cambiar estado. Ver `modulo-ficha-completa.md` para detalles.

---

## Utilidades usadas

- `formatearFechaLocal` / `fechaAString` — `src/app/dashboard/utils.ts`
- `generarFichaPDF` — `src/app/dashboard/utils/generarFichaPDF.ts` (exporta la ficha a PDF)

---

## Archivos relacionados

```
src/app/api/pacientes/route.ts
src/app/api/pacientes/[id]/route.ts
src/app/api/pacientes/[id]/estado/route.ts
src/app/api/pacientes/[id]/documentos/route.ts
src/app/api/pacientes/[id]/episodios/route.ts
src/app/api/pacientes/estadisticas-estados/route.ts
src/lib/cloudinary.ts
src/lib/episodios.ts
```
