import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Obtener el logo de la configuración
    const logoUrl = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?')
      .get('logo_url')
      .then((row: any) => row?.valor || null);

    if (!logoUrl) {
      // Si no hay logo configurado, redirigir al icono por defecto
      const url = new URL(request.url);
      return NextResponse.redirect(new URL('/icon-512x512.png', url.origin));
    }

    // Si el logo es una URL completa (http/https), obtener la imagen y servirla
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      try {
        const imageResponse = await fetch(logoUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
          },
        });
      } catch (fetchError) {
        console.error('Error al obtener imagen del logo:', fetchError);
        // Fallback al icono por defecto
        const url = new URL(request.url);
        return NextResponse.redirect(new URL('/icon-512x512.png', url.origin));
      }
    }

    // Si es una ruta relativa, redirigir
    const url = new URL(request.url);
    const fullLogoUrl = new URL(logoUrl, url.origin);
    return NextResponse.redirect(fullLogoUrl, 302);
  } catch (error) {
    console.error('Error al obtener icono:', error);
    // En caso de error, redirigir al icono por defecto
    const url = new URL(request.url);
    return NextResponse.redirect(new URL('/icon-512x512.png', url.origin));
  }
}
