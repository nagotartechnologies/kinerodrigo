'use client';

import { useState, useEffect } from 'react';
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
      nombreCentro: getConfigValue('nombre_centro', 'NAGO-KINE'),
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
          <div className="modal-header">
            <h2>Ficha Completa - {pacienteSeleccionado.nombre}</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!modoEdicion ? (
                <>
                  {onNavigate && (
                    <button 
                      className="btn-secondary" 
                      onClick={() => { onClose(); onNavigate('sesiones', { pacienteId: pacienteSeleccionado.id }); }}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Ver Sesiones
                    </button>
                  )}
                  
                  {pacienteSeleccionado.estado_paciente !== 'alta' && (
                    <button 
                      className="btn-secondary" 
                      onClick={() => handleAbrirModalEstado('alta')}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.9rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        color: '#10b981'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Dar de Alta
                    </button>
                  )}
                  
                  {pacienteSeleccionado.estado_paciente !== 'abandono' && (
                    <button 
                      className="btn-secondary" 
                      onClick={() => handleAbrirModalEstado('abandono')}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.9rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Marcar Receso
                    </button>
                  )}
                  
                  {(pacienteSeleccionado.estado_paciente === 'alta' || pacienteSeleccionado.estado_paciente === 'abandono') && (
                    <button 
                      className="btn-secondary" 
                      onClick={handleClickReactivar}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.9rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid #3b82f6',
                        color: '#3b82f6'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Reactivar
                    </button>
                  )}

                  <button 
                    className="btn-secondary" 
                    onClick={() => { setNuevoEpisodio({ motivoLesion: '', objetivo: '', evaluacionFisica: '' }); setShowModalEpisodio(true); }}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.9rem',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid #8b5cf6',
                      color: '#8b5cf6'
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Nuevo Episodio
                  </button>
                  
                  <button 
                    className="btn-secondary" 
                    onClick={() => setModoEdicion(true)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Editar Ficha
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleDescargarPDF}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
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
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleGuardarCambiosFicha}
                    disabled={saving}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </>
              )}
              <button className="modal-close" onClick={() => {
                setModoEdicion(false);
                onClose();
              }}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mensaje */}
          {mensaje.texto && (
            <div style={{
              padding: '0.75rem 1rem',
              margin: '0 1rem',
              borderRadius: '8px',
              background: mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: mensaje.tipo === 'error' ? '#ef4444' : '#10b981',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              {mensaje.texto}
            </div>
          )}
          
          <div className="ficha-completa-content">
            {/* Selector de Episodios */}
            {episodios.length > 0 && (
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #8b5cf640',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hayMultiplesEpisodios ? '0.75rem' : 0, flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {hayMultiplesEpisodios ? `Episodios de tratamiento (${episodios.length})` : 'Episodio de tratamiento'}
                  </span>
                  {!esEpisodioActual && (
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                      Viendo un episodio histórico (solo lectura)
                    </span>
                  )}
                </div>
                {hayMultiplesEpisodios && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {episodios.map((ep: any) => {
                      const activo = ep.id === episodioSeleccionadoId;
                      const esActual = ep.id === episodioActualId;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => setEpisodioSeleccionadoId(ep.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: `1px solid ${activo ? '#8b5cf6' : '#333'}`,
                            background: activo ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                            color: activo ? '#c4b5fd' : '#aaa',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          {etiquetaEpisodio(ep)}
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: esActual ? 'rgba(63, 255, 0, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: esActual ? '#3FFF00' : '#94a3b8',
                            textTransform: 'uppercase'
                          }}>
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {[
                  { label: 'Citas', value: estadisticasPaciente.totalCitas, color: '#3b82f6' },
                  { label: 'Sesiones', value: `${estadisticasPaciente.sesionesCompletadas}/${estadisticasPaciente.totalSesiones}`, color: '#3FFF00' },
                  { label: 'Pagos', value: `$${(estadisticasPaciente.totalPagado || 0).toLocaleString()}`, color: '#f59e0b' },
                  { label: 'Pendientes', value: estadisticasPaciente.citasPendientes, color: '#ef4444' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: '#1a1a1a',
                    border: `1px solid ${stat.color}30`,
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Gráfico de Evolución del Dolor */}
            {evolucionDolorFiltrada.length > 1 && !loadingSesiones && (
              <div style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                border: '1px solid #333'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#3FFF00', fontSize: '0.9rem' }}>
                  Evolución del Dolor
                </h4>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', padding: '0 0.5rem' }}>
                  {evolucionDolorFiltrada.map((punto: any, i: number) => {
                    const maxDolor = 10;
                    const alturaInicial = (punto.dolorInicial / maxDolor) * 100;
                    const alturaFinal = (punto.dolorFinal / maxDolor) * 100;
                    const mejoro = punto.dolorFinal < punto.dolorInicial;
                    return (
                      <div key={i} style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        minWidth: '30px'
                      }}>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '90px', width: '100%' }}>
                          <div style={{
                            flex: 1,
                            height: `${alturaInicial}%`,
                            background: 'rgba(239, 68, 68, 0.4)',
                            borderRadius: '3px 3px 0 0',
                            minHeight: '4px',
                            position: 'relative'
                          }} title={`Inicial: ${punto.dolorInicial}/10`}>
                            <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: '#ef4444' }}>
                              {punto.dolorInicial}
                            </span>
                          </div>
                          <div style={{
                            flex: 1,
                            height: `${alturaFinal}%`,
                            background: mejoro ? 'rgba(63, 255, 0, 0.4)' : 'rgba(239, 68, 68, 0.6)',
                            borderRadius: '3px 3px 0 0',
                            minHeight: '4px',
                            position: 'relative'
                          }} title={`Final: ${punto.dolorFinal}/10`}>
                            <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: mejoro ? '#3FFF00' : '#ef4444' }}>
                              {punto.dolorFinal}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.55rem', color: '#666' }}>S{i + 1}</span>
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
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(63, 255, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#3FFF00'
                    }}>
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
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#8b5cf6' }}>
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
                  Citas <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#3b82f6' }}>({citasPaciente.length})</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {citasPaciente.slice(0, 10).map((cita: any) => (
                    <div key={cita.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px',
                      borderLeft: `3px solid ${cita.estado === 'completada' ? '#10b981' : cita.estado === 'confirmada' ? '#3FFF00' : cita.estado === 'cancelada' ? '#ef4444' : '#3b82f6'}`
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatearFechaLocal(cita.fecha)} - {cita.hora}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{cita.tipo} • {cita.duracion} min</div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                        background: cita.estado === 'completada' ? 'rgba(16, 185, 129, 0.15)' : cita.estado === 'confirmada' ? 'rgba(63, 255, 0, 0.15)' : cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: cita.estado === 'completada' ? '#10b981' : cita.estado === 'confirmada' ? '#3FFF00' : cita.estado === 'cancelada' ? '#ef4444' : '#3b82f6'
                      }}>{cita.estado}</span>
                    </div>
                  ))}
                  {citasPaciente.length > 10 && (
                    <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>+{citasPaciente.length - 10} citas más</p>
                  )}
                </div>
              </div>
            )}

            {/* Pagos del Paciente */}
            {pagosPaciente.length > 0 && (
              <div className="ficha-section">
                <h3 className="section-title">
                  Pagos <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#f59e0b' }}>({pagosPaciente.length})</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {pagosPaciente.slice(0, 8).map((pago: any) => (
                    <div key={pago.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px',
                      borderLeft: `3px solid ${pago.estado === 'completado' ? '#f59e0b' : '#ef4444'}`
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>${(pago.monto || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{pago.fecha_pago ? formatearFechaLocal(pago.fecha_pago) : 'Sin fecha'} • {pago.metodo_pago}</div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                        background: pago.estado === 'completado' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: pago.estado === 'completado' ? '#f59e0b' : '#ef4444'
                      }}>{pago.estado}</span>
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
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#3FFF00' }}>({sesionesFiltradas.length})</span>
                )}
              </h3>
              <div className="sesiones-list">
                {loadingSesiones && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>
                )}
                
                {!loadingSesiones && sesionesFiltradas.length === 0 && (
                  <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }}>
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
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            {formatearFechaLocal(sesion.fecha)} - {sesion.hora}
                          </div>
                          <span className="badge" style={{ 
                            backgroundColor: sesion.estado === 'completada' ? '#10b981' : sesion.estado === 'programada' ? '#3b82f6' : sesion.estado === 'confirmada' ? '#3FFF00' : '#ef4444'
                          }}>{sesion.estado}</span>
                        </div>
                        
                        <div className="sesion-body">
                          <div className="sesion-info-row">
                            <strong>Tipo:</strong> {sesion.tipo}
                            <strong style={{ marginLeft: '1rem' }}>Duración:</strong> {sesion.duracion} min
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
                              <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
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
                              <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>{sesion.movilidad}</span>
                            </div>
                          )}
                          
                          {sesion.fuerza && (
                            <div className="sesion-info-row">
                              <strong>Daniels - Fuerza:</strong> {sesion.fuerza}/5
                              <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
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
                              <span style={{ marginLeft: '0.5rem', color: '#3FFF00', textTransform: 'capitalize' }}>
                                {sesion.progresoGeneral.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                          
                          {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                            <div className="sesion-info-row">
                              <strong>Ejercicios:</strong>
                              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {sesion.ejerciciosRealizados.map((ejercicio: any, idx: number) => {
                                  if (typeof ejercicio === 'string') {
                                    return (
                                      <div key={idx} style={{ padding: '0.5rem', background: 'rgba(63, 255, 0, 0.1)', borderLeft: '3px solid #3FFF00', borderRadius: '4px' }}>
                                        <strong>{ejercicio}</strong>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} style={{ padding: '0.75rem', background: 'rgba(63, 255, 0, 0.1)', borderLeft: '3px solid #3FFF00', borderRadius: '4px' }}>
                                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#3FFF00' }}>{ejercicio.nombre}</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem', fontSize: '0.85rem', color: '#ccc' }}>
                                        {ejercicio.peso && <div><strong>Peso:</strong> {ejercicio.peso}</div>}
                                        {ejercicio.repeticiones && <div><strong>Repeticiones:</strong> {ejercicio.repeticiones}</div>}
                                        {ejercicio.tiempo && <div><strong>Tiempo:</strong> {ejercicio.tiempo}</div>}
                                        {ejercicio.carga && <div><strong>Carga:</strong> {ejercicio.carga}</div>}
                                      </div>
                                      {ejercicio.notas && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>{ejercicio.notas}</div>
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
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#8b5cf6' }}>({documentosPaciente.length})</span>
                )}
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.2rem',
                  background: subiendoDocumento ? '#333' : 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid #8b5cf640', borderRadius: '8px',
                  color: subiendoDocumento ? '#666' : '#8b5cf6',
                  cursor: subiendoDocumento ? 'wait' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 600
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
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
                    style={{ display: 'none' }}
                    disabled={subiendoDocumento}
                  />
                </label>
              </div>

              {documentosPaciente.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {documentosPaciente.map((doc: any) => (
                    <div key={doc.id} style={{
                      background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden',
                      border: '1px solid #333'
                    }}>
                      {doc.tipo === 'imagen' ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <img src={doc.url} alt={doc.nombre} style={{
                            width: '100%', height: '120px', objectFit: 'cover', display: 'block', cursor: 'pointer'
                          }} />
                        </a>
                      ) : (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '120px', background: '#0a0a0a', cursor: 'pointer', textDecoration: 'none'
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke={doc.tipo === 'pdf' ? '#ef4444' : '#3b82f6'} strokeWidth="1.5" style={{ width: '40px', height: '40px' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </a>
                      )}
                      <div style={{ padding: '0.5rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={doc.nombre}>
                          {doc.nombre}
                        </span>
                        <button onClick={() => handleEliminarDocumento(doc.id)} style={{
                          background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem', lineHeight: 1
                        }} title="Eliminar">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No hay documentos adjuntos</p>
              )}
            </div>

            {/* Estado de Tratamiento */}
            <div className="ficha-section" style={{ marginTop: '2rem' }}>
              <h3 className="section-title" style={{ color: '#3FFF00', borderBottom: '2px solid #3FFF00', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Estado del Tratamiento
              </h3>
              {modoEdicion ? (
                <select
                  value={pacienteSeleccionado?.estado_tratamiento || 'en_tratamiento'}
                  onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, estado_tratamiento: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: '0.95rem' }}
                >
                  <option value="en_tratamiento">En Tratamiento</option>
                  <option value="alta">Alta</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="abandono">Receso</option>
                </select>
              ) : (
                (() => {
                  const est = pacienteSeleccionado?.estado_paciente || pacienteSeleccionado?.estado_tratamiento || 'activo';
                  const esAlta = est === 'alta';
                  const esAbandono = est === 'abandono';
                  const esSeguimiento = est === 'seguimiento';
                  return (
                    <span style={{
                      display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      background: esAlta ? 'rgba(16, 185, 129, 0.15)' :
                                  esSeguimiento ? 'rgba(59, 130, 246, 0.15)' :
                                  esAbandono ? 'rgba(239, 68, 68, 0.15)' :
                                  'rgba(63, 255, 0, 0.15)',
                      color: esAlta ? '#10b981' :
                             esSeguimiento ? '#3b82f6' :
                             esAbandono ? '#ef4444' :
                             '#3FFF00',
                      border: `1px solid ${
                        esAlta ? '#10b981' :
                        esSeguimiento ? '#3b82f6' :
                        esAbandono ? '#ef4444' :
                        '#3FFF00'
                      }40`
                    }}>
                      {esAlta ? 'Alta' :
                       esSeguimiento ? 'Seguimiento' :
                       esAbandono ? 'Receso' :
                       'En Tratamiento'}
                    </span>
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
                <div className="ficha-section" style={{ marginTop: '2rem' }}>
                  <h3 className="section-title" style={{ color: '#3FFF00', borderBottom: '2px solid #3FFF00', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    Evaluación Final del Tratamiento
                    {episodioSeleccionado && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#8b5cf6' }}>
                        (Episodio {episodioSeleccionado.numero_episodio})
                      </span>
                    )}
                  </h3>
                  <div style={{
                    background: '#0a0a0a', border: '1px solid #3FFF00', borderRadius: '8px',
                    padding: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#e0e0e0'
                  }}>
                    {evalFinal}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal Cambio de Estado */}
      {showModalEstado && (
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowModalEstado(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {estadoSeleccionado === 'alta' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#10b981' }}><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Dar de Alta al Paciente</>
                )}
                {estadoSeleccionado === 'abandono' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#ef4444' }}><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Marcar como Receso</>
                )}
                {estadoSeleccionado === 'activo' && (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#3b82f6' }}><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Reactivar Paciente</>
                )}
              </h3>
              <button className="modal-close" onClick={() => setShowModalEstado(false)}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
                {estadoSeleccionado === 'alta' && 'El paciente completó su tratamiento exitosamente.'}
                {estadoSeleccionado === 'abandono' && 'El paciente tomará un receso del tratamiento.'}
                {estadoSeleccionado === 'activo' && 'El paciente volverá a estar en tratamiento activo.'}
              </p>
              <div className="form-group">
                <label>Motivo</label>
                <input type="text" value={motivoEstado} onChange={(e) => setMotivoEstado(e.target.value)}
                  placeholder={estadoSeleccionado === 'alta' ? 'Ej: Tratamiento completado' : estadoSeleccionado === 'abandono' ? 'Ej: Receso temporal' : 'Ej: Retoma tratamiento'}
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Notas adicionales</label>
                <textarea value={notasEstado} onChange={(e) => setNotasEstado(e.target.value)} rows={3}
                  placeholder="Notas opcionales..."
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowModalEstado(false)} disabled={cambiandoEstado}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}>
                Cancelar
              </button>
              <button onClick={handleCambiarEstado} disabled={cambiandoEstado}
                style={{
                  flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#fff',
                  background: estadoSeleccionado === 'alta' ? '#10b981' : estadoSeleccionado === 'abandono' ? '#ef4444' : '#3b82f6'
                }}>
                {cambiandoEstado ? 'Procesando...' : estadoSeleccionado === 'alta' ? 'Confirmar Alta' : estadoSeleccionado === 'abandono' ? 'Confirmar Receso' : 'Confirmar Reactivación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pregunta al Reactivar */}
      {showModalReactivar && (
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowModalReactivar(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Reactivar Paciente</h3>
              <button className="modal-close" onClick={() => setShowModalReactivar(false)}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
                ¿El paciente vuelve por la <strong>misma lesión</strong> o por una <strong>lesión nueva</strong>?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => { setShowModalReactivar(false); handleAbrirModalEstado('activo'); }}
                  style={{
                    padding: '1rem', borderRadius: '8px', border: '1px solid #3b82f6',
                    background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 600, textAlign: 'left'
                  }}
                >
                  Misma lesión
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.25rem' }}>
                    Continúa el episodio actual (las sesiones siguen su numeración).
                  </div>
                </button>
                <button
                  onClick={() => { setShowModalReactivar(false); setNuevoEpisodio({ motivoLesion: '', objetivo: '', evaluacionFisica: '' }); setShowModalEpisodio(true); }}
                  style={{
                    padding: '1rem', borderRadius: '8px', border: '1px solid #8b5cf6',
                    background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 600, textAlign: 'left'
                  }}
                >
                  Lesión nueva
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.25rem' }}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#8b5cf6' }}>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Nuevo Episodio de Tratamiento
              </h3>
              <button className="modal-close" onClick={() => setShowModalEpisodio(false)}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.25rem', color: '#aaa', fontSize: '0.85rem' }}>
                Se cerrará el episodio actual (quedará como histórico) y se abrirá uno nuevo. Las sesiones nuevas se numerarán desde 1.
              </p>
              <div className="form-group">
                <label>Lesión / Motivo de consulta *</label>
                <textarea
                  value={nuevoEpisodio.motivoLesion}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, motivoLesion: e.target.value })}
                  rows={3}
                  placeholder="Ej: Esguince de tobillo derecho"
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Objetivo del paciente</label>
                <textarea
                  value={nuevoEpisodio.objetivo}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, objetivo: e.target.value })}
                  rows={2}
                  placeholder="Ej: Volver a correr sin dolor"
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Evaluación física inicial</label>
                <textarea
                  value={nuevoEpisodio.evaluacionFisica}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, evaluacionFisica: e.target.value })}
                  rows={3}
                  placeholder="Hallazgos de la evaluación inicial"
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowModalEpisodio(false)} disabled={creandoEpisodio}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}>
                Cancelar
              </button>
              <button onClick={handleCrearEpisodio} disabled={creandoEpisodio}
                style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#fff', background: '#8b5cf6' }}>
                {creandoEpisodio ? 'Creando...' : 'Crear Episodio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
