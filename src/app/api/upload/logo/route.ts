import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no válido. Solo se permiten: JPG, PNG, WEBP, SVG' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande. Máximo 2MB' },
        { status: 400 }
      );
    }

    // Generar nombre único
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `logo-${timestamp}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    const filePath = path.join(uploadDir, fileName);

    // Convertir archivo a buffer y guardar
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Obtener logo anterior para eliminarlo
    const configAnterior: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get('logo_url');
    
    // Actualizar configuración en la base de datos
    const logoUrl = `/uploads/logos/${fileName}`;
    await db.prepare('UPDATE configuraciones SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?')
      .run(logoUrl, 'logo_url');

    // Eliminar logo anterior si existe
    if (configAnterior?.valor && configAnterior.valor !== '') {
      const oldFilePath = path.join(process.cwd(), 'public', configAnterior.valor);
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath);
          console.log('✅ Logo anterior eliminado');
        } catch (error) {
          console.error('⚠️ Error al eliminar logo anterior:', error);
        }
      }
    }

    console.log(`✅ Logo subido: ${logoUrl}`);

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Logo subido exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error al subir logo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir el logo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar logo
export async function DELETE() {
  try {
    // Obtener logo actual
    const config: any = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get('logo_url');
    
    if (config?.valor && config.valor !== '') {
      const filePath = path.join(process.cwd(), 'public', config.valor);
      
      if (existsSync(filePath)) {
        await unlink(filePath);
        console.log('✅ Logo eliminado del sistema de archivos');
      }
    }

    // Limpiar configuración
    await db.prepare('UPDATE configuraciones SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?')
      .run('', 'logo_url');

    return NextResponse.json({
      success: true,
      message: 'Logo eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error al eliminar logo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar el logo' },
      { status: 500 }
    );
  }
}
