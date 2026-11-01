// Fechas y horas en la zona horaria del negocio (America/Santiago)
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Devuelve 'YYYY-MM-DD HH:MM' en hora de Chile para el instante indicado.
 * Se compara directamente con `fecha || ' ' || hora` de la tabla citas.
 */
export function fechaHoraChile(date: Date = new Date()): string {
  const p = Object.fromEntries(formato.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/**
 * Horas que faltan para una cita (fecha 'YYYY-MM-DD', hora 'HH:MM') medidas en hora de Chile.
 * Negativo si la cita ya pasó.
 */
export function horasHastaCita(fecha: string, hora: string): number {
  const [ahoraFecha, ahoraHora] = fechaHoraChile().split(' ');
  const aMinutos = (f: string, h: string) => {
    const [y, m, d] = f.split('-').map(Number);
    const [hh, mm] = h.split(':').map(Number);
    return Date.UTC(y, m - 1, d, hh, mm) / 60000;
  };
  return (aMinutos(fecha, hora) - aMinutos(ahoraFecha, ahoraHora)) / 60;
}
