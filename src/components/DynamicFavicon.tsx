'use client';

import { useEffect } from 'react';
import { nombreMarca } from '@/lib/marca';

// Los íconos y la imagen OG son fijos (brand kit, definidos en layout.tsx).
// Aquí solo se ajusta el título si el centro configuró un nombre propio.
export default function DynamicFavicon() {
  useEffect(() => {
    const actualizarTitulo = async () => {
      try {
        const response = await fetch('/api/configuraciones');
        const data = await response.json();
        if (data.success && data.configuraciones) {
          const valor = data.configuraciones.find((c: any) => c.clave === 'nombre_centro')?.valor;
          document.title = nombreMarca(valor);
        }
      } catch (error) {
        console.error('Error al cargar configuracion para metadata:', error);
      }
    };

    actualizarTitulo();
  }, []);

  return null;
}
