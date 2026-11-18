'use client';

import { useState, useEffect, useMemo } from 'react';
import Paginacion, { usePaginacion } from './Paginacion';
import { formatearFechaLocal, fechaAString } from '../utils';
import FichaCompletaModal from './FichaCompletaModal';
import { useConfirm } from '@/components/ConfirmDialog';
import { TIPOS_SESION } from '@/lib/tiposSesion';


// Módulo Sesiones
export default function SesionesModule({ onNavigate, initialPacienteId }: { onNavigate?: (modulo: string, context?: { pacienteId?: number }) => void; initialPacienteId?: number }) {
  const confirmar = useConfirm();
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
    if (!(await confirmar('¿Estás seguro de eliminar esta sesión?', { peligro: true }))) return;
    
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
    if (!(await confirmar('¿Estás seguro de eliminar este ejercicio de la biblioteca? Esta acción no se puede deshacer.', { peligro: true }))) return;
    
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
              <button className="modal-close" aria-label="Cerrar" onClick={handleCerrarModal}>×</button>
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
                      {TIPOS_SESION.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
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
                <div className="ses-bloque">
                  <span className="ses-bloque__titulo">Dolor (EVA 0-10)</span>
                  <div className="ses-dolor-grid">
                    {([
                      { campo: 'dolorInicial', etiqueta: 'Inicial' },
                      { campo: 'dolorFinal', etiqueta: 'Final' }
                    ] as const).map(({ campo, etiqueta }) => (
                      <div key={campo} style={{ '--dolor-color': getDolorColor(formData[campo]) } as React.CSSProperties}>
                        <label className="ses-dolor__label" htmlFor={`ses-${campo}`}>
                          {etiqueta}: <strong className="ses-dolor__valor">{formData[campo]}</strong>
                        </label>
                        <input
                          id={`ses-${campo}`}
                          className="ses-rango"
                          type="range"
                          min="0"
                          max="10"
                          value={formData[campo]}
                          onChange={(e) => setFormData({ ...formData, [campo]: parseInt(e.target.value) })}
                        />
                        <div className="ses-rango__extremos">
                          <span>Sin dolor</span><span>Máximo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progreso General - Chips */}
                <div className="ses-bloque">
                  <span className="ses-bloque__titulo">Progreso General</span>
                  <div className="ses-chips">
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
                        className={`ses-chip ${formData.progresoGeneral === opcion.value ? 'is-activo' : ''}`}
                        aria-pressed={formData.progresoGeneral === opcion.value}
                      >
                        {opcion.icon} {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Movilidad + Fuerza - en línea */}
                <div className="ses-par-grid">
                  <div className="form-field">
                    <label>Movilidad</label>
                    <select
                      value={formData.movilidad}
                      onChange={(e) => setFormData({ ...formData, movilidad: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="limitada">Limitada</option>
                      <option value="reducida">Reducida</option>
                      <option value="normal">Normal</option>
                      <option value="buena">Buena</option>
                      <option value="excelente">Excelente</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Fuerza (Escala Daniels)</label>
                    <select
                      value={formData.fuerza}
                      onChange={(e) => setFormData({ ...formData, fuerza: e.target.value })}
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
                <div className="ses-seccion-cabecera">
                  <h4>Ejercicios Realizados</h4>
                  <button 
                    type="button" 
                    onClick={() => setMostrarGestionBiblioteca(true)} 
                    className="btn-secondary btn-sm btn-con-icono"
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
                    className="btn-secondary ses-agregar-ejercicio"
                  >
                    + Agregar Ejercicio
                  </button>
                ) : (
                  <div className="ses-selector">
                    {/* Toggle entre seleccionar y crear */}
                    <div className="ses-selector__modos">
                      <button
                        type="button"
                        onClick={() => setModoCrearEjercicio(false)}
                        className={!modoCrearEjercicio ? 'btn-primary' : 'btn-secondary'}
                      >
                        Seleccionar de Biblioteca
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoCrearEjercicio(true)}
                        className={modoCrearEjercicio ? 'btn-primary' : 'btn-secondary'}
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
                          />
                        </div>

                        {busquedaEjercicio && (() => {
                          const termino = busquedaEjercicio.toLowerCase();
                          const resultados = bibliotecaEjercicios.filter(ej =>
                            ej.nombre.toLowerCase().includes(termino) ||
                            (ej.categoria && ej.categoria.toLowerCase().includes(termino))
                          );
                          return (
                            <div className="ses-resultados">
                              {resultados.map(ej => (
                                <button
                                  key={ej.id}
                                  type="button"
                                  className={`ses-resultado ${ejercicioSeleccionado?.id === ej.id ? 'is-activo' : ''}`}
                                  onClick={() => {
                                    setEjercicioSeleccionado(ej);
                                    setBusquedaEjercicio(ej.nombre);
                                  }}
                                >
                                  <span className="ses-resultado__nombre">{ej.nombre}</span>
                                  {ej.categoria && (
                                    <span className="ses-resultado__cat">{ej.categoria}</span>
                                  )}
                                </button>
                              ))}
                              {resultados.length === 0 && (
                                <div className="ses-resultados__vacio">
                                  No se encontraron ejercicios
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {ejercicioSeleccionado && (
                          <div className="form-grid ses-params">
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
                          <small className="campo-ayuda">
                            Este ejercicio se guardará en tu biblioteca para uso futuro
                          </small>
                        </div>

                        {nombreNuevoEjercicio.trim() && (
                          <div className="form-grid ses-params">
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

                    <div className="ses-selector__acciones">
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
                    <div key={index} className="ses-ejercicio">
                      <div className="ses-ejercicio__cuerpo">
                        <div className="ses-ejercicio__nombre">{ejercicio.nombre}</div>
                        <div className="ses-ejercicio__datos">
                          {ejercicio.peso && <div><strong>Peso:</strong> {ejercicio.peso}</div>}
                          {ejercicio.repeticiones && <div><strong>Repeticiones:</strong> {ejercicio.repeticiones}</div>}
                          {ejercicio.tiempo && <div><strong>Tiempo:</strong> {ejercicio.tiempo}</div>}
                          {ejercicio.carga && <div><strong>Carga:</strong> {ejercicio.carga}</div>}
                        </div>
                        {ejercicio.notas && (
                          <div className="ses-ejercicio__notas">{ejercicio.notas}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="ses-ejercicio__quitar"
                        onClick={() => eliminarEjercicio(index)}
                        aria-label={`Quitar ${ejercicio.nombre}`}
                      >
                        ×
                      </button>
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
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Biblioteca de Ejercicios
              </h3>
              <button className="modal-close" onClick={() => setMostrarGestionBiblioteca(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-texto">
                Total de ejercicios: <strong className="texto-acento">{bibliotecaEjercicios.length}</strong>
              </p>

              {bibliotecaEjercicios.length === 0 ? (
                <div className="ses-bib-vacio">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <p>No hay ejercicios en la biblioteca</p>
                  <p className="campo-ayuda">Crea ejercicios desde el formulario de sesiones</p>
                </div>
              ) : (
                <div className="ses-bib-lista">
                  {bibliotecaEjercicios.map((ejercicio) => (
                    <div key={ejercicio.id} className="ses-bib-item">
                      <div className="ses-bib-item__info">
                        <div className="ses-bib-item__nombre">{ejercicio.nombre}</div>
                        {ejercicio.categoria && (
                          <span className="ses-bib-item__cat">{ejercicio.categoria}</span>
                        )}
                        {ejercicio.descripcion && (
                          <div className="ses-bib-item__desc">{ejercicio.descripcion}</div>
                        )}
                      </div>
                      <button
                        className="ses-bib-eliminar"
                        onClick={() => eliminarEjercicioDeBiblioteca(ejercicio.id)}
                        aria-label={`Eliminar ${ejercicio.nombre}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setMostrarGestionBiblioteca(false)} className="btn-primary">
                Cerrar
              </button>
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
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModalEvaluacion(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {pacienteEvaluacion && (
                <div className="ses-eval-paciente">
                  <h4>{pacienteEvaluacion.nombre}</h4>
                  <p>Completó todas las sesiones programadas del tratamiento</p>
                </div>
              )}

              <div className="form-field full-width">
                <label htmlFor="ses-evaluacion-final">Evaluación Final *</label>
                <textarea
                  id="ses-evaluacion-final"
                  className="ses-eval-texto"
                  value={evaluacionTexto}
                  onChange={(e) => setEvaluacionTexto(e.target.value)}
                  rows={12}
                  placeholder="Describe la evaluación final del tratamiento del paciente...&#10;&#10;Incluye:&#10;- Progreso general&#10;- Objetivos alcanzados&#10;- Estado final del paciente&#10;- Recomendaciones finales&#10;- Observaciones importantes"
                  required
                />
                <small className="campo-ayuda">
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
          <div className="modal-content modal-large ses-progreso-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }} aria-hidden="true">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Progreso del Tratamiento
              </h3>
              <button className="modal-close" onClick={() => setShowModalProgreso(false)} aria-label="Cerrar">×</button>
            </div>
            
            <div className="modal-body">
              {/* Información del Paciente */}
              <div className="ses-prog-cabecera">
                <div className="ses-prog-cabecera__info">
                  <div className="ses-prog-cabecera__nombre">
                    <h4>{pacienteProgreso.nombre}</h4>
                    {pacienteProgreso.estado_paciente === 'alta' && (
                      <span className="ses-prog-pill ses-prog-pill--alta">✓ Alta</span>
                    )}
                    {pacienteProgreso.estado_paciente === 'abandono' && (
                      <span className="ses-prog-pill ses-prog-pill--receso">Receso</span>
                    )}
                  </div>
                  <p className="ses-prog-cabecera__datos">
                    RUT: {pacienteProgreso.rut} • Teléfono: {pacienteProgreso.telefono}
                  </p>
                </div>
                <div className="ses-prog-cabecera__total">
                  <strong>{sesionesProgreso.length}</strong>
                  <span>{sesionesProgreso.length === 1 ? 'Sesión' : 'Sesiones'}</span>
                </div>
              </div>

              {/* Métricas de Progreso */}
              <h4 className="ses-prog-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3v18h18M7 16l4-4 4 4 6-6"/>
                </svg>
                Métricas Generales
              </h4>
              <div className="ses-prog-metricas">
                {[
                  { label: 'Dolor Inicial Promedio', metrica: 'dolorInicial', color: 'var(--danger)', texto: false },
                  { label: 'Dolor Final Promedio', metrica: 'dolorFinal', color: 'var(--estado-confirmada)', texto: false },
                  { label: 'Movilidad Actual', metrica: 'movilidad', color: 'var(--estado-completada)', texto: true },
                  { label: 'Fuerza Actual', metrica: 'fuerza', color: 'var(--estado-pendiente)', texto: true }
                ].map(m => (
                  <div key={m.metrica} className="ses-prog-metrica" style={{ '--metrica-color': m.color } as React.CSSProperties}>
                    <div className="ses-prog-metrica__label">{m.label}</div>
                    <div className={`ses-prog-metrica__valor ${m.texto ? 'ses-prog-metrica__valor--texto' : ''}`}>
                      {calcularPromedioMetrica(m.metrica)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Historial de Sesiones */}
              <h4 className="ses-prog-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Historial de Sesiones
              </h4>
              <div className="ses-prog-lista">
                {sesionesProgreso.map((sesion: any, index: number) => (
                  <div key={sesion.id} className="ses-prog-sesion">
                    {/* Header de la sesión */}
                    <div className="ses-prog-sesion__cabecera">
                      <div className="ses-prog-sesion__id">
                        <div className="ses-prog-sesion__num">{sesionesProgreso.length - index}</div>
                        <div>
                          <div className="ses-prog-sesion__fecha">
                            {formatearFechaLocal(sesion.fecha)} • {sesion.hora}
                          </div>
                          <div className="ses-prog-sesion__meta">
                            {sesion.tipo} • {sesion.duracion} min
                          </div>
                        </div>
                      </div>
                      <span className="badge" style={{ backgroundColor: obtenerColorEstado(sesion.estado) }}>
                        {sesion.estado}
                      </span>
                    </div>

                    {/* Métricas de la sesión */}
                    <div className="ses-prog-datos">
                      {sesion.dolorInicial !== null && sesion.dolorInicial !== undefined && (
                        <div style={{ '--dato-color': 'var(--danger)' } as React.CSSProperties}>
                          <div className="ses-prog-dato__label">Dolor Inicial</div>
                          <div className="ses-prog-dato__valor">{sesion.dolorInicial}/10</div>
                        </div>
                      )}
                      {sesion.dolorFinal !== null && sesion.dolorFinal !== undefined && (
                        <div style={{ '--dato-color': 'var(--estado-confirmada)' } as React.CSSProperties}>
                          <div className="ses-prog-dato__label">Dolor Final</div>
                          <div className="ses-prog-dato__valor">{sesion.dolorFinal}/10</div>
                        </div>
                      )}
                      {sesion.movilidad && (
                        <div style={{ '--dato-color': 'var(--estado-completada)' } as React.CSSProperties}>
                          <div className="ses-prog-dato__label">Movilidad</div>
                          <div className="ses-prog-dato__valor">{sesion.movilidad}</div>
                        </div>
                      )}
                      {sesion.fuerza && (
                        <div style={{ '--dato-color': getDanielsInfo(sesion.fuerza).color } as React.CSSProperties}>
                          <div className="ses-prog-dato__label">Fuerza (Daniels)</div>
                          <div className="ses-prog-dato__valor">
                            {getDanielsInfo(sesion.fuerza).label} - {getDanielsInfo(sesion.fuerza).desc}
                          </div>
                        </div>
                      )}
                      {sesion.progresoGeneral && (
                        <div style={{ '--dato-color': 'var(--accent)' } as React.CSSProperties}>
                          <div className="ses-prog-dato__label">Progreso</div>
                          <div className="ses-prog-dato__valor">{sesion.progresoGeneral}</div>
                        </div>
                      )}
                    </div>

                    {/* Ejercicios realizados */}
                    {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                      <div className="ses-prog-ejercicios">
                        <div className="ses-prog-dato__label">Ejercicios:</div>
                        <div className="ses-prog-ejercicios__lista">
                          {sesion.ejerciciosRealizados.map((ejercicio: any, idx: number) => {
                            // Formato antiguo (string) - mostrar como badge
                            if (typeof ejercicio === 'string') {
                              return <span key={idx} className="ses-prog-ej-tag">{ejercicio}</span>;
                            }
                            // Formato nuevo (objeto) - mostrar con detalles
                            return (
                              <div key={idx} className="ses-prog-ej">
                                <div className="ses-prog-ej__nombre">{ejercicio.nombre}</div>
                                <div className="ses-prog-ej__datos">
                                  {ejercicio.peso && <span>💪 {ejercicio.peso}</span>}
                                  {ejercicio.repeticiones && <span>🔄 {ejercicio.repeticiones}</span>}
                                  {ejercicio.tiempo && <span>⏱️ {ejercicio.tiempo}</span>}
                                  {ejercicio.carga && <span>📊 {ejercicio.carga}</span>}
                                </div>
                                {ejercicio.notas && (
                                  <div className="ses-prog-ej__notas">{ejercicio.notas}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notas y observaciones */}
                    {(sesion.notasSesion || sesion.observaciones || sesion.recomendaciones) && (
                      <div className="ses-prog-notas">
                        {sesion.notasSesion && (
                          <div><strong>Notas:</strong> {sesion.notasSesion}</div>
                        )}
                        {sesion.observaciones && (
                          <div className="ses-prog-notas__obs"><strong>Observaciones:</strong> {sesion.observaciones}</div>
                        )}
                        {sesion.recomendaciones && (
                          <div className="ses-prog-notas__rec"><strong>Recomendaciones:</strong> {sesion.recomendaciones}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowModalProgreso(false)} 
                className="btn-primary"
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
          <div className="modal-content ses-completar" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header ses-completar__header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--estado-confirmada)' }} aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Completar Sesión
                {sesionCompletar.numeroSesion && (
                  <span className="ses-completar__num">
                    #{sesionCompletar.numeroSesion}{sesionCompletar.sesionesProgramadas ? ` / ${sesionCompletar.sesionesProgramadas}` : ''}
                  </span>
                )}
              </h3>
              <button className="modal-close" onClick={handleCerrarCompletar} aria-label="Cerrar">×</button>
            </div>

            {/* Info de la sesión (solo lectura) */}
            <dl className="ses-completar-info">
              <div><dt>Paciente</dt><dd>{sesionCompletar.paciente}</dd></div>
              <div><dt>Fecha</dt><dd>{formatearFechaLocal(sesionCompletar.fecha)}</dd></div>
              <div><dt>Hora</dt><dd>{sesionCompletar.hora}</dd></div>
              <div><dt>Tipo</dt><dd>{sesionCompletar.tipo}</dd></div>
            </dl>

            <div className="modal-body">
              {/* Dolor - Sliders visuales */}
              <div className="ses-bloque">
                <h4 className="ses-subtitulo">Dolor (EVA 0-10)</h4>
                <div className="ses-dolor-grid">
                  {([
                    { campo: 'dolorInicial', etiqueta: 'Dolor Inicial' },
                    { campo: 'dolorFinal', etiqueta: 'Dolor Final' }
                  ] as const).map(({ campo, etiqueta }) => (
                    <div key={campo} style={{ '--dolor-color': getDolorColor(completarForm[campo]) } as React.CSSProperties}>
                      <label className="ses-dolor__label" htmlFor={`completar-${campo}`}>
                        {etiqueta}: <strong className="ses-dolor__valor">{completarForm[campo]}</strong>
                      </label>
                      <input
                        id={`completar-${campo}`}
                        className="ses-rango"
                        type="range"
                        min="0"
                        max="10"
                        value={completarForm[campo]}
                        onChange={(e) => setCompletarForm(prev => ({ ...prev, [campo]: parseInt(e.target.value) }))}
                      />
                      <div className="ses-rango__extremos">
                        <span>Sin dolor</span><span>Máximo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escala de Borg (Percepción de Esfuerzo) */}
              <div className="ses-bloque" style={{ '--dolor-color': getBorgColor(completarForm.borgPercepcion) } as React.CSSProperties}>
                <h4 className="ses-subtitulo">Escala de Borg (Percepción de Esfuerzo 0-10)</h4>
                <label className="ses-dolor__label" htmlFor="completar-borg">
                  Esfuerzo: <strong className="ses-dolor__valor">{completarForm.borgPercepcion}</strong>
                  <span className="ses-dolor__nota">
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
                  id="completar-borg"
                  className="ses-rango"
                  type="range"
                  min="0"
                  max="10"
                  value={completarForm.borgPercepcion}
                  onChange={(e) => setCompletarForm(prev => ({ ...prev, borgPercepcion: parseInt(e.target.value) }))}
                />
                <div className="ses-rango__extremos">
                  <span>Reposo</span><span>Extremo</span>
                </div>
              </div>

              {/* Progreso General - Chips/botones */}
              <div className="ses-bloque">
                <h4 className="ses-subtitulo">Progreso General</h4>
                <div className="ses-chips">
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
                      className={`ses-chip ${completarForm.progresoGeneral === opcion.value ? 'is-activo' : ''}`}
                      aria-pressed={completarForm.progresoGeneral === opcion.value}
                    >
                      {opcion.icon} {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Movilidad + Fuerza - en línea */}
              <div className="ses-par-grid ses-bloque">
                <div className="form-field">
                  <label htmlFor="completar-movilidad">Movilidad</label>
                  <select
                    id="completar-movilidad"
                    value={completarForm.movilidad}
                    onChange={(e) => setCompletarForm(prev => ({ ...prev, movilidad: e.target.value }))}
                  >
                    <option value="">Seleccionar</option>
                    <option value="limitada">Limitada</option>
                    <option value="reducida">Reducida</option>
                    <option value="normal">Normal</option>
                    <option value="buena">Buena</option>
                    <option value="excelente">Excelente</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="completar-fuerza">Fuerza (Escala Daniels)</label>
                  <select
                    id="completar-fuerza"
                    value={completarForm.fuerza}
                    onChange={(e) => setCompletarForm(prev => ({ ...prev, fuerza: e.target.value }))}
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
              <div className="ses-bloque">
                <div className="ses-seccion-cabecera">
                  <h4 className="ses-subtitulo">
                    Ejercicios ({completarForm.ejerciciosRealizados.length})
                  </h4>
                  <div className="ses-mini-acciones">
                    <button
                      type="button"
                      onClick={handleCopiarEjerciciosUltimaSesion}
                      className="ses-btn-mini ses-btn-mini--azul"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copiar anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarSelectorEjercicioCompletar(!mostrarSelectorEjercicioCompletar)}
                      className="ses-btn-mini"
                      aria-expanded={mostrarSelectorEjercicioCompletar}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Selector de ejercicio inline */}
                {mostrarSelectorEjercicioCompletar && (
                  <div className="ses-selector">
                    {!modoCrearEjercicioCompletar ? (
                      <>
                        <input
                          type="text"
                          className="campo-input"
                          placeholder="Buscar ejercicio..."
                          aria-label="Buscar ejercicio"
                          value={busquedaEjercicioCompletar}
                          onChange={(e) => { setBusquedaEjercicioCompletar(e.target.value); setEjercicioSeleccionadoCompletar(null); }}
                          autoFocus
                        />
                        {busquedaEjercicioCompletar && (
                          <div className="ses-resultados">
                            {(() => {
                              const resultados = bibliotecaEjercicios.filter(ej => ej.nombre.toLowerCase().includes(busquedaEjercicioCompletar.toLowerCase()));
                              return resultados.length > 0 ? (
                                resultados.map(ej => (
                                  <button
                                    key={ej.id}
                                    type="button"
                                    className={`ses-resultado ${ejercicioSeleccionadoCompletar?.id === ej.id ? 'is-activo' : ''}`}
                                    onClick={() => { setEjercicioSeleccionadoCompletar(ej); setBusquedaEjercicioCompletar(ej.nombre); }}
                                  >
                                    <span className="ses-resultado__nombre">{ej.nombre}</span>
                                    {ej.categoria && <span className="ses-resultado__cat">{ej.categoria}</span>}
                                  </button>
                                ))
                              ) : (
                                <div className="ses-resultados__vacio">
                                  No se encontró &quot;{busquedaEjercicioCompletar}&quot;
                                  <button
                                    type="button"
                                    className="ses-btn-mini ses-btn-mini--ambar ses-resultados__crear"
                                    onClick={() => { setModoCrearEjercicioCompletar(true); setNuevoEjercicioNombre(busquedaEjercicioCompletar); }}
                                  >
                                    + Crear &quot;{busquedaEjercicioCompletar}&quot;
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {ejercicioSeleccionadoCompletar && (
                          <div className="ses-params-grid">
                            <input type="text" className="campo-input" placeholder="Peso" aria-label="Peso" value={parametrosEjercicioCompletar.peso} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, peso: e.target.value}))} />
                            <input type="text" className="campo-input" placeholder="Repeticiones" aria-label="Repeticiones" value={parametrosEjercicioCompletar.repeticiones} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, repeticiones: e.target.value}))} />
                            <input type="text" className="campo-input" placeholder="Tiempo" aria-label="Tiempo" value={parametrosEjercicioCompletar.tiempo} onChange={(e) => setParametrosEjercicioCompletar(p => ({...p, tiempo: e.target.value}))} />
                          </div>
                        )}
                        <div className="ses-selector__acciones ses-selector__acciones--wrap">
                          <button type="button" onClick={agregarEjercicioCompletar} disabled={!ejercicioSeleccionadoCompletar} className="btn-primary">Agregar</button>
                          <button
                            type="button"
                            className="ses-btn-mini ses-btn-mini--ambar"
                            onClick={() => { setModoCrearEjercicioCompletar(true); setNuevoEjercicioNombre(''); setNuevoEjercicioCategoria(''); }}
                          >
                            + Crear nuevo
                          </button>
                          <button type="button" onClick={() => { setMostrarSelectorEjercicioCompletar(false); setEjercicioSeleccionadoCompletar(null); setBusquedaEjercicioCompletar(''); }} className="btn-secondary">Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 className="ses-crear-titulo">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Crear Nuevo Ejercicio
                        </h5>
                        <input
                          type="text"
                          className="campo-input campo-input--ambar"
                          placeholder="Nombre del ejercicio *"
                          aria-label="Nombre del ejercicio"
                          value={nuevoEjercicioNombre}
                          onChange={(e) => setNuevoEjercicioNombre(e.target.value)}
                          autoFocus
                        />
                        <input
                          type="text"
                          className="campo-input ses-crear-categoria"
                          placeholder="Categoría (opcional, ej: Tren superior, Core...)"
                          aria-label="Categoría"
                          value={nuevoEjercicioCategoria}
                          onChange={(e) => setNuevoEjercicioCategoria(e.target.value)}
                        />
                        <div className="ses-selector__acciones">
                          <button
                            type="button"
                            className="btn-confirmar btn-confirmar--ambar"
                            onClick={handleCrearEjercicioRapido}
                            disabled={!nuevoEjercicioNombre.trim() || creandoEjercicio}
                          >
                            {creandoEjercicio ? 'Creando...' : 'Crear y Seleccionar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setModoCrearEjercicioCompletar(false); setNuevoEjercicioNombre(''); setNuevoEjercicioCategoria(''); }}
                            className="btn-secondary"
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
                  <div className="ses-ej-lista">
                    {completarForm.ejerciciosRealizados.map((ej, idx) => {
                      const editando = editandoEjercicioIdx === idx;
                      const actualizar = (campo: string, valor: string) => {
                        const updated = [...completarForm.ejerciciosRealizados];
                        updated[idx] = { ...updated[idx], [campo]: valor };
                        setCompletarForm(prev => ({ ...prev, ejerciciosRealizados: updated }));
                      };
                      return (
                        <div key={idx} className={`ses-ej-edit ${editando ? 'is-editando' : ''}`}>
                          <div className="ses-ej-edit__fila">
                            <button
                              type="button"
                              className="ses-ej-edit__info"
                              onClick={() => setEditandoEjercicioIdx(editando ? null : idx)}
                              aria-expanded={editando}
                            >
                              <span className="ses-ej-edit__nombre">{ej.nombre}</span>
                              {!editando && (
                                <span className="ses-ej-edit__resumen">
                                  {ej.peso && <span>Peso: {ej.peso}</span>}
                                  {ej.repeticiones && <span>Rep: {ej.repeticiones}</span>}
                                  {ej.tiempo && <span>Tiempo: {ej.tiempo}</span>}
                                  {ej.carga && <span>Carga: {ej.carga}</span>}
                                  {!ej.peso && !ej.repeticiones && !ej.tiempo && !ej.carga && <span className="ses-ej-edit__vacio">Toca para editar cargas</span>}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              className={`ses-icon-btn ${editando ? 'is-activo' : ''}`}
                              onClick={() => setEditandoEjercicioIdx(editando ? null : idx)}
                              title="Editar"
                              aria-label={`Editar ${ej.nombre}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="ses-icon-btn ses-icon-btn--peligro"
                              onClick={() => { eliminarEjercicioCompletar(idx); if (editando) setEditandoEjercicioIdx(null); }}
                              aria-label={`Quitar ${ej.nombre}`}
                            >×</button>
                          </div>
                          {editando && (
                            <div className="ses-ej-edit__campos">
                              <input type="text" className="campo-input" placeholder="Peso (ej: 10kg)" aria-label="Peso" value={ej.peso || ''} onChange={(e) => actualizar('peso', e.target.value)} />
                              <input type="text" className="campo-input" placeholder="Repeticiones (ej: 3x12)" aria-label="Repeticiones" value={ej.repeticiones || ''} onChange={(e) => actualizar('repeticiones', e.target.value)} />
                              <input type="text" className="campo-input" placeholder="Tiempo (ej: 30s)" aria-label="Tiempo" value={ej.tiempo || ''} onChange={(e) => actualizar('tiempo', e.target.value)} />
                              <input type="text" className="campo-input" placeholder="Carga (ej: banda roja)" aria-label="Carga" value={ej.carga || ''} onChange={(e) => actualizar('carga', e.target.value)} />
                              <input type="text" className="campo-input ses-ej-edit__notas" placeholder="Notas del ejercicio" aria-label="Notas del ejercicio" value={ej.notas || ''} onChange={(e) => actualizar('notas', e.target.value)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ses-ej-vacio">
                    Sin ejercicios — usa &quot;Copiar anterior&quot; o &quot;Agregar&quot;
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div className="form-field ses-bloque">
                <label htmlFor="completar-observaciones">Observaciones</label>
                <textarea
                  id="completar-observaciones"
                  value={completarForm.observaciones}
                  onChange={(e) => setCompletarForm(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Hallazgos clínicos, estado del paciente..."
                />
              </div>

              {/* Recomendaciones */}
              <div className="form-field">
                <label htmlFor="completar-recomendaciones">Recomendaciones para el paciente</label>
                <textarea
                  id="completar-recomendaciones"
                  value={completarForm.recomendaciones}
                  onChange={(e) => setCompletarForm(prev => ({ ...prev, recomendaciones: e.target.value }))}
                  rows={2}
                  placeholder="Ejercicios en casa, cuidados, indicaciones..."
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="modal-actions">
              <button type="button" onClick={handleCerrarCompletar} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirmar btn-confirmar--alta btn-con-icono"
                onClick={handleSubmitCompletar}
                disabled={completarLoading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
          <div className="modal-content modal-sm ses-siguiente" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="ses-siguiente__icono" aria-hidden="true">✅</div>
              <h3 className="ses-siguiente__titulo">Sesión completada</h3>
              <p className="ses-siguiente__paciente">{siguienteSesionInfo.pacienteNombre}</p>
              {siguienteSesionInfo.totalProgramadas && (
                <p className="ses-siguiente__progreso">
                  Progreso: {siguienteSesionInfo.siguienteNum ? siguienteSesionInfo.siguienteNum - 1 : '?'}/{siguienteSesionInfo.totalProgramadas} sesiones
                </p>
              )}

              <div className="ses-siguiente__panel">
                <h4 className="ses-subtitulo">
                  Programar Sesión {siguienteSesionInfo.siguienteNum ? `#${siguienteSesionInfo.siguienteNum}` : 'siguiente'}
                </h4>
                <div className="ses-siguiente__campos">
                  <div className="form-field">
                    <label htmlFor="siguiente-fecha">Fecha</label>
                    <input
                      id="siguiente-fecha"
                      type="date"
                      value={siguienteSesionData.fecha}
                      onChange={(e) => setSiguienteSesionData({ ...siguienteSesionData, fecha: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="siguiente-hora">Hora</label>
                    <select
                      id="siguiente-hora"
                      value={siguienteSesionData.hora}
                      onChange={(e) => setSiguienteSesionData({ ...siguienteSesionData, hora: e.target.value })}
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
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => { setShowMiniSiguiente(false); setSiguienteSesionInfo(null); mostrarMensaje('Sesión completada exitosamente'); }}
              >
                Omitir
              </button>
              <button
                className="btn-confirmar btn-confirmar--alta"
                onClick={handleCrearSiguienteSesion}
                disabled={!siguienteSesionData.hora || creandoSiguiente}
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
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {estadoSeleccionado === 'alta' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--estado-confirmada)' }} aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Dar de Alta al Paciente
                  </>
                )}
                {estadoSeleccionado === 'abandono' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--danger)' }} aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Marcar como Receso
                  </>
                )}
                {estadoSeleccionado === 'activo' && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ color: 'var(--estado-completada)' }} aria-hidden="true">
                      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reactivar Paciente
                  </>
                )}
              </h3>
              <button className="modal-close" onClick={() => setShowModalEstadoPaciente(false)} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-texto modal-texto--destacado">
                <strong>{pacienteEstado.nombre}</strong>
              </p>
              <p className="modal-texto">
                {estadoSeleccionado === 'alta' && 'El paciente completó su tratamiento exitosamente.'}
                {estadoSeleccionado === 'abandono' && 'El paciente tomará un receso del tratamiento.'}
                {estadoSeleccionado === 'activo' && 'El paciente volverá a estar en tratamiento activo.'}
              </p>

              <div className="form-group">
                <label htmlFor="ses-motivo-estado">Motivo</label>
                <input
                  id="ses-motivo-estado"
                  className="campo-input"
                  type="text"
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                  placeholder={
                    estadoSeleccionado === 'alta' ? 'Ej: Tratamiento completado' :
                    estadoSeleccionado === 'abandono' ? 'Ej: Receso temporal' :
                    'Ej: Retoma tratamiento'
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="ses-notas-estado">Notas adicionales (opcional)</label>
                <textarea
                  id="ses-notas-estado"
                  className="campo-input"
                  value={notasEstado}
                  onChange={(e) => setNotasEstado(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowModalEstadoPaciente(false)}
                disabled={cambiandoEstado}
              >
                Cancelar
              </button>
              <button
                className={`btn-confirmar btn-confirmar--${estadoSeleccionado}`}
                onClick={handleCambiarEstadoPaciente}
                disabled={cambiandoEstado}
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
