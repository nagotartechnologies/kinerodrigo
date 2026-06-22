export type Module = 'pacientes' | 'citas' | 'sesiones' | 'pagos' | 'configuracion';

export interface Paciente {
  id: number;
  nombre: string;
  rut: string;
  telefono: string;
  edad: number;
  altura: number;
  peso: number;
  ocupacion: string;
  enfermedades: string;
  enfermedades_hereditarias: string;
  medicamentos: string;
  alergias: string;
  cirugias: string;
  deportes: string;
  alimentacion: string;
  consumo_agua: string;
  descanso: string;
  psicologicamente: string;
  digestion: string;
  lesion_consulta: string;
  objetivo_paciente: string;
  evaluacion_fisica: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string;
  sesiones_programadas: number | null;
  evaluacion_final: string | null;
  numero_sesion: number | null;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface Cita {
  id: number;
  pacienteId: number;
  paciente: string;
  rut: string;
  telefono: string;
  fecha: string;
  hora: string;
  duracion: number;
  tipo: string;
  estado: string;
  notas: string;
  createdAt: string;
  updatedAt: string;
  tieneSesion: boolean;
  sesionId: number | null;
  sesionEstado: string | null;
  tienePago: boolean;
  totalPagado: number;
  cantidadPagos: number;
  sesionProgreso: string | null;
}

export interface Sesion {
  id: number;
  pacienteId: number;
  citaId: number | null;
  paciente: string;
  rut: string;
  telefono: string;
  fecha: string;
  hora: string;
  duracion: number;
  tipo: string;
  estado: string;
  numeroSesion: number | null;
  sesionesProgramadas: number | null;
  evaluacionFinal: string | null;
  notasSesion: string;
  ejerciciosRealizados: any[];
  observaciones: string;
  dolorInicial: number | null;
  dolorFinal: number | null;
  movilidad: string;
  fuerza: string;
  progresoGeneral: string;
  recomendaciones: string;
  proximaSesion: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pago {
  id: number;
  pacienteId: number;
  paciente: string;
  citaId: number | null;
  monto: number;
  metodoPago: string;
  estado: string;
  fechaPago: string;
  concepto: string;
  notas: string;
  numeroFactura: string;
  createdAt: string;
}

export interface HorarioBloqueado {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  tipo: string;
}

export interface Configuracion {
  id?: number;
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string;
  archivoTemporal?: File;
}

export interface ConfigMap {
  [clave: string]: Configuracion;
}

export interface CronEstado {
  activo: boolean;
  proximaEjecucion?: string;
  ultimaEjecucion?: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  createdAt: string;
}

export interface ConfigSectionProps {
  configuraciones: ConfigMap;
  getConfigValue: (clave: string, defaultValue?: any) => any;
  handleEditarConfig: (clave: string) => void;
  handleToggleConfig: (clave: string, nuevoValor: boolean) => void;
  mostrarMensaje: (texto: string, esError?: boolean) => void;
}
