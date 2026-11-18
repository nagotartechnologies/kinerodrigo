import db from '@/lib/db';
import { noEncontrado } from '@/lib/errores';
import { fechaHoraChile } from '@/lib/horaChile';
import type { CitasRecurrentesInput } from '@/lib/schemas/citas';
import { citasOcupadas, hayConflicto, DURACION_POR_DEFECTO, MAX_CITAS_SIMULTANEAS } from './conflictos';

const DIAS_POR_SEMANA = 7;

// Aritmética en UTC sobre la fecha de Chile para no depender de la zona del servidor
function fechasRecurrentes(cantidadSemanas: number, diasSemana: number[]): string[] {
  const [y, m, d] = fechaHoraChile().split(' ')[0].split('-').map(Number);
  const hoy = new Date(Date.UTC(y, m - 1, d));
  const fechas: string[] = [];
  for (let semana = 0; semana < cantidadSemanas; semana++) {
    for (const diaSemana of diasSemana) {
      const fecha = new Date(hoy);
      fecha.setUTCDate(fecha.getUTCDate() + semana * DIAS_POR_SEMANA);
      const diasHastaObjetivo = (diaSemana - fecha.getUTCDay() + DIAS_POR_SEMANA) % DIAS_POR_SEMANA;
      fecha.setUTCDate(fecha.getUTCDate() + diasHastaObjetivo);
      fechas.push(fecha.toISOString().slice(0, 10));
    }
  }
  return [...new Set(fechas)].sort();
}

export async function crearCitasRecurrentes(datos: CitasRecurrentesInput) {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND activo = 1').get(datos.pacienteId);
  if (!paciente) throw noEncontrado('Paciente no encontrado');

  const duracion = datos.duracion ?? DURACION_POR_DEFECTO;
  const fechas = fechasRecurrentes(datos.cantidadSemanas, datos.diasSemana);
  const ocupadas = await citasOcupadas(fechas[0], fechas[fechas.length - 1]);

  const libres = fechas.filter((fecha) => !hayConflicto(ocupadas, fecha, datos.horaInicio, duracion));
  const conflictos = fechas
    .filter((fecha) => !libres.includes(fecha))
    .map((fecha) => ({ fecha, hora: datos.horaInicio, motivo: `Ya hay ${MAX_CITAS_SIMULTANEAS} citas en ese horario` }));

  // Todas las inserciones en una sola llamada atómica
  const resultados = libres.length
    ? await db.batch(libres.map((fecha) => ({
        sql: `INSERT INTO citas (paciente_id, fecha, hora, duracion, tipo, notas, estado) VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
        args: [datos.pacienteId, fecha, datos.horaInicio, duracion, datos.tipo, datos.notas || null],
      })))
    : [];

  const citasCreadas = libres.map((fecha, i) => ({
    id: Number(resultados[i].lastInsertRowid),
    fecha,
    hora: datos.horaInicio,
    duracion,
    tipo: datos.tipo,
    estado: 'pendiente',
  }));
  return { citasCreadas, conflictos };
}
