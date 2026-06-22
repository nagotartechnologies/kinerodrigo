import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Obtener configuración del sistema
    const nombreCentro = await db.prepare('SELECT valor FROM configuraciones WHERE clave = ?')
      .get('nombre_centro')
      .then((row: any) => row?.valor || 'KINE-CITAS');

    // Generar manifest dinámico usando el logo de configuración vía /api/icon
    const manifest = {
      name: `${nombreCentro} - Sistema de Gestión`,
      short_name: nombreCentro,
      description: `Sistema de gestión kinesiológica - ${nombreCentro}`,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#10b981",
      orientation: "portrait-primary",
      scope: "/",
      icons: [
        {
          src: "/api/icon",
          sizes: "72x72",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "96x96",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "128x128",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "144x144",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "152x152",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "384x384",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/icon",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/api/icon",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      categories: ["health", "medical", "productivity"],
      screenshots: [
        {
          src: "/api/icon",
          sizes: "512x512",
          type: "image/png"
        }
      ]
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
      name: "KINE-CITAS - Sistema de Gestión",
      short_name: "KINE-CITAS",
      description: "Sistema de gestión kinesiológica",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#4F46E5",
      icons: [
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png"
        }
      ]
    };

    return NextResponse.json(defaultManifest, {
      headers: {
        'Content-Type': 'application/manifest+json'
      }
    });
  }
}
