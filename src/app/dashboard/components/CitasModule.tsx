'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { formatearFechaLocal, fechaAString } from '../utils';
import useTouchDrag from '../hooks/useTouchDrag';


// Módulo Citas
export default function CitasModule() {
  // Vista de calendario - se ajusta a móvil después de montar
  const [vistaCalendario, setVistaCalendario] = useState<'mes' | 'semana' | 'lista' | 'hoy'>('mes');
  const [showModal, setShowModal] = useState(false);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [diaActualMobile, setDiaActualMobile] = useState(0); // Índice del día actual en vista móvil (0-6)

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
    if (!confirm('¿Deseas desbloquear este horario?')) return;
    
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

  const esHorarioBloqueado = (fecha: Date, hora: string): any => {
    const fechaStr = fechaAString(fecha);
    return horariosBloqueados.find(bloqueo => {
      if (bloqueo.fecha !== fechaStr) return false;
      
      const horaActual = hora;
      const horaInicio = bloqueo.hora_inicio;
      const horaFin = bloqueo.hora_fin;
      
      return horaActual >= horaInicio && horaActual < horaFin;
    });
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
        await cargarCitas();
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
          await cargarCitas();
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
          await cargarCitas();
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
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/citas/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas();
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
        await cargarCitas();
        mostrarMensaje(`Estado cambiado a ${nuevoEstado}`);
      } else {
        mostrarMensaje(data.error || 'Error al cambiar estado', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cambiar estado', true);
    }
  };

  // Mover cita via API (callback para el hook y para desktop drop)
  const moverCitaAPI = useCallback(async (cita: any, nuevaFecha: Date, nuevaHora: string) => {
    const fechaStr = fechaAString(nuevaFecha);
    const fechaOriginal = cita.fecha;
    
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: cita.pacienteId,
          fecha: fechaStr,
          hora: nuevaHora,
          duracion: cita.duracion,
          tipo: cita.tipo,
          notas: cita.notas
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas();
        const cambioDeDay = fechaOriginal !== fechaStr;
        if (cambioDeDay) {
          const diasNombres = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
          const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const f = new Date(nuevaFecha);
          mostrarMensaje(`Cita movida a ${diasNombres[f.getDay()]} ${f.getDate()} ${mesesNombres[f.getMonth()]} - ${nuevaHora}`);
        } else {
          mostrarMensaje(`Cita movida a ${nuevaHora}`);
        }
      } else {
        mostrarMensaje(data.error || 'Error al mover la cita', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al mover la cita', true);
    }
  }, []);

  // Hook de touch/drag (extrae ~290 lineas de logica touch, long-press, auto-scroll)
  const touchDrag = useTouchDrag({
    onDrop: moverCitaAPI,
    onCrearCita: handleCrearCitaDesdeCalendario,
    onBloquearHorario: handleBloquearHorario,
    onEliminarBloqueo: handleEliminarBloqueo,
    obtenerDiasSemana: () => diasSemana,
  });

  // Desktop drop handler (vista mes)
  const handleDrop = useCallback(async (e: React.DragEvent, nuevaFecha: Date) => {
    e.preventDefault();
    if (touchDrag.citaArrastrada) {
      await moverCitaAPI(touchDrag.citaArrastrada, nuevaFecha, touchDrag.citaArrastrada.hora);
      touchDrag.setCitaArrastrada(null);
    }
  }, [moverCitaAPI, touchDrag]);

  // Aliases para compatibilidad con el JSX existente
  const { citaArrastrada, isReallyDragging, isDraggingTouch, touchPosition, isLongPressing, longPressTarget, longPressTimer } = touchDrag;
  const handleDragStart = touchDrag.handleDragStart;
  const handleDragOver = touchDrag.handleDragOver;
  const handleTouchStart = touchDrag.handleTouchStart;
  const handleTouchMove = touchDrag.handleTouchMove;
  const handleTouchEnd = touchDrag.handleTouchEnd;
  const handleTouchCancel = touchDrag.handleTouchCancel;
  const handleSlotTouchStart = touchDrag.handleSlotTouchStart;
  const handleSlotTouchMove = touchDrag.handleSlotTouchMove;
  const handleSlotTouchEnd = touchDrag.handleSlotTouchEnd;
  const handleSlotTouchCancel = touchDrag.handleSlotTouchCancel;

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
        await cargarCitas(); // Recargar para actualizar indicador
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

    if (!confirm(`¿Enviar recordatorio por WhatsApp a ${citasSinRecordatorio.length} paciente(s)?`)) return;

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
        await cargarCitas();
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
    if (!confirm(`¿Enviar recordatorio por WhatsApp a ${cita.paciente}?`)) return;

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
      !c.recordatorio && 
      c.telefono &&
      (c.fecha === hoyStr || c.fecha === mananaStr)
    );
  }, [citas]);

  // Aliases para compatibilidad con el render existente
  const obtenerDiasMes = () => diasMes;
  const obtenerDiasSemana = () => diasSemana;

  const obtenerCitasDia = (fecha: Date) => {
    const fechaStr = fechaAString(fecha);
    return citas.filter(cita => cita.fecha === fechaStr);
  };

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatearMesAño = (fecha: Date) => {
    return fecha.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const esHoy = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  return (
    <div className="module-container">
      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#3FFF00',
          color: '#0a0a0a',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontWeight: '600',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(63, 255, 0, 0.4)'
        }}>
          {successMessage}
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#ef4444',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontWeight: '600',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
        }}>
          {error}
        </div>
      )}

      <div className="module-header">
        <h2>Gestión de Citas</h2>
        <div className="calendario-controles">
          {/* Selector de Vista */}
          <div className="vista-selector">
            <button 
              className={vistaCalendario === 'mes' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaCalendario('mes')}
            >
              Mes
            </button>
            <button 
              className={vistaCalendario === 'semana' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaCalendario('semana')}
            >
              Semana
            </button>
            <button 
              className={vistaCalendario === 'hoy' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaCalendario('hoy')}
              style={vistaCalendario === 'hoy' ? { background: '#3FFF00', color: '#0a0a0a' } : {}}
            >
              Hoy
            </button>
            <button 
              className={vistaCalendario === 'lista' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaCalendario('lista')}
            >
              Lista
            </button>
          </div>
          <button 
            className="btn-secondary" 
            onClick={() => cargarCitas()}
            title="Refrescar citas"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
              <path d="M21.5 2v6h-6"/>
              <path d="M2.5 22v-6h6"/>
              <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refrescar
          </button>
          <button 
            className="btn-primary" 
            onClick={handleEnvioMasivo}
            disabled={enviandoMasivo}
            style={{ 
              background: '#25D366', 
              borderColor: '#25D366',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              opacity: enviandoMasivo ? 0.6 : 1
            }}
            title="Enviar recordatorios WhatsApp a todas las citas pendientes"
          >
            {enviandoMasivo ? (
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
            )}
            {enviandoMasivo ? 'Enviando...' : `Recordatorios${citas.filter(c => c.estado === 'pendiente' && !c.recordatorio && c.telefono).length > 0 ? ` (${citas.filter(c => c.estado === 'pendiente' && !c.recordatorio && c.telefono).length})` : ''}`}
          </button>
          <button className="btn-primary" onClick={() => setShowModalRecurrente(true)} style={{ background: '#1e40af' }}>
            Recurrentes
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Nueva Cita
          </button>
        </div>
      </div>

      <div className="module-content">
        {/* Loading Spinner */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            background: '#1a1a1a',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Navegación del Calendario */}
        {!loading && (
        <div className="calendario-nav">
          <button 
            className="btn-secondary" 
            onClick={vistaCalendario === 'semana' ? semanaAnterior : mesAnterior}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <h3 className="calendario-titulo">
            {vistaCalendario === 'semana' 
              ? formatearFecha(fechaActual)
              : formatearMesAño(fechaActual)
            }
          </h3>
          <button className="btn-secondary" onClick={hoy}>
            Hoy
          </button>
          <button 
            className="btn-secondary"
            onClick={vistaCalendario === 'semana' ? semanaSiguiente : mesSiguiente}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
        )}

        {/* Vista Mensual */}
        {!loading && vistaCalendario === 'mes' && (
          <div className="calendario-mes">
            <div className="calendario-header">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                <div key={dia} className="dia-semana">{dia}</div>
              ))}
            </div>
            <div className="calendario-grid">
              {obtenerDiasMes().map((dia, index) => (
                <div 
                  key={index} 
                  className={`dia-celda ${dia ? '' : 'vacio'} ${dia && esHoy(dia) ? 'hoy' : ''}`}
                >
                  {dia && (
                    <>
                      <div className="dia-numero">{dia.getDate()}</div>
                      <div className="citas-dia">
                        {obtenerCitasDia(dia).map(cita => (
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
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista Semanal */}
        {!loading && vistaCalendario === 'semana' && (() => {
          console.log('🗓️ Vista semanal - Total citas:', citas.length);
          console.log('📋 Citas disponibles:', citas);
          console.log('📅 Días de la semana:', obtenerDiasSemana().map(d => d.toISOString().split('T')[0]));
          return null;
        })()}
        {!loading && vistaCalendario === 'semana' && (
          <div>
            {/* Navegación móvil para cambiar de día */}
            <div className="semana-mobile-nav">
              <button 
                onClick={() => setDiaActualMobile(prev => prev > 0 ? prev - 1 : 6)}
                aria-label="Día anterior"
              >
                ← Anterior
              </button>
              <div className="dia-actual">
                {obtenerDiasSemana()[diaActualMobile].toLocaleDateString('es-CL', { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long'
                })}
              </div>
              <button 
                onClick={() => setDiaActualMobile(prev => prev < 6 ? prev + 1 : 0)}
                aria-label="Día siguiente"
              >
                Siguiente →
              </button>
            </div>

            <div className="calendario-semana-horarios">
              {/* Header con días */}
              <div className="semana-horarios-header">
                <div className="hora-column-header">Hora</div>
                {obtenerDiasSemana().map((dia, index) => (
                  <div 
                    key={index} 
                    className={`dia-column-header ${esHoy(dia) ? 'hoy' : ''} ${index === diaActualMobile ? 'dia-actual-mobile' : ''}`}
                  >
                    <div className="dia-nombre">
                      {dia.toLocaleDateString('es-CL', { weekday: 'short' })}
                    </div>
                    <div className="dia-numero">{dia.getDate()}</div>
                  </div>
                ))}
              </div>

            {/* Grid de horarios */}
            <div className="semana-horarios-grid">
              {/* Generar filas de horarios de 8:00 a 21:00 (slots de 1 hora visualmente) */}
              {Array.from({ length: 14 }, (_, i) => i + 8).map(hora => (
                <div key={hora} className="hora-row">
                  {/* Columna de hora */}
                  <div className="hora-label">
                    {`${hora.toString().padStart(2, '0')}:00`}
                  </div>
                  
                  {/* Columnas de días */}
                  {obtenerDiasSemana().map((dia, diaIndex) => {
                    const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                    // Buscar citas que empiecen en esta hora (cualquier minuto: 00, 15, 30, 45)
                    const citasEnHora = obtenerCitasDia(dia).filter(cita => {
                      const horaCita = cita.hora.split(':')[0];
                      const horaSlot = hora.toString().padStart(2, '0');
                      return horaCita === horaSlot;
                    });
                    
                    const bloqueado = esHorarioBloqueado(dia, horaStr);
                    
                    return (
                      <div 
                        key={diaIndex}
                        className={`hora-slot ${citaArrastrada ? 'drop-zone' : ''} ${diaIndex === diaActualMobile ? 'dia-actual-mobile' : ''} ${bloqueado ? 'bloqueado' : ''} ${isLongPressing && longPressTarget?.hora === horaStr ? 'long-pressing' : ''}`}
                        data-dia-index={diaIndex}
                        data-hora={horaStr}
                        onDragOver={handleDragOver}
                        onTouchStart={(e) => {
                          // Si el slot está vacío, detectar long press para bloquear
                          if (citasEnHora.length === 0) {
                            handleSlotTouchStart(e, dia, horaStr, bloqueado, citasEnHora);
                          }
                        }}
                        onTouchMove={(e) => {
                          if (citasEnHora.length === 0 && longPressTimer) {
                            handleSlotTouchMove(e);
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (citasEnHora.length === 0) {
                            handleSlotTouchEnd(e, dia, horaStr, bloqueado, citasEnHora);
                          }
                        }}
                        onTouchCancel={() => {
                          if (citasEnHora.length === 0) {
                            handleSlotTouchCancel();
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (citaArrastrada) {
                            // Calcular en qué cuarto del slot (15 minutos) soltó la cita
                            const rect = e.currentTarget.getBoundingClientRect();
                            const relativeY = e.clientY - rect.top;
                            const slotHeight = rect.height;
                            const quarter = Math.floor((relativeY / slotHeight) * 4); // 0, 1, 2, 3
                            
                            // Convertir quarter a minutos (0=00, 1=15, 2=30, 3=45)
                            const minutos = Math.min(quarter * 15, 45);
                            
                            // Construir la hora completa (HH:MM)
                            const [horaNum] = horaStr.split(':');
                            const horaCompleta = `${horaNum}:${minutos.toString().padStart(2, '0')}`;
                            
                            moverCitaAPI(citaArrastrada, dia, horaCompleta).then(() => touchDrag.setCitaArrastrada(null));
                          }
                        }}
                        onClick={(e) => {
                          // Solo crear cita si no hay citas, no está bloqueado y no se está arrastrando
                          if (citasEnHora.length === 0 && !bloqueado && !citaArrastrada && !isDraggingTouch) {
                            // Calcular en qué cuarto del slot (15 minutos) hizo clic
                            const rect = e.currentTarget.getBoundingClientRect();
                            const relativeY = e.clientY - rect.top;
                            const slotHeight = rect.height;
                            const quarter = Math.floor((relativeY / slotHeight) * 4); // 0, 1, 2, 3
                            
                            // Convertir quarter a minutos (0=00, 1=15, 2=30, 3=45)
                            const minutos = Math.min(quarter * 15, 45);
                            
                            // Construir la hora completa (HH:MM)
                            const [horaNum] = horaStr.split(':');
                            const horaCompleta = `${horaNum}:${minutos.toString().padStart(2, '0')}`;
                            
                            handleCrearCitaDesdeCalendario(dia, horaCompleta);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (bloqueado) {
                            // Si está bloqueado, desbloquear
                            handleEliminarBloqueo(bloqueado.id);
                          } else if (citasEnHora.length === 0) {
                            // Si está vacío, bloquear
                            handleBloquearHorario(dia, horaStr);
                          }
                        }}
                        style={{ cursor: citasEnHora.length === 0 && !bloqueado ? 'pointer' : bloqueado ? 'not-allowed' : 'default' }}
                      >
                        {bloqueado && (
                          <div className="horario-bloqueado-indicator">
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                            </svg>
                            <span>{bloqueado.motivo || 'Bloqueado'}</span>
                          </div>
                        )}
                        {citasEnHora.map(cita => (
                          <div 
                            key={cita.id}
                            className={`cita-horario ${cita.estado} ${citaArrastrada?.id === cita.id ? 'dragging' : ''} ${isDraggingTouch ? 'touch-dragging' : ''} ${cita.tieneSesion ? 'con-sesion' : ''}`}
                            style={{ touchAction: 'none' }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, cita)}
                            onTouchStart={(e) => handleTouchStart(e, cita)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchCancel}
                            onClick={() => !isDraggingTouch && handleEditarCita(cita)}
                            title={cita.tieneSesion ? `Tiene sesión registrada (${cita.sesionEstado})` : 'Sin sesión registrada'}
                          >
                            <div className="cita-horario-hora">
                              {cita.hora}
                              {cita.tieneSesion && (
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '12px', height: '12px', marginLeft: '4px', color: '#3FFF00' }}>
                                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              )}
                              {cita.tienePago && (
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '12px', height: '12px', marginLeft: '4px', color: '#FFD700' }}>
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              )}
                              {cita.recordatorio && (
                                <span style={{ marginLeft: '4px', fontSize: '10px' }} title={
                                  cita.recordatorio.respuesta === 'CONFIRMAR' ? 'Confirmado por WhatsApp' :
                                  cita.recordatorio.respuesta === 'CANCELAR' ? 'Cancelado por WhatsApp' :
                                  cita.recordatorio.respuesta === 'REAGENDAR' ? 'Pidió reagendar' :
                                  'Recordatorio enviado'
                                }>
                                  {cita.recordatorio.respuesta === 'CONFIRMAR' ? '✅' :
                                   cita.recordatorio.respuesta === 'CANCELAR' ? '❌' :
                                   cita.recordatorio.respuesta === 'REAGENDAR' ? '📅' : '📤'}
                                </span>
                              )}
                            </div>
                            <div className="cita-horario-paciente">{cita.paciente}</div>
                            <div className="cita-horario-tipo">
                              {cita.tipo}
                              {cita.tienePago && cita.totalPagado > 0 && (
                                <span style={{ fontSize: '0.65rem', color: '#FFD700', marginLeft: '4px' }}>
                                  ${new Intl.NumberFormat('es-CL').format(cita.totalPagado)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {/* Vista Hoy - Citas del Día con acciones rápidas */}
        {!loading && vistaCalendario === 'hoy' && (() => {
          const hoyStr = fechaAString(new Date());
          const citasHoy = citas
            .filter(c => c.fecha === hoyStr)
            .sort((a, b) => a.hora.localeCompare(b.hora));
          const confirmadas = citasHoy.filter(c => c.estado === 'confirmada').length;
          const pendientes = citasHoy.filter(c => c.estado === 'pendiente').length;
          const completadas = citasHoy.filter(c => c.estado === 'completada').length;
          const canceladas = citasHoy.filter(c => c.estado === 'cancelada').length;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Resumen del día */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3FFF00' }}>{citasHoy.length}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Total Hoy</div>
                </div>
                <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{pendientes}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Pendientes</div>
                </div>
                <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{confirmadas}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Confirmadas</div>
                </div>
                <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{completadas}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Completadas</div>
                </div>
              </div>

              {citasHoy.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#666',
                  border: '2px dashed #2a2a2a',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📅</div>
                  <p style={{ margin: 0, fontSize: '1.1rem' }}>No hay citas programadas para hoy</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {citasHoy.map((cita, index) => {
                    const ahora = new Date();
                    const [h, m] = cita.hora.split(':').map(Number);
                    const horaCita = new Date();
                    horaCita.setHours(h, m, 0, 0);
                    const enCurso = ahora >= horaCita && ahora <= new Date(horaCita.getTime() + cita.duracion * 60000);
                    const pasada = ahora > new Date(horaCita.getTime() + cita.duracion * 60000);

                    return (
                      <div key={cita.id} style={{
                        background: enCurso ? 'rgba(63, 255, 0, 0.05)' : '#1a1a1a',
                        border: enCurso ? '2px solid #3FFF00' : '1px solid #2a2a2a',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        opacity: cita.estado === 'cancelada' ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '48px', height: '48px',
                              background: enCurso ? '#3FFF00' : pasada ? '#333' : '#1e40af',
                              borderRadius: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: enCurso ? '#0a0a0a' : '#fff',
                              fontWeight: 700, fontSize: '0.9rem'
                            }}>
                              {cita.hora}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff' }}>{cita.paciente}</div>
                              <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {cita.tipo} · {cita.duracion} min
                                {cita.recordatorio && (
                                  <span style={{ fontSize: '0.75rem' }}>
                                    {cita.recordatorio.respuesta === 'CONFIRMAR' ? '✅ Confirmó' :
                                     cita.recordatorio.respuesta === 'CANCELAR' ? '❌ Canceló' :
                                     cita.recordatorio.respuesta === 'REAGENDAR' ? '📅 Reagendar' : '📤 Enviado'}
                                  </span>
                                )}
                                {enCurso && <span style={{ color: '#3FFF00', fontWeight: 600 }}>EN CURSO</span>}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: cita.estado === 'confirmada' ? 'rgba(16, 185, 129, 0.2)' :
                                       cita.estado === 'completada' ? 'rgba(59, 130, 246, 0.2)' :
                                       cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: cita.estado === 'confirmada' ? '#10b981' :
                                   cita.estado === 'completada' ? '#3b82f6' :
                                   cita.estado === 'cancelada' ? '#ef4444' : '#f59e0b'
                          }}>
                            {cita.estado}
                          </span>
                        </div>

                        {/* Acciones rápidas */}
                        {cita.estado !== 'cancelada' && cita.estado !== 'completada' && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                            paddingTop: '0.75rem', borderTop: '1px solid #2a2a2a'
                          }}>
                            {cita.estado === 'pendiente' && (
                              <button
                                onClick={() => handleCambiarEstado(cita.id)}
                                style={{
                                  padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                                  background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                              >
                                ✓ Confirmar
                              </button>
                            )}
                            {!cita.recordatorio && cita.telefono && (
                              <button
                                onClick={() => handleEnviarRecordatorio(cita)}
                                style={{
                                  padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                                  background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.3)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                              >
                                📱 WhatsApp
                              </button>
                            )}
                            {!cita.tieneSesion && (
                              <button
                                onClick={() => handleCrearSesionDesdeCita(cita)}
                                style={{
                                  padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                                  background: 'rgba(63, 255, 0, 0.1)', color: '#3FFF00', border: '1px solid rgba(63, 255, 0, 0.3)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                              >
                                + Sesión
                              </button>
                            )}
                            <button
                              onClick={() => handleRegistrarPago(cita)}
                              style={{
                                padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                                background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.3)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                              }}
                            >
                              $ Pago
                            </button>
                            <button
                              onClick={() => handleEditarCita(cita)}
                              style={{
                                padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                                background: 'rgba(255, 255, 255, 0.05)', color: '#888', border: '1px solid #333',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                              }}
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        )}

                        {/* Info adicional */}
                        {cita.tieneSesion && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#3FFF00', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: '14px', height: '14px' }}>
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            Sesión registrada ({cita.sesionEstado})
                          </div>
                        )}
                        {cita.notas && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                            {cita.notas}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Vista Lista */}
        {!loading && vistaCalendario === 'lista' && (
          <div className="citas-lista">
            {citas.length === 0 ? (
              <p className="empty-state">No hay citas programadas</p>
            ) : (
              <div className="lista-grid">
                {citas.map(cita => (
                  <div key={cita.id} className={`cita-lista-item ${cita.estado}`}>
                    <div className="cita-lista-fecha">
                      <div className="fecha-dia">
                        {(() => {
                          const [year, month, day] = cita.fecha.split('-');
                          const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return fecha.toLocaleDateString('es-CL', { day: 'numeric' });
                        })()}
                      </div>
                      <div className="fecha-mes">
                        {(() => {
                          const [year, month, day] = cita.fecha.split('-');
                          const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return fecha.toLocaleDateString('es-CL', { month: 'short' });
                        })()}
                      </div>
                    </div>
                    <div className="cita-lista-info">
                      <h4>{cita.paciente}</h4>
                      <div className="cita-lista-detalles">
                        <span className="detalle-item">
                          <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {cita.hora} ({cita.duracion} min)
                        </span>
                        <span className="detalle-item">
                          <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px' }}>
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {cita.tipo}
                        </span>
                      </div>
                    </div>
                    <div className="cita-lista-acciones">
                      <span 
                        className={`estado-badge ${cita.estado}`}
                        onClick={() => handleCambiarEstado(cita.id)}
                        style={{ cursor: 'pointer' }}
                        title="Click para cambiar estado"
                      >
                        {cita.estado === 'confirmada' ? 'Confirmada' : 
                         cita.estado === 'cancelada' ? 'Cancelada' : 
                         cita.estado === 'completada' ? 'Completada' : 'Pendiente'}
                      </span>
                      <button 
                        className="btn-icon"
                        onClick={() => handleEditarCita(cita)}
                        title="Editar cita"
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button 
                        className="btn-icon delete"
                        onClick={() => handleEliminarCita(cita.id)}
                        title="Eliminar cita"
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nueva/Editar Cita */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editandoCita ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button className="modal-close" onClick={handleCerrarModal}>
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
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #3FFF00',
                        borderRadius: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                      }}>
                        {pacientesFiltrados.map(paciente => (
                          <div
                            key={paciente.id}
                            onClick={() => handleSeleccionarPaciente(paciente)}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #2a2a2a',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: 600, color: '#fff' }}>{paciente.nombre}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>
                              RUT: {paciente.rut} {paciente.telefono && `• Tel: ${paciente.telefono}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Mensaje cuando no hay resultados */}
                    {mostrarDropdownPacientes && busquedaPaciente.trim() !== '' && pacientesFiltrados.length === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #3FFF00',
                        borderRadius: '8px',
                        padding: '12px',
                        zIndex: 1000,
                        marginTop: '4px',
                        color: '#888',
                        textAlign: 'center'
                      }}>
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
                      <option value="Kinesioterapia">Kinesioterapia</option>
                      <option value="Control">Control</option>
                      <option value="Rehabilitación">Rehabilitación</option>
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
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCerrarModal}>
                  Cancelar
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', marginRight: 'auto', alignItems: 'center' }}>
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
                    <span style={{ color: '#3FFF00', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
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

      {/* Modal Bloquear Horario */}
      {showModalBloqueo && (
        <div className="modal-overlay" onClick={() => setShowModalBloqueo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bloquear Horario</h2>
              <button className="modal-close" onClick={() => setShowModalBloqueo(false)}>
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
              <button className="modal-close" onClick={() => setShowModalPago(false)}>
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
              <button className="modal-close" onClick={() => setShowModalRecurrente(false)}>
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
                  cargarCitas();
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
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 1000
                  }}>
                    {pacientes
                      .filter(p => p.nombre?.toLowerCase().includes(busquedaPacienteRecurrente.toLowerCase()) || p.rut?.includes(busquedaPacienteRecurrente))
                      .map(p => (
                        <div key={p.id} onClick={() => {
                          setRecurrenteData({...recurrenteData, pacienteId: String(p.id)});
                          setBusquedaPacienteRecurrente(`${p.nombre} - ${p.rut}`);
                          setMostrarDropdownRecurrente(false);
                        }} style={{
                          padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #222'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#2a2a2a')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <strong>{p.nombre}</strong> <span style={{ color: '#888' }}>- {p.rut}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Días de la semana */}
              <div className="form-field">
                <label>Días de la semana *</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const dias = recurrenteData.diasSemana.includes(idx)
                          ? recurrenteData.diasSemana.filter(d => d !== idx)
                          : [...recurrenteData.diasSemana, idx];
                        setRecurrenteData({...recurrenteData, diasSemana: dias});
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: recurrenteData.diasSemana.includes(idx) ? '2px solid #3FFF00' : '1px solid #444',
                        background: recurrenteData.diasSemana.includes(idx) ? 'rgba(63, 255, 0, 0.15)' : '#1a1a1a',
                        color: recurrenteData.diasSemana.includes(idx) ? '#3FFF00' : '#999',
                        cursor: 'pointer',
                        fontWeight: recurrenteData.diasSemana.includes(idx) ? 700 : 400,
                        fontSize: '0.85rem'
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
                    <option value="Kinesioterapia">Kinesioterapia</option>
                    <option value="Control">Control</option>
                    <option value="Rehabilitación">Rehabilitación</option>
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
                  background: 'rgba(63, 255, 0, 0.05)',
                  border: '1px solid rgba(63, 255, 0, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#ccc'
                }}>
                  Se crearán aprox. <strong style={{ color: '#3FFF00' }}>{recurrenteData.diasSemana.length * parseInt(recurrenteData.cantidadSemanas || '0')}</strong> citas
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

      {/* Elemento flotante que sigue el dedo durante el drag */}
      {isReallyDragging && touchPosition && citaArrastrada && (
        <div 
          className="drag-ghost"
          style={{
            left: `${touchPosition.x}px`,
            top: `${touchPosition.y}px`,
          }}
        >
          <div className="cita-horario" style={{ margin: 0 }}>
            <div className="cita-horario-hora">{citaArrastrada.hora}</div>
            <div className="cita-horario-paciente">{citaArrastrada.paciente}</div>
            <div className="cita-horario-tipo">{citaArrastrada.tipo}</div>
          </div>
        </div>
      )}
    </div>
  );
}
