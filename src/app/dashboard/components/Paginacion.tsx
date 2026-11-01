'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export const POR_PAGINA = 10;

// Pagina una lista en el cliente. La página vuelve a 1 cuando cambia `claveReinicio` (filtros, búsqueda, mes...)
export function usePaginacion<T>(items: T[], claveReinicio: unknown = null, porPagina: number = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));

  useEffect(() => {
    setPagina(1);
  }, [claveReinicio]);

  // Si la lista se achica (ej. al eliminar), no quedar en una página vacía
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => items.slice((paginaActual - 1) * porPagina, paginaActual * porPagina),
    [items, paginaActual, porPagina]
  );

  return { visibles, pagina: paginaActual, totalPaginas, setPagina, total: items.length, porPagina };
}

// Números de página a mostrar, con "…" cuando hay muchas
function paginasVisibles(actual: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set([1, total, actual, actual - 1, actual + 1]);
  const lista = [...paginas].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultado: (number | '…')[] = [];
  lista.forEach((p, i) => {
    if (i > 0 && p - lista[i - 1] > 1) resultado.push('…');
    resultado.push(p);
  });
  return resultado;
}

interface Props {
  pagina: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  onCambiar: (pagina: number) => void;
  etiqueta?: string;
}

export default function Paginacion({ pagina, totalPaginas, total, porPagina, onCambiar, etiqueta = 'resultados' }: Props) {
  const ref = useRef<HTMLElement>(null);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  const ir = (nueva: number) => {
    if (nueva < 1 || nueva > totalPaginas || nueva === pagina) return;
    onCambiar(nueva);
    // Volver al inicio de la lista para no quedar al fondo de la página nueva
    const lista = ref.current?.parentElement;
    const top = lista ? lista.getBoundingClientRect().top + window.scrollY - 120 : 0;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  return (
    <nav className="paginacion" aria-label="Paginación" ref={ref}>
      <p className="paginacion__resumen">
        {desde}–{hasta} de {total} {etiqueta}
      </p>
      <div className="paginacion__controles">
        <button
          type="button"
          className="paginacion__flecha"
          onClick={() => ir(pagina - 1)}
          disabled={pagina === 1}
          aria-label="Página anterior"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {paginasVisibles(pagina, totalPaginas).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="paginacion__elipsis" aria-hidden="true">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`paginacion__numero ${p === pagina ? 'activa' : ''}`}
              onClick={() => ir(p)}
              aria-label={`Página ${p}`}
              aria-current={p === pagina ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="paginacion__flecha"
          onClick={() => ir(pagina + 1)}
          disabled={pagina === totalPaginas}
          aria-label="Página siguiente"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
