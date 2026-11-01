'use client';

import { useState, useEffect, useMemo } from 'react';
import Paginacion, { usePaginacion } from './Paginacion';
import { formatearFechaLocal, fechaAString } from '../utils';
import FichaCompletaModal from './FichaCompletaModal';


// Módulo Sesiones
export default function SesionesModule({ onNavigate, initialPacienteId }: { onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void; initialPacienteId?: number }) {
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoSesion, setEditandoSesion] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [pacienteExpandido, setPacienteExpandido] = useState<string | null>(null);
  const [showModalEvaluacion, setShowModalEvaluacion] = useState(false);
  const [pacienteEvaluacion, setPacienteEvaluacion] = useState<any>(null);
  const [evaluacionTexto, setEvaluacionTexto] = useState('');
  const [showModalProgreso, setShowModalProgreso] = useState(false);
  const [pacienteProgreso, setPacienteProgreso] = useState<any>(null);
  const [sesionesProgreso, setSesionesProgreso] = useState<any[]>([]);

  // Modal ficha completa del paciente
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [pacienteFicha, setPacienteFicha] = useState<any>(null);

  // Modal cambio de estado paciente
  const [showModalEstadoPaciente, setShowModalEstadoPaciente] = useState(false);
  const [pacienteEstado, setPacienteEstado] = useState<any>(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [motivoEstado, setMotivoEstado] = useState('');
  const [notasEstado, setNotasEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Mini-modal completar sesión
  const [showModalCompletar, setShowModalCompletar] = useState(false);
  const [sesionCompletar, setSesionCompletar] = useState<any>(null);
  const [completarForm, setCompletarForm] = useState({
    dolorInicial: 0,
    dolorFinal: 0,
    borgPercepcion: 0,
    movilidad: '',
    fuerza: '',
    progresoGeneral: '',
    ejerciciosRealizados: [] as Array<{
      ejercicioId: number;
      nombre: string;
      peso?: string;
      repeticiones?: string;
      tiempo?: string;
      carga?: string;
      notas?: string;
    }>,
    observaciones: '',
    recomendaciones: ''
  });
  const [completarLoading, setCompletarLoading] = useState(false);
  const [mostrarSelectorEjercicioCompletar, setMostrarSelectorEjercicioCompletar] = useState(false);
  const [busquedaEjercicioCompletar, setBusquedaEjercicioCompletar] = useState('');
  const [ejercicioSeleccionadoCompletar, setEjercicioSeleccionadoCompletar] = useState<any>(null);
  const [parametrosEjercicioCompletar, setParametrosEjercicioCompletar] = useState({
    peso: '',
    repeticiones: '',
    tiempo: '',
    carga: '',
    notas: ''
  });
  const [modoCrearEjercicioCompletar, setModoCrearEjercicioCompletar] = useState(false);
  const [nuevoEjercicioNombre, setNuevoEjercicioNombre] = useState('');
  const [nuevoEjercicioCategoria, setNuevoEjercicioCategoria] = useState('');
  const [creandoEjercicio, setCreandoEjercicio] = useState(false);
  const [editandoEjercicioIdx, setEditandoEjercicioIdx] = useState<number | null>(null);

  // Mini-modal programar siguiente sesión
  const [showMiniSiguiente, setShowMiniSiguiente] = useState(false);
  const [siguienteSesionInfo, setSiguienteSesionInfo] = useState<any>(null);
  const [siguienteSesionData, setSiguienteSesionData] = useState({ fecha: '', hora: '' });
  const [creandoSiguiente, setCreandoSiguiente] = useState(false);

  // Buscador y filtros
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [filtros, setFiltros] = useState({
    pacienteId: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    pacienteId: '',
    fecha: '',
    hora: '',
    duracion: 60,
    tipo: 'Kinesioterapia',
    estado: 'programada',
    notasSesion: '',
    ejerciciosRealizados: [] as Array<{
      ejercicioId: number;
      nombre: string;
      peso?: string;
      repeticiones?: string;
      tiempo?: string;
      carga?: string;
      notas?: string;
    }>,
    observaciones: '',
    dolorInicial: 0,
    dolorFinal: 0,
    movilidad: '',
    fuerza: '',
    progresoGeneral: '',
    recomendaciones: '',
    proximaSesion: ''
  });

  const [nuevoEjercicio, setNuevoEjercicio] = useState('');
  const [bibliotecaEjercicios, setBibliotecaEjercicios] = useState<any[]>([]);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<any>(null);
  const [mostrarSelectorEjercicio, setMostrarSelectorEjercicio] = useState(false);
  const [modoCrearEjercicio, setModoCrearEjercicio] = useState(false);
  const [nombreNuevoEjercicio, setNombreNuevoEjercicio] = useState('');
  const [mostrarGestionBiblioteca, setMostrarGestionBiblioteca] = useState(false);
  const [busquedaEjercicio, setBusquedaEjercicio] = useState('');
  const [parametrosEjercicio, setParametrosEjercicio] = useState({
    peso: '',
    repeticiones: '',
    tiempo: '',
    carga: '',
    notas: ''
  });

  // Carga inicial en paralelo (solo al montar)
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      const [sesionesRes, pacientesRes, ejerciciosRes] = await Promise.allSettled([
        fetch('/api/sesiones').then(r => r.json()),
        fetch('/api/pacientes').then(r => r.json()),
        fetch('/api/ejercicios').then(r => r.json())
      ]);
      if (sesionesRes.status === 'fulfilled' && sesionesRes.value.success) setSesiones(sesionesRes.value.sesiones);
      if (pacientesRes.status === 'fulfilled' && pacientesRes.value.success) setPacientes(pacientesRes.value.pacientes);
      if (ejerciciosRes.status === 'fulfilled' && ejerciciosRes.value.success) setBibliotecaEjercicios(ejerciciosRes.value.ejercicios);
      setLoading(false);
    };
    cargarDatosIniciales();
  }, []);

  // Auto-expandir y filtrar paciente cuando se navega desde otro módulo
  useEffect(() => {
    if (initialPacienteId && !loading) {
      setPacienteExpandido(String(initialPacienteId));
      // Buscar nombre del paciente para filtrar la lista
      const paciente = pacientes.find((p: any) => p.id === initialPacienteId);
      if (paciente) {
        setBusquedaPaciente(paciente.nombre);
      }
    }
  }, [initialPacienteId, loading]);

  // Solo recargar sesiones cuando cambian los filtros (no pacientes ni ejercicios)
  useEffect(() => {
    if (filtros.pacienteId || filtros.estado || filtros.fechaDesde || filtros.fechaHasta) {
      cargarSesiones();
    }
  }, [filtros]);

  const cargarPacientes = async () => {
    try {
      const response = await fetch('/api/pacientes');
      const data = await response.json();
      if (data.success) {
        setPacientes(data.pacientes);
      }
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  const cargarBibliotecaEjercicios = async () => {
    try {
      const response = await fetch('/api/ejercicios');
      const data = await response.json();
      if (data.success) {
        setBibliotecaEjercicios(data.ejercicios);
      }
    } catch (error) {
      console.error('Error al cargar biblioteca de ejercicios:', error);
    }
  };

  const cargarSesiones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.pacienteId) params.append('pacienteId', filtros.pacienteId);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

      const response = await fetch(`/api/sesiones?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSesiones(data.sesiones);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cargar sesiones', true);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const handleAbrirModalEstadoPaciente = (paciente: any, estado: string) => {
    setPacienteEstado(paciente);
    setEstadoSeleccionado(estado);
    setMotivoEstado('');
    setNotasEstado('');
    setShowModalEstadoPaciente(true);
  };

  const handleCambiarEstadoPaciente = async () => {
    if (!pacienteEstado || !estadoSeleccionado) return;
    
    setCambiandoEstado(true);
    try {
      const response = await fetch(`/api/pacientes/${pacienteEstado.id}/estado`, {
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
        // Recargar tanto sesiones como pacientes para actualizar la UI
        await Promise.all([cargarSesiones(), cargarPacientes()]);
        setShowModalEstadoPaciente(false);
      } else {
        mostrarMensaje(data.error || 'Error al cambiar estado', true);
      }
    } catch (error) {
      mostrarMensaje('Error al cambiar estado del paciente', true);
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editandoSesion 
        ? `/api/sesiones/${editandoSesion.id}`
        : '/api/sesiones';
      
      const method = editandoSesion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarSesiones();
        handleCerrarModal();
        mostrarMensaje(editandoSesion ? 'Sesión actualizada' : 'Sesión creada');
      } else {
        mostrarMensaje(data.error || 'Error al guardar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar sesión', true);
    }
  };

  const handleEditarSesion = (sesion: any) => {
    setEditandoSesion(sesion);
    
    // Convertir ejercicios antiguos (strings) al nuevo formato (objetos)
    let ejerciciosConvertidos = [];
    if (sesion.ejerciciosRealizados && Array.isArray(sesion.ejerciciosRealizados)) {
      ejerciciosConvertidos = sesion.ejerciciosRealizados.map((ej: any) => {
        // Si ya es un objeto, devolverlo tal cual
        if (typeof ej === 'object' && ej.ejercicioId) {
          return ej;
        }
        // Si es un string (formato antiguo), convertirlo
        if (typeof ej === 'string') {
          return {
            ejercicioId: 0, // ID temporal para ejercicios antiguos
            nombre: ej,
            peso: '',
            repeticiones: '',
            tiempo: '',
            carga: '',
            notas: ''
          };
        }
        return ej;
      });
    }
    
    setFormData({
      pacienteId: sesion.pacienteId,
      fecha: sesion.fecha,
      hora: sesion.hora,
      duracion: sesion.duracion,
      tipo: sesion.tipo,
      estado: sesion.estado,
      notasSesion: sesion.notasSesion || '',
      ejerciciosRealizados: ejerciciosConvertidos,
      observaciones: sesion.observaciones || '',
      dolorInicial: sesion.dolorInicial || 0,
      dolorFinal: sesion.dolorFinal || 0,
      movilidad: sesion.movilidad || '',
      fuerza: sesion.fuerza || '',
      progresoGeneral: sesion.progresoGeneral || '',
      recomendaciones: sesion.recomendaciones || '',
      proximaSesion: sesion.proximaSesion || ''
    });
    setShowModal(true);
  };

  const handleEliminarSesion = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta sesión?')) return;
    
    try {
      const response = await fetch(`/api/sesiones/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarSesiones();
        mostrarMensaje('Sesión eliminada');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar sesión', true);
    }
  };

  const handleAbrirModalEvaluacion = (paciente: any) => {
    setPacienteEvaluacion(paciente);
    setEvaluacionTexto(paciente.evaluacion_final || '');
    setShowModalEvaluacion(true);
  };

  const handleGuardarEvaluacionFinal = async () => {
    if (!pacienteEvaluacion) return;

    try {
      const response = await fetch(`/api/pacientes/${pacienteEvaluacion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluacion_final: evaluacionTexto })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('✅ Evaluación final guardada');
        setShowModalEvaluacion(false);
        setPacienteEvaluacion(null);
        setEvaluacionTexto('');
        cargarSesiones();
        cargarPacientes();
      } else {
        mostrarMensaje(data.error || 'Error al guardar evaluación', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar evaluación', true);
    }
  };

  const handleAbrirModalProgreso = async (paciente: any, sesionesPaciente: any[]) => {
    setPacienteProgreso(paciente);
    setSesionesProgreso(sesionesPaciente);
    setShowModalProgreso(true);
  };

  // === MINI-MODAL COMPLETAR SESIÓN ===
  const handleAbrirCompletar = async (sesion: any) => {
    setSesionCompletar(sesion);
    
    // Intentar precargar ejercicios de la última sesión completada del paciente
    let ejerciciosPrecargados: any[] = [];
    try {
      const pacienteId = sesion.pacienteId || sesion.paciente_id;
      const res = await fetch(`/api/sesiones?pacienteId=${pacienteId}&estado=completada`);
      const data = await res.json();
      if (data.success && data.sesiones.length > 0) {
        const ultimaSesion = data.sesiones[0]; // Ya viene ordenado DESC
        if (ultimaSesion.ejerciciosRealizados && ultimaSesion.ejerciciosRealizados.length > 0) {
          ejerciciosPrecargados = ultimaSesion.ejerciciosRealizados.map((ej: any) => {
            if (typeof ej === 'string') {
              return { ejercicioId: 0, nombre: ej, peso: '', repeticiones: '', tiempo: '', carga: '', notas: '' };
            }
            return { ...ej };
          });
        }
      }
    } catch (error) {
      console.error('Error al precargar ejercicios:', error);
    }

    // Si la sesión ya tiene ejercicios asignados, usarlos en vez de la anterior
    let ejerciciosIniciales = ejerciciosPrecargados;
    if (sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0) {
      ejerciciosIniciales = sesion.ejerciciosRealizados.map((ej: any) => {
        if (typeof ej === 'string') {
          return { ejercicioId: 0, nombre: ej, peso: '', repeticiones: '', tiempo: '', carga: '', notas: '' };
        }
        return { ...ej };
      });
    }

    setCompletarForm({
      dolorInicial: sesion.dolorInicial || 0,
      dolorFinal: sesion.dolorFinal || 0,
      borgPercepcion: sesion.borgPercepcion || 0,
      movilidad: sesion.movilidad || '',
      fuerza: sesion.fuerza || '',
      progresoGeneral: sesion.progresoGeneral || '',
      ejerciciosRealizados: ejerciciosIniciales,
      observaciones: sesion.observaciones || sesion.notasSesion || '',
      recomendaciones: sesion.recomendaciones || ''
    });
    setShowModalCompletar(true);
  };

  const handleCopiarEjerciciosUltimaSesion = async () => {
    if (!sesionCompletar) return;
    try {
      const pacienteId = sesionCompletar.pacienteId || sesionCompletar.paciente_id;
      const res = await fetch(`/api/sesiones?pacienteId=${pacienteId}&estado=completada`);
      const data = await res.json();
      if (data.success && data.sesiones.length > 0) {
        const ultimaSesion = data.sesiones[0];
        if (ultimaSesion.ejerciciosRealizados && ultimaSesion.ejerciciosRealizados.length > 0) {
          const ejercicios = ultimaSesion.ejerciciosRealizados.map((ej: any) => {
            if (typeof ej === 'string') {
              return { ejercicioId: 0, nombre: ej, peso: '', repeticiones: '', tiempo: '', carga: '', notas: '' };
            }
            return { ...ej };
          });
          setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: ejercicios }));
          mostrarMensaje('Ejercicios copiados de la última sesión');
        } else {
          mostrarMensaje('La última sesión no tiene ejercicios', true);
        }
      } else {
        mostrarMensaje('No hay sesiones anteriores completadas', true);
      }
    } catch (error) {
      mostrarMensaje('Error al copiar ejercicios', true);
    }
  };

  const handleSubmitCompletar = async () => {
    if (!sesionCompletar) return;
    setCompletarLoading(true);
    try {
      const response = await fetch(`/api/sesiones/${sesionCompletar.id}/completar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completarForm)
      });
      const data = await response.json();
      if (data.success) {
        // Guardar info para programar siguiente sesión
        const pacienteId = sesionCompletar.pacienteId || sesionCompletar.paciente_id;
        const pacienteNombre = sesionCompletar.paciente;
        const numSesion = sesionCompletar.numeroSesion || null;
        const totalProgramadas = sesionCompletar.sesionesProgramadas || null;
        
        await cargarSesiones();
        handleCerrarCompletar();
        
        // Mostrar mini-modal para programar siguiente (solo si no completó todas)
        const siguienteNum = numSesion ? numSesion + 1 : null;
        if (!totalProgramadas || !siguienteNum || siguienteNum <= totalProgramadas) {
          setSiguienteSesionInfo({
            pacienteId,
            pacienteNombre,
            siguienteNum,
            totalProgramadas
          });
          setSiguienteSesionData({ fecha: fechaAString(new Date()), hora: '' });
          setShowMiniSiguiente(true);
        } else {
          mostrarMensaje('Todas las sesiones completadas');
        }
      } else {
        mostrarMensaje(data.error || 'Error al completar sesión', true);
      }
    } catch (error) {
      mostrarMensaje('Error al completar sesión', true);
    } finally {
      setCompletarLoading(false);
    }
  };

  const handleCrearSiguienteSesion = async () => {
    if (!siguienteSesionInfo?.pacienteId || !siguienteSesionData.hora) return;
    setCreandoSiguiente(true);
    try {
      const response = await fetch('/api/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: siguienteSesionInfo.pacienteId,
          fecha: siguienteSesionData.fecha,
          hora: siguienteSesionData.hora,
          duracion: 60,
          tipo: 'Kinesioterapia',
          estado: 'programada'
        })
      });
      const data = await response.json();
      if (data.success) {
        await cargarSesiones();
        mostrarMensaje(`Sesión ${siguienteSesionInfo.siguienteNum ? '#' + siguienteSesionInfo.siguienteNum : ''} programada para ${siguienteSesionInfo.pacienteNombre}`);
      } else {
        mostrarMensaje(data.error || 'Error al crear sesión', true);
      }
    } catch (err) {
      mostrarMensaje('Error al crear sesión', true);
    } finally {
      setCreandoSiguiente(false);
      setShowMiniSiguiente(false);
      setSiguienteSesionInfo(null);
    }
  };

  const handleCerrarCompletar = () => {
    setShowModalCompletar(false);
    setSesionCompletar(null);
    setMostrarSelectorEjercicioCompletar(false);
    setBusquedaEjercicioCompletar('');
    setEjercicioSeleccionadoCompletar(null);
    setParametrosEjercicioCompletar({ peso: '', repeticiones: '', tiempo: '', carga: '', notas: '' });
    setModoCrearEjercicioCompletar(false);
    setNuevoEjercicioNombre('');
    setNuevoEjercicioCategoria('');
    setEditandoEjercicioIdx(null);
    setCompletarForm({
      dolorInicial: 0,
      dolorFinal: 0,
      borgPercepcion: 0,
      movilidad: '',
      fuerza: '',
      progresoGeneral: '',
      ejerciciosRealizados: [],
      observaciones: '',
      recomendaciones: ''
    });
  };

  const agregarEjercicioCompletar = () => {
    if (!ejercicioSeleccionadoCompletar) return;
    const nuevoEj = {
      ejercicioId: ejercicioSeleccionadoCompletar.id,
      nombre: ejercicioSeleccionadoCompletar.nombre,
      ...parametrosEjercicioCompletar
    };
    setCompletarForm(prev => ({
      ...prev,
      ejerciciosRealizados: [...prev.ejerciciosRealizados, nuevoEj]
    }));
    setEjercicioSeleccionadoCompletar(null);
    setBusquedaEjercicioCompletar('');
    setMostrarSelectorEjercicioCompletar(false);
    setParametrosEjercicioCompletar({ peso: '', repeticiones: '', tiempo: '', carga: '', notas: '' });
  };

  const handleCrearEjercicioRapido = async () => {
    if (!nuevoEjercicioNombre.trim()) return;
    setCreandoEjercicio(true);
    try {
      const response = await fetch('/api/ejercicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoEjercicioNombre.trim(),
          categoria: nuevoEjercicioCategoria.trim() || null
        })
      });
      const data = await response.json();
      if (data.success) {
        // Agregar a la biblioteca local
        setBibliotecaEjercicios(prev => [...prev, data.ejercicio].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        // Seleccionar automáticamente el ejercicio recién creado
        setEjercicioSeleccionadoCompletar(data.ejercicio);
        setBusquedaEjercicioCompletar(data.ejercicio.nombre);
        // Resetear modo crear
        setModoCrearEjercicioCompletar(false);
        setNuevoEjercicioNombre('');
        setNuevoEjercicioCategoria('');
        mostrarMensaje(`Ejercicio "${data.ejercicio.nombre}" creado y seleccionado`);
      } else {
        mostrarMensaje(data.error || 'Error al crear ejercicio', true);
      }
    } catch (error) {
      mostrarMensaje('Error al crear ejercicio', true);
    } finally {
      setCreandoEjercicio(false);
    }
  };

  const eliminarEjercicioCompletar = (index: number) => {
    setCompletarForm(prev => ({
      ...prev,
      ejerciciosRealizados: prev.ejerciciosRealizados.filter((_, i) => i !== index)
    }));
  };

  // Obtener color del slider de dolor (EVA)
  const getDolorColor = (valor: number) => {
    if (valor <= 2) return '#10b981';
    if (valor <= 4) return '#84cc16';
    if (valor <= 6) return '#f59e0b';
    if (valor <= 8) return '#f97316';
    return '#ef4444';
  };

  // Obtener color de la escala de Borg (0-10)
  const getBorgColor = (valor: number) => {
    if (valor === 0) return '#3b82f6'; // Reposo - azul
    if (valor <= 2) return '#10b981'; // Muy ligero - verde
    if (valor <= 3) return '#84cc16'; // Ligero - verde lima
    if (valor <= 5) return '#f59e0b'; // Algo pesado - naranja
    if (valor <= 7) return '#f97316'; // Pesado - naranja oscuro
    if (valor <= 9) return '#ef4444'; // Muy pesado - rojo
    return '#dc2626'; // Extremo - rojo oscuro
  };

  // Obtener información de la Escala de Daniels (0-5)
  const getDanielsInfo = (valor: string | number) => {
    const num = typeof valor === 'string' ? parseInt(valor) : valor;
    switch (num) {
      case 0: return { label: '0', desc: 'Sin contracción', color: '#ef4444' };
      case 1: return { label: '1', desc: 'Contracción visible', color: '#f97316' };
      case 2: return { label: '2', desc: 'Movimiento sin gravedad', color: '#f59e0b' };
      case 3: return { label: '3', desc: 'Contra gravedad', color: '#84cc16' };
      case 4: return { label: '4', desc: 'Resistencia moderada', color: '#10b981' };
      case 5: return { label: '5', desc: 'Fuerza normal', color: '#3b82f6' };
      default: return { label: valor?.toString() || '-', desc: 'No evaluado', color: '#666' };
    }
  };

  const calcularPromedioMetrica = (metrica: string) => {
    const valores = sesionesProgreso
      .map(s => s[metrica])
      .filter(v => {
        if (v === null || v === undefined || v === '') return false;
        if (typeof v === 'number') return !isNaN(v);
        if (typeof v === 'string' && v.trim() !== '') return true;
        return false;
      });
    
    if (valores.length === 0) return 'N/A';
    
    // Si el primer valor es numérico, calcular promedio
    if (typeof valores[0] === 'number' || !isNaN(Number(valores[0]))) {
      const numericos = valores.map(v => Number(v)).filter(n => !isNaN(n));
      if (numericos.length === 0) return 'N/A';
      const promedio = numericos.reduce((a, b) => a + b, 0) / numericos.length;
      return promedio.toFixed(1);
    }
    
    // Para valores no numéricos (movilidad, fuerza), retornar el último valor
    return valores[valores.length - 1];
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    setEditandoSesion(null);
    setBusquedaEjercicio('');
    setEjercicioSeleccionado(null);
    setMostrarSelectorEjercicio(false);
    setFormData({
      pacienteId: '',
      fecha: '',
      hora: '',
      duracion: 60,
      tipo: 'Kinesioterapia',
      estado: 'programada',
      notasSesion: '',
      ejerciciosRealizados: [],
      observaciones: '',
      dolorInicial: 0,
      dolorFinal: 0,
      movilidad: '',
      fuerza: '',
      progresoGeneral: '',
      recomendaciones: '',
      proximaSesion: ''
    });
    setNuevoEjercicio('');
  };

  const crearYAgregarEjercicio = async () => {
    if (!nombreNuevoEjercicio.trim()) return;
    
    try {
      // Guardar el ejercicio en la biblioteca
      const response = await fetch('/api/ejercicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreNuevoEjercicio.trim(),
          categoria: 'Personalizado'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Agregar a la lista local de biblioteca
        setBibliotecaEjercicios([...bibliotecaEjercicios, data.ejercicio]);
        
        // Agregar el ejercicio a la sesión con sus parámetros
        const nuevoEjercicioObj = {
          ejercicioId: data.ejercicio.id,
          nombre: data.ejercicio.nombre,
          peso: parametrosEjercicio.peso,
          repeticiones: parametrosEjercicio.repeticiones,
          tiempo: parametrosEjercicio.tiempo,
          carga: parametrosEjercicio.carga,
          notas: parametrosEjercicio.notas
        };

        setFormData({
          ...formData,
          ejerciciosRealizados: [...formData.ejerciciosRealizados, nuevoEjercicioObj]
        });

        // Limpiar y cerrar
        setNombreNuevoEjercicio('');
        setModoCrearEjercicio(false);
        setMostrarSelectorEjercicio(false);
        setParametrosEjercicio({
          peso: '',
          repeticiones: '',
          tiempo: '',
          carga: '',
          notas: ''
        });
        
        mostrarMensaje('Ejercicio creado y agregado a la biblioteca');
      } else {
        mostrarMensaje(data.error || 'Error al crear ejercicio', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al crear ejercicio', true);
    }
  };

  const agregarEjercicioDesdeSelector = () => {
    if (!ejercicioSeleccionado) return;
    
    const nuevoEjercicioObj = {
      ejercicioId: ejercicioSeleccionado.id,
      nombre: ejercicioSeleccionado.nombre,
      peso: parametrosEjercicio.peso,
      repeticiones: parametrosEjercicio.repeticiones,
      tiempo: parametrosEjercicio.tiempo,
      carga: parametrosEjercicio.carga,
      notas: parametrosEjercicio.notas
    };

    setFormData({
      ...formData,
      ejerciciosRealizados: [...formData.ejerciciosRealizados, nuevoEjercicioObj]
    });

    // Limpiar selector
    setEjercicioSeleccionado(null);
    setBusquedaEjercicio('');
    setMostrarSelectorEjercicio(false);
    setParametrosEjercicio({
      peso: '',
      repeticiones: '',
      tiempo: '',
      carga: '',
      notas: ''
    });
  };

  const eliminarEjercicio = (index: number) => {
    setFormData({
      ...formData,
      ejerciciosRealizados: formData.ejerciciosRealizados.filter((_, i) => i !== index)
    });
  };

  const eliminarEjercicioDeBiblioteca = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio de la biblioteca? Esta acción no se puede deshacer.')) return;
    
    try {
      const response = await fetch(`/api/ejercicios/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Actualizar lista local
        setBibliotecaEjercicios(bibliotecaEjercicios.filter(ej => ej.id !== id));
        mostrarMensaje('Ejercicio eliminado de la biblioteca');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar ejercicio', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar ejercicio', true);
    }
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10b981';
      case 'programada': return '#3b82f6';
      case 'confirmada': return '#2AD636';
      case 'cancelada': return '#ef4444';
      default: return '#a0a0a0';
    }
  };

  // Agrupar sesiones por paciente con métricas (memoizado)
  const sesionesPorPaciente = useMemo(() => {
    const grupos: { [key: string]: any } = {};
    
    sesiones.forEach(sesion => {
      const pacienteId = sesion.pacienteId || sesion.paciente_id;
      if (!grupos[pacienteId]) {
        grupos[pacienteId] = {
          pacienteId,
          pacienteNombre: sesion.paciente,
          sesionesProgramadas: sesion.sesionesProgramadas || null,
          evaluacionFinal: sesion.evaluacionFinal || null,
          sesiones: []
        };
      }
      grupos[pacienteId].sesiones.push(sesion);
    });

    // Calcular métricas por paciente
    return Object.values(grupos).map((grupo: any) => {
      const completadas = grupo.sesiones.filter((s: any) => s.estado === 'completada');
      const pendientes = grupo.sesiones.filter((s: any) => s.estado === 'programada' || s.estado === 'confirmada');
      const ultimaCompletada = completadas[0]; // Ya viene DESC
      const proximaPendiente = pendientes.length > 0 ? pendientes[pendientes.length - 1] : null;
      
      // Tendencia dolor (comparar últimas 2 sesiones completadas)
      let tendenciaDolor = '';
      if (completadas.length >= 2) {
        const dolorActual = completadas[0]?.dolorFinal;
        const dolorAnterior = completadas[1]?.dolorFinal;
        if (dolorActual !== null && dolorAnterior !== null && dolorActual !== undefined && dolorAnterior !== undefined) {
          if (dolorActual < dolorAnterior) tendenciaDolor = 'baja';
          else if (dolorActual > dolorAnterior) tendenciaDolor = 'sube';
          else tendenciaDolor = 'igual';
        }
      }

      return {
        ...grupo,
        completadas: completadas.length,
        totalSesiones: grupo.sesiones.length,
        ultimaCompletada,
        proximaPendiente,
        tendenciaDolor,
        ultimoDolorInicial: ultimaCompletada?.dolorInicial ?? null,
        ultimoDolorFinal: ultimaCompletada?.dolorFinal ?? null,
        ultimaMovilidad: ultimaCompletada?.movilidad || null,
        ultimaFuerza: ultimaCompletada?.fuerza || null,
        ultimoProgreso: ultimaCompletada?.progresoGeneral || null
      };
    }).sort((a, b) => {
      // Primero los que tienen sesión pendiente, luego alfabético
      if (a.proximaPendiente && !b.proximaPendiente) return -1;
      if (!a.proximaPendiente && b.proximaPendiente) return 1;
      return a.pacienteNombre.localeCompare(b.pacienteNombre);
    });
  }, [sesiones]);

  // Filtrar por búsqueda de nombre
  const sesionesFiltradas = useMemo(() => {
    if (!busquedaPaciente.trim()) return sesionesPorPaciente;
    const termino = busquedaPaciente.toLowerCase().trim();
    return sesionesPorPaciente.filter((g: any) => 
      g.pacienteNombre.toLowerCase().includes(termino)
    );
  }, [sesionesPorPaciente, busquedaPaciente]);

  const pagSesiones = usePaginacion(sesionesFiltradas, `${busquedaPaciente}|${filtros.estado}`);

  return (
    <div className="module-container sesiones-module">
      <div className="module-header pac-header">
        <h2>Sesiones</h2>
        <button className="btn-primary pac-nuevo-desktop" onClick={() => setShowModal(true)}>
          + Nueva Sesión
        </button>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div className={`toast ${mensaje.tipo === 'error' ? 'toast--error' : 'toast--ok'}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
          {mensaje.texto}
        </div>
      )}

      <div className="module-content">
        {/* Buscador + Filtros */}
        <div className="pac-toolbar ses-toolbar">
          <div className="pac-buscador">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              value={busquedaPaciente}
              onChange={(e) => setBusquedaPaciente(e.target.value)}
              placeholder="Buscar paciente"
              aria-label="Buscar paciente"
              autoComplete="off"
            />
            {busquedaPaciente && (
              <button type="button" className="pac-buscador__limpiar" onClick={() => setBusquedaPaciente('')} aria-label="Limpiar búsqueda">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className="pac-filtros" role="tablist" aria-label="Filtrar por estado de sesión" data-no-swipe>
            {[
              { id: '', etiqueta: 'Todas' },
              { id: 'programada', etiqueta: 'Programadas' },
              { id: 'confirmada', etiqueta: 'Confirmadas' },
              { id: 'completada', etiqueta: 'Completadas' },
              { id: 'cancelada', etiqueta: 'Canceladas' },
            ].map(f => (
              <button
                key={f.id || 'todas'}
                type="button"
                role="tab"
                aria-selected={filtros.estado === f.id}
                className={`pac-filtro ses-filtro--${f.id || 'todas'} ${filtros.estado === f.id ? 'activo' : ''}`}
                onClick={() => setFiltros({ ...filtros, estado: f.id })}
              >
                <span className="pac-filtro__punto" aria-hidden="true" />
                {f.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && sesiones.length === 0 && (
          <p className="empty-state">No hay sesiones registradas</p>
        )}

        {/* Sin resultados de búsqueda */}
        {!loading && sesiones.length > 0 && sesionesFiltradas.length === 0 && (
          <p className="empty-state" style={{ color: '#888' }}>
            No se encontraron pacientes con &quot;{busquedaPaciente}&quot;
          </p>
        )}

        {/* Tarjetas por paciente */}
        {!loading && sesionesFiltradas.length > 0 && (
          <div className="ses-lista">
            {pagSesiones.visibles.map((grupo: any) => {
              const isExpanded = pacienteExpandido === String(grupo.pacienteId);
              const progresoPct = grupo.sesionesProgramadas 
                ? Math.round((grupo.completadas / grupo.sesionesProgramadas) * 100) 
                : null;
              const tienePendiente = !!grupo.proximaPendiente;

              return (
                <div key={grupo.pacienteId} className={`ses-card ${isExpanded ? 'is-expandida' : ''}`}>
                  {/* Tarjeta colapsada — Header */}
                  <div
                    className="ses-card__cabecera"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setPacienteExpandido(isExpanded ? null : String(grupo.pacienteId))}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setPacienteExpandido(isExpanded ? null : String(grupo.pacienteId));
                      }
                    }}
                  >
                    {/* Fila superior: Nombre + Flecha */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem', color: tienePendiente ? '#2AD636' : '#10b981', flexShrink: 0 }}>
                          {tienePendiente ? '●' : '✓'}
                        </span>
                        <h3 style={{ 
                          margin: 0, 
                          color: '#fff', 
                          fontSize: 'clamp(1rem, 4vw, 1.15rem)', 
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {grupo.pacienteNombre}
                        </h3>
                        {(() => {
                          const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                          const estadoPaciente = paciente?.estado_paciente || 'activo';
                          if (estadoPaciente === 'alta') {
                            return (
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#10b981',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                flexShrink: 0,
                                whiteSpace: 'nowrap'
                              }}>
                                ✓ Alta
                              </span>
                            );
                          }
                          if (estadoPaciente === 'abandono') {
                            return (
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid #ef4444',
                                borderRadius: '12px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#ef4444',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                flexShrink: 0,
                                whiteSpace: 'nowrap'
                              }}>
                                Receso
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span style={{ 
                        color: '#666', 
                        fontSize: '1.25rem', 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        flexShrink: 0
                      }}>▼</span>
                    </div>

                    {/* Última sesión (solo en móvil si existe) */}
                    {grupo.ultimaCompletada && (
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '-0.5rem' }}>
                        Última: {formatearFechaLocal(grupo.ultimaCompletada.fecha)}
                      </div>
                    )}

                    {/* Barra de progreso */}
                    {progresoPct !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <div style={{
                          flex: 1,
                          height: '6px',
                          background: '#333',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(progresoPct, 100)}%`,
                            height: '100%',
                            background: progresoPct >= 100 ? '#10b981' : '#2AD636',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {grupo.completadas}/{grupo.sesionesProgramadas}
                        </span>
                      </div>
                    )}

                    {/* Métricas en fila con wrap */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      {/* Dolor con tendencia */}
                      {grupo.ultimoDolorInicial !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ccc' }}>
                          <span style={{ color: '#888' }}>Dolor:</span>
                          <span style={{ color: getDolorColor(grupo.ultimoDolorInicial) }}>{grupo.ultimoDolorInicial}</span>
                          <span style={{ color: '#666' }}>→</span>
                          <span style={{ color: getDolorColor(grupo.ultimoDolorFinal ?? 0) }}>{grupo.ultimoDolorFinal ?? '-'}</span>
                          {grupo.tendenciaDolor === 'baja' && <span style={{ color: '#10b981' }}>↓</span>}
                          {grupo.tendenciaDolor === 'sube' && <span style={{ color: '#ef4444' }}>↑</span>}
                          {grupo.tendenciaDolor === 'igual' && <span style={{ color: '#888' }}>↔</span>}
                        </div>
                      )}

                      {/* Movilidad */}
                      {grupo.ultimaMovilidad && (
                        <div>
                          <span style={{ color: '#888' }}>Mov:</span>{' '}
                          <span style={{ color: '#3b82f6', textTransform: 'capitalize' }}>{grupo.ultimaMovilidad}</span>
                        </div>
                      )}

                      {/* Fuerza (Daniels) */}
                      {grupo.ultimaFuerza && (
                        <div>
                          <span style={{ color: '#888' }}>Fza:</span>{' '}
                          <span style={{ color: getDanielsInfo(grupo.ultimaFuerza).color, fontWeight: 600 }}>
                            {getDanielsInfo(grupo.ultimaFuerza).label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                          if (paciente) {
                            setPacienteFicha(paciente);
                            setShowFichaModal(true);
                          }
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #333',
                          background: 'transparent',
                          color: '#888',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          whiteSpace: 'nowrap'
                        }}
                        title="Ver ficha del paciente"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        Ficha
                      </button>
                      {(() => {
                        const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                        const estadoPaciente = paciente?.estado_paciente || 'activo';
                        
                        // Si tiene pendiente, mostrar botón completar
                        if (tienePendiente) {
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAbrirCompletar(grupo.proximaPendiente); }}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#10b981',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                              Completar
                            </button>
                          );
                        }
                        
                        // Si está de alta o abandono, mostrar botón de reactivar
                        if (estadoPaciente === 'alta' || estadoPaciente === 'abandono') {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (paciente) handleAbrirModalEstadoPaciente(paciente, 'activo');
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid #3b82f6',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                                <path d="M1 4v6h6M23 20v-6h-6"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                              </svg>
                              Reactivar
                            </button>
                          );
                        }
                        
                        // Si está activo y puede agendar más sesiones
                        if (!grupo.sesionesProgramadas || grupo.completadas < grupo.sesionesProgramadas) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSiguienteSesionInfo({
                                  pacienteId: grupo.pacienteId,
                                  pacienteNombre: grupo.pacienteNombre,
                                  siguienteNum: grupo.completadas + 1,
                                  totalProgramadas: grupo.sesionesProgramadas
                                });
                                setSiguienteSesionData({ fecha: fechaAString(new Date()), hora: '' });
                                setShowMiniSiguiente(true);
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid #2AD636',
                                background: 'transparent',
                                color: '#2AD636',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              Sesión #{grupo.completadas + 1}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Tarjeta expandida — Timeline + detalle */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #2a2a2a' }}>
                      {/* Acciones del paciente */}
                      <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        background: '#0f0f0f', 
                        display: 'flex', 
                        gap: '0.5rem', 
                        flexWrap: 'wrap',
                        borderBottom: '1px solid #2a2a2a',
                        overflow: 'hidden'
                      }}>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                            if (paciente) handleAbrirModalProgreso(paciente, grupo.sesiones);
                          }}
                          style={{ 
                            fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)', 
                            padding: '0.4rem 0.6rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                            flex: '0 1 auto'
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '12px', height: '12px', flexShrink: 0 }}>
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                          </svg>
                          Progreso
                        </button>
                        {grupo.sesionesProgramadas && grupo.completadas >= grupo.sesionesProgramadas && (
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                              if (paciente) handleAbrirModalEvaluacion(paciente);
                            }}
                            style={{ 
                              fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)', 
                              padding: '0.4rem 0.6rem',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              flex: '0 1 auto'
                            }}
                          >
                            {grupo.evaluacionFinal ? 'Editar' : 'Agregar'} Evaluación
                          </button>
                        )}
                        
                        {/* Botones de cambio de estado */}
                        {(() => {
                          const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                          const estadoPaciente = paciente?.estado_paciente || 'activo';
                          
                          if (estadoPaciente !== 'alta') {
                            return (
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  if (paciente) handleAbrirModalEstadoPaciente(paciente, 'alta');
                                }}
                                style={{ 
                                  fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)', 
                                  padding: '0.4rem 0.6rem',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                  flex: '0 1 auto'
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '14px', height: '14px', marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }}>
                                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Alta
                              </button>
                            );
                          }
                          
                          if (estadoPaciente !== 'abandono') {
                            return (
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  if (paciente) handleAbrirModalEstadoPaciente(paciente, 'abandono');
                                }}
                                style={{ 
                                  fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)', 
                                  padding: '0.4rem 0.6rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid #ef4444',
                                  color: '#ef4444',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                  flex: '0 1 auto'
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '14px', height: '14px', marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }}>
                                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Receso
                              </button>
                            );
                          }
                          
                          if (estadoPaciente === 'alta' || estadoPaciente === 'abandono') {
                            return (
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  if (paciente) handleAbrirModalEstadoPaciente(paciente, 'activo');
                                }}
                                style={{ 
                                  fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)', 
                                  padding: '0.4rem 0.6rem',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid #3b82f6',
                                  color: '#3b82f6',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                  flex: '0 1 auto'
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '14px', height: '14px', marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }}>
                                  <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Reactivar
                              </button>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>

                      {/* Mini-gráfico dolor (barras simples) */}
                      {grupo.sesiones.some((s: any) => s.estado === 'completada' && s.dolorInicial !== null) && (
                        <div style={{ padding: '0.75rem', borderBottom: '1px solid #2a2a2a' }}>
                          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>Evolución del dolor</div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '50px' }}>
                            {[...grupo.sesiones]
                              .filter((s: any) => s.estado === 'completada' && s.dolorFinal !== null)
                              .reverse()
                              .map((s: any, idx: number) => (
                                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '30px' }}>
                                  <div
                                    title={`#${s.numeroSesion || idx + 1}: ${s.dolorInicial}→${s.dolorFinal}`}
                                    style={{
                                      width: '100%',
                                      height: `${Math.max((s.dolorFinal / 10) * 50, 3)}px`,
                                      background: getDolorColor(s.dolorFinal),
                                      borderRadius: '2px 2px 0 0',
                                      opacity: 0.8
                                    }}
                                  />
                                </div>
                              ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#555', marginTop: '0.25rem' }}>
                            <span>Inicio</span><span>Última</span>
                          </div>
                        </div>
                      )}

                      {/* Timeline de sesiones */}
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {grupo.sesiones.map((sesion: any, idx: number) => {
                            const isPendiente = sesion.estado === 'programada' || sesion.estado === 'confirmada';
                            const isProxima = grupo.proximaPendiente?.id === sesion.id;

                            return (
                              <div key={sesion.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '0.75rem',
                                background: isProxima ? 'rgba(42, 214, 54, 0.05)' : '#0a0a0a',
                                border: isProxima ? '1px solid rgba(42, 214, 54, 0.3)' : '1px solid #1a1a1a',
                                borderRadius: '8px',
                                transition: 'all 0.2s'
                              }}>
                                {/* Fila superior: Número + Info */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  {/* Número de sesión */}
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    minWidth: '32px',
                                    borderRadius: '50%',
                                    background: sesion.estado === 'completada' ? '#10b981' 
                                      : sesion.estado === 'cancelada' ? '#ef4444' 
                                      : isProxima ? '#2AD636' : '#333',
                                    color: sesion.estado === 'completada' || isProxima ? '#0a0a0a' : '#888',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8rem'
                                  }}>
                                    {sesion.numeroSesion || idx + 1}
                                  </div>

                                  {/* Info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                      <span style={{ color: '#fff', fontWeight: 500, fontSize: 'clamp(0.8rem, 3vw, 0.9rem)' }}>
                                        {formatearFechaLocal(sesion.fecha)} • {sesion.hora}
                                      </span>
                                      <span style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)', color: '#888' }}>{sesion.tipo} • {sesion.duracion}min</span>
                                      <span className="badge" style={{ 
                                        backgroundColor: obtenerColorEstado(sesion.estado), 
                                        fontSize: 'clamp(0.65rem, 2vw, 0.7rem)', 
                                        padding: '0.15rem 0.4rem' 
                                      }}>
                                        {sesion.estado}
                                      </span>
                                    </div>
                                    {/* Métricas inline para completadas */}
                                    {sesion.estado === 'completada' && (
                                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)', color: '#888', flexWrap: 'wrap' }}>
                                        {sesion.dolorInicial !== null && sesion.dolorInicial !== undefined && (
                                          <span>EVA: <span style={{ color: getDolorColor(sesion.dolorInicial) }}>{sesion.dolorInicial}</span>→<span style={{ color: getDolorColor(sesion.dolorFinal ?? 0) }}>{sesion.dolorFinal ?? '-'}</span></span>
                                        )}
                                        {sesion.borgPercepcion !== null && sesion.borgPercepcion !== undefined && (
                                          <span>Borg: <span style={{ color: getBorgColor(sesion.borgPercepcion) }}>{sesion.borgPercepcion}/10</span></span>
                                        )}
                                        {sesion.movilidad && <span>Mov: <span style={{ color: '#3b82f6', textTransform: 'capitalize' }}>{sesion.movilidad}</span></span>}
                                        {sesion.progresoGeneral && <span style={{ color: '#2AD636', textTransform: 'capitalize' }}>{sesion.progresoGeneral.replace(/_/g, ' ')}</span>}
                                        {sesion.ejerciciosRealizados?.length > 0 && <span>{sesion.ejerciciosRealizados.length} ejercicios</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Acciones */}
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  {isPendiente && (
                                    <button
                                      onClick={() => handleAbrirCompletar(sesion)}
                                      className="btn-icon"
                                      title="Completar"
                                      style={{ color: '#10b981' }}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                                        <path d="M20 6L9 17l-5-5"/>
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditarSesion(sesion)}
                                    className="btn-icon"
                                    title="Editar"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleEliminarSesion(sesion.id)}
                                    className="btn-icon btn-danger"
                                    title="Eliminar"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                      <path d="M3 6h18"/>
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!loading && (
          <Paginacion
            pagina={pagSesiones.pagina}
            totalPaginas={pagSesiones.totalPaginas}
            total={pagSesiones.total}
            porPagina={pagSesiones.porPagina}
            onCambiar={(p) => { setPacienteExpandido(null); pagSesiones.setPagina(p); }}
            etiqueta="pacientes"
          />
        )}
      </div>

      {/* Botón flotante para crear sesión (solo móvil) */}
      <button type="button" className="fab" onClick={() => setShowModal(true)} aria-label="Nueva sesión">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoSesion ? 'Editar Sesión' : 'Nueva Sesión'}</h3>
              <button className="modal-close" onClick={handleCerrarModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="ficha-form">
              {/* Información básica */}
              <div className="form-section">
                <h4>Información Básica</h4>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Paciente *</label>
                    <select
                      value={formData.pacienteId}
                      onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar paciente</option>
                      {pacientes.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Hora *</label>
                    <input
                      type="time"
                      value={formData.hora}
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Duración (min)</label>
                    <input
                      type="number"
                      value={formData.duracion}
                      onChange={(e) => setFormData({ ...formData, duracion: parseInt(e.target.value) || 60 })}
                      min="15"
                      step="15"
                    />
                  </div>

                  <div className="form-field">
                    <label>Tipo *</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      required
                    >
                      <option value="Kinesioterapia">Kinesioterapia</option>
                      <option value="Control">Control</option>
                      <option value="Rehabilitación">Rehabilitación</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="programada">Programada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Evaluación — Dolor con sliders */}
              <div className="form-section">
                <h4>Evaluación</h4>
                
                {/* Dolor - Sliders visuales */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: '#aaa', display: 'block', marginBottom: '0.75rem' }}>Dolor (EVA 0-10)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                        Inicial: <strong style={{ color: getDolorColor(formData.dolorInicial), fontSize: '1.25rem' }}>{formData.dolorInicial}</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.dolorInicial}
                        onChange={(e) => setFormData({ ...formData, dolorInicial: parseInt(e.target.value) })}
                        style={{ width: '100%', height: '8px', borderRadius: '4px', outline: 'none', cursor: 'pointer', accentColor: getDolorColor(formData.dolorInicial) }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                        <span>Sin dolor</span><span>Máximo</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                        Final: <strong style={{ color: getDolorColor(formData.dolorFinal), fontSize: '1.25rem' }}>{formData.dolorFinal}</strong>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.dolorFinal}
                        onChange={(e) => setFormData({ ...formData, dolorFinal: parseInt(e.target.value) })}
                        style={{ width: '100%', height: '8px', borderRadius: '4px', outline: 'none', cursor: 'pointer', accentColor: getDolorColor(formData.dolorFinal) }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                        <span>Sin dolor</span><span>Máximo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progreso General - Chips */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: '#aaa', display: 'block', marginBottom: '0.75rem' }}>Progreso General</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      { value: 'sin_cambios', label: 'Sin cambios', icon: '↔' },
                      { value: 'leve_mejoria', label: 'Leve mejoría', icon: '↗' },
                      { value: 'mejoria_moderada', label: 'Moderada', icon: '⬆' },
                      { value: 'mejoria_significativa', label: 'Significativa', icon: '⬆⬆' },
                      { value: 'recuperacion_completa', label: 'Completa', icon: '✅' }
                    ].map(opcion => (
                      <button
                        key={opcion.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, progresoGeneral: opcion.value })}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: formData.progresoGeneral === opcion.value ? '2px solid #2AD636' : '1px solid #333',
                          background: formData.progresoGeneral === opcion.value ? 'rgba(42, 214, 54, 0.15)' : '#1a1a1a',
                          color: formData.progresoGeneral === opcion.value ? '#2AD636' : '#ccc',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: formData.progresoGeneral === opcion.value ? 600 : 400,
                          transition: 'all 0.2s'
                        }}
                      >
                        {opcion.icon} {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Movilidad + Fuerza - en línea */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Movilidad</label>
                    <select
                      value={formData.movilidad}
                      onChange={(e) => setFormData({ ...formData, movilidad: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    >
                      <option value="">Seleccionar</option>
                      <option value="limitada">Limitada</option>
                      <option value="reducida">Reducida</option>
                      <option value="normal">Normal</option>
                      <option value="buena">Buena</option>
                      <option value="excelente">Excelente</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Fuerza (Escala Daniels)</label>
                    <select
                      value={formData.fuerza}
                      onChange={(e) => setFormData({ ...formData, fuerza: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    >
                      <option value="">Seleccionar</option>
                      <option value="0">0 - Sin contracción</option>
                      <option value="1">1 - Contracción visible sin movimiento</option>
                      <option value="2">2 - Movimiento completo sin gravedad</option>
                      <option value="3">3 - Movimiento completo contra gravedad</option>
                      <option value="4">4 - Movimiento contra resistencia moderada</option>
                      <option value="5">5 - Fuerza normal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ejercicios */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0 }}>Ejercicios Realizados</h4>
                  <button 
                    type="button" 
                    onClick={() => setMostrarGestionBiblioteca(true)} 
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    Gestionar Biblioteca ({bibliotecaEjercicios.length})
                  </button>
                </div>
                
                {!mostrarSelectorEjercicio ? (
                  <button 
                    type="button" 
                    onClick={() => setMostrarSelectorEjercicio(true)} 
                    className="btn-secondary"
                    style={{ marginBottom: '1rem' }}
                  >
                    + Agregar Ejercicio
                  </button>
                ) : (
                  <div style={{ 
                    border: '1px solid #2AD636', 
                    borderRadius: '8px', 
                    padding: '1rem', 
                    marginBottom: '1rem',
                    background: '#1a1a1a'
                  }}>
                    {/* Toggle entre seleccionar y crear */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => setModoCrearEjercicio(false)}
                        className={!modoCrearEjercicio ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1 }}
                      >
                        Seleccionar de Biblioteca
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoCrearEjercicio(true)}
                        className={modoCrearEjercicio ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1 }}
                      >
                        Crear Nuevo
                      </button>
                    </div>

                    {!modoCrearEjercicio ? (
                      // Modo: Seleccionar de biblioteca
                      <>
                        <div className="form-field">
                          <label>Buscar Ejercicio</label>
                          <input
                            type="text"
                            placeholder="Escribe para buscar..."
                            value={busquedaEjercicio}
                            onChange={(e) => {
                              setBusquedaEjercicio(e.target.value);
                              setEjercicioSeleccionado(null);
                            }}
                            style={{
                              padding: '0.75rem',
                              fontSize: '0.95rem',
                              border: '1px solid #333',
                              borderRadius: '8px',
                              background: '#1a1a1a',
                              color: '#fff'
                            }}
                          />
                        </div>

                        {busquedaEjercicio && (
                          <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            background: '#1a1a1a',
                            marginTop: '0.5rem'
                          }}>
                            {bibliotecaEjercicios
                              .filter(ej => 
                                ej.nombre.toLowerCase().includes(busquedaEjercicio.toLowerCase()) ||
                                (ej.categoria && ej.categoria.toLowerCase().includes(busquedaEjercicio.toLowerCase()))
                              )
                              .map(ej => (
                                <div
                                  key={ej.id}
                                  onClick={() => {
                                    setEjercicioSeleccionado(ej);
                                    setBusquedaEjercicio(ej.nombre);
                                  }}
                                  style={{
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #333',
                                    background: ejercicioSeleccionado?.id === ej.id ? '#2a2a2a' : 'transparent',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = ejercicioSeleccionado?.id === ej.id ? '#2a2a2a' : 'transparent'}
                                >
                                  <div style={{ fontWeight: '500' }}>{ej.nombre}</div>
                                  {ej.categoria && (
                                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                                      {ej.categoria}
                                    </div>
                                  )}
                                </div>
                              ))}
                            {bibliotecaEjercicios.filter(ej => 
                              ej.nombre.toLowerCase().includes(busquedaEjercicio.toLowerCase()) ||
                              (ej.categoria && ej.categoria.toLowerCase().includes(busquedaEjercicio.toLowerCase()))
                            ).length === 0 && (
                              <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>
                                No se encontraron ejercicios
                              </div>
                            )}
                          </div>
                        )}

                        {ejercicioSeleccionado && (
                          <div className="form-grid" style={{ marginTop: '1rem' }}>
                            <div className="form-field">
                              <label>Peso (opcional)</label>
                              <input
                                type="text"
                                placeholder="ej: 20kg"
                                value={parametrosEjercicio.peso}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, peso: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Repeticiones (opcional)</label>
                              <input
                                type="text"
                                placeholder="ej: 3x12"
                                value={parametrosEjercicio.repeticiones}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, repeticiones: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Tiempo (opcional)</label>
                              <input
                                type="text"
                                placeholder="ej: 45seg"
                                value={parametrosEjercicio.tiempo}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, tiempo: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Carga (opcional)</label>
                              <select
                                value={parametrosEjercicio.carga}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, carga: e.target.value })}
                              >
                                <option value="">Sin especificar</option>
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>
                            <div className="form-field full-width">
                              <label>Notas (opcional)</label>
                              <input
                                type="text"
                                placeholder="Notas adicionales..."
                                value={parametrosEjercicio.notas}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, notas: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Modo: Crear nuevo ejercicio
                      <>
                        <div className="form-field">
                          <label>Nombre del Ejercicio *</label>
                          <input
                            type="text"
                            placeholder="Escribe el nombre del ejercicio..."
                            value={nombreNuevoEjercicio}
                            onChange={(e) => setNombreNuevoEjercicio(e.target.value)}
                            autoFocus
                          />
                          <small style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                            Este ejercicio se guardará en tu biblioteca para uso futuro
                          </small>
                        </div>

                        {nombreNuevoEjercicio.trim() && (
                          <div className="form-grid" style={{ marginTop: '1rem' }}>
                            <div className="form-field">
                              <label>Peso</label>
                              <input
                                type="text"
                                placeholder="ej: 20kg"
                                value={parametrosEjercicio.peso}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, peso: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Repeticiones</label>
                              <input
                                type="text"
                                placeholder="ej: 3x12"
                                value={parametrosEjercicio.repeticiones}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, repeticiones: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Tiempo</label>
                              <input
                                type="text"
                                placeholder="ej: 45seg"
                                value={parametrosEjercicio.tiempo}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, tiempo: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>Carga</label>
                              <select
                                value={parametrosEjercicio.carga}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, carga: e.target.value })}
                              >
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>
                            <div className="form-field full-width">
                              <label>Notas</label>
                              <input
                                type="text"
                                placeholder="Notas adicionales..."
                                value={parametrosEjercicio.notas}
                                onChange={(e) => setParametrosEjercicio({ ...parametrosEjercicio, notas: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button 
                        type="button" 
                        onClick={modoCrearEjercicio ? crearYAgregarEjercicio : agregarEjercicioDesdeSelector} 
                        className="btn-primary"
                        disabled={modoCrearEjercicio ? !nombreNuevoEjercicio.trim() : !ejercicioSeleccionado}
                      >
                        {modoCrearEjercicio ? 'Crear y Agregar' : 'Agregar'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setMostrarSelectorEjercicio(false);
                          setEjercicioSeleccionado(null);
                          setModoCrearEjercicio(false);
                          setNombreNuevoEjercicio('');
                          setParametrosEjercicio({
                            peso: '',
                            repeticiones: '',
                            tiempo: '',
                            carga: 'Media',
                            notas: ''
                          });
                        }} 
                        className="btn-cancel"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="ejercicios-lista">
                  {formData.ejerciciosRealizados.map((ejercicio, index) => (
                    <div key={index} style={{
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      background: '#0f0f0f'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', color: '#2AD636', marginBottom: '0.5rem' }}>
                            {ejercicio.nombre}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
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
                        <button
                          type="button"
                          onClick={() => eliminarEjercicio(index)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0 0.5rem'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones y Recomendaciones */}
              <div className="form-section">
                <h4>Observaciones y Recomendaciones</h4>
                <div className="form-field">
                  <label>Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={4}
                    placeholder="Observaciones de la sesión, hallazgos clínicos, estado del paciente..."
                  />
                </div>

                <div className="form-field">
                  <label>Recomendaciones</label>
                  <textarea
                    value={formData.recomendaciones}
                    onChange={(e) => setFormData({ ...formData, recomendaciones: e.target.value })}
                    rows={3}
                    placeholder="Recomendaciones para el paciente..."
                  />
                </div>

                <div className="form-field">
                  <label>Próxima Sesión</label>
                  <input
                    type="date"
                    value={formData.proximaSesion}
                    onChange={(e) => setFormData({ ...formData, proximaSesion: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCerrarModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editandoSesion ? 'Actualizar' : 'Crear'} Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión de Biblioteca de Ejercicios */}
      {mostrarGestionBiblioteca && (
        <div className="modal-overlay" onClick={() => setMostrarGestionBiblioteca(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Biblioteca de Ejercicios
              </h2>
              <button className="modal-close" onClick={() => setMostrarGestionBiblioteca(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#888', marginBottom: '1rem' }}>
                Total de ejercicios: <strong style={{ color: '#2AD636' }}>{bibliotecaEjercicios.length}</strong>
              </p>

              {bibliotecaEjercicios.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem', 
                  color: '#666',
                  border: '2px dashed #2a2a2a',
                  borderRadius: '8px'
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <p style={{ margin: 0 }}>No hay ejercicios en la biblioteca</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Crea ejercicios desde el formulario de sesiones
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gap: '0.75rem',
                  maxHeight: '60vh',
                  overflowY: 'auto'
                }}>
                  {bibliotecaEjercicios.map((ejercicio) => (
                    <div 
                      key={ejercicio.id}
                      style={{
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        padding: '1rem',
                        background: '#0f0f0f',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2AD636'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: '#fff', 
                          marginBottom: '0.25rem',
                          fontSize: '1rem'
                        }}>
                          {ejercicio.nombre}
                        </div>
                        {ejercicio.categoria && (
                          <div style={{ 
                            display: 'inline-block',
                            fontSize: '0.75rem', 
                            color: '#2AD636',
                            background: 'rgba(42, 214, 54, 0.1)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            marginTop: '0.25rem'
                          }}>
                            {ejercicio.categoria}
                          </div>
                        )}
                        {ejercicio.descripcion && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#888',
                            marginTop: '0.5rem'
                          }}>
                            {ejercicio.descripcion}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarEjercicioDeBiblioteca(ejercicio.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                          marginLeft: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ 
                marginTop: '1.5rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid #2a2a2a',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button 
                  onClick={() => setMostrarGestionBiblioteca(false)} 
                  className="btn-primary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Evaluación Final */}
      {showModalEvaluacion && (
        <div className="modal-overlay" onClick={() => setShowModalEvaluacion(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Evaluación Final del Tratamiento</h3>
              <button className="modal-close" onClick={() => setShowModalEvaluacion(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {pacienteEvaluacion && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #2AD636' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#2AD636' }}>
                    {pacienteEvaluacion.nombre}
                  </h4>
                  <p style={{ margin: 0, color: '#888', fontSize: '0.875rem' }}>
                    Completó todas las sesiones programadas del tratamiento
                  </p>
                </div>
              )}

              <div className="form-field full-width">
                <label style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'block', color: '#e0e0e0' }}>
                  Evaluación Final *
                </label>
                <textarea
                  value={evaluacionTexto}
                  onChange={(e) => setEvaluacionTexto(e.target.value)}
                  rows={12}
                  placeholder="Describe la evaluación final del tratamiento del paciente...&#10;&#10;Incluye:&#10;- Progreso general&#10;- Objetivos alcanzados&#10;- Estado final del paciente&#10;- Recomendaciones finales&#10;- Observaciones importantes"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  required
                />
                <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
                  Esta evaluación se mostrará en la ficha del paciente y en el PDF
                </small>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowModalEvaluacion(false)} 
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleGuardarEvaluacionFinal} 
                className="btn-primary"
                disabled={!evaluacionTexto.trim()}
              >
                Guardar Evaluación Final
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progreso del Paciente */}
      {showModalProgreso && pacienteProgreso && (
        <div className="modal-overlay" onClick={() => setShowModalProgreso(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px', color: '#2AD636' }}>
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Progreso del Tratamiento
              </h3>
              <button className="modal-close" onClick={() => setShowModalProgreso(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Información del Paciente */}
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, rgba(42, 214, 54, 0.1) 0%, rgba(42, 214, 54, 0.05) 100%)', 
                borderRadius: '12px', 
                border: '2px solid #2AD636' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, color: '#2AD636', fontSize: '1.5rem' }}>
                        {pacienteProgreso.nombre}
                      </h4>
                      {pacienteProgreso.estado_paciente === 'alta' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1.5px solid #10b981',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#10b981',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          ✓ Alta
                        </span>
                      )}
                      {pacienteProgreso.estado_paciente === 'abandono' && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1.5px solid #ef4444',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#ef4444',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Receso
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                      RUT: {pacienteProgreso.rut} • Teléfono: {pacienteProgreso.telefono}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2AD636' }}>
                      {sesionesProgreso.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {sesionesProgreso.length === 1 ? 'Sesión' : 'Sesiones'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas de Progreso */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2AD636" strokeWidth="2">
                    <path d="M3 3v18h18M7 16l4-4 4 4 6-6"/>
                  </svg>
                  Métricas Generales
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {/* Dolor Inicial Promedio */}
                  <div style={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Dolor Inicial Promedio</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
                      {calcularPromedioMetrica('dolorInicial')}
                    </div>
                  </div>

                  {/* Dolor Final Promedio */}
                  <div style={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Dolor Final Promedio</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                      {calcularPromedioMetrica('dolorFinal')}
                    </div>
                  </div>

                  {/* Movilidad Actual */}
                  <div style={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Movilidad Actual</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', textTransform: 'capitalize' }}>
                      {calcularPromedioMetrica('movilidad')}
                    </div>
                  </div>

                  {/* Fuerza Actual */}
                  <div style={{ 
                    background: '#1a1a1a', 
                    border: '1px solid #2a2a2a', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Fuerza Actual</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b', textTransform: 'capitalize' }}>
                      {calcularPromedioMetrica('fuerza')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Sesiones */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2AD636" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  Historial de Sesiones
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sesionesProgreso.map((sesion: any, index: number) => (
                    <div key={sesion.id} style={{
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      transition: 'all 0.2s ease'
                    }}>
                      {/* Header de la sesión */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid #2a2a2a'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#2AD636',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0a0a0a',
                            fontWeight: 700,
                            fontSize: '1.1rem'
                          }}>
                            {sesionesProgreso.length - index}
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                              {formatearFechaLocal(sesion.fecha)} • {sesion.hora}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#888' }}>
                              {sesion.tipo} • {sesion.duracion} min
                            </div>
                          </div>
                        </div>
                        <span 
                          className="badge"
                          style={{ 
                            backgroundColor: obtenerColorEstado(sesion.estado),
                            fontSize: '0.75rem',
                            padding: '0.375rem 0.75rem'
                          }}
                        >
                          {sesion.estado}
                        </span>
                      </div>

                      {/* Métricas de la sesión */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        {sesion.dolorInicial !== null && sesion.dolorInicial !== undefined && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Dolor Inicial</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ef4444' }}>{sesion.dolorInicial}/10</div>
                          </div>
                        )}
                        {sesion.dolorFinal !== null && sesion.dolorFinal !== undefined && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Dolor Final</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>{sesion.dolorFinal}/10</div>
                          </div>
                        )}
                        {sesion.movilidad && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Movilidad</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3b82f6', textTransform: 'capitalize' }}>{sesion.movilidad}</div>
                          </div>
                        )}
                        {sesion.fuerza && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Fuerza (Daniels)</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: getDanielsInfo(sesion.fuerza).color }}>
                              {getDanielsInfo(sesion.fuerza).label} - {getDanielsInfo(sesion.fuerza).desc}
                            </div>
                          </div>
                        )}
                        {sesion.progresoGeneral && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Progreso</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2AD636', textTransform: 'capitalize' }}>{sesion.progresoGeneral}</div>
                          </div>
                        )}
                      </div>

                      {/* Ejercicios realizados */}
                      {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Ejercicios:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {sesion.ejerciciosRealizados.map((ejercicio: any, idx: number) => {
                              // Formato antiguo (string) - mostrar como badge
                              if (typeof ejercicio === 'string') {
                                return (
                                  <span key={idx} style={{
                                    background: 'rgba(42, 214, 54, 0.1)',
                                    color: '#2AD636',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    border: '1px solid rgba(42, 214, 54, 0.3)',
                                    display: 'inline-block',
                                    width: 'fit-content'
                                  }}>
                                    {ejercicio}
                                  </span>
                                );
                              }
                              // Formato nuevo (objeto) - mostrar con detalles
                              return (
                                <div key={idx} style={{
                                  background: 'rgba(42, 214, 54, 0.05)',
                                  border: '1px solid rgba(42, 214, 54, 0.2)',
                                  borderRadius: '8px',
                                  padding: '0.5rem',
                                  fontSize: '0.8rem'
                                }}>
                                  <div style={{ fontWeight: 600, color: '#2AD636', marginBottom: '0.25rem' }}>
                                    {ejercicio.nombre}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#aaa' }}>
                                    {ejercicio.peso && <span>💪 {ejercicio.peso}</span>}
                                    {ejercicio.repeticiones && <span>🔄 {ejercicio.repeticiones}</span>}
                                    {ejercicio.tiempo && <span>⏱️ {ejercicio.tiempo}</span>}
                                    {ejercicio.carga && <span>📊 {ejercicio.carga}</span>}
                                  </div>
                                  {ejercicio.notas && (
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
                                      {ejercicio.notas}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Notas y observaciones */}
                      {(sesion.notasSesion || sesion.observaciones || sesion.recomendaciones) && (
                        <div style={{ 
                          background: '#0a0a0a', 
                          padding: '0.75rem', 
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: '#ccc',
                          lineHeight: '1.5'
                        }}>
                          {sesion.notasSesion && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong style={{ color: '#2AD636' }}>Notas:</strong> {sesion.notasSesion}
                            </div>
                          )}
                          {sesion.observaciones && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong style={{ color: '#3b82f6' }}>Observaciones:</strong> {sesion.observaciones}
                            </div>
                          )}
                          {sesion.recomendaciones && (
                            <div>
                              <strong style={{ color: '#f59e0b' }}>Recomendaciones:</strong> {sesion.recomendaciones}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowModalProgreso(false)} 
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Modal Completar Sesión */}
      {showModalCompletar && sesionCompletar && (
        <div className="modal-overlay" onClick={handleCerrarCompletar}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid #10b981' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Completar Sesión
                {sesionCompletar.numeroSesion && (
                  <span style={{ color: '#2AD636', fontSize: '0.9rem' }}>
                    #{sesionCompletar.numeroSesion}{sesionCompletar.sesionesProgramadas ? ` / ${sesionCompletar.sesionesProgramadas}` : ''}
                  </span>
                )}
              </h3>
              <button className="modal-close" onClick={handleCerrarCompletar}>×</button>
            </div>

            {/* Info de la sesión (solo lectura) */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              background: '#0a0a0a', 
              borderBottom: '1px solid #2a2a2a',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              fontSize: '0.9rem'
            }}>
              <div><strong style={{ color: '#888' }}>Paciente:</strong> <span style={{ color: '#fff' }}>{sesionCompletar.paciente}</span></div>
              <div><strong style={{ color: '#888' }}>Fecha:</strong> <span style={{ color: '#fff' }}>{formatearFechaLocal(sesionCompletar.fecha)}</span></div>
              <div><strong style={{ color: '#888' }}>Hora:</strong> <span style={{ color: '#fff' }}>{sesionCompletar.hora}</span></div>
              <div><strong style={{ color: '#888' }}>Tipo:</strong> <span style={{ color: '#fff' }}>{sesionCompletar.tipo}</span></div>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Dolor - Sliders visuales */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#e0e0e0', fontSize: '1rem' }}>Dolor (EVA 0-10)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Dolor Inicial */}
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                      Dolor Inicial: <strong style={{ color: getDolorColor(completarForm.dolorInicial), fontSize: '1.25rem' }}>{completarForm.dolorInicial}</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={completarForm.dolorInicial}
                      onChange={(e) => setCompletarForm(prev => ({ ...prev, dolorInicial: parseInt(e.target.value) }))}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        outline: 'none',
                        cursor: 'pointer',
                        accentColor: getDolorColor(completarForm.dolorInicial)
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                      <span>Sin dolor</span><span>Máximo</span>
                    </div>
                  </div>

                  {/* Dolor Final */}
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                      Dolor Final: <strong style={{ color: getDolorColor(completarForm.dolorFinal), fontSize: '1.25rem' }}>{completarForm.dolorFinal}</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={completarForm.dolorFinal}
                      onChange={(e) => setCompletarForm(prev => ({ ...prev, dolorFinal: parseInt(e.target.value) }))}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        outline: 'none',
                        cursor: 'pointer',
                        accentColor: getDolorColor(completarForm.dolorFinal)
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                      <span>Sin dolor</span><span>Máximo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escala de Borg (Percepción de Esfuerzo) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#e0e0e0', fontSize: '1rem' }}>Escala de Borg (Percepción de Esfuerzo 0-10)</h4>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                    Esfuerzo: <strong style={{ color: getBorgColor(completarForm.borgPercepcion), fontSize: '1.25rem' }}>{completarForm.borgPercepcion}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                      {completarForm.borgPercepcion === 0 && '(Reposo)'}
                      {completarForm.borgPercepcion >= 1 && completarForm.borgPercepcion <= 2 && '(Muy ligero)'}
                      {completarForm.borgPercepcion === 3 && '(Ligero)'}
                      {completarForm.borgPercepcion >= 4 && completarForm.borgPercepcion <= 5 && '(Algo pesado)'}
                      {completarForm.borgPercepcion >= 6 && completarForm.borgPercepcion <= 7 && '(Pesado)'}
                      {completarForm.borgPercepcion >= 8 && completarForm.borgPercepcion <= 9 && '(Muy pesado)'}
                      {completarForm.borgPercepcion === 10 && '(Extremo)'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={completarForm.borgPercepcion}
                    onChange={(e) => setCompletarForm(prev => ({ ...prev, borgPercepcion: parseInt(e.target.value) }))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      outline: 'none',
                      cursor: 'pointer',
                      accentColor: getBorgColor(completarForm.borgPercepcion)
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                    <span>Reposo</span><span>Extremo</span>
                  </div>
                </div>
              </div>

              {/* Progreso General - Chips/botones */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#e0e0e0', fontSize: '1rem' }}>Progreso General</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[
                    { value: 'sin_cambios', label: 'Sin cambios', icon: '↔' },
                    { value: 'leve_mejoria', label: 'Leve mejoría', icon: '↗' },
                    { value: 'mejoria_moderada', label: 'Moderada', icon: '⬆' },
                    { value: 'mejoria_significativa', label: 'Significativa', icon: '⬆⬆' },
                    { value: 'recuperacion_completa', label: 'Completa', icon: '✅' }
                  ].map(opcion => (
                    <button
                      key={opcion.value}
                      type="button"
                      onClick={() => setCompletarForm(prev => ({ ...prev, progresoGeneral: opcion.value }))}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: completarForm.progresoGeneral === opcion.value ? '2px solid #2AD636' : '1px solid #333',
                        background: completarForm.progresoGeneral === opcion.value ? 'rgba(42, 214, 54, 0.15)' : '#1a1a1a',
                        color: completarForm.progresoGeneral === opcion.value ? '#2AD636' : '#ccc',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: completarForm.progresoGeneral === opcion.value ? 600 : 400,
                        transition: 'all 0.2s'
                      }}
                    >
                      {opcion.icon} {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Movilidad + Fuerza - en línea */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Movilidad</label>
                  <select
                    value={completarForm.movilidad}
                    onChange={(e) => setCompletarForm(prev => ({ ...prev, movilidad: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="limitada">Limitada</option>
                    <option value="reducida">Reducida</option>
                    <option value="normal">Normal</option>
                    <option value="buena">Buena</option>
                    <option value="excelente">Excelente</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Fuerza (Escala Daniels)</label>
                  <select
                    value={completarForm.fuerza}
                    onChange={(e) => setCompletarForm(prev => ({ ...prev, fuerza: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="0">0 - Sin contracción</option>
                    <option value="1">1 - Contracción visible sin movimiento</option>
                    <option value="2">2 - Movimiento completo sin gravedad</option>
                    <option value="3">3 - Movimiento completo contra gravedad</option>
                    <option value="4">4 - Movimiento contra resistencia moderada</option>
                    <option value="5">5 - Fuerza normal</option>
                  </select>
                </div>
              </div>

              {/* Ejercicios */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: '#e0e0e0', fontSize: '1rem' }}>
                    Ejercicios ({completarForm.ejerciciosRealizados.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleCopiarEjerciciosUltimaSesion}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #3b82f6',
                        background: 'transparent',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copiar anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarSelectorEjercicioCompletar(!mostrarSelectorEjercicioCompletar)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #2AD636',
                        background: 'transparent',
                        color: '#2AD636',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Selector de ejercicio inline */}
                {mostrarSelectorEjercicioCompletar && (
                  <div style={{ border: '1px solid #2AD636', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', background: '#1a1a1a' }}>
                    {!modoCrearEjercicioCompletar ? (
                      <>
                        <input
                          type="text"
                          placeholder="Buscar ejercicio..."
                          value={busquedaEjercicioCompletar}
                          onChange={(e) => { setBusquedaEjercicioCompletar(e.target.value); setEjercicioSeleccionadoCompletar(null); }}
                          style={{ width: '100%', padding: '0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginBottom: '0.5rem' }}
                          autoFocus
                        />
                        {busquedaEjercicioCompletar && (
                          <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #333', borderRadius: '6px', marginBottom: '0.5rem' }}>
                            {(() => {
                              const resultados = bibliotecaEjercicios.filter(ej => ej.nombre.toLowerCase().includes(busquedaEjercicioCompletar.toLowerCase()));
                              return resultados.length > 0 ? (
                                resultados.map(ej => (
                                  <div
                                    key={ej.id}
                                    onClick={() => { setEjercicioSeleccionadoCompletar(ej); setBusquedaEjercicioCompletar(ej.nombre); }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #222',
                                      background: ejercicioSeleccionadoCompletar?.id === ej.id ? '#2a2a2a' : 'transparent',
                                      fontSize: '0.85rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = ejercicioSeleccionadoCompletar?.id === ej.id ? '#2a2a2a' : 'transparent'}
                                  >
                                    {ej.nombre}
                                    {ej.categoria && <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.75rem' }}>{ej.categoria}</span>}
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: '0.75rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
                                  No se encontró "{busquedaEjercicioCompletar}"
                                  <button
                                    type="button"
                                    onClick={() => { setModoCrearEjercicioCompletar(true); setNuevoEjercicioNombre(busquedaEjercicioCompletar); }}
                                    style={{
                                      display: 'block',
                                      margin: '0.5rem auto 0',
                                      padding: '0.4rem 0.8rem',
                                      borderRadius: '6px',
                                      border: '1px solid #f59e0b',
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      color: '#f59e0b',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    + Crear "{busquedaEjercicioCompletar}"
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {ejercicioSeleccionadoCompletar && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="text" placeholder="Peso" value={parametrosEjercicioCompletar.peso} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, peso: e.target.value}))} style={{ padding: '0.4rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                            <input type="text" placeholder="Repeticiones" value={parametrosEjercicioCompletar.repeticiones} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, repeticiones: e.target.value}))} style={{ padding: '0.4rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                            <input type="text" placeholder="Tiempo" value={parametrosEjercicioCompletar.tiempo} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, tiempo: e.target.value}))} style={{ padding: '0.4rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={agregarEjercicioCompletar} disabled={!ejercicioSeleccionadoCompletar} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Agregar</button>
                          <button
                            type="button"
                            onClick={() => { setModoCrearEjercicioCompletar(true); setNuevoEjercicioNombre(''); setNuevoEjercicioCategoria(''); }}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #f59e0b', background: 'transparent', color: '#f59e0b', cursor: 'pointer' }}
                          >
                            + Crear nuevo
                          </button>
                          <button type="button" onClick={() => { setMostrarSelectorEjercicioCompletar(false); setEjercicioSeleccionadoCompletar(null); setBusquedaEjercicioCompletar(''); }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Crear Nuevo Ejercicio
                        </h5>
                        <input
                          type="text"
                          placeholder="Nombre del ejercicio *"
                          value={nuevoEjercicioNombre}
                          onChange={(e) => setNuevoEjercicioNombre(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', background: '#0a0a0a', border: '1px solid #f59e0b', borderRadius: '6px', color: '#fff', marginBottom: '0.5rem', fontSize: '0.85rem' }}
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Categoría (opcional, ej: Tren superior, Core...)"
                          value={nuevoEjercicioCategoria}
                          onChange={(e) => setNuevoEjercicioCategoria(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginBottom: '0.75rem', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={handleCrearEjercicioRapido}
                            disabled={!nuevoEjercicioNombre.trim() || creandoEjercicio}
                            style={{
                              fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none',
                              background: nuevoEjercicioNombre.trim() ? '#f59e0b' : '#333',
                              color: nuevoEjercicioNombre.trim() ? '#000' : '#666',
                              cursor: nuevoEjercicioNombre.trim() ? 'pointer' : 'not-allowed',
                              fontWeight: 600
                            }}
                          >
                            {creandoEjercicio ? 'Creando...' : 'Crear y Seleccionar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setModoCrearEjercicioCompletar(false); setNuevoEjercicioNombre(''); setNuevoEjercicioCategoria(''); }}
                            className="btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            Volver
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Lista de ejercicios (editables) */}
                {completarForm.ejerciciosRealizados.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {completarForm.ejerciciosRealizados.map((ej, idx) => (
                      <div key={idx} style={{
                        padding: '0.5rem 0.75rem',
                        background: editandoEjercicioIdx === idx ? '#1a1a1a' : '#0a0a0a',
                        border: editandoEjercicioIdx === idx ? '1px solid #2AD636' : '1px solid #2a2a2a',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div
                            style={{ flex: 1, cursor: 'pointer' }}
                            onClick={() => setEditandoEjercicioIdx(editandoEjercicioIdx === idx ? null : idx)}
                          >
                            <span style={{ color: '#2AD636', fontWeight: 600 }}>{ej.nombre}</span>
                            {editandoEjercicioIdx !== idx && (
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#888' }}>
                                {ej.peso && <span>Peso: {ej.peso}</span>}
                                {ej.repeticiones && <span>Rep: {ej.repeticiones}</span>}
                                {ej.tiempo && <span>Tiempo: {ej.tiempo}</span>}
                                {ej.carga && <span>Carga: {ej.carga}</span>}
                                {!ej.peso && !ej.repeticiones && !ej.tiempo && !ej.carga && <span style={{ color: '#555' }}>Toca para editar cargas</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setEditandoEjercicioIdx(editandoEjercicioIdx === idx ? null : idx)}
                              style={{ background: 'none', border: 'none', color: editandoEjercicioIdx === idx ? '#2AD636' : '#666', cursor: 'pointer', padding: '0 0.25rem', display: 'flex', alignItems: 'center' }}
                              title="Editar"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => { eliminarEjercicioCompletar(idx); if (editandoEjercicioIdx === idx) setEditandoEjercicioIdx(null); }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}
                            >×</button>
                          </div>
                        </div>
                        {editandoEjercicioIdx === idx && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginTop: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="Peso (ej: 10kg)"
                              value={ej.peso || ''}
                              onChange={(e) => {
                                const updated = [...completarForm.ejerciciosRealizados];
                                updated[idx] = { ...updated[idx], peso: e.target.value };
                                setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                              }}
                              style={{ padding: '0.35rem 0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Repeticiones (ej: 3x12)"
                              value={ej.repeticiones || ''}
                              onChange={(e) => {
                                const updated = [...completarForm.ejerciciosRealizados];
                                updated[idx] = { ...updated[idx], repeticiones: e.target.value };
                                setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                              }}
                              style={{ padding: '0.35rem 0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Tiempo (ej: 30s)"
                              value={ej.tiempo || ''}
                              onChange={(e) => {
                                const updated = [...completarForm.ejerciciosRealizados];
                                updated[idx] = { ...updated[idx], tiempo: e.target.value };
                                setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                              }}
                              style={{ padding: '0.35rem 0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Carga (ej: banda roja)"
                              value={ej.carga || ''}
                              onChange={(e) => {
                                const updated = [...completarForm.ejerciciosRealizados];
                                updated[idx] = { ...updated[idx], carga: e.target.value };
                                setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                              }}
                              style={{ padding: '0.35rem 0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                            />
                            <input
                              type="text"
                              placeholder="Notas del ejercicio"
                              value={ej.notas || ''}
                              onChange={(e) => {
                                const updated = [...completarForm.ejerciciosRealizados];
                                updated[idx] = { ...updated[idx], notas: e.target.value };
                                setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                              }}
                              style={{ padding: '0.35rem 0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', gridColumn: 'span 2' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.85rem', border: '1px dashed #333', borderRadius: '8px' }}>
                    Sin ejercicios — usa "Copiar anterior" o "Agregar"
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Observaciones</label>
                <textarea
                  value={completarForm.observaciones}
                  onChange={(e) => setCompletarForm(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Hallazgos clínicos, estado del paciente..."
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Recomendaciones */}
              <div>
                <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Recomendaciones para el paciente</label>
                <textarea
                  value={completarForm.recomendaciones}
                  onChange={(e) => setCompletarForm(prev => ({ ...prev, recomendaciones: e.target.value }))}
                  rows={2}
                  placeholder="Ejercicios en casa, cuidados, indicaciones..."
                  style={{ width: '100%', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Acciones */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #2a2a2a', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleCerrarCompletar} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitCompletar}
                disabled={completarLoading}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: completarLoading ? 'not-allowed' : 'pointer',
                  opacity: completarLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {completarLoading ? 'Guardando...' : 'Completar Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Modal: Programar siguiente sesión */}
      {showMiniSiguiente && siguienteSesionInfo && (
        <div className="modal-overlay" onClick={() => { setShowMiniSiguiente(false); setSiguienteSesionInfo(null); mostrarMensaje('Sesión completada exitosamente'); }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#1a1a1a',
            border: '2px solid #10b981',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ color: '#fff', margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>
              Sesión completada
            </h3>
            <p style={{ color: '#10b981', fontWeight: 600, margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
              {siguienteSesionInfo.pacienteNombre}
            </p>
            {siguienteSesionInfo.totalProgramadas && (
              <p style={{ color: '#888', margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
                Progreso: {siguienteSesionInfo.siguienteNum ? siguienteSesionInfo.siguienteNum - 1 : '?'}/{siguienteSesionInfo.totalProgramadas} sesiones
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
                Programar Sesión {siguienteSesionInfo.siguienteNum ? `#${siguienteSesionInfo.siguienteNum}` : 'siguiente'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Fecha</label>
                  <input
                    type="date"
                    value={siguienteSesionData.fecha}
                    onChange={(e) => setSiguienteSesionData({ ...siguienteSesionData, fecha: e.target.value })}
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
                    value={siguienteSesionData.hora}
                    onChange={(e) => setSiguienteSesionData({ ...siguienteSesionData, hora: e.target.value })}
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
                onClick={() => { setShowMiniSiguiente(false); setSiguienteSesionInfo(null); mostrarMensaje('Sesión completada exitosamente'); }}
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
                onClick={handleCrearSiguienteSesion}
                disabled={!siguienteSesionData.hora || creandoSiguiente}
                style={{
                  flex: 2,
                  padding: '0.65rem',
                  background: !siguienteSesionData.hora ? '#333' : '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: !siguienteSesionData.hora ? '#666' : '#fff',
                  cursor: !siguienteSesionData.hora ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                {creandoSiguiente ? 'Creando...' : `Programar Sesión ${siguienteSesionInfo.siguienteNum ? '#' + siguienteSesionInfo.siguienteNum : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa del Paciente */}
      {showFichaModal && pacienteFicha && (
        <FichaCompletaModal
          paciente={pacienteFicha}
          onClose={() => {
            setShowFichaModal(false);
            setPacienteFicha(null);
          }}
          onPacienteUpdated={(pacienteActualizado) => {
            cargarPacientes();
            cargarSesiones();
          }}
          onNavigate={onNavigate}
        />
      )}

      {/* Modal Cambio de Estado Paciente */}
      {showModalEstadoPaciente && pacienteEstado && (
        <div className="modal-overlay" onClick={() => setShowModalEstadoPaciente(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {estadoSeleccionado === 'alta' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#10b981' }}>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Dar de Alta al Paciente
                  </>
                )}
                {estadoSeleccionado === 'abandono' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#ef4444' }}>
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Marcar como Receso
                  </>
                )}
                {estadoSeleccionado === 'activo' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
                      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reactivar Paciente
                  </>
                )}
              </h3>
              <button className="modal-close" onClick={() => setShowModalEstadoPaciente(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem' }}>
                <strong>{pacienteEstado.nombre}</strong>
              </p>
              <p style={{ marginBottom: '1.5rem', color: '#888', fontSize: '0.85rem' }}>
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
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowModalEstadoPaciente(false)}
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
                onClick={handleCambiarEstadoPaciente}
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
