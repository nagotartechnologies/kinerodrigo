import { NextResponse } from 'next/server';

// Versión del build desplegado (definida en next.config.js). Es pública:
// la usa el cliente para saber si debe recargar con una versión nueva.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { version: process.env.APP_VERSION || '' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
