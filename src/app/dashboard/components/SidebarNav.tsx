'use client';

import { useEffect, useRef } from 'react';
import { MARCA } from '@/lib/marca';

export type ModuloNav = 'pacientes' | 'citas' | 'sesiones' | 'pagos' | 'configuracion';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  activo: ModuloNav | null;
  onIr: (modulo: ModuloNav | null) => void;
  user: any;
  onLogout: () => void;
  citasHoy?: number;
}

const ICONOS: Record<ModuloNav | 'inicio', React.ReactNode> = {
  inicio: (
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
  ),
  pacientes: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  citas: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  sesiones: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  pagos: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

const ITEMS: { id: ModuloNav; nombre: string }[] = [
  { id: 'pacientes', nombre: 'Pacientes' },
  { id: 'citas', nombre: 'Citas' },
  { id: 'sesiones', nombre: 'Sesiones' },
  { id: 'pagos', nombre: 'Finanzas' },
  { id: 'configuracion', nombre: 'Configuración' },
];

const Icono = ({ id }: { id: ModuloNav | 'inicio' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONOS[id]}
  </svg>
);

export default function SidebarNav({ abierta, onCerrar, activo, onIr, user, onLogout, citasHoy = 0 }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const toqueRef = useRef<{ x: number; y: number } | null>(null);

  // Esc para cerrar, foco al abrir y sin scroll del fondo
  useEffect(() => {
    if (!abierta) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierta, onCerrar]);

  const ir = (modulo: ModuloNav | null) => {
    onIr(modulo);
    onCerrar();
  };

  // Deslizar el panel hacia la izquierda lo cierra
  const onTouchStart = (e: React.TouchEvent) => {
    toqueRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const inicio = toqueRef.current;
    toqueRef.current = null;
    if (!inicio) return;
    const dx = e.changedTouches[0].clientX - inicio.x;
    const dy = Math.abs(e.changedTouches[0].clientY - inicio.y);
    if (dx < -60 && Math.abs(dx) > dy) onCerrar();
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${abierta ? 'abierta' : ''}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        id="sidebar-nav"
        className={`sidebar ${abierta ? 'abierta' : ''}`}
        aria-label="Navegación principal"
        aria-hidden={!abierta}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="sidebar-head">
          <img className="sidebar-logo" src={MARCA.logos.horizontal} alt={MARCA.nombreCompleto} width={2534} height={652} />
          <button
            ref={cerrarRef}
            type="button"
            className="sidebar-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            tabIndex={abierta ? 0 : -1}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-item ${activo === null ? 'activo' : ''}`}
            onClick={() => ir(null)}
            aria-current={activo === null ? 'page' : undefined}
            tabIndex={abierta ? 0 : -1}
          >
            <Icono id="inicio" />
            <span>Inicio</span>
          </button>

          <p className="sidebar-seccion">Módulos</p>

          {ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${activo === item.id ? 'activo' : ''}`}
              onClick={() => ir(item.id)}
              aria-current={activo === item.id ? 'page' : undefined}
              tabIndex={abierta ? 0 : -1}
            >
              <Icono id={item.id} />
              <span>{item.nombre}</span>
              {item.id === 'citas' && citasHoy > 0 && (
                <span className="sidebar-badge" aria-label={`${citasHoy} citas hoy`}>{citasHoy}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-pie">
          <div className="sidebar-usuario">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <div className="sidebar-usuario__texto">
              <p className="sidebar-usuario__nombre">{user?.nombre} {user?.apellido}</p>
              <p className="sidebar-usuario__email">{user?.email}</p>
            </div>
          </div>
          <button type="button" className="sidebar-salir" onClick={onLogout} tabIndex={abierta ? 0 : -1}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
          <p className="sidebar-credito">Desarrollado por {MARCA.desarrollador}</p>
        </div>
      </aside>
    </>
  );
}
