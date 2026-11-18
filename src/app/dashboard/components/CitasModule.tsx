'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fechaAString } from '../utils';
import SemanaCalendario from './SemanaCalendario';
import AgendaCard from './citas/AgendaCard';
import ListaCitas from './citas/ListaCitas';
import ModalRespuestas from './citas/ModalRespuestas';
import { IconoWhatsApp, IconoRefrescar } from './citas/iconos';
import { formatearMesAnio, esHoy } from './citas/formato';
import { useRespuestasPendientes } from '../hooks/useRespuestasPendientes';
import { useConfirm } from '@/components/ConfirmDialog';
import { TIPOS_SESION } from '@/lib/tiposSesion';
import { propsActivable } from '../utils/accesible';


// Módulo Citas
export default function CitasModule() {
  const confirmar = useConfirm();
  // Vista de calendario - se ajusta a móvil después de montar
  const [vistaCalendario, setVistaCalendario] = useState<'mes' | 'semana' | 'lista' | 'hoy'>('mes');
  const [showModal, setShowModal] = useState(false);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [menuAcciones, setMenuAcciones] = useState(false);
  const [diaSeleccionadoMes, setDiaSeleccionadoMes] = useState<Date>(() => new Date());

  const [formData, setFormData] = useState({
    pacienteId: '',
    fecha: '',
    hora: '',
    duracion: '60',
    tipo: 'Kinesioterapia',
    notas: ''
  });

  const [editandoCita, setEditandoCita] = useState<any>(null);
  const [horariosBloqueados, setHorariosBloqueados] = useState<any[]>([]);
  const [showModalBloqueo, setShowModalBloqueo] = useState(false);
  
  // Estados para citas recurrentes
  const [showModalRecurrente, setShowModalRecurrente] = useState(false);
  const [recurrenteData, setRecurrenteData] = useState({
    pacienteId: '',
    horaInicio: '09:00',
    duracion: '60',
    tipo: 'Kinesioterapia',
    notas: '',
    cantidadSemanas: '8',
    diasSemana: [] as number[]
  });
  const [creandoRecurrentes, setCreandoRecurrentes] = useState(false);
  const [busquedaPacienteRecurrente, setBusquedaPacienteRecurrente] = useState('');
  const [mostrarDropdownRecurrente, setMostrarDropdownRecurrente] = useState(false);
  
  // Estados para envío masivo de recordatorios
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [resultadoMasivo, setResultadoMasivo] = useState<any>(null);

  // Respuestas de pacientes por WhatsApp (cancelaciones y pedidos de reagendar) sin revisar.
  // Los callbacks se envuelven porque cargarCitas y mostrarMensaje se declaran más abajo
  const { respuestas: respuestasPendientes, marcarRevisadas: marcarRespuestasRevisadas } = useRespuestasPendientes(
    () => cargarCitas(false),
    (mensaje) => mostrarMensaje(mensaje, true)
  );
  const [showModalRespuestas, setShowModalRespuestas] = useState(false);
  
  // Estados para el buscador de pacientes
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
  const [mostrarDropdownPacientes, setMostrarDropdownPacientes] = useState(false);
  const [bloqueoData, setBloqueoData] = useState({
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    motivo: '',
    tipo: 'bloqueo'
  });
  
  // Estados para pagos
  const [showModalPago, setShowModalPago] = useState(false);
  const [pagoData, setPagoData] = useState({
    pacienteId: '',
    citaId: '',
    monto: '',
    metodoPago: 'Efectivo',
    estado: 'completado',
    fechaPago: fechaAString(new Date()),
    concepto: 'Pago de sesión',
    notas: '',
    numeroFactura: ''
  });

  // Detectar móvil después del montaje (evita hydration mismatch)
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setVistaCalendario('semana');
    }
  }, []);

  // Cargar datos en paralelo al montar
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      const [citasRes, pacientesRes, horariosRes] = await Promise.allSettled([
        fetch('/api/citas').then(r => r.json()),
        fetch('/api/pacientes').then(r => r.json()),
        fetch('/api/horarios-bloqueados').then(r => r.json())
      ]);
      if (citasRes.status === 'fulfilled' && citasRes.value.success) setCitas(citasRes.value.citas);
      if (pacientesRes.status === 'fulfilled' && pacientesRes.value.success) setPacientes(pacientesRes.value.pacientes);
      if (horariosRes.status === 'fulfilled' && horariosRes.value.success) setHorariosBloqueados(horariosRes.value.horarios);
    };
    cargarDatosIniciales();
  }, []);

  // Recarga automatica cada 2 minutos solo cuando se esta en la vista del dia,
  // para detectar respuestas de WhatsApp sin que el usuario tenga que recargar la pagina
  useEffect(() => {
    if (vistaCalendario !== 'hoy') return;
    
    const interval = setInterval(() => {
      cargarCitas(false);
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, [vistaCalendario]);

  const verCitaDeRespuesta = (citaId: number) => {
    const cita = citas.find(c => c.id === citaId);
    if (!cita) {
      mostrarMensaje('La cita ya no existe', true);
      return;
    }
    setShowModalRespuestas(false);
    handleEditarCita(cita);
  };

  // Cerrar dropdown de pacientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.form-field')) {
        setMostrarDropdownPacientes(false);
      }
    };

    if (mostrarDropdownPacientes) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mostrarDropdownPacientes]);

  const cargarCitas = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) {
        setLoading(true);
      }
      const response = await fetch('/api/citas');
      const data = await response.json();
      
      if (data.success) {
        setCitas(data.citas);
      } else {
        setError('Error al cargar las citas');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar las citas');
    } finally {
      if (mostrarLoading) {
        setLoading(false);
      }
    }
  };

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

  // Función para manejar la búsqueda de pacientes
  const handleBusquedaPaciente = (texto: string) => {
    setBusquedaPaciente(texto);
    
    if (texto.trim() === '') {
      setPacientesFiltrados([]);
      setMostrarDropdownPacientes(false);
      return;
    }
    
    // Filtrar pacientes por nombre o RUT
    const filtrados = pacientes.filter(p => 
      p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
      p.rut.toLowerCase().includes(texto.toLowerCase())
    );
    
    setPacientesFiltrados(filtrados);
    setMostrarDropdownPacientes(true);
  };

  // Función para seleccionar un paciente del dropdown
  const handleSeleccionarPaciente = (paciente: any) => {
    setFormData({ ...formData, pacienteId: paciente.id.toString() });
    setBusquedaPaciente(`${paciente.nombre} - ${paciente.rut}`);
    setMostrarDropdownPacientes(false);
  };

  const cargarHorariosBloqueados = async () => {
    try {
      const response = await fetch('/api/horarios-bloqueados');
      const data = await response.json();
      
      if (data.success) {
        setHorariosBloqueados(data.horarios);
      }
    } catch (error) {
      console.error('Error al cargar horarios bloqueados:', error);
    }
  };

  const handleBloquearHorario = (fecha: Date, hora: string) => {
    const fechaStr = fechaAString(fecha);
    const [horaNum] = hora.split(':');
    const horaInicio = `${horaNum}:00`;
    const horaFin = `${(parseInt(horaNum) + 1).toString().padStart(2, '0')}:00`;
    
    setBloqueoData({
      fecha: fechaStr,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: '',
      tipo: 'bloqueo'
    });
    setShowModalBloqueo(true);
  };

  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/api/horarios-bloqueados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bloqueoData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarHorariosBloqueados();
        setShowModalBloqueo(false);
        setBloqueoData({
          fecha: '',
          hora_inicio: '',
          hora_fin: '',
          motivo: '',
          tipo: 'bloqueo'
        });
        mostrarMensaje('Horario bloqueado exitosamente');
      } else {
        mostrarMensaje(data.error || 'Error al bloquear horario', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al bloquear horario', true);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarBloqueo = async (id: number) => {
    if (!(await confirmar('¿Deseas desbloquear este horario?', { peligro: true }))) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/horarios-bloqueados/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarHorariosBloqueados();
        mostrarMensaje('Horario desbloqueado exitosamente');
      } else {
        mostrarMensaje(data.error || 'Error al desbloquear horario', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al desbloquear horario', true);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (mensaje: string, esError: boolean = false) => {
    if (esError) {
      setError(mensaje);
      setTimeout(() => setError(''), 3000);
    } else {
      setSuccessMessage(mensaje);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Funciones para pagos
  const handleRegistrarPago = (cita: any) => {
    setPagoData({
      pacienteId: (cita.pacienteId || cita.paciente_id).toString(),
      citaId: cita.id.toString(),
      monto: '',
      metodoPago: 'Efectivo',
      estado: 'completado',
      fechaPago: cita.fecha,
      concepto: `Pago de sesión - ${cita.tipo}`,
      notas: '',
      numeroFactura: ''
    });
    setShowModalPago(true);
  };

  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowModalPago(false);
        setPagoData({
          pacienteId: '',
          citaId: '',
          monto: '',
          metodoPago: 'Efectivo',
          estado: 'completado',
          fechaPago: fechaAString(new Date()),
          concepto: 'Pago de sesión',
          notas: '',
          numeroFactura: ''
        });
        mostrarMensaje('✅ Pago registrado exitosamente');
        await cargarCitas(false);
      } else {
        mostrarMensaje(data.error || 'Error al registrar pago', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al registrar pago', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editandoCita) {
        // Actualizar cita existente
        const response = await fetch(`/api/citas/${editandoCita.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pacienteId: parseInt(formData.pacienteId),
            fecha: formData.fecha,
            hora: formData.hora,
            duracion: parseInt(formData.duracion),
            tipo: formData.tipo,
            notas: formData.notas
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          await cargarCitas(false);
          mostrarMensaje('Cita actualizada exitosamente');
          setEditandoCita(null);
        } else {
          mostrarMensaje(data.error || 'Error al actualizar la cita', true);
        }
      } else {
        // Crear nueva cita
        const response = await fetch('/api/citas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pacienteId: parseInt(formData.pacienteId),
            fecha: formData.fecha,
            hora: formData.hora,
            duracion: parseInt(formData.duracion),
            tipo: formData.tipo,
            notas: formData.notas
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          await cargarCitas(false);
          mostrarMensaje('Cita creada exitosamente');
        } else {
          mostrarMensaje(data.error || 'Error al crear la cita', true);
        }
      }
      
      setShowModal(false);
      setFormData({
        pacienteId: '',
        fecha: '',
        hora: '',
        duracion: '60',
        tipo: 'Kinesioterapia',
        notas: ''
      });
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al procesar la solicitud', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearCitaDesdeCalendario = (fecha: Date, hora: string) => {
    const fechaStr = fechaAString(fecha);
    setEditandoCita(null);
    setFormData({
      pacienteId: '',
      fecha: fechaStr,
      hora: hora,
      duracion: '60',
      tipo: 'Kinesioterapia',
      notas: ''
    });
    setShowModal(true);
  };

  const handleEditarCita = (cita: any) => {
    setEditandoCita(cita);
    setFormData({
      pacienteId: cita.pacienteId.toString(),
      fecha: cita.fecha,
      hora: cita.hora,
      duracion: cita.duracion.toString(),
      tipo: cita.tipo,
      notas: cita.notas || ''
    });
    // Buscar el paciente y mostrar su nombre en el buscador
    const paciente = pacientes.find(p => p.id === cita.pacienteId);
    if (paciente) {
      setBusquedaPaciente(`${paciente.nombre} - ${paciente.rut}`);
    }
    setShowModal(true);
  };

  const handleEliminarCita = async (id: number) => {
    if (!(await confirmar('¿Estás seguro de eliminar esta cita?', { peligro: true, textoConfirmar: "Eliminar" }))) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/citas/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas(false);
        mostrarMensaje('Cita eliminada exitosamente');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar la cita', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar la cita', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (id: number) => {
    try {
      const cita = citas.find(c => c.id === id);
      if (!cita) return;
      
      const nuevoEstado = cita.estado === 'confirmada' ? 'pendiente' : 'confirmada';
      
      const response = await fetch(`/api/citas/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas(false);
        mostrarMensaje(`Estado cambiado a ${nuevoEstado}`);
      } else {
        mostrarMensaje(data.error || 'Error al cambiar estado', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cambiar estado', true);
    }
  };

  // Mover o redimensionar una cita desde el calendario semanal
  const moverCitaAPI = useCallback(async (cita: any, nuevaFecha: Date, nuevaHora: string, nuevaDuracion?: number) => {
    const fechaStr = fechaAString(nuevaFecha);
    const fechaOriginal = cita.fecha;
    const duracion = nuevaDuracion ?? cita.duracion;

    // Actualizacion optimista: la cita queda en su nuevo lugar mientras responde la API
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, fecha: fechaStr, hora: nuevaHora, duracion } : c));
    
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: cita.pacienteId,
          fecha: fechaStr,
          hora: nuevaHora,
          duracion,
          tipo: cita.tipo,
          notas: cita.notas
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas(false);
        const cambioDeDay = fechaOriginal !== fechaStr;
        if (nuevaDuracion !== undefined && !cambioDeDay && nuevaHora === cita.hora) {
          mostrarMensaje(`Duración cambiada a ${nuevaDuracion} min`);
        } else if (cambioDeDay) {
          const diasNombres = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
          const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const f = new Date(nuevaFecha);
          mostrarMensaje(`Cita movida a ${diasNombres[f.getDay()]} ${f.getDate()} ${mesesNombres[f.getMonth()]} - ${nuevaHora}`);
        } else {
          mostrarMensaje(`Cita movida a ${nuevaHora}`);
        }
      } else {
        await cargarCitas(false);
        mostrarMensaje(data.error || 'Error al mover la cita', true);
      }
    } catch (error) {
      console.error('Error:', error);
      await cargarCitas(false);
      mostrarMensaje('Error al mover la cita', true);
    }
  }, []);

  const handleCrearSesionDesdeCita = async (cita: any) => {
    try {
      // Crear sesión con los datos de la cita
      const response = await fetch('/api/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: cita.pacienteId,
          citaId: cita.id,
          fecha: cita.fecha,
          hora: cita.hora,
          duracion: cita.duracion,
          tipo: cita.tipo,
          estado: 'programada',
          notasSesion: cita.notas || 'Sesión creada desde cita'
        })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('✅ Sesión creada exitosamente');
        await cargarCitas(false); // Recargar para actualizar indicador
        handleCerrarModal();
      } else {
        mostrarMensaje(data.error || 'Error al crear sesión', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al crear sesión', true);
    }
  };

  // Envío masivo de recordatorios
  const handleEnvioMasivo = async () => {
    if (citasSinRecordatorio.length === 0) {
      mostrarMensaje('Todas las citas ya tienen recordatorio enviado', true);
      return;
    }

    if (!(await confirmar(`¿Enviar recordatorio por WhatsApp a ${citasSinRecordatorio.length} paciente(s)?`, { titulo: "Enviar recordatorios", textoConfirmar: "Enviar" }))) return;

    try {
      setEnviandoMasivo(true);
      const response = await fetch('/api/citas/recordatorios-masivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citaIds: citasSinRecordatorio.map(c => c.id)
        })
      });

      const data = await response.json();

      if (data.success) {
        setResultadoMasivo(data);
        mostrarMensaje(`${data.enviados} recordatorio(s) enviado(s)${data.errores > 0 ? `, ${data.errores} error(es)` : ''}`);
        await cargarCitas(false);
        setTimeout(() => setResultadoMasivo(null), 10000);
      } else {
        mostrarMensaje(data.error || 'Error al enviar recordatorios', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al enviar recordatorios masivos', true);
    } finally {
      setEnviandoMasivo(false);
    }
  };

  const handleEnviarRecordatorio = async (cita: any) => {
    if (!(await confirmar(`¿Enviar recordatorio por WhatsApp a ${cita.paciente}?`, { titulo: "Enviar recordatorio", textoConfirmar: "Enviar" }))) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/citas/${cita.id}/recordatorio`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Recordatorio enviado por WhatsApp');
        handleCerrarModal();
      } else {
        // Mostrar mensaje de error específico
        mostrarMensaje(data.error || 'Error al enviar recordatorio', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al enviar recordatorio', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    setEditandoCita(null);
    setFormData({
      pacienteId: '',
      fecha: '',
      hora: '',
      duracion: '60',
      tipo: 'Kinesioterapia',
      notas: ''
    });
    // Limpiar buscador de pacientes
    setBusquedaPaciente('');
    setPacientesFiltrados([]);
    setMostrarDropdownPacientes(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const mesAnterior = () => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    setFechaActual(nuevaFecha);
  };

  const mesSiguiente = () => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    setFechaActual(nuevaFecha);
  };

  const semanaAnterior = () => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    setFechaActual(nuevaFecha);
  };

  const semanaSiguiente = () => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    setFechaActual(nuevaFecha);
  };

  const hoy = () => {
    setFechaActual(new Date());
  };

  const diasMes = useMemo(() => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const totalDias = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
    
    const dias: (Date | null)[] = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let i = 1; i <= totalDias; i++) dias.push(new Date(año, mes, i));
    return dias;
  }, [fechaActual]);

  const diasSemana = useMemo(() => {
    const dias: Date[] = [];
    const inicioSemana = new Date(fechaActual);
    const diaSemana = inicioSemana.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioSemana.setDate(inicioSemana.getDate() + diff);
    
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(dia.getDate() + i);
      dias.push(dia);
    }
    return dias;
  }, [fechaActual]);

  const citasSinRecordatorio = useMemo(() => {
    // Solo enviar recordatorios para citas de hoy y mañana
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const mananaStr = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
    
    return citas.filter(c => 
      (c.estado === 'pendiente' || c.estado === 'confirmada') && 
      (!c.recordatorio || c.recordatorio.estado === 'error') && 
      c.telefono &&
      (c.fecha === hoyStr || c.fecha === mananaStr)
    );
  }, [citas]);

  // Aliases para compatibilidad con el render existente
  const obtenerDiasMes = () => diasMes;
  const obtenerDiasSemana = () => diasSemana;

  // Memoizar citas agrupadas por fecha para evitar filtros repetitivos
  const citasPorFecha = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const cita of citas) {
      const lista = mapa.get(cita.fecha);
      if (lista) {
        lista.push(cita);
      } else {
        mapa.set(cita.fecha, [cita]);
      }
    }
    return mapa;
  }, [citas]);

  // Memoizar horarios bloqueados agrupados por fecha para evitar find lineal repetitivo
  const horariosBloqueadosPorFecha = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const bloqueo of horariosBloqueados) {
      const lista = mapa.get(bloqueo.fecha);
      if (lista) {
        lista.push(bloqueo);
      } else {
        mapa.set(bloqueo.fecha, [bloqueo]);
      }
    }
    return mapa;
  }, [horariosBloqueados]);

  // Memoizar citas de hoy y conteos por estado para la vista "hoy"
  const citasHoyMemo = useMemo(() => {
    const hoyStr = fechaAString(new Date());
    const citasDelDia = (citasPorFecha.get(hoyStr) || [])
      .slice()
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const conteos = { confirmadas: 0, pendientes: 0, completadas: 0, canceladas: 0 };
    for (const c of citasDelDia) {
      if (c.estado === 'confirmada') conteos.confirmadas++;
      else if (c.estado === 'pendiente') conteos.pendientes++;
      else if (c.estado === 'completada') conteos.completadas++;
      else if (c.estado === 'cancelada') conteos.canceladas++;
    }
    return { citasDelDia, conteos };
  }, [citasPorFecha]);

  const obtenerCitasDia = (fecha: Date) => {
    const fechaStr = fechaAString(fecha);
    return citasPorFecha.get(fechaStr) || [];
  };

  const hoyStr = fechaAString(new Date());
  const citasHoy = citasHoyMemo.citasDelDia;
  const conteosHoy = citasHoyMemo.conteos;

  // Titulo compacto del periodo: rango de la semana o mes y año
  const tituloPeriodo = (() => {
    if (vistaCalendario !== 'semana') return formatearMesAnio(fechaActual);
    const inicio = diasSemana[0];
    const fin = diasSemana[6];
    const mesCorto = (d: Date) => d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
    return inicio.getMonth() === fin.getMonth()
      ? `${inicio.getDate()} – ${fin.getDate()} ${mesCorto(fin)} ${fin.getFullYear()}`
      : `${inicio.getDate()} ${mesCorto(inicio)} – ${fin.getDate()} ${mesCorto(fin)} ${fin.getFullYear()}`;
  })();

  // Dia tocado en la vista mensual (solo cuenta si pertenece al mes visible)
  const diaSeleccionadoValido =
    diaSeleccionadoMes.getMonth() === fechaActual.getMonth() &&
    diaSeleccionadoMes.getFullYear() === fechaActual.getFullYear();
  const citasDiaSeleccionado = diaSeleccionadoValido
    ? obtenerCitasDia(diaSeleccionadoMes).slice().sort((a, b) => a.hora.localeCompare(b.hora))
    : [];

  const iconoWhatsApp = <IconoWhatsApp />;
  const iconoRefrescar = <IconoRefrescar />;

  const textoRecordatorios = enviandoMasivo
    ? 'Enviando...'
    : `Recordatorios${citasSinRecordatorio.length > 0 ? ` (${citasSinRecordatorio.length})` : ''}`;

  const renderAgendaCard = (cita: any) => (
    <AgendaCard
      key={cita.id}
      cita={cita}
      hoyStr={hoyStr}
      onConfirmar={handleCambiarEstado}
      onRecordatorio={handleEnviarRecordatorio}
      onCrearSesion={handleCrearSesionDesdeCita}
      onPago={handleRegistrarPago}
      onEditar={handleEditarCita}
    />
  );

  return (
    <div className="module-container citas-module">
      {/* Mensajes de éxito/error */}
      {successMessage && <div className="toast toast--ok" role="status">{successMessage}</div>}
      {error && <div className="toast toast--error" role="alert">{error}</div>}

      <div className="module-header citas-header">
        <h2>Gestión de Citas</h2>
        <div className="calendario-controles">
          {/* Selector de Vista */}
          <div className="vista-selector" role="tablist" aria-label="Vista del calendario">
            {([['mes', 'Mes'], ['semana', 'Semana'], ['hoy', 'Hoy'], ['lista', 'Lista']] as const).map(([vista, etiqueta]) => (
              <button
                key={vista}
                type="button"
                role="tab"
                aria-selected={vistaCalendario === vista}
                className={vistaCalendario === vista ? 'vista-btn active' : 'vista-btn'}
                onClick={() => setVistaCalendario(vista)}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {/* Acciones visibles en escritorio */}
          <div className="citas-acciones-desktop">
            <button className="btn-secondary" onClick={() => cargarCitas()} title="Refrescar citas">
              {iconoRefrescar}
              Refrescar
            </button>
            <button
              className="btn-secondary btn-respuestas"
              onClick={() => setShowModalRespuestas(true)}
              title="Cancelaciones y pedidos de reagendar recibidos por WhatsApp"
            >
              Respuestas
              {respuestasPendientes.length > 0 && <span className="citas-menu-badge">{respuestasPendientes.length}</span>}
            </button>
            <button
              className="btn-primary btn-whatsapp"
              onClick={handleEnvioMasivo}
              disabled={enviandoMasivo}
              title="Enviar recordatorios WhatsApp a todas las citas pendientes"
            >
              {enviandoMasivo ? <div className="spinner spinner-16"></div> : iconoWhatsApp}
              {textoRecordatorios}
            </button>
            <button className="btn-primary btn-recurrentes" onClick={() => setShowModalRecurrente(true)}>
              Recurrentes
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + Nueva Cita
            </button>
          </div>

          {/* Menu de acciones en movil */}
          <div className="citas-menu">
            <button
              type="button"
              className="citas-menu-btn"
              onClick={() => setMenuAcciones(v => !v)}
              aria-haspopup="menu"
              aria-expanded={menuAcciones}
              aria-label="Más acciones"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
              {(citasSinRecordatorio.length + respuestasPendientes.length) > 0 && (
                <span className="citas-menu-badge">{citasSinRecordatorio.length + respuestasPendientes.length}</span>
              )}
            </button>
            {menuAcciones && (
              <>
                <div className="citas-menu-backdrop" onClick={() => setMenuAcciones(false)} />
                <div className="citas-menu-panel" role="menu">
                  <button type="button" role="menuitem" className="citas-menu-item" onClick={() => { setMenuAcciones(false); cargarCitas(); }}>
                    {iconoRefrescar}
                    Refrescar
                  </button>
                  <button type="button" role="menuitem" className="citas-menu-item" onClick={() => { setMenuAcciones(false); setShowModalRespuestas(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icono-18" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Respuestas{respuestasPendientes.length > 0 ? ` (${respuestasPendientes.length})` : ''}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="citas-menu-item citas-menu-item--whatsapp"
                    disabled={enviandoMasivo}
                    onClick={() => { setMenuAcciones(false); handleEnvioMasivo(); }}
                  >
                    {iconoWhatsApp}
                    {textoRecordatorios}
                  </button>
                  <button type="button" role="menuitem" className="citas-menu-item" onClick={() => { setMenuAcciones(false); setShowModalRecurrente(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icono-18" aria-hidden="true">
                      <path d="M17 2l4 4-4 4"/>
                      <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
                      <path d="M7 22l-4-4 4-4"/>
                      <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
                    </svg>
                    Citas recurrentes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="module-content">
        {/* Loading Spinner */}
        {loading && (
          <div className="citas-loading">
            <div className="spinner"></div>
          </div>
        )}

        {/* Navegación del Calendario */}
        {!loading && (vistaCalendario === 'mes' || vistaCalendario === 'semana') && (
          <div className="calendario-nav">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={vistaCalendario === 'semana' ? semanaAnterior : mesAnterior}
              aria-label={vistaCalendario === 'semana' ? 'Semana anterior' : 'Mes anterior'}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h3 className="calendario-titulo">{tituloPeriodo}</h3>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={vistaCalendario === 'semana' ? semanaSiguiente : mesSiguiente}
              aria-label={vistaCalendario === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button type="button" className="cal-hoy-chip" onClick={() => { hoy(); setDiaSeleccionadoMes(new Date()); }}>
              Hoy
            </button>
          </div>
        )}

        {/* Vista Mensual: grilla con nombres en escritorio, mini-mes con puntos en movil */}
        {!loading && vistaCalendario === 'mes' && (
          <>
            <div className="calendario-mes">
              <div className="calendario-header">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                  <div key={dia} className="dia-semana">{dia}</div>
                ))}
              </div>
              <div className="calendario-grid">
                {obtenerDiasMes().map((dia, index) => {
                  if (!dia) return <div key={index} className="dia-celda vacio" />;
                  const citasDia = obtenerCitasDia(dia);
                  const seleccionado = diaSeleccionadoValido && dia.toDateString() === diaSeleccionadoMes.toDateString();
                  return (
                    <button
                      type="button"
                      key={index}
                      className={`dia-celda ${esHoy(dia) ? 'hoy' : ''} ${seleccionado ? 'seleccionado' : ''} ${citasDia.length > 0 ? 'con-citas' : ''}`}
                      onClick={() => setDiaSeleccionadoMes(dia)}
                      aria-label={`${dia.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}, ${citasDia.length} cita(s)`}
                      aria-pressed={seleccionado}
                    >
                      <div className="dia-numero">{dia.getDate()}</div>
                      <div className="citas-dia">
                        {citasDia.map(cita => (
                          <div
                            key={cita.id}
                            className={`cita-item ${cita.estado}`}
                            title={`${cita.hora} - ${cita.paciente}`}
                          >
                            <span className="cita-hora">{cita.hora}</span>
                            <span className="cita-paciente">{cita.paciente}</span>
                          </div>
                        ))}
                      </div>
                      {citasDia.length > 0 && (
                        <div className="dia-puntos" aria-hidden="true">
                          {citasDia.slice(0, 3).map(cita => (
                            <span key={cita.id} className={`dia-punto ${cita.estado}`} />
                          ))}
                          {citasDia.length > 3 && <span className="dia-puntos-mas">+{citasDia.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mes-dia-detalle">
              {diaSeleccionadoValido ? (
                <>
                  <h4 className="mes-dia-titulo">
                    {diaSeleccionadoMes.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span className="mes-dia-contador">{citasDiaSeleccionado.length} cita(s)</span>
                  </h4>
                  {citasDiaSeleccionado.length === 0 ? (
                    <div className="agenda-vacia agenda-vacia--compacta">
                      <p>Sin citas este día</p>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleCrearCitaDesdeCalendario(diaSeleccionadoMes, '09:00')}
                      >
                        + Agendar cita
                      </button>
                    </div>
                  ) : (
                    <div className="agenda-lista">
                      {citasDiaSeleccionado.map(renderAgendaCard)}
                    </div>
                  )}
                </>
              ) : (
                <p className="mes-dia-hint">Toca un día para ver sus citas</p>
              )}
            </div>
          </>
        )}

        {/* Vista Semanal estilo Google Calendar */}
        {!loading && vistaCalendario === 'semana' && (
          <SemanaCalendario
            dias={diasSemana}
            citasPorFecha={citasPorFecha}
            bloqueosPorFecha={horariosBloqueadosPorFecha}
            onEditar={handleEditarCita}
            onCrear={handleCrearCitaDesdeCalendario}
            onMover={moverCitaAPI}
            onBloquear={handleBloquearHorario}
            onDesbloquear={handleEliminarBloqueo}
          />
        )}

        {/* Vista Hoy - Citas del Día con acciones rápidas */}
        {!loading && vistaCalendario === 'hoy' && (
          <div className="agenda-hoy">
            {/* Resumen del día */}
            <div className="agenda-resumen">
              <div className="agenda-stat agenda-stat--total">
                <div className="agenda-stat__valor">{citasHoy.length}</div>
                <div className="agenda-stat__label">Total</div>
              </div>
              <div className="agenda-stat agenda-stat--pendiente">
                <div className="agenda-stat__valor">{conteosHoy.pendientes}</div>
                <div className="agenda-stat__label">Pendientes</div>
              </div>
              <div className="agenda-stat agenda-stat--confirmada">
                <div className="agenda-stat__valor">{conteosHoy.confirmadas}</div>
                <div className="agenda-stat__label">Confirmadas</div>
              </div>
              <div className="agenda-stat agenda-stat--completada">
                <div className="agenda-stat__valor">{conteosHoy.completadas}</div>
                <div className="agenda-stat__label">Completadas</div>
              </div>
            </div>

            {citasHoy.length === 0 ? (
              <div className="agenda-vacia">
                <div className="agenda-vacia__icono" aria-hidden="true">📅</div>
                <p>No hay citas programadas para hoy</p>
              </div>
            ) : (
              <div className="agenda-lista">
                {citasHoy.map(renderAgendaCard)}
              </div>
            )}
          </div>
        )}

        {/* Vista Lista */}
        {!loading && vistaCalendario === 'lista' && (
          <ListaCitas
            citas={citas}
            onCambiarEstado={handleCambiarEstado}
            onEditar={handleEditarCita}
            onEliminar={handleEliminarCita}
          />
        )}
      </div>

      {/* Botón flotante para crear cita (solo móvil) */}
      <button type="button" className="citas-fab" onClick={() => setShowModal(true)} aria-label="Nueva cita">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Modal Nueva/Editar Cita */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editandoCita ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button className="modal-close" aria-label="Cerrar" onClick={handleCerrarModal}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="ficha-form">
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-field full-width" style={{ position: 'relative' }}>
                    <label>Paciente *</label>
                    <input
                      type="text"
                      placeholder="Buscar paciente por nombre o RUT..."
                      value={busquedaPaciente}
                      onChange={(e) => handleBusquedaPaciente(e.target.value)}
                      onFocus={() => {
                        if (busquedaPaciente.trim() !== '') {
                          setMostrarDropdownPacientes(true);
                        }
                      }}
                      required={!formData.pacienteId}
                      autoComplete="off"
                    />
                    <input type="hidden" name="pacienteId" value={formData.pacienteId} />
                    
                    {/* Dropdown de pacientes filtrados */}
                    {mostrarDropdownPacientes && pacientesFiltrados.length > 0 && (
                      <div className="paciente-dropdown" role="listbox">
                        {pacientesFiltrados.map(paciente => (
                          <div
                            key={paciente.id}
                            aria-selected={String(formData.pacienteId) === String(paciente.id)}
                            className="paciente-dropdown__item"
                            {...propsActivable(() => handleSeleccionarPaciente(paciente), 'option')}
                          >
                            <div className="paciente-dropdown__nombre">{paciente.nombre}</div>
                            <div className="paciente-dropdown__detalle">
                              RUT: {paciente.rut} {paciente.telefono && `• Tel: ${paciente.telefono}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Mensaje cuando no hay resultados */}
                    {mostrarDropdownPacientes && busquedaPaciente.trim() !== '' && pacientesFiltrados.length === 0 && (
                      <div className="paciente-dropdown paciente-dropdown__vacio">
                        No se encontraron pacientes
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Hora *</label>
                    <select
                      name="hora"
                      value={formData.hora}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar hora</option>
                      {Array.from({ length: 14 }, (_, i) => i + 8).flatMap(hora =>
                        [0, 15, 30, 45].map(minutos => {
                          const horaStr = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
                          return (
                            <option key={horaStr} value={horaStr}>
                              {horaStr}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Duración (minutos) *</label>
                    <select
                      name="duracion"
                      value={formData.duracion}
                      onChange={handleChange}
                      required
                    >
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos</option>
                      <option value="90">90 minutos</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Tipo de Cita *</label>
                    <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      required
                    >
                      {TIPOS_SESION.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label>Notas</label>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer cita-modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCerrarModal}>
                  Cancelar
                </button>
                <div className="cita-modal-extras">
                  {editandoCita && !editandoCita.tieneSesion && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => handleCrearSesionDesdeCita(editandoCita)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Crear Sesión
                    </button>
                  )}
                  {editandoCita && editandoCita.tieneSesion && (
                    <span className="cita-modal-sesion-ok">
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Sesión registrada
                    </span>
                  )}
                  {editandoCita && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        setShowModal(false);
                        handleRegistrarPago(editandoCita);
                      }}
                      style={{ background: '#FFD700', borderColor: '#FFD700', color: '#000' }}
                      title="Registrar pago de esta cita"
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Registrar Pago
                    </button>
                  )}
                  {editandoCita && editandoCita.estado !== 'cancelada' && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => handleEnviarRecordatorio(editandoCita)}
                      style={{ background: '#25D366', borderColor: '#25D366' }}
                      title="Enviar recordatorio por WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}>
                        <path d="M17 8l4 4m0 0l-4 4m4-4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      WhatsApp
                    </button>
                  )}
                </div>
                <button type="submit" className="btn-primary">
                  {editandoCita ? 'Guardar Cambios' : 'Crear Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Respuestas de pacientes por WhatsApp */}
      {showModalRespuestas && (
        <ModalRespuestas
          respuestas={respuestasPendientes}
          onCerrar={() => setShowModalRespuestas(false)}
          onVerCita={verCitaDeRespuesta}
          onMarcarRevisadas={marcarRespuestasRevisadas}
        />
      )}

      {/* Modal Bloquear Horario */}
      {showModalBloqueo && (
        <div className="modal-overlay" onClick={() => setShowModalBloqueo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bloquear Horario</h2>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModalBloqueo(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCrearBloqueo} className="ficha-form">
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      value={bloqueoData.fecha}
                      onChange={(e) => setBloqueoData({...bloqueoData, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Hora Inicio *</label>
                    <select
                      value={bloqueoData.hora_inicio}
                      onChange={(e) => setBloqueoData({...bloqueoData, hora_inicio: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar hora</option>
                      {Array.from({ length: 14 }, (_, i) => i + 8).map(hora => {
                        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                        return <option key={horaStr} value={horaStr}>{horaStr}</option>;
                      })}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Hora Fin *</label>
                    <select
                      value={bloqueoData.hora_fin}
                      onChange={(e) => setBloqueoData({...bloqueoData, hora_fin: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar hora</option>
                      {Array.from({ length: 14 }, (_, i) => i + 8).map(hora => {
                        const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                        return <option key={horaStr} value={horaStr}>{horaStr}</option>;
                      })}
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label>Motivo</label>
                    <input
                      type="text"
                      value={bloqueoData.motivo}
                      onChange={(e) => setBloqueoData({...bloqueoData, motivo: e.target.value})}
                      placeholder="Ej: Almuerzo, Reunión, Descanso..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModalBloqueo(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Bloquear Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {showModalPago && (
        <div className="modal-overlay" onClick={() => setShowModalPago(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#FFD700' }}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Registrar Pago
              </h2>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModalPago(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleGuardarPago} className="ficha-form">
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Paciente *</label>
                    <input
                      type="text"
                      value={pacientes.find(p => p.id.toString() === pagoData.pacienteId)?.nombre || ''}
                      disabled
                      style={{ background: '#1a1a1a', color: '#888' }}
                    />
                  </div>
                  <div className="form-field">
                    <label>Fecha de Pago *</label>
                    <input
                      type="date"
                      value={pagoData.fechaPago}
                      onChange={(e) => setPagoData({...pagoData, fechaPago: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Monto (CLP) *</label>
                    <input
                      type="number"
                      value={pagoData.monto}
                      onChange={(e) => setPagoData({...pagoData, monto: e.target.value})}
                      placeholder="Ej: 25000"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Método de Pago *</label>
                    <select
                      value={pagoData.metodoPago}
                      onChange={(e) => setPagoData({...pagoData, metodoPago: e.target.value})}
                      required
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta Débito">Tarjeta Débito</option>
                      <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                      <option value="Bono Fonasa">Bono Fonasa</option>
                      <option value="Isapre">Isapre</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Estado *</label>
                    <select
                      value={pagoData.estado}
                      onChange={(e) => setPagoData({...pagoData, estado: e.target.value})}
                      required
                    >
                      <option value="completado">Completado</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>N° Factura / Boleta</label>
                    <input
                      type="text"
                      value={pagoData.numeroFactura}
                      onChange={(e) => setPagoData({...pagoData, numeroFactura: e.target.value})}
                      placeholder="Ej: F-001234"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Concepto</label>
                    <input
                      type="text"
                      value={pagoData.concepto}
                      onChange={(e) => setPagoData({...pagoData, concepto: e.target.value})}
                      placeholder="Ej: Pago de sesión - Evaluación"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Notas</label>
                    <textarea
                      value={pagoData.notas}
                      onChange={(e) => setPagoData({...pagoData, notas: e.target.value})}
                      rows={3}
                      placeholder="Notas adicionales sobre el pago..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModalPago(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px' }}>
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Registrar Pago
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Citas Recurrentes */}
      {showModalRecurrente && (
        <div className="modal-overlay" onClick={() => setShowModalRecurrente(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🔄 Crear Citas Recurrentes</h2>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModalRecurrente(false)}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (recurrenteData.diasSemana.length === 0) {
                mostrarMensaje('Selecciona al menos un día de la semana', true);
                return;
              }
              setCreandoRecurrentes(true);
              try {
                const response = await fetch('/api/citas/recurrentes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...recurrenteData,
                    cantidadSemanas: parseInt(recurrenteData.cantidadSemanas),
                    duracion: parseInt(recurrenteData.duracion)
                  })
                });
                const data = await response.json();
                if (data.success) {
                  mostrarMensaje(data.message, false);
                  setShowModalRecurrente(false);
                  cargarCitas(false);
                  setRecurrenteData({
                    pacienteId: '',
                    horaInicio: '09:00',
                    duracion: '60',
                    tipo: 'Kinesioterapia',
                    notas: '',
                    cantidadSemanas: '8',
                    diasSemana: []
                  });
                  setBusquedaPacienteRecurrente('');
                } else {
                  mostrarMensaje(data.error || 'Error al crear citas', true);
                }
              } catch (err) {
                mostrarMensaje('Error al crear citas recurrentes', true);
              } finally {
                setCreandoRecurrentes(false);
              }
            }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Buscador de paciente */}
              <div className="form-field" style={{ position: 'relative' }}>
                <label>Paciente *</label>
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={busquedaPacienteRecurrente}
                  onChange={(e) => {
                    setBusquedaPacienteRecurrente(e.target.value);
                    setMostrarDropdownRecurrente(true);
                  }}
                  onFocus={() => setMostrarDropdownRecurrente(true)}
                />
                {mostrarDropdownRecurrente && busquedaPacienteRecurrente && (
                  <div className="paciente-dropdown" role="listbox">
                    {pacientes
                      .filter(p => p.nombre?.toLowerCase().includes(busquedaPacienteRecurrente.toLowerCase()) || p.rut?.includes(busquedaPacienteRecurrente))
                      .map(p => (
                        <div
                          key={p.id}
                          aria-selected={recurrenteData.pacienteId === String(p.id)}
                          className="paciente-dropdown__item"
                          {...propsActivable(() => {
                            setRecurrenteData({...recurrenteData, pacienteId: String(p.id)});
                            setBusquedaPacienteRecurrente(`${p.nombre} - ${p.rut}`);
                            setMostrarDropdownRecurrente(false);
                          }, 'option')}
                        >
                          <div className="paciente-dropdown__nombre">{p.nombre}</div>
                          <div className="paciente-dropdown__detalle">{p.rut}</div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Días de la semana */}
              <div className="form-field">
                <label>Días de la semana *</label>
                <div className="dias-chips">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={recurrenteData.diasSemana.includes(idx)}
                      className={`dia-chip ${recurrenteData.diasSemana.includes(idx) ? 'activo' : ''}`}
                      onClick={() => {
                        const dias = recurrenteData.diasSemana.includes(idx)
                          ? recurrenteData.diasSemana.filter(d => d !== idx)
                          : [...recurrenteData.diasSemana, idx];
                        setRecurrenteData({...recurrenteData, diasSemana: dias});
                      }}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-field">
                  <label>Hora</label>
                  <input type="time" value={recurrenteData.horaInicio} onChange={(e) => setRecurrenteData({...recurrenteData, horaInicio: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Duración (min)</label>
                  <select value={recurrenteData.duracion} onChange={(e) => setRecurrenteData({...recurrenteData, duracion: e.target.value})}>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-field">
                  <label>Tipo</label>
                  <select value={recurrenteData.tipo} onChange={(e) => setRecurrenteData({...recurrenteData, tipo: e.target.value})}>
                    {TIPOS_SESION.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Semanas</label>
                  <select value={recurrenteData.cantidadSemanas} onChange={(e) => setRecurrenteData({...recurrenteData, cantidadSemanas: e.target.value})}>
                    {[2,3,4,5,6,7,8,10,12,16].map(n => (
                      <option key={n} value={String(n)}>{n} semanas</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Notas (opcional)</label>
                <input type="text" value={recurrenteData.notas} onChange={(e) => setRecurrenteData({...recurrenteData, notas: e.target.value})} placeholder="Notas para todas las citas..." />
              </div>

              {/* Resumen */}
              {recurrenteData.diasSemana.length > 0 && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(42, 214, 54, 0.05)',
                  border: '1px solid rgba(42, 214, 54, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#ccc'
                }}>
                  Se crearán aprox. <strong style={{ color: '#2AD636' }}>{recurrenteData.diasSemana.length * parseInt(recurrenteData.cantidadSemanas || '0')}</strong> citas
                  ({['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].filter((_, i) => recurrenteData.diasSemana.includes(i)).join(', ')} 
                  a las {recurrenteData.horaInicio} por {recurrenteData.cantidadSemanas} semanas)
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={creandoRecurrentes || !recurrenteData.pacienteId || recurrenteData.diasSemana.length === 0}
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
              >
                {creandoRecurrentes ? 'Creando citas...' : 'Crear Citas Recurrentes'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
