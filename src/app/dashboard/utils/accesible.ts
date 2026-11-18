import type { KeyboardEvent } from 'react';

/**
 * Props para que un elemento no-botón (tarjeta, opción de lista) sea usable
 * con teclado: recibe foco con Tab y se activa con Enter o Espacio.
 * Preferir <button> cuando el layout lo permita.
 */
export function propsActivable(accion: () => void, rol: 'button' | 'option' = 'button') {
  return {
    role: rol,
    tabIndex: 0,
    onClick: accion,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        accion();
      }
    },
  };
}
