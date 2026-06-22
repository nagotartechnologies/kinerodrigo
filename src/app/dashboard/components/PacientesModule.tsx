'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { formatearFechaLocal, fechaAString } from '../utils';
import { generarFichaPDF } from '../utils/generarFichaPDF';
import FichaCompletaModal from './FichaCompletaModal';

// Módulo Pacientes
export default function PacientesModule({ configuraciones = {}, onNavigate, initialPacienteId }: { configuraciones?: any; onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void; initialPacienteId?: number }) {
  const [showModal, setShowModal] = useState(false);
  const [showFichaCompleta, setShowFichaCompleta] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargarEstadisticasEstados = async () => {
    try {
      const response = await fetch('/api/pacientes/estadisticas-estados');
      const data = await response.json();
      if (data.success) {
        setEstadisticasEstados(data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de estados:', error);
    }
  };
  
  const getConfigValue = (clave: string, defaultValue: any = '') => {
    return configuraciones[clave]?.valor ?? defaultValue;
  };
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [sesionesPaciente, setSesionesPaciente] = useState<any[]>([]);
  const [citasPaciente, setCitasPaciente] = useState<any[]>([]);
  const [pagosPaciente, setPagosPaciente] = useState<any[]>([]);
  const [estadisticasPaciente, setEstadisticasPaciente] = useState<any>(null);
  const [loadingSesiones, setLoadingSesiones] = useState(false);
  const [documentosPaciente, setDocumentosPaciente] = useState<any[]>([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [showModalEstado, setShowModalEstado] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [motivoEstado, setMotivoEstado] = useState('');
  const [notasEstado, setNotasEstado] = useState('');
  const [historialEstados, setHistorialEstados] = useState<any[]>([]);
  const [estadisticasEstados, setEstadisticasEstados] = useState<any>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Flujo rápido: crear primera sesión después de crear paciente
  const [showMiniSesion, setShowMiniSesion] = useState(false);
  const [pacienteCreado, setPacienteCreado] = useState<any>(null);
  const [miniSesionData, setMiniSesionData] = useState({
    fecha: fechaAString(new Date()),
    hora: ''
  });
  const [creandoSesion, setCreandoSesion] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    edad: '',
    altura: '',
    peso: '',
    ocupacion: '',
    enfermedades: '',
    enfermedadesHereditarias: '',
    deportes: '',
    alimentacion: '',
    consumoAgua: '',
    descanso: '',
    psicologicamente: '',
    digestion: '',
    lesionConsulta: '',
    objetivoPaciente: '',
    evaluacionFisica: '',
    sesiones_programadas: '',
  });

  // Cargar pacientes al montar el componente
  useEffect(() => {
    fetchPacientes();
    cargarEstadisticasEstados();
  }, []);

  // Auto-abrir ficha cuando se navega desde otro módulo (solo una vez)
  const initialNavHandled = useRef(false);
  useEffect(() => {
    if (initialPacienteId && pacientes.length > 0 && !initialNavHandled.current) {
      const paciente = pacientes.find((p: any) => p.id === initialPacienteId);
      if (paciente) {
        setPacienteSeleccionado(paciente);
        setShowFichaCompleta(true);
        setModoEdicion(true);
        initialNavHandled.current = true;
      }
    }
  }, [initialPacienteId, pacientes]);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pacientes');
      if (!response.ok) throw new Error('Error al cargar pacientes');
      const data = await response.json();
      setPacientes(data.pacientes);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear paciente');
      }

      const data = await response.json();
      
      // Recargar la lista de pacientes
      await fetchPacientes();
      
      // Guardar paciente creado y mostrar mini-modal de sesión
      setPacienteCreado({ id: data.paciente?.id || data.id, nombre: formData.nombre, sesionesProgramadas: formData.sesiones_programadas });
      setShowModal(false);
      setShowMiniSesion(true);
      setMiniSesionData({ fecha: fechaAString(new Date()), hora: '' });
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        rut: '',
        telefono: '',
        edad: '',
        altura: '',
        peso: '',
        ocupacion: '',
        enfermedades: '',
        enfermedadesHereditarias: '',
        deportes: '',
        alimentacion: '',
        consumoAgua: '',
        descanso: '',
        psicologicamente: '',
        digestion: '',
        lesionConsulta: '',
        objetivoPaciente: '',
        evaluacionFisica: '',
        sesiones_programadas: '',
      });
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al crear paciente');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearSesionRapida = async () => {
    if (!pacienteCreado?.id || !miniSesionData.fecha || !miniSesionData.hora) return;
    setCreandoSesion(true);
    try {
      const response = await fetch('/api/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteCreado.id,
          fecha: miniSesionData.fecha,
          hora: miniSesionData.hora,
          duracion: 60,
          tipo: 'Kinesioterapia',
          estado: 'programada'
        })
      });
      const data = await response.json();
      if (data.success) {
        mostrarMensaje(`Sesi\u00f3n #1 creada para ${pacienteCreado.nombre}`);
      } else {
        mostrarMensaje(data.error || 'Error al crear sesi\u00f3n', true);
      }
    } catch (err) {
      mostrarMensaje('Error al crear sesi\u00f3n', true);
    } finally {
      setCreandoSesion(false);
      setShowMiniSesion(false);
      setPacienteCreado(null);
    }
  };

  const formatRut = (value: string) => {
    // Eliminar todo excepto números y k/K
    const clean = value.replace(/[^0-9kK]/g, '');
    
    if (clean.length === 0) return '';
    
    // Separar número y dígito verificador
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    
    if (body.length === 0) return dv;
    
    // Formatear con puntos
    let formatted = body.split('').reverse().join('')
      .replace(/(\d{3})/g, '$1.')
      .split('').reverse().join('')
      .replace(/^\./, '');
    
    // Agregar guión y dígito verificador
    return `${formatted}-${dv}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Si es el campo RUT, formatear automáticamente
    if (name === 'rut') {
      const formatted = formatRut(value);
      setFormData({
        ...formData,
        [name]: formatted,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleVerFicha = async (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setShowFichaCompleta(true);
    
    // Cargar historial consolidado del paciente
    try {
      setLoadingSesiones(true);
      const response = await fetch(`/api/pacientes/${paciente.id}/historial`);
      const data = await response.json();
      
      if (data.success) {
        setSesionesPaciente(data.sesiones || []);
        setCitasPaciente(data.citas || []);
        setPagosPaciente(data.pagos || []);
        setEstadisticasPaciente(data.estadisticas || null);
      }
      // Cargar documentos en paralelo
      const docsRes = await fetch(`/api/pacientes/${paciente.id}/documentos`);
      const docsData = await docsRes.json();
      if (docsData.success) setDocumentosPaciente(docsData.documentos || []);
      
      // Cargar historial de estados
      await cargarHistorialEstados(paciente.id);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setSesionesPaciente([]);
      setCitasPaciente([]);
      setPagosPaciente([]);
      setEstadisticasPaciente(null);
      setDocumentosPaciente([]);
      setHistorialEstados([]);
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

  const cargarHistorialEstados = async (pacienteId: number) => {
    try {
      const response = await fetch(`/api/pacientes/${pacienteId}/estado`);
      const data = await response.json();
      if (data.success) {
        setHistorialEstados(data.historial || []);
      }
    } catch (error) {
      console.error('Error al cargar historial de estados:', error);
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
        await cargarHistorialEstados(pacienteSeleccionado.id);
        await fetchPacientes();
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

  const handleEliminarPaciente = async (paciente: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al paciente ${paciente.nombre}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar paciente');
      }

      // Recargar lista de pacientes
      await fetchPacientes();
      
      mostrarMensaje('Paciente eliminado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      setError('Error al eliminar paciente');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
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

  const handleGuardarCambiosFicha = async () => {
    if (!pacienteSeleccionado) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/pacientes/${pacienteSeleccionado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pacienteSeleccionado),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar paciente');
      }

      // Recargar lista de pacientes
      await fetchPacientes();
      
      // Salir del modo edición
      setModoEdicion(false);
      
      mostrarMensaje('Ficha actualizada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al actualizar la ficha', true);
    } finally {
      setSaving(false);
    }
  };

  // Filtrar pacientes por busqueda y estado (memoizado)
  const pacientesFiltrados = useMemo(() => {
    let filtrados = pacientes;
    
    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(p => (p.estado_paciente || 'activo') === filtroEstado);
    }
    
    // Filtrar por búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(paciente =>
        paciente.nombre?.toLowerCase().includes(searchLower) ||
        paciente.rut?.toLowerCase().includes(searchLower) ||
        paciente.telefono?.includes(busqueda) ||
        paciente.ocupacion?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtrados;
  }, [pacientes, busqueda, filtroEstado]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Gestión de Pacientes</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nuevo Paciente
        </button>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Estadísticas de Estados */}
      {estadisticasEstados && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            border: filtroEstado === 'activo' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            ...(filtroEstado !== 'activo' && {
              ':hover': { borderColor: 'rgba(255, 255, 255, 0.1)' }
            })
          }} onClick={() => setFiltroEstado('activo')}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: filtroEstado === 'activo' ? '#3b82f6' : '#888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              Activos
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {estadisticasEstados.estadisticas.activo}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {estadisticasEstados.porcentajes.activo}% del total
            </div>
          </div>
          
          <div style={{
            background: '#1a1a1a',
            border: filtroEstado === 'alta' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }} onClick={() => setFiltroEstado('alta')}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: filtroEstado === 'alta' ? '#10b981' : '#888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              Alta
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {estadisticasEstados.estadisticas.alta}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {estadisticasEstados.porcentajes.alta}% del total
            </div>
          </div>
          
          <div style={{
            background: '#1a1a1a',
            border: filtroEstado === 'abandono' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }} onClick={() => setFiltroEstado('abandono')}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: filtroEstado === 'abandono' ? '#ef4444' : '#888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              Receso
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {estadisticasEstados.estadisticas.abandono}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {estadisticasEstados.porcentajes.abandono}% del total
            </div>
          </div>
          
          <div style={{
            background: '#1a1a1a',
            border: filtroEstado === 'todos' ? '1px solid #3FFF00' : '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }} onClick={() => setFiltroEstado('todos')}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: filtroEstado === 'todos' ? '#3FFF00' : '#888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              Todos
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {estadisticasEstados.estadisticas.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              Total pacientes
            </div>
          </div>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="filtros-container" style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#666' }}>
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, RUT, teléfono u ocupación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="search-input"
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#666', 
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            )}
          </div>
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="alta">Alta</option>
            <option value="abandono">Receso</option>
          </select>
        </div>
        
        {(busqueda || filtroEstado !== 'todos') && (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
            {filtroEstado !== 'todos' && ` (${filtroEstado})`}
          </p>
        )}
      </div>

      <div className="module-content">
        {error && (
          <div style={{ 
            padding: '1rem', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '300px',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div className="spinner-large"></div>
            <p>Cargando pacientes...</p>
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <p className="empty-state">
            {busqueda ? 'No se encontraron pacientes con ese criterio de búsqueda.' : 'No hay pacientes registrados. Crea el primero.'}
          </p>
        ) : (
          <div className="pacientes-grid">
            {pacientesFiltrados.map((paciente) => (
              <div key={paciente.id} className="paciente-card">
                <div className="paciente-header">
                  <div className="paciente-avatar">
                    {paciente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="paciente-header-info">
                    <h3>{paciente.nombre}</h3>
                    <p>{paciente.edad} años • {paciente.ocupacion}</p>
                    {(() => {
                      const estado = paciente.estado_paciente || paciente.estado_tratamiento || 'activo';
                      const esAlta = estado === 'alta';
                      const esAbandono = estado === 'abandono';
                      const esSeguimiento = estado === 'seguimiento';
                      return (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '0.25rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                           'En tratamiento'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="paciente-info">
                  <div className="info-row">
                    <span>RUT:</span>
                    <strong>{paciente.rut || 'No especificado'}</strong>
                  </div>
                  <div className="info-row">
                    <span>Teléfono:</span>
                    <strong>{paciente.telefono || 'No especificado'}</strong>
                  </div>
                  <div className="info-row">
                    <span>Altura:</span>
                    <strong>{paciente.altura ? `${paciente.altura} cm` : 'No especificado'}</strong>
                  </div>
                  <div className="info-row">
                    <span>Peso:</span>
                    <strong>{paciente.peso ? `${paciente.peso} kg` : 'No especificado'}</strong>
                  </div>
                  <div className="info-row info-row-lesion">
                    <span>Lesión:</span>
                    <strong className="lesion-text">{paciente.lesion_consulta || 'No especificado'}</strong>
                  </div>
                </div>
                <div className="paciente-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="btn-secondary btn-ver-ficha" 
                    style={{ flex: 1 }}
                    onClick={() => handleVerFicha(paciente)}
                  >
                    Ver Ficha
                  </button>
                  <button 
                    className="btn-danger btn-eliminar"
                    style={{ 
                      flex: '0 0 auto',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '36px'
                    }}
                    onClick={() => handleEliminarPaciente(paciente)}
                    title="Eliminar paciente"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ width: '18px', height: '18px' }}
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ficha de Paciente */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ficha de Nuevo Paciente</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="ficha-form">
              {error && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fee2e2', 
                  color: '#dc2626', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}
              
              {/* Datos Personales */}
              <div className="form-section">
                <h3 className="section-title">Datos Personales</h3>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>Nombre Completo *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>RUT</label>
                    <input
                      type="text"
                      name="rut"
                      value={formData.rut}
                      onChange={handleChange}
                      placeholder="12.345.678-9"
                      maxLength={12}
                    />
                  </div>
                  <div className="form-field">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="form-field">
                    <label>Edad</label>
                    <input
                      type="number"
                      name="edad"
                      value={formData.edad}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-field">
                    <label>Altura (cm)</label>
                    <input
                      type="number"
                      name="altura"
                      value={formData.altura}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-field">
                    <label>Peso (kg)</label>
                    <input
                      type="number"
                      name="peso"
                      value={formData.peso}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Ocupación</label>
                    <input
                      type="text"
                      name="ocupacion"
                      value={formData.ocupacion}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Antecedentes Médicos */}
              <div className="form-section">
                <h3 className="section-title">Antecedentes Médicos</h3>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>Enfermedades</label>
                    <textarea
                      name="enfermedades"
                      value={formData.enfermedades}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Enfermedades Hereditarias</label>
                    <textarea
                      name="enfermedadesHereditarias"
                      value={formData.enfermedadesHereditarias}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Estilo de Vida */}
              <div className="form-section">
                <h3 className="section-title">Estilo de Vida</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Deportes</label>
                    <textarea
                      name="deportes"
                      value={formData.deportes}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field">
                    <label>Alimentación</label>
                    <textarea
                      name="alimentacion"
                      value={formData.alimentacion}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field">
                    <label>Consumo de Agua</label>
                    <textarea
                      name="consumoAgua"
                      value={formData.consumoAgua}
                      onChange={handleChange}
                      placeholder="Ej: 2 litros/día"
                      rows={3}
                    />
                  </div>
                  <div className="form-field">
                    <label>Descanso</label>
                    <textarea
                      name="descanso"
                      value={formData.descanso}
                      onChange={handleChange}
                      placeholder="Ej: 7-8 horas/día"
                      rows={3}
                    />
                  </div>
                  <div className="form-field">
                    <label>Psicológicamente</label>
                    <textarea
                      name="psicologicamente"
                      value={formData.psicologicamente}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field">
                    <label>Digestión</label>
                    <textarea
                      name="digestion"
                      value={formData.digestion}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div className="form-section">
                <h3 className="section-title">Motivo de Consulta</h3>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>Lesión por la que consulta</label>
                    <textarea
                      name="lesionConsulta"
                      value={formData.lesionConsulta}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Objetivo del paciente</label>
                    <textarea
                      name="objetivoPaciente"
                      value={formData.objetivoPaciente}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Evaluación física</label>
                    <textarea
                      name="evaluacionFisica"
                      value={formData.evaluacionFisica}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>
                  <div className="form-field">
                    <label>Sesiones Programadas (opcional)</label>
                    <input
                      type="number"
                      name="sesiones_programadas"
                      value={formData.sesiones_programadas}
                      onChange={handleChange}
                      min="1"
                      placeholder="Ej: 10"
                    />
                    <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      Número total de sesiones del tratamiento
                    </small>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mini-modal: Crear primera sesión rápida */}
      {showMiniSesion && pacienteCreado && (
        <div className="modal-overlay" onClick={() => { setShowMiniSesion(false); setPacienteCreado(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#1a1a1a',
            border: '2px solid #3FFF00',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ color: '#fff', margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
              Paciente creado
            </h3>
            <p style={{ color: '#3FFF00', fontWeight: 600, margin: '0 0 0.25rem 0', fontSize: '1.05rem' }}>
              {pacienteCreado.nombre}
            </p>
            {pacienteCreado.sesionesProgramadas && (
              <p style={{ color: '#888', margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
                Tratamiento: {pacienteCreado.sesionesProgramadas} sesiones
              </p>
            )}

            <div style={{
              background: '#0a0a0a',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <h4 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '0.95rem' }}>
                Programar Sesión #1 (Kinesioterapia)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Fecha</label>
                  <input
                    type="date"
                    value={miniSesionData.fecha}
                    onChange={(e) => setMiniSesionData({ ...miniSesionData, fecha: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Hora</label>
                  <select
                    value={miniSesionData.hora}
                    onChange={(e) => setMiniSesionData({ ...miniSesionData, hora: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {Array.from({ length: 4 * (21 - 8) + 1 }, (_, i) => {
                      const h = Math.floor(i / 4) + 8;
                      const m = (i % 4) * 15;
                      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowMiniSesion(false); setPacienteCreado(null); }}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  background: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Omitir
              </button>
              <button
                onClick={handleCrearSesionRapida}
                disabled={!miniSesionData.hora || creandoSesion}
                style={{
                  flex: 2,
                  padding: '0.65rem',
                  background: !miniSesionData.hora ? '#333' : '#3FFF00',
                  border: 'none',
                  borderRadius: '8px',
                  color: !miniSesionData.hora ? '#666' : '#0a0a0a',
                  cursor: !miniSesionData.hora ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                {creandoSesion ? 'Creando...' : 'Crear Sesión #1'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa (componente compartido con soporte de Episodios) */}
      {showFichaCompleta && pacienteSeleccionado && (
        <FichaCompletaModal
          paciente={pacienteSeleccionado}
          onClose={() => { setShowFichaCompleta(false); setModoEdicion(false); }}
          onPacienteUpdated={(p: any) => { setPacienteSeleccionado(p); fetchPacientes(); }}
          onNavigate={onNavigate}
          configuraciones={configuraciones}
          initialModoEdicion={modoEdicion}
        />
      )}

      {/* Ficha inline antigua (reemplazada por FichaCompletaModal, se mantiene desactivada) */}
      {false && pacienteSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowFichaCompleta(false)}>
          <div className="modal-content ficha-completa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ficha Completa - {pacienteSeleccionado.nombre}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!modoEdicion ? (
                  <>
                    {onNavigate && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => onNavigate?.('sesiones', { pacienteId: pacienteSeleccionado.id })}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Ver Sesiones
                      </button>
                    )}
                    
                    {/* Botones de cambio de estado */}
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
                        onClick={() => handleAbrirModalEstado('activo')}
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
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Guardar Cambios
                    </button>
                  </>
                )}
                <button className="modal-close" onClick={() => {
                  setShowFichaCompleta(false);
                  setModoEdicion(false);
                }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="ficha-completa-content">
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
              {estadisticasPaciente?.evolucionDolor?.length > 1 && !loadingSesiones && (
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
                    {estadisticasPaciente.evolucionDolor.map((punto: any, i: number) => {
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
                              background: mejoro ? 'rgba(63, 255, 0, 0.5)' : 'rgba(239, 68, 68, 0.7)',
                              borderRadius: '3px 3px 0 0',
                              minHeight: '4px',
                              position: 'relative'
                            }} title={`Final: ${punto.dolorFinal}/10`}>
                              <span style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: mejoro ? '#3FFF00' : '#ef4444' }}>
                                {punto.dolorFinal}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.55rem', color: '#666' }}>S{punto.numeroSesion || i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: '#888' }}>
                    <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(239, 68, 68, 0.4)', borderRadius: '2px', marginRight: '4px' }}></span>Inicial</span>
                    <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(63, 255, 0, 0.5)', borderRadius: '2px', marginRight: '4px' }}></span>Final</span>
                  </div>
                  {(() => {
                    const datos = estadisticasPaciente.evolucionDolor;
                    const primero = datos[0];
                    const ultimo = datos[datos.length - 1];
                    const mejoriaPct = primero.dolorInicial > 0 
                      ? Math.round(((primero.dolorInicial - ultimo.dolorFinal) / primero.dolorInicial) * 100)
                      : 0;
                    return mejoriaPct > 0 ? (
                      <div style={{
                        textAlign: 'center',
                        marginTop: '0.75rem',
                        padding: '0.5rem',
                        background: 'rgba(63, 255, 0, 0.05)',
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
                      <input
                        type="text"
                        value={pacienteSeleccionado.nombre || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, nombre: e.target.value})}
                        className="field-input"
                        placeholder="Nombre completo"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.nombre}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">RUT</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.rut || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, rut: e.target.value})}
                        className="field-input"
                        placeholder="12.345.678-9"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.rut}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Teléfono</span>
                    {modoEdicion ? (
                      <input
                        type="tel"
                        value={pacienteSeleccionado.telefono || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, telefono: e.target.value})}
                        className="field-input"
                        placeholder="+56 9 1234 5678"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.telefono}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Edad</span>
                    {modoEdicion ? (
                      <input
                        type="number"
                        value={pacienteSeleccionado.edad || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, edad: e.target.value})}
                        className="field-input"
                        placeholder="Edad"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.edad} años</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Altura</span>
                    {modoEdicion ? (
                      <input
                        type="number"
                        value={pacienteSeleccionado.altura || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, altura: e.target.value})}
                        className="field-input"
                        placeholder="Altura (cm)"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.altura} cm</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Peso</span>
                    {modoEdicion ? (
                      <input
                        type="number"
                        value={pacienteSeleccionado.peso || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, peso: e.target.value})}
                        className="field-input"
                        placeholder="Peso (kg)"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.peso} kg</span>
                    )}
                  </div>
                  <div className="ficha-field full-width">
                    <span className="field-label">Ocupación</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.ocupacion || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, ocupacion: e.target.value})}
                        className="field-input"
                        placeholder="Ocupación"
                      />
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
                      <textarea
                        value={pacienteSeleccionado.enfermedades || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, enfermedades: e.target.value})}
                        className="field-input"
                        placeholder="Enfermedades actuales"
                        rows={3}
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.enfermedades || 'Ninguna'}</span>
                    )}
                  </div>
                  <div className="ficha-field full-width">
                    <span className="field-label">Enfermedades Hereditarias</span>
                    {modoEdicion ? (
                      <textarea
                        value={pacienteSeleccionado.enfermedades_hereditarias || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, enfermedades_hereditarias: e.target.value})}
                        className="field-input"
                        placeholder="Enfermedades hereditarias"
                        rows={3}
                      />
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
                  <div className="ficha-field">
                    <span className="field-label">Deportes</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.deportes || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, deportes: e.target.value})}
                        className="field-input"
                        placeholder="Deportes que practica"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.deportes || 'No especificado'}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Alimentación</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.alimentacion || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, alimentacion: e.target.value})}
                        className="field-input"
                        placeholder="Tipo de alimentación"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.alimentacion || 'No especificado'}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Consumo de Agua</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.consumo_agua || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, consumo_agua: e.target.value})}
                        className="field-input"
                        placeholder="Litros por día"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.consumo_agua || 'No especificado'}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Descanso</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.descanso || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, descanso: e.target.value})}
                        className="field-input"
                        placeholder="Horas de sueño"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.descanso || 'No especificado'}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Estado Psicológico</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.psicologicamente || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, psicologicamente: e.target.value})}
                        className="field-input"
                        placeholder="Estado psicológico"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.psicologicamente || 'No especificado'}</span>
                    )}
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Digestión</span>
                    {modoEdicion ? (
                      <input
                        type="text"
                        value={pacienteSeleccionado.digestion || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, digestion: e.target.value})}
                        className="field-input"
                        placeholder="Estado digestivo"
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.digestion || 'No especificado'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div className="ficha-section">
                <h3 className="section-title">Motivo de Consulta</h3>
                <div className="ficha-grid">
                  <div className="ficha-field full-width">
                    <span className="field-label">Lesión por la que consulta</span>
                    {modoEdicion ? (
                      <textarea
                        value={pacienteSeleccionado.lesion_consulta || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, lesion_consulta: e.target.value})}
                        className="field-input"
                        placeholder="Descripción de la lesión"
                        rows={3}
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.lesion_consulta}</span>
                    )}
                  </div>
                  <div className="ficha-field full-width">
                    <span className="field-label">Objetivo del Paciente</span>
                    {modoEdicion ? (
                      <textarea
                        value={pacienteSeleccionado.objetivo_paciente || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, objetivo_paciente: e.target.value})}
                        className="field-input"
                        placeholder="Objetivos del tratamiento"
                        rows={3}
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.objetivo_paciente}</span>
                    )}
                  </div>
                  <div className="ficha-field full-width">
                    <span className="field-label">Evaluación Física</span>
                    {modoEdicion ? (
                      <textarea
                        value={pacienteSeleccionado.evaluacion_fisica || ''}
                        onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, evaluacion_fisica: e.target.value})}
                        className="field-input"
                        placeholder="Evaluación física inicial"
                        rows={4}
                      />
                    ) : (
                      <span className="field-value">{pacienteSeleccionado.evaluacion_fisica || 'No especificado'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Citas del Paciente */}
              {citasPaciente.length > 0 && (
                <div className="ficha-section">
                  <h3 className="section-title">
                    Citas 
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#3b82f6' }}>
                      ({citasPaciente.length})
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {citasPaciente.slice(0, 10).map((cita: any) => (
                      <div key={cita.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: '#1a1a1a',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${
                          cita.estado === 'completada' ? '#10b981' :
                          cita.estado === 'confirmada' ? '#3FFF00' :
                          cita.estado === 'cancelada' ? '#ef4444' : '#3b82f6'
                        }`
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {formatearFechaLocal(cita.fecha)} - {cita.hora}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>{cita.tipo} • {cita.duracion} min</div>
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: cita.estado === 'completada' ? 'rgba(16, 185, 129, 0.15)' :
                                      cita.estado === 'confirmada' ? 'rgba(63, 255, 0, 0.15)' :
                                      cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.15)' :
                                      'rgba(59, 130, 246, 0.15)',
                          color: cita.estado === 'completada' ? '#10b981' :
                                 cita.estado === 'confirmada' ? '#3FFF00' :
                                 cita.estado === 'cancelada' ? '#ef4444' : '#3b82f6'
                        }}>
                          {cita.estado}
                        </span>
                      </div>
                    ))}
                    {citasPaciente.length > 10 && (
                      <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
                        +{citasPaciente.length - 10} citas más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pagos del Paciente */}
              {pagosPaciente.length > 0 && (
                <div className="ficha-section">
                  <h3 className="section-title">
                    Pagos 
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#f59e0b' }}>
                      ({pagosPaciente.length})
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {pagosPaciente.slice(0, 8).map((pago: any) => (
                      <div key={pago.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: '#1a1a1a',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${pago.estado === 'completado' ? '#f59e0b' : '#ef4444'}`
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            ${(pago.monto || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {pago.fecha_pago ? formatearFechaLocal(pago.fecha_pago) : 'Sin fecha'} • {pago.metodo_pago}
                          </div>
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: pago.estado === 'completado' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: pago.estado === 'completado' ? '#f59e0b' : '#ef4444'
                        }}>
                          {pago.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Sesiones */}
              <div className="ficha-section">
                <h3 className="section-title">
                  Historial de Sesiones 
                  {sesionesPaciente.length > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#3FFF00' }}>
                      ({sesionesPaciente.length})
                    </span>
                  )}
                </h3>
                <div className="sesiones-list">
                  {loadingSesiones && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="spinner"></div>
                    </div>
                  )}
                  
                  {!loadingSesiones && sesionesPaciente.length === 0 && (
                    <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <p>No hay sesiones registradas para este paciente</p>
                    </div>
                  )}
                  
                  {!loadingSesiones && sesionesPaciente.length > 0 && (
                    <div className="sesiones-timeline">
                      {sesionesPaciente.map((sesion: any) => (
                        <div key={sesion.id} className="sesion-card">
                          <div className="sesion-header">
                            <div className="sesion-fecha">
                              <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              {formatearFechaLocal(sesion.fecha)} - {sesion.hora}
                            </div>
                            <span 
                              className="badge"
                              style={{ 
                                backgroundColor: 
                                  sesion.estado === 'completada' ? '#10b981' :
                                  sesion.estado === 'programada' ? '#3b82f6' :
                                  sesion.estado === 'confirmada' ? '#3FFF00' : '#ef4444'
                              }}
                            >
                              {sesion.estado}
                            </span>
                          </div>
                          
                          <div className="sesion-body">
                            <div className="sesion-info-row">
                              <strong>Tipo:</strong> {sesion.tipo}
                              <strong style={{ marginLeft: '1rem' }}>Duración:</strong> {sesion.duracion} min
                            </div>
                            
                            {sesion.notasSesion && (
                              <div className="sesion-info-row">
                                <strong>Notas:</strong> {sesion.notasSesion}
                              </div>
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
                                <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>
                                  {sesion.movilidad}
                                </span>
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
                                <span style={{ 
                                  marginLeft: '0.5rem',
                                  color: '#3FFF00',
                                  textTransform: 'capitalize'
                                }}>
                                  {sesion.progresoGeneral.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                            
                            {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                              <div className="sesion-info-row">
                                <strong>Ejercicios:</strong>
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {sesion.ejerciciosRealizados.map((ejercicio: any, idx: number) => {
                                    // Formato antiguo (string)
                                    if (typeof ejercicio === 'string') {
                                      return (
                                        <div key={idx} style={{
                                          padding: '0.5rem',
                                          background: 'rgba(63, 255, 0, 0.1)',
                                          borderLeft: '3px solid #3FFF00',
                                          borderRadius: '4px'
                                        }}>
                                          <strong>{ejercicio}</strong>
                                        </div>
                                      );
                                    }
                                    // Formato nuevo (objeto con parámetros)
                                    return (
                                      <div key={idx} style={{
                                        padding: '0.75rem',
                                        background: 'rgba(63, 255, 0, 0.1)',
                                        borderLeft: '3px solid #3FFF00',
                                        borderRadius: '4px'
                                      }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#3FFF00' }}>
                                          {ejercicio.nombre}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem', fontSize: '0.85rem', color: '#ccc' }}>
                                          {ejercicio.peso && <div><strong>Peso:</strong> {ejercicio.peso}</div>}
                                          {ejercicio.repeticiones && <div><strong>Repeticiones:</strong> {ejercicio.repeticiones}</div>}
                                          {ejercicio.tiempo && <div><strong>Tiempo:</strong> {ejercicio.tiempo}</div>}
                                          {ejercicio.carga && <div><strong>Carga:</strong> {ejercicio.carga}</div>}
                                        </div>
                                        {ejercicio.notas && (
                                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>
                                            {ejercicio.notas}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {sesion.recomendaciones && (
                              <div className="sesion-info-row">
                                <strong>Recomendaciones:</strong> {sesion.recomendaciones}
                              </div>
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
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#8b5cf6' }}>
                      ({documentosPaciente.length})
                    </span>
                  )}
                </h3>

                {/* Botón subir */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    background: subiendoDocumento ? '#333' : 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid #8b5cf640',
                    borderRadius: '8px',
                    color: subiendoDocumento ? '#666' : '#8b5cf6',
                    cursor: subiendoDocumento ? 'wait' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {subiendoDocumento ? 'Subiendo...' : 'Subir archivo'}
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleSubirDocumento}
                      disabled={subiendoDocumento}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
                    Imágenes, PDF, documentos
                  </span>
                </div>

                {/* Grid de documentos */}
                {documentosPaciente.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {documentosPaciente.map((doc: any) => (
                      <div key={doc.id} style={{
                        background: '#1a1a1a',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid #2a2a2a',
                        position: 'relative',
                        transition: 'border-color 0.2s'
                      }}>
                        {/* Preview */}
                        {doc.tipo === 'imagen' ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={doc.url}
                              alt={doc.nombre}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover',
                                display: 'block',
                                cursor: 'pointer'
                              }}
                            />
                          </a>
                        ) : (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '120px',
                              background: '#0a0a0a',
                              cursor: 'pointer',
                              textDecoration: 'none'
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke={doc.tipo === 'pdf' ? '#ef4444' : '#3b82f6'} strokeWidth="1.5" style={{ width: '40px', height: '40px' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 8 20 8 20 14"/>
                            </svg>
                          </a>
                        )}

                        {/* Info */}
                        <div style={{ padding: '0.5rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            color: '#aaa',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100px'
                          }} title={doc.nombre}>
                            {doc.nombre}
                          </span>
                          <button
                            onClick={() => handleEliminarDocumento(doc.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#666',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              padding: '0 0.2rem',
                              lineHeight: 1
                            }}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No hay documentos adjuntos
                  </p>
                )}
              </div>

              {/* Estado de Tratamiento */}
              <div className="ficha-section" style={{ marginTop: '2rem' }}>
                <h3 className="section-title" style={{ 
                  color: '#3FFF00', 
                  borderBottom: '2px solid #3FFF00',
                  paddingBottom: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  Estado del Tratamiento
                </h3>
                {modoEdicion ? (
                  <select
                    value={pacienteSeleccionado?.estado_tratamiento || 'en_tratamiento'}
                    onChange={(e) => setPacienteSeleccionado({...pacienteSeleccionado, estado_tratamiento: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      background: '#1a1a1a',
                      color: '#fff',
                      fontSize: '0.95rem'
                    }}
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
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
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
              {pacienteSeleccionado?.evaluacion_final && (
                <div className="ficha-section" style={{ marginTop: '2rem' }}>
                  <h3 className="section-title" style={{ 
                    color: '#3FFF00', 
                    borderBottom: '2px solid #3FFF00',
                    paddingBottom: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    📋 Evaluación Final del Tratamiento
                  </h3>
                  <div style={{
                    background: '#0a0a0a',
                    border: '1px solid #3FFF00',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    color: '#e0e0e0'
                  }}>
                    {pacienteSeleccionado.evaluacion_final}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambio de Estado */}
      {showModalEstado && (
        <div className="modal-overlay" onClick={() => setShowModalEstado(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>
                {estadoSeleccionado === 'alta' && '✅ Dar de Alta al Paciente'}
                {estadoSeleccionado === 'abandono' && '❌ Marcar como Receso'}
                {estadoSeleccionado === 'activo' && '🔄 Reactivar Paciente'}
              </h3>
              <button className="modal-close" onClick={() => setShowModalEstado(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
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
                <input
                  type="text"
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                  placeholder={
                    estadoSeleccionado === 'alta' ? 'Ej: Tratamiento completado' :
                    estadoSeleccionado === 'abandono' ? 'Ej: Receso temporal' :
                    'Ej: Retoma tratamiento'
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div className="form-group">
                <label>Notas adicionales (opcional)</label>
                <textarea
                  value={notasEstado}
                  onChange={(e) => setNotasEstado(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {historialEstados.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.75rem' }}>
                    Historial de Estados
                  </h4>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    background: '#0a0a0a',
                    borderRadius: '8px',
                    padding: '0.75rem'
                  }}>
                    {historialEstados.map((h: any) => (
                      <div key={h.id} style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid #1a1a1a',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#aaa' }}>
                            {h.estadoAnterior || 'Nuevo'} → <strong style={{ color: '#3FFF00' }}>{h.estadoNuevo}</strong>
                          </span>
                          <span style={{ color: '#666', fontSize: '0.75rem' }}>
                            {new Date(h.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        {h.motivo && (
                          <div style={{ color: '#666', fontSize: '0.8rem' }}>
                            {h.motivo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowModalEstado(false)}
                disabled={cambiandoEstado}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: cambiandoEstado ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCambiarEstado}
                disabled={cambiandoEstado}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  background: cambiandoEstado ? '#333' : 
                    estadoSeleccionado === 'alta' ? '#10b981' :
                    estadoSeleccionado === 'abandono' ? '#ef4444' : '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: cambiandoEstado ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                {cambiandoEstado ? 'Guardando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
