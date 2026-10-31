// Identidad de marca del sistema. Fuente única para nombres, colores, logos y textos de marca.
// Assets originales en /brand-kit (copiados a /public y /public/brand).
export const MARCA = {
  nombre: 'Rodrigo Ulloa',
  rubro: 'Kinesiólogo Deportivo',
  nombreCompleto: 'Rodrigo Ulloa · Kinesiólogo Deportivo',
  nombreCorto: 'R. Ulloa',
  descripcion: 'Agenda, pacientes y sesiones de kinesiología deportiva en un solo lugar.',
  colorFondo: '#0E0F0E',
  colorAcento: '#2AD636',
  desarrollador: 'Nagotar Tech',
  logos: {
    vertical: '/brand/logo-vertical-oscuro.svg',
    horizontal: '/brand/logo-horizontal-oscuro.svg',
    isotipo: '/brand/isotipo.svg',
  },
} as const;

// Valores sembrados por versiones antiguas que se consideran "sin configurar"
const NOMBRES_LEGACY = ['NAGO-KINE', 'KINE-CITAS', 'RODRIGO ULLOA KINESIOLOGÍA', ''];

// Devuelve el nombre configurado en `nombre_centro` o la marca si no fue personalizado
export const nombreMarca = (valorConfigurado?: string | null): string => {
  const valor = (valorConfigurado ?? '').trim();
  return NOMBRES_LEGACY.includes(valor.toUpperCase()) ? MARCA.nombreCompleto : valor;
};
