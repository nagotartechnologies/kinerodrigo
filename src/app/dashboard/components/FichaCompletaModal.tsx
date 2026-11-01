'use client';

import { useState, useEffect } from 'react';
import { nombreMarca } from '@/lib/marca';
import { formatearFechaLocal } from '../utils';
import { generarFichaPDF } from '../utils/generarFichaPDF';

interface FichaCompletaModalProps {
  paciente: any;
  onClose: () => void;
  onPacienteUpdated?: (paciente: any) => void;
  onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void;
  configuraciones?: any;
  initialModoEdicion?: boolean;
}

export default function FichaCompletaModal({
  paciente: pacienteInicial,
  onClose,
  onPacienteUpdated,
  onNavigate,
  configuraciones = {},
  initialModoEdicion = false,
}: FichaCompletaModalProps) {
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(pacienteInicial);
  const [modoEdicion, setModoEdicion] = useState(initialModoEdicion);
  const [sesionesPaciente, setSesionesPaciente] = useState<any[]>([]);
  const [citasPaciente, setCitasPaciente] = useState<any[]>([]);
  const [pagosPaciente, setPagosPaciente] = useState<any[]>([]);
  const [estadisticasPaciente, setEstadisticasPaciente] = useState<any>(null);
  const [loadingSesiones, setLoadingSesiones] = useState(false);
  const [documentosPaciente, setDocumentosPaciente] = useState<any[]>([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [historialEstados, setHistorialEstados] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Modal cambio de estado
  const [showModalEstado, setShowModalEstado] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [motivoEstado, setMotivoEstado] = useState('');
  const [notasEstado, setNotasEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Episodios de tratamiento
  const [episodios, setEpisodios] = useState<any[]>([]);
  const [episodioActualId, setEpisodioActualId] = useState<number | null>(null);
  const [episodioSeleccionadoId, setEpisodioSeleccionadoId] = useState<number | null>(null);

  // Modal nuevo episodio
  const [showModalEpisodio, setShowModalEpisodio] = useState(false);
  const [nuevoEpisodio, setNuevoEpisodio] = useState({ motivoLesion: '', objetivo: '', evaluacionFisica: '' });
  const [creandoEpisodio, setCreandoEpisodio] = useState(false);

  // Modal pregunta al reactivar (misma o nueva lesión)
  const [showModalReactivar, setShowModalReactivar] = useState(false);

  const getConfigValue = (clave: string, defaultValue: any = '') => {
    return configuraciones[clave]?.valor ?? defaultValue;
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  // Cargar datos al montar
  useEffect(() => {
    if (pacienteSeleccionado?.id) {
      cargarDatosPaciente(pacienteSeleccionado.id);
    }
  }, []);

  const cargarDatosPaciente = async (pacienteId: number) => {
    try {
      setLoadingSesiones(true);
      const [historialRes, docsRes, estadosRes] = await Promise.allSettled([
        fetch(`/api/pacientes/${pacienteId}/historial`).then(r => r.json()),
        fetch(`/api/pacientes/${pacienteId}/documentos`).then(r => r.json()),
        fetch(`/api/pacientes/${pacienteId}/estado`).then(r => r.json()),
      ]);

      if (historialRes.status === 'fulfilled' && historialRes.value.success) {
        setSesionesPaciente(historialRes.value.sesiones || []);
        setCitasPaciente(historialRes.value.citas || []);
        setPagosPaciente(historialRes.value.pagos || []);
        setEstadisticasPaciente(historialRes.value.estadisticas || null);
        const eps = historialRes.value.episodios || [];
        const actualId = historialRes.value.episodioActualId || null;
        setEpisodios(eps);
        setEpisodioActualId(actualId);
        // Por defecto, seleccionar el episodio actual (o mantener el ya seleccionado si sigue existiendo)
        setEpisodioSeleccionadoId(prev =>
          prev && eps.some((e: any) => e.id === prev) ? prev : actualId
        );
      }
      if (docsRes.status === 'fulfilled' && docsRes.value.success) {
        setDocumentosPaciente(docsRes.value.documentos || []);
      }
      if (estadosRes.status === 'fulfilled' && estadosRes.value.success) {
        setHistorialEstados(estadosRes.value.historial || []);
      }
    } catch (error) {
      console.error('Error al cargar datos del paciente:', error);
    } finally {
      setLoadingSesiones(false);
    }
  };

  const handleSubirDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !pacienteSeleccionado) return;
    
    setSubiendoDocumento(true);
    try {
      for (const file of Array.from(files)) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('nombre', file.name);
        
        const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}/documentos`, {
          method: 'POST',
          body: formDataUpload
        });
        const data = await response.json();
        if (data.success) {
          setDocumentosPaciente(prev => [data.documento, ...prev]);
        } else {
          mostrarMensaje(data.error || 'Error al subir archivo', true);
        }
      }
      mostrarMensaje('Archivo(s) subido(s) exitosamente');
    } catch (err) {
      mostrarMensaje('Error al subir archivo', true);
    } finally {
      setSubiendoDocumento(false);
      e.target.value = '';
    }
  };

  const handleEliminarDocumento = async (docId: number) => {
    if (!pacienteSeleccionado || !confirm('¿Eliminar este documento?')) return;
    try {
      const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}/documentos?docId=${docId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setDocumentosPaciente(prev => prev.filter((d: any) => d.id !== docId));
        mostrarMensaje('Documento eliminado');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar', true);
      }
    } catch (err) {
      mostrarMensaje('Error al eliminar documento', true);
    }
  };

  const handleAbrirModalEstado = (estado: string) => {
    setEstadoSeleccionado(estado);
    setMotivoEstado('');
    setNotasEstado('');
    setShowModalEstado(true);
  };

  const handleCambiarEstado = async () => {
    if (!pacienteSeleccionado || !estadoSeleccionado) return;
    
    setCambiandoEstado(true);
    try {
      const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: estadoSeleccionado,
          motivo: motivoEstado,
          notas: notasEstado
        })
      });
      
      const data = await response.json();
      if (data.success) {
        mostrarMensaje(data.message);
        setPacienteSeleccionado(data.paciente);
        if (onPacienteUpdated) onPacienteUpdated(data.paciente);
        await cargarDatosPaciente(pacienteSeleccionado.id);
        setShowModalEstado(false);
      } else {
        mostrarMensaje(data.error || 'Error al cambiar estado', true);
      }
    } catch (error) {
      mostrarMensaje('Error al cambiar estado del paciente', true);
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleDescargarPDF = () => {
    if (!pacienteSeleccionado) return;
    generarFichaPDF({
      paciente: pacienteSeleccionado,
      sesiones: sesionesPaciente,
      logoUrl: getConfigValue('logo_url', ''),
      nombreCentro: nombreMarca(getConfigValue('nombre_centro', '')),
    });
  };

  // Episodio actualmente seleccionado en el selector
  const episodioSeleccionado = episodios.find((e: any) => e.id === episodioSeleccionadoId) || null;
  const esEpisodioActual = episodioSeleccionadoId === episodioActualId;
  const hayMultiplesEpisodios = episodios.length > 1;

  // Sesiones del episodio seleccionado (si no hay episodios, mostrar todas)
  const sesionesFiltradas = episodioSeleccionadoId
    ? sesionesPaciente.filter((s: any) => s.episodioId === episodioSeleccionadoId)
    : sesionesPaciente;

  // Evolución del dolor calculada a partir de las sesiones del episodio seleccionado
  const evolucionDolorFiltrada = sesionesFiltradas
    .filter((s: any) => s.dolorInicial !== null && s.dolorInicial !== undefined && s.dolorFinal !== null && s.dolorFinal !== undefined)
    .slice()
    .sort((a: any, b: any) => String(a.fecha).localeCompare(String(b.fecha)))
    .map((s: any) => ({ fecha: s.fecha, dolorInicial: s.dolorInicial, dolorFinal: s.dolorFinal, numeroSesion: s.numeroSesion }));

  const etiquetaEpisodio = (ep: any) => {
    const titulo = ep.motivo_lesion || 'Sin motivo';
    const corto = titulo.length > 28 ? titulo.slice(0, 28) + '…' : titulo;
    return `Episodio ${ep.numero_episodio} — ${corto}`;
  };

  const handleCrearEpisodio = async () => {
    if (!pacienteSeleccionado) return;
    if (!nuevoEpisodio.motivoLesion.trim()) {
      mostrarMensaje('Indica la lesión / motivo del nuevo episodio', true);
      return;
    }
    setCreandoEpisodio(true);
    try {
      const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}/episodios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEpisodio),
      });
      const data = await response.json();
      if (data.success) {
        mostrarMensaje(data.message || 'Episodio creado');
        setShowModalEpisodio(false);
        setNuevoEpisodio({ motivoLesion: '', objetivo: '', evaluacionFisica: '' });
        // Recargar paciente (estado pasa a activo) y datos
        const pacRes = await fetch(`/api/pacientes/${pacienteSeleccionado.id}`).then(r => r.json());
        if (pacRes.paciente) {
          setPacienteSeleccionado(pacRes.paciente);
          if (onPacienteUpdated) onPacienteUpdated(pacRes.paciente);
        }
        setEpisodioSeleccionadoId(data.episodio?.id || null);
        await cargarDatosPaciente(pacienteSeleccionado.id);
      } else {
        mostrarMensaje(data.error || 'Error al crear episodio', true);
      }
    } catch (error) {
      mostrarMensaje('Error al crear episodio', true);
    } finally {
      setCreandoEpisodio(false);
    }
  };

  // Al pulsar "Reactivar": si el paciente está de alta, preguntar misma/nueva lesión
  const handleClickReactivar = () => {
    if (pacienteSeleccionado?.estado_paciente === 'alta') {
      setShowModalReactivar(true);
    } else {
      handleAbrirModalEstado('activo');
    }
  };

  const handleGuardarCambiosFicha = async () => {
    if (!pacienteSeleccionado) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacienteSeleccionado),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar paciente');
      }

      const data = await response.json();
      if (onPacienteUpdated) onPacienteUpdated(data.paciente || pacienteSeleccionado);
      setModoEdicion(false);
      mostrarMensaje('Ficha actualizada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al actualizar la ficha', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content ficha-completa-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header ficha-header">
            <h2>
              <span className="ficha-header__prefijo">Ficha Completa - </span>
              {pacienteSeleccionado.nombre}
            </h2>
            <button className="modal-close" aria-label="Cerrar ficha" onClick={() => {
              setModoEdicion(false);
              onClose();
            }}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <div className="ficha-acciones" data-no-swipe>
              {!modoEdicion ? (
                <>
                  {onNavigate && (
                    <button 
                      className="btn-secondary" 
                      onClick={() => { onClose(); onNavigate('sesiones', { pacienteId: pacienteSeleccionado.id }); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Ver Sesiones
                    </button>
                  )}
                  
                  {pacienteSeleccionado.estado_paciente !== 'alta' && (
                    <button 
                      className="btn-secondary ficha-accion ficha-accion--alta" 
                      onClick={() => handleAbrirModalEstado('alta')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Dar de Alta
                    </button>
                  )}
                  
                  {pacienteSeleccionado.estado_paciente !== 'abandono' && (
                    <button 
                      className="btn-secondary ficha-accion ficha-accion--receso" 
                      onClick={() => handleAbrirModalEstado('abandono')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Marcar Receso
                    </button>
                  )}
                  
                  {(pacienteSeleccionado.estado_paciente === 'alta' || pacienteSeleccionado.estado_paciente === 'abandono') && (
                    <button 
                      className="btn-secondary ficha-accion ficha-accion--reactivar" 
                      onClick={handleClickReactivar}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Reactivar
                    </button>
                  )}

                  <button 
                    className="btn-secondary ficha-accion ficha-accion--episodio" 
                    onClick={() => { setNuevoEpisodio({ motivoLesion: '', objetivo: '', evaluacionFisica: '' }); setShowModalEpisodio(true); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Nuevo Episodio
                  </button>
                  
                  <button 
                    className="btn-secondary" 
                    onClick={() => setModoEdicion(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Editar Ficha
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleDescargarPDF}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Descargar PDF
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setModoEdicion(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleGuardarCambiosFicha}
                    disabled={saving}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Mensaje */}
          {mensaje.texto && (
            <div className={`ficha-mensaje ${mensaje.tipo === 'error' ? 'ficha-mensaje--error' : ''}`} role="status">
              {mensaje.texto}
            </div>
          )}
          
          <div className="ficha-completa-content">
            {/* Selector de Episodios */}
            {episodios.length > 0 && (
              <div className="ficha-episodios">
                <div className="ficha-episodios__cabecera">
                  <span className="ficha-episodios__titulo">
                    {hayMultiplesEpisodios ? `Episodios de tratamiento (${episodios.length})` : 'Episodio de tratamiento'}
                  </span>
                  {!esEpisodioActual && (
                    <span className="ficha-episodios__aviso">
                      Viendo un episodio histórico (solo lectura)
                    </span>
                  )}
                </div>
                {hayMultiplesEpisodios && (
                  <div className="ficha-episodios__lista" data-no-swipe>
                    {episodios.map((ep: any) => {
                      const activo = ep.id === episodioSeleccionadoId;
                      const esActual = ep.id === episodioActualId;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => setEpisodioSeleccionadoId(ep.id)}
                          className={`ficha-episodio ${activo ? 'is-activo' : ''}`}
                          aria-pressed={activo}
                        >
                          {etiquetaEpisodio(ep)}
                          <span className={`ficha-episodio__tag ${esActual ? 'ficha-episodio__tag--actual' : ''}`}>
                            {esActual ? 'Actual' : 'Cerrado'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Resumen Estadísticas */}
            {estadisticasPaciente && !loadingSesiones && (
              <div className="ficha-stats">
                {[
                  { label: 'Citas', value: estadisticasPaciente.totalCitas, color: 'var(--estado-completada)' },
                  { label: 'Sesiones', value: `${estadisticasPaciente.sesionesCompletadas}/${estadisticasPaciente.totalSesiones}`, color: 'var(--accent)' },
                  { label: 'Pagos', value: `$${(estadisticasPaciente.totalPagado || 0).toLocaleString()}`, color: 'var(--estado-pendiente)' },
                  { label: 'Pendientes', value: estadisticasPaciente.citasPendientes, color: 'var(--danger)' },
                ].map((stat, i) => (
                  <div key={i} className="ficha-stat" style={{ '--stat-color': stat.color } as React.CSSProperties}>
                    <div className="ficha-stat__valor">{stat.value}</div>
                    <div className="ficha-stat__label">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Gráfico de Evolución del Dolor */}
            {evolucionDolorFiltrada.length > 1 && !loadingSesiones && (
              <div className="ficha-dolor">
                <h4 className="ficha-dolor__titulo">Evolución del Dolor</h4>
                <div className="ficha-dolor__barras" data-no-swipe>
                  {evolucionDolorFiltrada.map((punto: any, i: number) => {
                    const maxDolor = 10;
                    const alturaInicial = (punto.dolorInicial / maxDolor) * 100;
                    const alturaFinal = (punto.dolorFinal / maxDolor) * 100;
                    const mejoro = punto.dolorFinal < punto.dolorInicial;
                    return (
                      <div key={i} className="ficha-dolor__col">
                        <div className="ficha-dolor__par">
                          <div className="ficha-dolor__barra" style={{ height: `${alturaInicial}%` }} title={`Inicial: ${punto.dolorInicial}/10`}>
                            <span className="ficha-dolor__valor">{punto.dolorInicial}</span>
                          </div>
                          <div
                            className={`ficha-dolor__barra ${mejoro ? 'ficha-dolor__barra--mejora' : 'ficha-dolor__barra--empeora'}`}
                            style={{ height: `${alturaFinal}%` }}
                            title={`Final: ${punto.dolorFinal}/10`}
                          >
                            <span className="ficha-dolor__valor">{punto.dolorFinal}</span>
                          </div>
                        </div>
                        <span className="ficha-dolor__sesion">S{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const datos = evolucionDolorFiltrada;
                  const primero = datos[0];
                  const ultimo = datos[datos.length - 1];
                  const mejoriaPct = primero.dolorInicial > 0 
                    ? Math.round(((primero.dolorInicial - ultimo.dolorFinal) / primero.dolorInicial) * 100)
                    : 0;
                  return mejoriaPct > 0 ? (
                    <div className="ficha-dolor__mejoria">
                      Mejoría del <strong>{mejoriaPct}%</strong> en dolor (de {primero.dolorInicial}/10 a {ultimo.dolorFinal}/10)
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Datos Personales */}
            <div className="ficha-section">
              <h3 className="section-title">Datos Personales</h3>
              <div className="ficha-grid">
                <div className="ficha-field full-width">
                  <span className="field-label">Nombre Completo</span>
                  {modoEdicion ? (
                    <input type="text" value={pacienteSeleccionado.nombre || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, nombre: e.target.value})} className="field-input" placeholder="Nombre completo" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.nombre}</span>
                  )}
                </div>
                <div className="ficha-field">
                  <span className="field-label">RUT</span>
                  {modoEdicion ? (
                    <input type="text" value={pacienteSeleccionado.rut || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, rut: e.target.value})} className="field-input" placeholder="12.345.678-9" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.rut}</span>
                  )}
                </div>
                <div className="ficha-field">
                  <span className="field-label">Teléfono</span>
                  {modoEdicion ? (
                    <input type="tel" value={pacienteSeleccionado.telefono || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, telefono: e.target.value})} className="field-input" placeholder="+56 9 1234 5678" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.telefono}</span>
                  )}
                </div>
                <div className="ficha-field">
                  <span className="field-label">Edad</span>
                  {modoEdicion ? (
                    <input type="number" value={pacienteSeleccionado.edad || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, edad: e.target.value})} className="field-input" placeholder="Edad" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.edad} años</span>
                  )}
                </div>
                <div className="ficha-field">
                  <span className="field-label">Altura</span>
                  {modoEdicion ? (
                    <input type="number" value={pacienteSeleccionado.altura || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, altura: e.target.value})} className="field-input" placeholder="Altura (cm)" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.altura} cm</span>
                  )}
                </div>
                <div className="ficha-field">
                  <span className="field-label">Peso</span>
                  {modoEdicion ? (
                    <input type="number" value={pacienteSeleccionado.peso || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, peso: e.target.value})} className="field-input" placeholder="Peso (kg)" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.peso} kg</span>
                  )}
                </div>
                <div className="ficha-field full-width">
                  <span className="field-label">Ocupación</span>
                  {modoEdicion ? (
                    <input type="text" value={pacienteSeleccionado.ocupacion || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, ocupacion: e.target.value})} className="field-input" placeholder="Ocupación" />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.ocupacion || 'No especificado'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Antecedentes Médicos */}
            <div className="ficha-section">
              <h3 className="section-title">Antecedentes Médicos</h3>
              <div className="ficha-grid">
                <div className="ficha-field full-width">
                  <span className="field-label">Enfermedades</span>
                  {modoEdicion ? (
                    <textarea value={pacienteSeleccionado.enfermedades || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, enfermedades: e.target.value})} className="field-input" placeholder="Enfermedades actuales" rows={3} />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.enfermedades || 'Ninguna'}</span>
                  )}
                </div>
                <div className="ficha-field full-width">
                  <span className="field-label">Enfermedades Hereditarias</span>
                  {modoEdicion ? (
                    <textarea value={pacienteSeleccionado.enfermedades_hereditarias || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, enfermedades_hereditarias: e.target.value})} className="field-input" placeholder="Enfermedades hereditarias" rows={3} />
                  ) : (
                    <span className="field-value">{pacienteSeleccionado.enfermedades_hereditarias || 'Ninguna'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Estilo de Vida */}
            <div className="ficha-section">
              <h3 className="section-title">Estilo de Vida</h3>
              <div className="ficha-grid">
                {[
                  { label: 'Deportes', field: 'deportes', placeholder: 'Deportes que practica' },
                  { label: 'Alimentación', field: 'alimentacion', placeholder: 'Tipo de alimentación' },
                  { label: 'Consumo de Agua', field: 'consumo_agua', placeholder: 'Litros por día' },
                  { label: 'Descanso', field: 'descanso', placeholder: 'Horas de sueño' },
                  { label: 'Estado Psicológico', field: 'psicologicamente', placeholder: 'Estado psicológico' },
                  { label: 'Digestión', field: 'digestion', placeholder: 'Estado digestivo' },
                ].map((campo) => (
                  <div key={campo.field} className="ficha-field">
                    <span className="field-label">{campo.label}</span>
                    {modoEdicion ? (
                      <input type="text" value={pacienteSeleccionado[campo.field] || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, [campo.field]: e.target.value})} className="field-input" placeholder={campo.placeholder} />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado[campo.field] || 'No especificado'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Motivo de Consulta */}
            <div className="ficha-section">
              <h3 className="section-title">
                Motivo de Consulta
                {episodioSeleccionado && (
                  <span className="section-title__extra section-title__extra--episodio">
                    (Episodio {episodioSeleccionado.numero_episodio})
                  </span>
                )}
              </h3>
              <div className="ficha-grid">
                {[
                  { label: 'Lesión por la que consulta', field: 'lesion_consulta', epField: 'motivo_lesion', placeholder: 'Descripción de la lesión', rows: 3 },
                  { label: 'Objetivo del Paciente', field: 'objetivo_paciente', epField: 'objetivo', placeholder: 'Objetivos del tratamiento', rows: 3 },
                  { label: 'Evaluación Física', field: 'evaluacion_fisica', epField: 'evaluacion_fisica', placeholder: 'Evaluación física inicial', rows: 4 },
                ].map((campo) => {
                  // En lectura, mostrar el valor del episodio seleccionado; en edición, editar el paciente (episodio actual)
                  const valorLectura = episodioSeleccionado
                    ? (episodioSeleccionado[campo.epField] || 'No especificado')
                    : (pacienteSeleccionado[campo.field] || 'No especificado');
                  return (
                    <div key={campo.field} className="ficha-field full-width">
                      <span className="field-label">{campo.label}</span>
                      {modoEdicion && esEpisodioActual ? (
                        <textarea value={pacienteSeleccionado[campo.field] || ''} onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, [campo.field]: e.target.value})} className="field-input" placeholder={campo.placeholder} rows={campo.rows} />
                      ) : (
                        <span className="field-value">{valorLectura}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Citas del Paciente */}
            {citasPaciente.length > 0 && (
              <div className="ficha-section">
                <h3 className="section-title">
                  Citas <span className="section-title__extra section-title__extra--citas">({citasPaciente.length})</span>
                </h3>
                <div className="ficha-lista">
                  {citasPaciente.slice(0, 10).map((cita: any) => (
                    <div key={cita.id} className={`ficha-item ficha-item--${['completada', 'confirmada', 'cancelada'].includes(cita.estado) ? cita.estado : 'otra'}`}>
                      <div>
                        <div className="ficha-item__titulo">{formatearFechaLocal(cita.fecha)} - {cita.hora}</div>
                        <div className="ficha-item__meta">{cita.tipo} • {cita.duracion} min</div>
                      </div>
                      <span className="ficha-pill">{cita.estado}</span>
                    </div>
                  ))}
                  {citasPaciente.length > 10 && (
                    <p className="ficha-mas">+{citasPaciente.length - 10} citas más</p>
                  )}
                </div>
              </div>
            )}

            {/* Pagos del Paciente */}
            {pagosPaciente.length > 0 && (
              <div className="ficha-section">
                <h3 className="section-title">
                  Pagos <span className="section-title__extra section-title__extra--pagos">({pagosPaciente.length})</span>
                </h3>
                <div className="ficha-lista">
                  {pagosPaciente.slice(0, 8).map((pago: any) => (
                    <div key={pago.id} className={`ficha-item ${pago.estado === 'completado' ? 'ficha-item--pagado' : 'ficha-item--impago'}`}>
                      <div>
                        <div className="ficha-item__titulo">${(pago.monto || 0).toLocaleString()}</div>
                        <div className="ficha-item__meta">{pago.fecha_pago ? formatearFechaLocal(pago.fecha_pago) : 'Sin fecha'} • {pago.metodo_pago}</div>
                      </div>
                      <span className="ficha-pill">{pago.estado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de Sesiones */}
            <div className="ficha-section">
              <h3 className="section-title">
                Historial de Sesiones 
                {sesionesFiltradas.length > 0 && (
                  <span className="section-title__extra section-title__extra--sesiones">({sesionesFiltradas.length})</span>
                )}
              </h3>
              <div className="sesiones-list">
                {loadingSesiones && (
                  <div className="ficha-cargando"><div className="spinner"></div></div>
                )}
                
                {!loadingSesiones && sesionesFiltradas.length === 0 && (
                  <div className="ficha-vacio">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <p>No hay sesiones registradas para este paciente</p>
                  </div>
                )}
                
                {!loadingSesiones && sesionesFiltradas.length > 0 && (
                  <div className="sesiones-timeline">
                    {sesionesFiltradas.map((sesion: any) => (
                      <div key={sesion.id} className="sesion-card">
                        <div className="sesion-header">
                          <div className="sesion-fecha">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            {formatearFechaLocal(sesion.fecha)} - {sesion.hora}
                          </div>
                          <span className="badge" style={{ 
                            backgroundColor: sesion.estado === 'completada' ? '#10b981' : sesion.estado === 'programada' ? '#3b82f6' : sesion.estado === 'confirmada' ? '#2AD636' : '#ef4444'
                          }}>{sesion.estado}</span>
                        </div>
                        
                        <div className="sesion-body">
                          <div className="sesion-info-row">
                            <strong>Tipo:</strong> {sesion.tipo}
                            <strong className="sesion-info-row__sep">Duración:</strong> {sesion.duracion} min
                          </div>
                          
                          {sesion.notasSesion && (
                            <div className="sesion-info-row"><strong>Notas:</strong> {sesion.notasSesion}</div>
                          )}
                          
                          {(sesion.dolorInicial !== null || sesion.dolorFinal !== null) && (
                            <div className="sesion-info-row">
                              <strong>EVA - Dolor:</strong> Inicial {sesion.dolorInicial}/10 → Final {sesion.dolorFinal}/10
                            </div>
                          )}
                          
                          {sesion.borgPercepcion !== null && sesion.borgPercepcion !== undefined && (
                            <div className="sesion-info-row">
                              <strong>Borg - Esfuerzo:</strong> {sesion.borgPercepcion}/10
                              <span className="sesion-info-row__nota">
                                {sesion.borgPercepcion === 0 && '(Reposo)'}
                                {sesion.borgPercepcion >= 1 && sesion.borgPercepcion <= 2 && '(Muy ligero)'}
                                {sesion.borgPercepcion === 3 && '(Ligero)'}
                                {sesion.borgPercepcion >= 4 && sesion.borgPercepcion <= 5 && '(Algo pesado)'}
                                {sesion.borgPercepcion >= 6 && sesion.borgPercepcion <= 7 && '(Pesado)'}
                                {sesion.borgPercepcion >= 8 && sesion.borgPercepcion <= 9 && '(Muy pesado)'}
                                {sesion.borgPercepcion === 10 && '(Extremo)'}
                              </span>
                            </div>
                          )}
                          
                          {sesion.movilidad && (
                            <div className="sesion-info-row">
                              <strong>Movilidad:</strong> 
                              <span className="sesion-info-row__valor">{sesion.movilidad}</span>
                            </div>
                          )}
                          
                          {sesion.fuerza && (
                            <div className="sesion-info-row">
                              <strong>Daniels - Fuerza:</strong> {sesion.fuerza}/5
                              <span className="sesion-info-row__nota">
                                {sesion.fuerza == 0 && '(Sin contracción)'}
                                {sesion.fuerza == 1 && '(Contracción visible)'}
                                {sesion.fuerza == 2 && '(Movimiento sin gravedad)'}
                                {sesion.fuerza == 3 && '(Contra gravedad)'}
                                {sesion.fuerza == 4 && '(Resistencia moderada)'}
                                {sesion.fuerza == 5 && '(Fuerza normal)'}
                              </span>
                            </div>
                          )}
                          
                          {sesion.progresoGeneral && (
                            <div className="sesion-info-row">
                              <strong>Progreso:</strong> 
                              <span className="sesion-info-row__valor sesion-info-row__valor--acento">
                                {sesion.progresoGeneral.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                          
                          {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                            <div className="sesion-info-row">
                              <strong>Ejercicios:</strong>
                              <div className="ficha-ejercicios">
                                {sesion.ejerciciosRealizados.map((ejercicio: any, idx: number) => {
                                  if (typeof ejercicio === 'string') {
                                    return (
                                      <div key={idx} className="ficha-ejercicio">
                                        <strong>{ejercicio}</strong>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="ficha-ejercicio">
                                      <div className="ficha-ejercicio__nombre">{ejercicio.nombre}</div>
                                      <div className="ficha-ejercicio__datos">
                                        {ejercicio.peso && <div><strong>Peso:</strong> {ejercicio.peso}</div>}
                                        {ejercicio.repeticiones && <div><strong>Repeticiones:</strong> {ejercicio.repeticiones}</div>}
                                        {ejercicio.tiempo && <div><strong>Tiempo:</strong> {ejercicio.tiempo}</div>}
                                        {ejercicio.carga && <div><strong>Carga:</strong> {ejercicio.carga}</div>}
                                      </div>
                                      {ejercicio.notas && (
                                        <div className="ficha-ejercicio__notas">{ejercicio.notas}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {sesion.recomendaciones && (
                            <div className="sesion-info-row"><strong>Recomendaciones:</strong> {sesion.recomendaciones}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Documentos e Imágenes */}
            <div className="ficha-section">
              <h3 className="section-title">
                Documentos e Imágenes
                {documentosPaciente.length > 0 && (
                  <span className="section-title__extra section-title__extra--episodio">({documentosPaciente.length})</span>
                )}
              </h3>

              <label className={`ficha-subir ${subiendoDocumento ? 'is-subiendo' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {subiendoDocumento ? 'Subiendo...' : 'Subir Archivo'}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleSubirDocumento}
                  hidden
                  disabled={subiendoDocumento}
                />
              </label>

              {documentosPaciente.length > 0 ? (
                <div className="ficha-docs">
                  {documentosPaciente.map((doc: any) => (
                    <div key={doc.id} className="ficha-doc">
                      {doc.tipo === 'imagen' ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <img className="ficha-doc__img" src={doc.url} alt={doc.nombre} loading="lazy" />
                        </a>
                      ) : (
                        <a className="ficha-doc__archivo" href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${doc.nombre}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke={doc.tipo === 'pdf' ? 'var(--danger)' : 'var(--estado-completada)'} strokeWidth="1.5" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </a>
                      )}
                      <div className="ficha-doc__pie">
                        <span className="ficha-doc__nombre" title={doc.nombre}>
                          {doc.nombre}
                        </span>
                        <button className="ficha-doc__eliminar" onClick={() => handleEliminarDocumento(doc.id)} title="Eliminar" aria-label={`Eliminar ${doc.nombre}`}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ficha-docs__vacio">No hay documentos adjuntos</p>
              )}
            </div>

            {/* Estado de Tratamiento */}
            <div className="ficha-section ficha-section--destacada">
              <h3 className="section-title">Estado del Tratamiento</h3>
              {modoEdicion ? (
                <select
                  className="campo-input"
                  value={pacienteSeleccionado?.estado_tratamiento || 'en_tratamiento'}
                  onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, estado_tratamiento: e.target.value})}
                >
                  <option value="en_tratamiento">En Tratamiento</option>
                  <option value="alta">Alta</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="abandono">Receso</option>
                </select>
              ) : (
                (() => {
                  const est = pacienteSeleccionado?.estado_paciente || pacienteSeleccionado?.estado_tratamiento || 'activo';
                  const clave = ['alta', 'abandono', 'seguimiento'].includes(est) ? est : 'activo';
                  const etiquetas: Record<string, string> = { alta: 'Alta', seguimiento: 'Seguimiento', abandono: 'Receso', activo: 'En Tratamiento' };
                  return (
                    <span className={`ficha-estado ficha-estado--${clave}`}>{etiquetas[clave]}</span>
                  );
                })()
              )}
            </div>

            {/* Evaluación Final */}
            {(() => {
              const evalFinal = episodioSeleccionado
                ? episodioSeleccionado.evaluacion_final
                : pacienteSeleccionado?.evaluacion_final;
              if (!evalFinal) return null;
              return (
                <div className="ficha-section ficha-section--destacada">
                  <h3 className="section-title">
                    Evaluación Final del Tratamiento
                    {episodioSeleccionado && (
                      <span className="section-title__extra section-title__extra--episodio">
                        (Episodio {episodioSeleccionado.numero_episodio})
                      </span>
                    )}
                  </h3>
                  <div className="ficha-eval-final">{evalFinal}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal Cambio de Estado */}
      {showModalEstado && (
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowModalEstado(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {estadoSeleccionado === 'alta' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--estado-confirmada)' }} aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Dar de Alta al Paciente</>
                )}
                {estadoSeleccionado === 'abandono' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--danger)' }} aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Marcar como Receso</>
                )}
                {estadoSeleccionado === 'activo' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--estado-completada)' }} aria-hidden="true"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Reactivar Paciente</>
                )}
              </h3>
              <button className="modal-close" onClick={() => setShowModalEstado(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-texto">
                {estadoSeleccionado === 'alta' && 'El paciente completó su tratamiento exitosamente.'}
                {estadoSeleccionado === 'abandono' && 'El paciente tomará un receso del tratamiento.'}
                {estadoSeleccionado === 'activo' && 'El paciente volverá a estar en tratamiento activo.'}
              </p>
              <div className="form-group">
                <label htmlFor="ficha-motivo-estado">Motivo</label>
                <input id="ficha-motivo-estado" className="campo-input" type="text" value={motivoEstado} onChange={(e) => setMotivoEstado(e.target.value)}
                  placeholder={estadoSeleccionado === 'alta' ? 'Ej: Tratamiento completado' : estadoSeleccionado === 'abandono' ? 'Ej: Receso temporal' : 'Ej: Retoma tratamiento'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="ficha-notas-estado">Notas adicionales</label>
                <textarea id="ficha-notas-estado" className="campo-input" value={notasEstado} onChange={(e) => setNotasEstado(e.target.value)} rows={3}
                  placeholder="Notas opcionales..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalEstado(false)} disabled={cambiandoEstado}>
                Cancelar
              </button>
              <button className={`btn-confirmar btn-confirmar--${estadoSeleccionado}`} onClick={handleCambiarEstado} disabled={cambiandoEstado}>
                {cambiandoEstado ? 'Procesando...' : estadoSeleccionado === 'alta' ? 'Confirmar Alta' : estadoSeleccionado === 'abandono' ? 'Confirmar Receso' : 'Confirmar Reactivación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pregunta al Reactivar */}
      {showModalReactivar && (
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowModalReactivar(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reactivar Paciente</h3>
              <button className="modal-close" onClick={() => setShowModalReactivar(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-texto">
                ¿El paciente vuelve por la <strong>misma lesión</strong> o por una <strong>lesión nueva</strong>?
              </p>
              <div className="ficha-opciones">
                <button
                  className="ficha-opcion ficha-opcion--misma"
                  onClick={() => { setShowModalReactivar(false); handleAbrirModalEstado('activo'); }}
                >
                  Misma lesión
                  <div className="ficha-opcion__desc">
                    Continúa el episodio actual (las sesiones siguen su numeración).
                  </div>
                </button>
                <button
                  className="ficha-opcion ficha-opcion--nueva"
                  onClick={() => { setShowModalReactivar(false); setNuevoEpisodio({ motivoLesion: '', objetivo: '', evaluacionFisica: '' }); setShowModalEpisodio(true); }}
                >
                  Lesión nueva
                  <div className="ficha-opcion__desc">
                    Cierra el episodio anterior y abre uno nuevo (sesiones desde 1).
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Episodio */}
      {showModalEpisodio && (
        <div className="modal-overlay" style={{ zIndex: 1002 }} onClick={() => setShowModalEpisodio(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--episodio)' }} aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Nuevo Episodio de Tratamiento
              </h3>
              <button className="modal-close" onClick={() => setShowModalEpisodio(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-texto">
                Se cerrará el episodio actual (quedará como histórico) y se abrirá uno nuevo. Las sesiones nuevas se numerarán desde 1.
              </p>
              <div className="form-group">
                <label htmlFor="episodio-motivo">Lesión / Motivo de consulta *</label>
                <textarea
                  id="episodio-motivo"
                  className="campo-input"
                  value={nuevoEpisodio.motivoLesion}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, motivoLesion: e.target.value })}
                  rows={3}
                  placeholder="Ej: Esguince de tobillo derecho"
                />
              </div>
              <div className="form-group">
                <label htmlFor="episodio-objetivo">Objetivo del paciente</label>
                <textarea
                  id="episodio-objetivo"
                  className="campo-input"
                  value={nuevoEpisodio.objetivo}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, objetivo: e.target.value })}
                  rows={2}
                  placeholder="Ej: Volver a correr sin dolor"
                />
              </div>
              <div className="form-group">
                <label htmlFor="episodio-evaluacion">Evaluación física inicial</label>
                <textarea
                  id="episodio-evaluacion"
                  className="campo-input"
                  value={nuevoEpisodio.evaluacionFisica}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, evaluacionFisica: e.target.value })}
                  rows={3}
                  placeholder="Hallazgos de la evaluación inicial"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalEpisodio(false)} disabled={creandoEpisodio}>
                Cancelar
              </button>
              <button className="btn-confirmar btn-confirmar--episodio" onClick={handleCrearEpisodio} disabled={creandoEpisodio}>
                {creandoEpisodio ? 'Creando...' : 'Crear Episodio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
