'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface OpcionesConfirmacion {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  // Acciones destructivas (eliminar) se muestran en rojo
  peligro?: boolean;
  // Solo informa: muestra un único botón "Entendido" (reemplazo de alert)
  soloAviso?: boolean;
}

interface Solicitud extends OpcionesConfirmacion {
  mensaje: string;
  resolver: (aceptado: boolean) => void;
}

type Confirmar = (mensaje: string, opciones?: OpcionesConfirmacion) => Promise<boolean>;

const ConfirmContext = createContext<Confirmar | null>(null);

/**
 * Reemplazo accesible de window.confirm/alert: se ve como el resto de la app,
 * atrapa el foco, cierra con Escape y devuelve una promesa con la decisión.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  const confirmar = useCallback<Confirmar>((mensaje, opciones = {}) => {
    focoPrevio.current = document.activeElement as HTMLElement | null;
    return new Promise((resolver) => setSolicitud({ mensaje, ...opciones, resolver }));
  }, []);

  const cerrar = useCallback((aceptado: boolean) => {
    setSolicitud((actual) => {
      actual?.resolver(aceptado);
      return null;
    });
    focoPrevio.current?.focus();
  }, []);

  useEffect(() => {
    if (!solicitud) return;
    botonConfirmar.current?.focus();
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [solicitud, cerrar]);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {solicitud && (
        <div className="modal-overlay confirm-overlay" onClick={() => cerrar(false)}>
          <div
            className="modal-content modal-sm confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-titulo"
            aria-describedby="confirm-mensaje"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="confirm-titulo">{solicitud.titulo ?? (solicitud.soloAviso ? 'Aviso' : 'Confirmar acción')}</h3>
            </div>
            <div className="modal-body">
              <p id="confirm-mensaje" className="modal-texto confirm-dialog__mensaje">{solicitud.mensaje}</p>
            </div>
            <div className="modal-actions">
              {!solicitud.soloAviso && (
                <button type="button" className="btn-secondary" onClick={() => cerrar(false)}>
                  {solicitud.textoCancelar ?? 'Cancelar'}
                </button>
              )}
              <button
                ref={botonConfirmar}
                type="button"
                className={`btn-confirmar ${solicitud.peligro ? 'btn-confirmar--abandono' : ''}`}
                onClick={() => cerrar(true)}
              >
                {solicitud.textoConfirmar ?? (solicitud.soloAviso ? 'Entendido' : 'Aceptar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirmar {
  const confirmar = useContext(ConfirmContext);
  if (!confirmar) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return confirmar;
}
