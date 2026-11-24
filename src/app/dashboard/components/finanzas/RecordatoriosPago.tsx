'use client';

import { useMemo, useState } from 'react';
import Paginacion, { usePaginacion } from '../Paginacion';
import { useConfirm } from '@/components/ConfirmDialog';
import type { ResultadoEnvioCobro } from '@/services/finanzas/cobros';

// Debe coincidir con MAX_RECORDATORIOS_PAGO_POR_ENVIO del esquema: cada tanda es una petición
const TAMANO_TANDA = 10;

interface PacienteLista {
  id: number;
  nombre: string;
  rut?: string | null;
  telefono?: string | null;
}

interface Props {
  pacientes: PacienteLista[];
  mostrarMensaje: (texto: string, esError?: boolean) => void;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function enTandas<T>(items: T[], tamano: number): T[][] {
  const tandas: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) tandas.push(items.slice(i, i + tamano));
  return tandas;
}

async function enviarTanda(pacienteIds: number[]): Promise<ResultadoEnvioCobro[]> {
  const res = await fetch('/api/cobros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pacienteIds }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error al enviar los recordatorios');
  return data.resultados;
}

export default function RecordatoriosPago({ pacientes, mostrarMensaje }: Props) {
  const confirmar = useConfirm();
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState<{ hechos: number; total: number } | null>(null);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return pacientes;
    return pacientes.filter((p) => normalizar(`${p.nombre} ${p.rut ?? ''}`).includes(q));
  }, [pacientes, busqueda]);

  const pag = usePaginacion(filtrados, busqueda);
  const todosMarcados = filtrados.length > 0 && filtrados.every((p) => seleccion.has(p.id));

  const alternar = (id: number) => setSeleccion((prev) => {
    const nueva = new Set(prev);
    if (nueva.has(id)) nueva.delete(id); else nueva.add(id);
    return nueva;
  });

  const alternarTodos = () => setSeleccion((prev) => {
    const nueva = new Set(prev);
    filtrados.forEach((p) => (todosMarcados ? nueva.delete(p.id) : nueva.add(p.id)));
    return nueva;
  });

  const handleEnviar = async () => {
    const ids = [...seleccion];
    const texto = `Se enviará un recordatorio de pago por WhatsApp a ${ids.length} paciente(s). ¿Continuar?`;
    if (!ids.length || !(await confirmar(texto, { titulo: 'Enviar recordatorios', textoConfirmar: 'Enviar' }))) return;

    const resultados: ResultadoEnvioCobro[] = [];
    setEnviando({ hechos: 0, total: ids.length });
    try {
      // Secuencial: cada petición debe terminar antes del timeout de Netlify
      for (const tanda of enTandas(ids, TAMANO_TANDA)) {
        resultados.push(...(await enviarTanda(tanda)));
        setEnviando({ hechos: resultados.length, total: ids.length });
      }
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : 'Error al enviar los recordatorios', true);
    } finally {
      setEnviando(null);
    }

    if (!resultados.length) return;
    const fallidos = resultados.filter((r) => r.estado === 'error');
    const resumen = `${resultados.length - fallidos.length} recordatorio(s) enviado(s)`;
    mostrarMensaje(fallidos.length ? `${resumen}. Fallaron: ${fallidos.map((f) => `${f.nombre} (${f.error})`).join(', ')}` : resumen, fallidos.length > 0);
    // Quedan marcados solo los que fallaron, para reintentar
    setSeleccion(new Set(fallidos.map((f) => f.pacienteId)));
  };

  if (!pacientes.length) return <div className="pac-vacio"><p>No hay pacientes registrados</p></div>;

  return (
    <div>
      <div className="fin-fijos-cabecera">
        <p>Elige a quién enviarle un recordatorio de pago por WhatsApp.</p>
        <div className="fin-fijos-botones">
          <button className="btn-secondary" onClick={alternarTodos} disabled={!filtrados.length} aria-pressed={todosMarcados}>
            {todosMarcados ? 'Quitar selección' : 'Seleccionar todos'}
          </button>
          <button className="btn-primary" onClick={handleEnviar} disabled={!seleccion.size || !!enviando}>
            {enviando ? `Enviando ${enviando.hechos}/${enviando.total}…` : `Enviar recordatorio (${seleccion.size})`}
          </button>
        </div>
      </div>

      <input
        type="search"
        className="pac-buscador fin-cobro__buscador"
        placeholder="Buscar paciente por nombre o RUT"
        aria-label="Buscar paciente"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {!filtrados.length ? (
        <div className="pac-vacio"><p>Ningún paciente coincide con la búsqueda</p></div>
      ) : (
        <ul className="fin-lista">
          {pag.visibles.map((p) => (
            <li key={p.id}>
              <label className={`fin-mov fin-cobro ${seleccion.has(p.id) ? 'is-seleccionado' : ''}`}>
                <input
                  type="checkbox"
                  className="fin-cobro__check"
                  checked={seleccion.has(p.id)}
                  onChange={() => alternar(p.id)}
                />
                <span className="fin-mov__info">
                  <span className="fin-mov__desc">{p.nombre}</span>
                  <span className="fin-mov__meta">
                    {p.rut || 'Sin RUT'} · {p.telefono || 'Sin teléfono'}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <Paginacion
        pagina={pag.pagina}
        totalPaginas={pag.totalPaginas}
        total={pag.total}
        porPagina={pag.porPagina}
        onCambiar={pag.setPagina}
        etiqueta="pacientes"
      />
    </div>
  );
}
