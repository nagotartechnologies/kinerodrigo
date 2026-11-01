'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fechaAString } from '../utils';

// Calendario semanal estilo Google Calendar: grilla temporal con citas posicionadas por hora y duracion.
// Mouse: arrastrar mueve la cita, el borde inferior cambia la duracion, click en hueco crea, click derecho bloquea.
// Touch: tocar abre, mantener presionado y arrastrar mueve, el tirador inferior cambia la duracion,
// tocar un hueco crea y mantener presionado un hueco bloquea la hora.

const HORA_INICIO = 8;
const HORA_FIN = 22;
const PX_POR_MIN = 1.2;
const PASO_MIN = 15;
const DURACION_MINIMA = 15;
const LONG_PRESS_MS = 400;
const UMBRAL_MOUSE_PX = 4;
const UMBRAL_TOUCH_PX = 8;

const MIN_INICIO = HORA_INICIO * 60;
const MIN_FIN = HORA_FIN * 60;
const ALTO_TOTAL = (MIN_FIN - MIN_INICIO) * PX_POR_MIN;

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};
const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const ajustar = (min: number) => Math.round(min / PASO_MIN) * PASO_MIN;
const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

interface EventoPosicionado {
  cita: any;
  ini: number;
  fin: number;
  col: number;
  total: number;
}

// Agrupa citas que se solapan y las reparte en columnas lado a lado
function calcularLayout(citas: any[]): EventoPosicionado[] {
  const eventos = citas
    .map(cita => {
      const ini = aMinutos(cita.hora);
      return { cita, ini, fin: ini + (Number(cita.duracion) || 60), col: 0, total: 1 };
    })
    .sort((a, b) => a.ini - b.ini || b.fin - a.fin);

  const resultado: EventoPosicionado[] = [];
  let grupo: EventoPosicionado[] = [];
  let finGrupo = -1;

  const cerrarGrupo = () => {
    const finPorColumna: number[] = [];
    for (const ev of grupo) {
      let col = finPorColumna.findIndex(fin => fin <= ev.ini);
      if (col === -1) {
        col = finPorColumna.length;
        finPorColumna.push(ev.fin);
      } else {
        finPorColumna[col] = ev.fin;
      }
      ev.col = col;
    }
    for (const ev of grupo) ev.total = finPorColumna.length;
    resultado.push(...grupo);
    grupo = [];
  };

  for (const ev of eventos) {
    if (grupo.length > 0 && ev.ini >= finGrupo) cerrarGrupo();
    grupo.push(ev);
    finGrupo = grupo.length === 1 ? ev.fin : Math.max(finGrupo, ev.fin);
  }
  if (grupo.length > 0) cerrarGrupo();
  return resultado;
}

interface Arrastre {
  tipo: 'mover' | 'redimensionar';
  cita: any;
  diaIndex: number;
  ini: number;
  dur: number;
  x0: number;
  y0: number;
  offsetMin: number;
  activo: boolean;
}

interface Preview {
  citaId: number;
  diaIndex: number;
  ini: number;
  dur: number;
}

interface Props {
  dias: Date[];
  citasPorFecha: Map<string, any[]>;
  bloqueosPorFecha: Map<string, any[]>;
  onEditar: (cita: any) => void;
  onCrear: (dia: Date, hora: string) => void;
  onMover: (cita: any, dia: Date, hora: string, duracion?: number) => void;
  onBloquear: (dia: Date, hora: string) => void;
  onDesbloquear: (id: number) => void;
}

const etiquetaRecordatorio = (recordatorio: { estado?: string; respuesta?: string }) =>
  recordatorio.estado === 'error' ? '⚠️' :
  recordatorio.respuesta === 'CONFIRMAR' ? '✅' : recordatorio.respuesta === 'CANCELAR' ? '❌' : recordatorio.respuesta === 'REAGENDAR' ? '📅' : '📤';

const tituloRecordatorio = (recordatorio: { estado?: string; respuesta?: string; cancelacionTardia?: boolean }) =>
  recordatorio.estado === 'error' ? 'Error al enviar el recordatorio de WhatsApp' :
  recordatorio.respuesta === 'CANCELAR' && recordatorio.cancelacionTardia ? 'Canceló por WhatsApp (cancelación tardía)' :
  'Recordatorio WhatsApp';

export default function SemanaCalendario({
  dias,
  citasPorFecha,
  bloqueosPorFecha,
  onEditar,
  onCrear,
  onMover,
  onBloquear,
  onDesbloquear,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const arrastreRef = useRef<Arrastre | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const ultimoPuntoRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limpiarListenersRef = useRef<(() => void) | null>(null);
  const suprimirClickRef = useRef(false);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [arrastrandoId, setArrastrandoId] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const hoyStr = fechaAString(new Date());
  const indiceHoy = dias.findIndex(d => fechaAString(d) === hoyStr);

  // Linea de "ahora" se actualiza cada minuto
  useEffect(() => {
    const intervalo = setInterval(() => {
      const d = new Date();
      setAhora(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  // Al abrir o cambiar de semana: centrar el dia de hoy y la hora actual
  useEffect(() => {
    const cont = scrollRef.current;
    if (!cont) return;
    const columnaHoy = indiceHoy >= 0 ? colRefs.current[indiceHoy] : null;
    const anchoHoras = colRefs.current[0]?.offsetLeft || 0;
    cont.scrollLeft = columnaHoy ? columnaHoy.offsetLeft - anchoHoras : 0;
    const minutoObjetivo = indiceHoy >= 0 ? limitar(ahora - 60, MIN_INICIO, MIN_FIN) : MIN_INICIO;
    cont.scrollTop = (minutoObjetivo - MIN_INICIO) * PX_POR_MIN;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  // Limpieza al desmontar
  useEffect(() => () => {
    limpiarListenersRef.current?.();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    document.body.classList.remove('gcal-arrastrando');
  }, []);

  const layoutPorDia = useMemo(
    () => dias.map(dia => calcularLayout(citasPorFecha.get(fechaAString(dia)) || [])),
    [dias, citasPorFecha]
  );

  const minutoEnY = (clientY: number) => {
    const col = colRefs.current[0];
    if (!col) return MIN_INICIO;
    return (clientY - col.getBoundingClientRect().top) / PX_POR_MIN + MIN_INICIO;
  };

  const diaEnX = (clientX: number) => {
    const primera = colRefs.current[0];
    if (!primera) return 0;
    const rect = primera.getBoundingClientRect();
    return limitar(Math.floor((clientX - rect.left) / rect.width), 0, dias.length - 1);
  };

  const actualizarPreview = (p: Preview | null) => {
    previewRef.current = p;
    setPreview(p);
  };

  const moverA = (x: number, y: number) => {
    const a = arrastreRef.current;
    if (!a || !a.activo) return;
    ultimoPuntoRef.current = { x, y };
    const minuto = minutoEnY(y);
    if (a.tipo === 'mover') {
      const ini = limitar(ajustar(minuto - a.offsetMin), MIN_INICIO, MIN_FIN - a.dur);
      actualizarPreview({ citaId: a.cita.id, diaIndex: diaEnX(x), ini, dur: a.dur });
    } else {
      const fin = limitar(ajustar(minuto), a.ini + DURACION_MINIMA, MIN_FIN);
      actualizarPreview({ citaId: a.cita.id, diaIndex: a.diaIndex, ini: a.ini, dur: fin - a.ini });
    }
  };

  // Desplaza la grilla cuando se arrastra cerca de los bordes
  const autoScroll = () => {
    const a = arrastreRef.current;
    const cont = scrollRef.current;
    if (!a?.activo || !cont) return;
    const rect = cont.getBoundingClientRect();
    const altoCabecera = (cont.querySelector('.gcal-head') as HTMLElement | null)?.offsetHeight || 0;
    const anchoHoras = colRefs.current[0]?.offsetLeft || 0;
    const { x, y } = ultimoPuntoRef.current;
    const margen = 40;
    const vel = 10;
    const dy = y < rect.top + altoCabecera + margen ? -vel : y > rect.bottom - margen ? vel : 0;
    const dx = a.tipo === 'mover'
      ? (x < rect.left + anchoHoras + margen ? -vel : x > rect.right - margen ? vel : 0)
      : 0;
    if (dx || dy) {
      cont.scrollBy(dx, dy);
      moverA(x, y);
    }
    rafRef.current = requestAnimationFrame(autoScroll);
  };

  const activar = (x: number, y: number) => {
    const a = arrastreRef.current;
    if (!a || a.activo) return;
    a.activo = true;
    a.offsetMin = minutoEnY(y) - a.ini;
    setArrastrandoId(a.cita.id);
    document.body.classList.add('gcal-arrastrando');
    moverA(x, y);
    rafRef.current = requestAnimationFrame(autoScroll);
  };

  const terminar = (confirmar: boolean) => {
    const a = arrastreRef.current;
    const p = previewRef.current;
    arrastreRef.current = null;
    limpiarListenersRef.current?.();
    limpiarListenersRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    document.body.classList.remove('gcal-arrastrando');
    setArrastrandoId(null);
    actualizarPreview(null);

    if (!a?.activo) return;
    // Evita que el click que sigue al soltar abra el modal de edicion
    suprimirClickRef.current = true;
    setTimeout(() => { suprimirClickRef.current = false; }, 350);

    if (!confirmar || !p) return;
    if (p.diaIndex === a.diaIndex && p.ini === a.ini && p.dur === a.dur) return;
    onMover(a.cita, dias[p.diaIndex], aHora(p.ini), p.dur !== a.dur ? p.dur : undefined);
  };

  const prepararArrastre = (tipo: Arrastre['tipo'], ev: EventoPosicionado, diaIndex: number, x: number, y: number) => {
    limpiarListenersRef.current?.();
    if (timerRef.current) clearTimeout(timerRef.current);
    arrastreRef.current = {
      tipo,
      cita: ev.cita,
      diaIndex,
      ini: ev.ini,
      dur: ev.fin - ev.ini,
      x0: x,
      y0: y,
      offsetMin: 0,
      activo: false,
    };
    ultimoPuntoRef.current = { x, y };
  };

  // --- Mouse ---
  const onPointerDownCita = (e: React.PointerEvent, tipo: Arrastre['tipo'], ev: EventoPosicionado, diaIndex: number) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.stopPropagation();
    if (tipo === 'redimensionar') e.preventDefault();
    prepararArrastre(tipo, ev, diaIndex, e.clientX, e.clientY);

    const alMover = (pe: PointerEvent) => {
      const a = arrastreRef.current;
      if (!a) return;
      if (!a.activo) {
        if (Math.hypot(pe.clientX - a.x0, pe.clientY - a.y0) < UMBRAL_MOUSE_PX) return;
        activar(pe.clientX, pe.clientY);
      }
      moverA(pe.clientX, pe.clientY);
    };
    const alSoltar = () => terminar(true);
    const alTeclear = (ke: KeyboardEvent) => { if (ke.key === 'Escape') terminar(false); };

    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
    window.addEventListener('keydown', alTeclear);
    limpiarListenersRef.current = () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('keydown', alTeclear);
    };
  };

  // --- Touch ---
  const onTouchStartCita = (e: React.TouchEvent, tipo: Arrastre['tipo'], ev: EventoPosicionado, diaIndex: number) => {
    e.stopPropagation();
    if (e.touches.length > 1) return;
    const t = e.touches[0];
    prepararArrastre(tipo, ev, diaIndex, t.clientX, t.clientY);

    if (tipo === 'redimensionar') {
      activar(t.clientX, t.clientY);
    } else {
      timerRef.current = setTimeout(() => {
        const { x, y } = ultimoPuntoRef.current;
        if (arrastreRef.current && !arrastreRef.current.activo) {
          navigator.vibrate?.(30);
          activar(x, y);
        }
      }, LONG_PRESS_MS);
    }

    const alMover = (te: TouchEvent) => {
      const a = arrastreRef.current;
      if (!a) return;
      const p = te.touches[0];
      ultimoPuntoRef.current = { x: p.clientX, y: p.clientY };
      if (a.activo) {
        te.preventDefault();
        moverA(p.clientX, p.clientY);
      } else if (Math.hypot(p.clientX - a.x0, p.clientY - a.y0) > UMBRAL_TOUCH_PX) {
        // El usuario esta haciendo scroll: se cancela el long press
        terminar(false);
      }
    };
    const alSoltar = (te: TouchEvent) => {
      if (arrastreRef.current?.activo) te.preventDefault();
      terminar(true);
    };
    const alCancelar = () => terminar(false);

    window.addEventListener('touchmove', alMover, { passive: false });
    window.addEventListener('touchend', alSoltar, { passive: false });
    window.addEventListener('touchcancel', alCancelar);
    limpiarListenersRef.current = () => {
      window.removeEventListener('touchmove', alMover);
      window.removeEventListener('touchend', alSoltar);
      window.removeEventListener('touchcancel', alCancelar);
    };
  };

  const onClickCita = (e: React.MouseEvent, cita: any) => {
    e.stopPropagation();
    if (suprimirClickRef.current) return;
    onEditar(cita);
  };

  // --- Huecos vacios ---
  const minutoHueco = (clientY: number) =>
    limitar(Math.floor(minutoEnY(clientY) / PASO_MIN) * PASO_MIN, MIN_INICIO, MIN_FIN - PASO_MIN);

  const bloquearEn = (clientY: number, diaIndex: number) => {
    const hora = Math.floor(minutoHueco(clientY) / 60);
    onBloquear(dias[diaIndex], `${String(hora).padStart(2, '0')}:00`);
  };

  const onClickColumna = (e: React.MouseEvent, diaIndex: number) => {
    if (suprimirClickRef.current) return;
    onCrear(dias[diaIndex], aHora(minutoHueco(e.clientY)));
  };

  const onTouchStartColumna = (e: React.TouchEvent, diaIndex: number) => {
    if (e.touches.length > 1) return;
    const t = e.touches[0];
    const x0 = t.clientX;
    const y0 = t.clientY;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(40);
      suprimirClickRef.current = true;
      setTimeout(() => { suprimirClickRef.current = false; }, 600);
      bloquearEn(y0, diaIndex);
    }, 550);

    const cancelar = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('touchmove', alMover);
      window.removeEventListener('touchend', cancelar);
      window.removeEventListener('touchcancel', cancelar);
    };
    const alMover = (te: TouchEvent) => {
      const p = te.touches[0];
      if (Math.hypot(p.clientX - x0, p.clientY - y0) > 10) cancelar();
    };
    window.addEventListener('touchmove', alMover, { passive: true });
    window.addEventListener('touchend', cancelar);
    window.addEventListener('touchcancel', cancelar);
  };

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const citaEnPreview = preview
    ? layoutPorDia.flat().find(ev => ev.cita.id === preview.citaId)?.cita
    : null;

  return (
    <div
      className="gcal"
      ref={scrollRef}
      data-no-swipe
      style={{ '--hora-px': `${PX_POR_MIN * 60}px` } as React.CSSProperties}
    >
      {/* Cabecera de dias (fija arriba) */}
      <div className="gcal-head">
        <div className="gcal-esquina" />
        {dias.map((dia, i) => (
          <div key={i} className={`gcal-dia-head ${i === indiceHoy ? 'hoy' : ''}`}>
            <span className="gcal-dia-nombre">
              {dia.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '')}
            </span>
            <span className="gcal-dia-num">{dia.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="gcal-body">
        {/* Columna de horas (fija a la izquierda) */}
        <div className="gcal-horas" style={{ height: ALTO_TOTAL }}>
          {horas.map(h => (
            <div key={h} className="gcal-hora" style={{ top: (h - HORA_INICIO) * 60 * PX_POR_MIN }}>
              <span>{`${String(h).padStart(2, '0')}:00`}</span>
            </div>
          ))}
        </div>

        {dias.map((dia, diaIndex) => {
          const fechaStr = fechaAString(dia);
          const bloqueos = bloqueosPorFecha.get(fechaStr) || [];
          const diaPasado = fechaStr < hoyStr;

          return (
            <div
              key={diaIndex}
              ref={el => { colRefs.current[diaIndex] = el; }}
              className={`gcal-col ${diaIndex === indiceHoy ? 'hoy' : ''} ${diaPasado ? 'pasado' : ''}`}
              style={{ height: ALTO_TOTAL }}
              onClick={e => onClickColumna(e, diaIndex)}
              onContextMenu={e => { e.preventDefault(); bloquearEn(e.clientY, diaIndex); }}
              onTouchStart={e => onTouchStartColumna(e, diaIndex)}
            >
              {bloqueos.map(b => {
                const ini = limitar(aMinutos(b.hora_inicio), MIN_INICIO, MIN_FIN);
                const fin = limitar(aMinutos(b.hora_fin), MIN_INICIO, MIN_FIN);
                if (fin <= ini) return null;
                return (
                  <button
                    type="button"
                    key={b.id}
                    className="gcal-bloqueo"
                    style={{ top: (ini - MIN_INICIO) * PX_POR_MIN, height: (fin - ini) * PX_POR_MIN }}
                    onClick={e => { e.stopPropagation(); onDesbloquear(b.id); }}
                    onTouchStart={e => e.stopPropagation()}
                    title="Toca para desbloquear"
                  >
                    <span>🔒 {b.motivo || 'Bloqueado'}</span>
                  </button>
                );
              })}

              {layoutPorDia[diaIndex].map(ev => {
                const { cita } = ev;
                const ini = limitar(ev.ini, MIN_INICIO, MIN_FIN - DURACION_MINIMA);
                const fin = limitar(ev.fin, ini + DURACION_MINIMA, MIN_FIN);
                const dur = ev.fin - ev.ini;
                const pasada = diaPasado || (diaIndex === indiceHoy && ev.fin <= ahora);
                const redimensionable = cita.estado !== 'cancelada' && cita.estado !== 'completada';
                return (
                  <div
                    key={cita.id}
                    role="button"
                    tabIndex={0}
                    className={`gcal-ev gcal-ev--${cita.estado} ${dur <= 30 ? 'is-corta' : ''} ${pasada ? 'is-pasada' : ''} ${arrastrandoId === cita.id ? 'is-origen' : ''}`}
                    style={{
                      top: (ini - MIN_INICIO) * PX_POR_MIN,
                      height: Math.max((fin - ini) * PX_POR_MIN - 2, 20),
                      left: `calc(${(ev.col / ev.total) * 100}% + 2px)`,
                      width: `calc(${100 / ev.total}% - 4px)`,
                    }}
                    onPointerDown={e => onPointerDownCita(e, 'mover', ev, diaIndex)}
                    onTouchStart={e => onTouchStartCita(e, 'mover', ev, diaIndex)}
                    onClick={e => onClickCita(e, cita)}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEditar(cita);
                      }
                    }}
                    aria-label={`${cita.paciente}, ${cita.hora} a ${aHora(ev.fin)}, ${cita.estado}`}
                  >
                    <div className="gcal-ev__titulo">
                      {cita.paciente}
                      {dur <= 30 && <span className="gcal-ev__hora-inline">, {cita.hora}</span>}
                    </div>
                    {dur > 30 && (
                      <div className="gcal-ev__hora">
                        {cita.hora} – {aHora(ev.fin)}
                        {cita.tieneSesion && <span className="gcal-ev__icono gcal-ev__icono--sesion" title="Sesión registrada">✓</span>}
                        {cita.tienePago && <span className="gcal-ev__icono gcal-ev__icono--pago" title="Pago registrado">$</span>}
                        {cita.recordatorio && (
                          <span className="gcal-ev__icono" title={tituloRecordatorio(cita.recordatorio)}>
                            {etiquetaRecordatorio(cita.recordatorio)}
                          </span>
                        )}
                      </div>
                    )}
                    {dur >= 60 && <div className="gcal-ev__tipo">{cita.tipo}</div>}
                    {redimensionable && (
                      <div
                        className="gcal-ev__resize"
                        onPointerDown={e => onPointerDownCita(e, 'redimensionar', ev, diaIndex)}
                        onTouchStart={e => onTouchStartCita(e, 'redimensionar', ev, diaIndex)}
                        onClick={e => e.stopPropagation()}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}

              {/* Vista previa mientras se arrastra */}
              {preview && citaEnPreview && preview.diaIndex === diaIndex && (
                <div
                  className={`gcal-ev gcal-ev--${citaEnPreview.estado} is-fantasma ${preview.dur <= 30 ? 'is-corta' : ''}`}
                  style={{
                    top: (preview.ini - MIN_INICIO) * PX_POR_MIN,
                    height: Math.max(preview.dur * PX_POR_MIN - 2, 20),
                    left: 2,
                    width: 'calc(100% - 4px)',
                  }}
                  aria-hidden="true"
                >
                  <div className="gcal-ev__titulo">{citaEnPreview.paciente}</div>
                  <div className="gcal-ev__hora">{aHora(preview.ini)} – {aHora(preview.ini + preview.dur)}</div>
                </div>
              )}

              {/* Linea de la hora actual */}
              {diaIndex === indiceHoy && ahora >= MIN_INICIO && ahora <= MIN_FIN && (
                <div className="gcal-ahora" style={{ top: (ahora - MIN_INICIO) * PX_POR_MIN }} aria-hidden="true">
                  <span className="gcal-ahora__punto" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
