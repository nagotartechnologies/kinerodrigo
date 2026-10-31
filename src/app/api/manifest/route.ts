import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MARCA, nombreMarca } from '@/lib/marca';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Nombre configurado o marca por defecto
    const nombreCentro = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?')
      .get('nombre_centro')
      .then((row: any) => nombreMarca(row?.valor));
    const nombreCorto = nombreCentro === MARCA.nombreCompleto ? MARCA.nombreCorto : nombreCentro;

    // Manifest dinámico con los íconos del brand kit
    const manifest = {
      name: nombreCentro,
      short_name: nombreCorto,
      description: MARCA.descripcion,
      start_url: "/dashboard",
      display: "standalone",
      background_color: MARCA.colorFondo,
      theme_color: MARCA.colorFondo,
      orientation: "portrait-primary",
      scope: "/",
      lang: "es-CL",
      icons: [
        { src: "/android-chrome-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/android-chrome-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ],
      categories: ["health", "medical", "productivity"]
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error al generar manifest:', error);
    
    // Fallback a manifest por defecto
    const defaultManifest = {
      name: MARCA.nombreCompleto,
      short_name: MARCA.nombreCorto,
      description: MARCA.descripcion,
      start_url: "/dashboard",
      display: "standalone",
      background_color: MARCA.colorFondo,
      theme_color: MARCA.colorFondo,
      icons: [
        { src: "/android-chrome-192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512.png", sizes: "512x512", type: "image/png" },
        { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };

    return NextResponse.json(defaultManifest, {
      headers: {
        'Content-Type': 'application/manifest+json'
      }
    });
  }
}
