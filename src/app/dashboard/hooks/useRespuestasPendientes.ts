'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RespuestaPendiente } from '../components/citas/ModalRespuestas';

const INTERVALO_SONDEO_MS = 120000;

/**
 * Sondea las respuestas de WhatsApp sin revisar. Llama a `onNuevas` cuando
 * aparece alguna que no se conocía, para que el calendario recargue los estados.
 */
export function useRespuestasPendientes(onNuevas: () => void, onError: (mensaje: string) => void) {
  const [respuestas, setRespuestas] = useState<RespuestaPendiente[]>([]);
  const idsConocidos = useRef<Set<number> | null>(null);
  // Refs para no reiniciar el intervalo cada vez que el padre re-renderiza
  const onNuevasRef = useRef(onNuevas);
  onNuevasRef.current = onNuevas;

  const cargar = useCallback(async () => {
    try {
      const data = await fetch('/api/recordatorios/pendientes').then(r => r.json());
      if (!data.success) return;
      const pendientes: RespuestaPendiente[] = data.pendientes;
      const conocidos = idsConocidos.current;
      const hayNuevas = conocidos !== null && pendientes.some(p => !conocidos.has(p.id));
      idsConocidos.current = new Set(pendientes.map(p => p.id));
      setRespuestas(pendientes);
      if (hayNuevas) onNuevasRef.current();
    } catch {
      // Sin conexión: se reintenta en el próximo intervalo
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const marcarRevisadas = async (ids: number[]) => {
    setRespuestas(prev => prev.filter(r => !ids.includes(r.id)));
    try {
      const res = await fetch('/api/recordatorios/pendientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Respuesta no válida');
    } catch {
      onError('No se pudo marcar como revisado');
      cargar();
    }
  };

  return { respuestas, marcarRevisadas };
}
