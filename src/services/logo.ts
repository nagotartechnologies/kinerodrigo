import cloudinary from '@/lib/cloudinary';
import { ErrorNegocio } from '@/lib/errores';
import { guardarConfiguracion, leerConfiguracion } from './configuraciones';

const MB = 1024 * 1024;
const TAMANO_MAXIMO_LOGO_MB = 2;
const TIPOS_LOGO = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
const CARPETA_LOGO = 'kine-citas/logo';
const CLAVE_URL = 'logo_url';
const CLAVE_PUBLIC_ID = 'logo_public_id';

function validarLogo(file: unknown): File {
  if (!(file instanceof File)) throw new ErrorNegocio('No se proporcionó ningún archivo');
  if (!TIPOS_LOGO.includes(file.type)) {
    throw new ErrorNegocio('Tipo de archivo no válido. Solo se permiten: JPG, PNG, WEBP, SVG');
  }
  if (file.size > TAMANO_MAXIMO_LOGO_MB * MB) {
    throw new ErrorNegocio(`El archivo es demasiado grande. Máximo ${TAMANO_MAXIMO_LOGO_MB}MB`);
  }
  return file;
}

// El borrado del logo anterior es best-effort: no debe impedir guardar el nuevo
async function borrarDeCloudinary(publicId: string): Promise<void> {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Error al eliminar el logo anterior de Cloudinary:', error);
  }
}

// Se guarda en Cloudinary: el disco de las funciones de Netlify es efímero y de solo lectura
export async function subirLogo(formData: FormData): Promise<string> {
  const file = validarLogo(formData.get('logo'));
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: CARPETA_LOGO, resource_type: 'image', public_id: `logo-${Date.now()}` },
      (error, res) => (error || !res ? reject(error ?? new Error('Cloudinary no devolvió resultado')) : resolve(res))
    ).end(buffer);
  });

  const publicIdAnterior = await leerConfiguracion(CLAVE_PUBLIC_ID);
  await guardarConfiguracion(CLAVE_URL, result.secure_url);
  await guardarConfiguracion(CLAVE_PUBLIC_ID, result.public_id);
  await borrarDeCloudinary(publicIdAnterior);
  return result.secure_url;
}

export async function eliminarLogo(): Promise<void> {
  await borrarDeCloudinary(await leerConfiguracion(CLAVE_PUBLIC_ID));
  await guardarConfiguracion(CLAVE_URL, '');
  await guardarConfiguracion(CLAVE_PUBLIC_ID, '');
}
