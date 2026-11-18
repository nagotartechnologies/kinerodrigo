import db from '@/lib/db';
import cloudinary from '@/lib/cloudinary';
import { ErrorNegocio, noEncontrado } from '@/lib/errores';

const MB = 1024 * 1024;
// Netlify corta el body de las funciones en ~6 MB y los binarios viajan en base64 (+33%)
export const TAMANO_MAXIMO_DOCUMENTO_MB = 4;
const LARGO_MAXIMO_NOMBRE = 200;
const CARPETA_CLOUDINARY = 'kine-citas/pacientes';

// Coincide con el accept="image/*,.pdf,.doc,.docx" de los formularios
const TIPOS_DOCUMENTO = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface ResultadoCloudinary {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
}

function validarArchivo(file: unknown): File {
  if (!(file instanceof File)) throw new ErrorNegocio('No se proporcionó archivo');
  if (file.size > TAMANO_MAXIMO_DOCUMENTO_MB * MB) {
    throw new ErrorNegocio(`El archivo supera el máximo de ${TAMANO_MAXIMO_DOCUMENTO_MB} MB`);
  }
  if (!file.type.startsWith('image/') && !TIPOS_DOCUMENTO.includes(file.type)) {
    throw new ErrorNegocio('Tipo de archivo no permitido. Sube imágenes, PDF o documentos Word');
  }
  return file;
}

function subirACloudinary(buffer: Buffer, opciones: Record<string, string>): Promise<ResultadoCloudinary> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(opciones, (error, result) => {
      if (error || !result) reject(error ?? new Error('Cloudinary no devolvió resultado'));
      else resolve(result as ResultadoCloudinary);
    }).end(buffer);
  });
}

export async function listarDocumentos(pacienteId: number) {
  return db.prepare('SELECT * FROM documentos_paciente WHERE paciente_id = ? ORDER BY created_at DESC').all(pacienteId);
}

export async function subirDocumento(pacienteId: number, formData: FormData) {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ?').get(pacienteId);
  if (!paciente) throw noEncontrado('Paciente no encontrado');

  const file = validarArchivo(formData.get('file'));
  const nombreEnviado = formData.get('nombre');
  const nombre = (typeof nombreEnviado === 'string' && nombreEnviado.trim() ? nombreEnviado : file.name).slice(0, LARGO_MAXIMO_NOMBRE);

  const esImagen = file.type.startsWith('image/');
  const tipo = esImagen ? 'imagen' : file.type === 'application/pdf' ? 'pdf' : 'documento';
  // Se limpia el nombre para que no altere la ruta del public_id
  const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^\w-]+/g, '_');

  const result = await subirACloudinary(Buffer.from(await file.arrayBuffer()), {
    folder: `${CARPETA_CLOUDINARY}/${pacienteId}`,
    resource_type: esImagen ? 'image' : 'raw',
    public_id: `${Date.now()}_${base}`,
  });

  const formato = result.format || file.type.split('/')[1];
  const tamano = result.bytes || file.size;
  const dbResult = await db.prepare(`
    INSERT INTO documentos_paciente (paciente_id, nombre, tipo, url, public_id, formato, tamano)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(pacienteId, nombre, tipo, result.secure_url, result.public_id, formato, tamano);

  return {
    id: Number(dbResult.lastInsertRowid),
    pacienteId,
    nombre,
    tipo,
    url: result.secure_url,
    publicId: result.public_id,
    formato: result.format,
    tamano,
  };
}

// Solo se borra si el documento pertenece al paciente de la URL
export async function eliminarDocumento(pacienteId: number, docId: number): Promise<void> {
  const doc = await db.prepare('SELECT * FROM documentos_paciente WHERE id = ? AND paciente_id = ?').get(docId, pacienteId);
  if (!doc) throw noEncontrado('Documento no encontrado');

  try {
    await cloudinary.uploader.destroy(String(doc.public_id), { resource_type: doc.tipo === 'imagen' ? 'image' : 'raw' });
  } catch (error) {
    // Se borra igual de la BD: un archivo huérfano en Cloudinary es preferible a una ficha con un enlace roto
    console.error('Error al borrar de Cloudinary:', error);
  }
  await db.prepare('DELETE FROM documentos_paciente WHERE id = ?').run(docId);
}
