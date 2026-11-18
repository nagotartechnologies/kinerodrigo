// Tipos de sesión/cita que ofrecen los formularios. El valor se guarda tal cual en citas.tipo y sesiones.tipo
export const TIPOS_SESION = [
  'Evaluación',
  'Kinesioterapia',
  'Reintegro deportivo',
  'Sesión de descarga (recovery)',
  'Control',
  'Rehabilitación',
] as const;

export const TIPO_SESION_POR_DEFECTO = 'Kinesioterapia';
