import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import cloudinary from '@/lib/cloudinary';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener documentos de un paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const documentos = await db.prepare(
      'SELECT * FROM documentos_paciente WHERE paciente_id = ? ORDER BY created_at DESC'
    ).all(parseInt(id));

    return NextResponse.json({ success: true, documentos });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener documentos' }, { status: 500 });
  }
}

// POST - Subir documento/imagen a Cloudinary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const pacienteId = parseInt(id);

    // Verificar que el paciente existe
    const paciente: any = await db.prepare('SELECT id, nombre FROM pacientes WHERE id = ?').get(pacienteId);
    if (!paciente) {
      return NextResponse.json({ success: false, error: 'Paciente no encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombre = formData.get('nombre') as string || file.name;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Convertir File a buffer para Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determinar tipo de recurso
    const esImagen = file.type.startsWith('image/');
    const esPDF = file.type === 'application/pdf';
    const resourceType = esImagen ? 'image' : 'raw';
    const tipo = esImagen ? 'imagen' : (esPDF ? 'pdf' : 'documento');

    // Subir a Cloudinary
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `kine-citas/pacientes/${pacienteId}`,
          resource_type: resourceType,
          public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // Guardar referencia en BD
    const dbResult = await db.prepare(`
      INSERT INTO documentos_paciente (paciente_id, nombre, tipo, url, public_id, formato, tamano)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      pacienteId,
      nombre,
      tipo,
      result.secure_url,
      result.public_id,
      result.format || file.type.split('/')[1],
      result.bytes || file.size
    );

    return NextResponse.json({
      success: true,
      documento: {
        id: Number(dbResult.lastInsertRowid),
        pacienteId,
        nombre,
        tipo,
        url: result.secure_url,
        publicId: result.public_id,
        formato: result.format,
        tamano: result.bytes || file.size
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al subir documento:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error al subir documento' }, { status: 500 });
  }
}

// DELETE - Eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ success: false, error: 'Falta docId' }, { status: 400 });
    }

    // Obtener documento para borrar de Cloudinary
    const doc: any = await db.prepare('SELECT * FROM documentos_paciente WHERE id = ?').get(parseInt(docId));
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Documento no encontrado' }, { status: 404 });
    }

    // Borrar de Cloudinary
    const resourceType = doc.tipo === 'imagen' ? 'image' : 'raw';
    try {
      await cloudinary.uploader.destroy(doc.public_id, { resource_type: resourceType });
    } catch (err) {
      console.error('Error al borrar de Cloudinary:', err);
    }

    // Borrar de BD
    await db.prepare('DELETE FROM documentos_paciente WHERE id = ?').run(parseInt(docId));

    return NextResponse.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar documento' }, { status: 500 });
  }
}
