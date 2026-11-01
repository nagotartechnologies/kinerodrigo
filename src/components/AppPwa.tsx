'use client';

import { useEffect, useState } from 'react';
import { iniciarPwa, usePwa, aplicarVersionNueva } from '@/lib/pwa';

// Registra el service worker, captura el evento de instalación y avisa
// cuando hay una versión nueva desplegada. Se monta una vez en el layout raíz.
export default function AppPwa() {
  const { versionNueva } = usePwa();
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    iniciarPwa();
  }, []);

  if (!versionNueva) return null;

  return (
    <div className="pwa-actualizacion" role="status">
      <span className="pwa-actualizacion__texto">Hay una nueva versión disponible</span>
      <button
        type="button"
        className="pwa-actualizacion__boton"
        disabled={actualizando}
        onClick={() => {
          setActualizando(true);
          aplicarVersionNueva();
        }}
      >
        {actualizando ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  );
}
