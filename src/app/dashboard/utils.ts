// Función global para formatear fechas sin problemas de zona horaria
export const formatearFechaLocal = (fechaStr: string) => {
  const [year, month, day] = fechaStr.split('-');
  const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Función para convertir Date a YYYY-MM-DD sin problemas de timezone
export const fechaAString = (fecha: Date): string => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
