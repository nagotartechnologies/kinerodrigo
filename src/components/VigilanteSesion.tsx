'use client';

import { useEffect } from 'react';

const RUTA_LOGIN = '/login';
const RUTA_LOGOUT = '/api/auth/logout';
// Rutas cuyo 401 no significa "sesión vencida" (el login responde 401 por credenciales malas)
const RUTAS_IGNORADAS = ['/api/auth/'];

function esApiPropia(input: RequestInfo | URL): string | null {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const { pathname, origin } = new URL(url, window.location.origin);
  if (origin !== window.location.origin || !pathname.startsWith('/api/')) return null;
  return pathname;
}

/**
 * El middleware solo comprueba que exista la cookie, no que el JWT sea válido.
 * Si la API responde 401 (token vencido o firmado con otra clave), se borra la
 * cookie y se manda al login en vez de dejar la pantalla fallando en silencio.
 */
export default function VigilanteSesion() {
  useEffect(() => {
    const fetchOriginal = window.fetch;
    let redirigiendo = false;

    window.fetch = async (input, init) => {
      const respuesta = await fetchOriginal(input, init);
      const ruta = esApiPropia(input);
      const ignorada = ruta && RUTAS_IGNORADAS.some((prefijo) => ruta.startsWith(prefijo));
      if (respuesta.status === 401 && ruta && !ignorada && !redirigiendo) {
        redirigiendo = true;
        await fetchOriginal(RUTA_LOGOUT, { method: 'POST' }).catch(() => undefined);
        window.location.href = `${RUTA_LOGIN}?expirada=1`;
      }
      return respuesta;
    };

    return () => {
      window.fetch = fetchOriginal;
    };
  }, []);

  return null;
}
