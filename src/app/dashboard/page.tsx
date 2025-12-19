'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import './calendario.css';

type Module = 'pacientes' | 'citas' | 'sesiones' | 'pagos' | 'configuracion';

// Función global para formatear fechas sin problemas de zona horaria
const formatearFechaLocal = (fechaStr: string) => {
  const [year, month, day] = fechaStr.split('-');
  const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function DashboardPage() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    pacientesActivos: 0,
    pacientesNuevos: 0,
    citasHoy: 0,
    citasSemana: 0,
    sesionesMes: 0,
    sesionesCompletadas: 0,
    ingresosMes: 0,
    ingresosTotales: 0,
    pagosPendientes: 0
  });
  const [configuracionesGlobales, setConfiguracionesGlobales] = useState<any>({});

  useEffect(() => {
    fetchUser();
    cargarEstadisticas();
    cargarConfiguracionesGlobales();
    inicializarCronAutomatico();
  }, []);

  const inicializarCronAutomatico = async () => {
    try {
      console.log('🔄 Inicializando sistema de recordatorios automáticos...');
      const response = await fetch('/api/cron/init', { method: 'POST' });
      
      if (!response.ok) {
        console.warn('⚠️ No se pudo inicializar el cron automáticamente');
        return;
      }
      
      const data = await response.json();
      console.log('✅ Sistema de recordatorios iniciado:', data);
    } catch (error) {
      console.error('❌ Error al inicializar cron:', error);
      // No lanzar el error para no interrumpir la carga del dashboard
    }
  };

  const cargarConfiguracionesGlobales = async () => {
    try {
      const response = await fetch('/api/configuraciones');
      const data = await response.json();
      if (data.success) {
        const configMap: any = {};
        data.configuraciones.forEach((config: any) => {
          configMap[config.clave] = config;
        });
        setConfiguracionesGlobales(configMap);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const getConfigValue = (clave: string, defaultValue: any = '') => {
    return configuracionesGlobales[clave]?.valor ?? defaultValue;
  };

  // Recargar estadísticas cuando se vuelve al dashboard principal
  useEffect(() => {
    if (!selectedModule) {
      cargarEstadisticas();
    }
  }, [selectedModule]);

  const cargarEstadisticas = async () => {
    try {
      console.log('🔄 Cargando estadísticas...');
      
      // Cargar estadísticas de pacientes
      const resPacientes = await fetch('/api/pacientes');
      const dataPacientes = await resPacientes.json();
      
      console.log('📊 Datos de pacientes:', JSON.stringify(dataPacientes, null, 2));
      
      if (dataPacientes.success) {
        console.log('✅ Success es true, pacientes:', dataPacientes.pacientes);
        console.log('📝 Cantidad de pacientes:', dataPacientes.pacientes?.length);
        
        const totalPacientes = dataPacientes.pacientes?.length || 0;
        const pacientesActivos = dataPacientes.pacientes?.filter((p: any) => p.activo).length || 0;
        
        // Calcular pacientes nuevos este mes
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        const pacientesNuevos = dataPacientes.pacientes?.filter((p: any) => {
          const fechaCreacion = new Date(p.createdAt);
          return fechaCreacion >= inicioMes;
        }).length || 0;

        console.log('👥 Estadísticas pacientes:', { totalPacientes, pacientesActivos, pacientesNuevos });
        console.log('🔢 Valores a actualizar:', { totalPacientes, pacientesActivos, pacientesNuevos });

        setStats(prev => {
          const newStats = {
            ...prev,
            totalPacientes,
            pacientesActivos,
            pacientesNuevos
          };
          console.log('📊 Estado actualizado:', newStats);
          return newStats;
        });
      } else {
        console.log('❌ Success es false o no existe');
      }

      // Cargar estadísticas de citas
      const resCitas = await fetch('/api/citas/estadisticas');
      const dataCitas = await resCitas.json();
      
      console.log('📅 Datos de citas:', dataCitas);
      
      if (dataCitas.success) {
        const citasStats = {
          citasHoy: dataCitas.estadisticas.hoy,
          citasSemana: dataCitas.estadisticas.proximasCitas?.length || 0,
          sesionesMes: dataCitas.estadisticas.mesActual,
          sesionesCompletadas: dataCitas.estadisticas.porEstado?.find((e: any) => e.estado === 'completada')?.cantidad || 0
        };
        
        console.log('📈 Estadísticas citas:', citasStats);
        
        setStats(prev => ({
          ...prev,
          ...citasStats
        }));
      }

      // Cargar estadísticas de pagos
      const resPagos = await fetch('/api/pagos/estadisticas');
      const dataPagos = await resPagos.json();
      
      console.log('💰 Datos de pagos:', dataPagos);
      
      if (dataPagos.success) {
        const pagosStats = {
          ingresosMes: dataPagos.estadisticas.ingresosMes || 0,
          ingresosTotales: dataPagos.estadisticas.ingresosTotales || 0,
          pagosPendientes: dataPagos.estadisticas.pagosPendientes?.cantidad || 0
        };
        
        console.log('💵 Estadísticas pagos:', pagosStats);
        
        setStats(prev => ({
          ...prev,
          ...pagosStats
        }));
      }
      
      console.log('✅ Estadísticas cargadas');
    } catch (error) {
      console.error('❌ Error al cargar estadísticas:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si hay un módulo seleccionado, mostrar ese módulo
  if (selectedModule) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="back-button" onClick={() => setSelectedModule(null)}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Volver al Dashboard
            </button>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
              </div>
              <div>
                <p className="user-name">{user?.nombre} {user?.apellido}</p>
                <p className="user-email">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </header>
        <main className="dashboard-main">
          {selectedModule === 'pacientes' && <PacientesModule configuraciones={configuracionesGlobales} />}
          {selectedModule === 'citas' && <CitasModule />}
          {selectedModule === 'sesiones' && <SesionesModule />}
          {selectedModule === 'pagos' && <PagosModule />}
          {selectedModule === 'configuracion' && <ConfiguracionModule />}
        </main>
      </div>
    );
  }

  // Vista principal del dashboard con tarjetas
  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          {getConfigValue('logo_url', '') ? (
            <div style={{ marginRight: '1rem' }}>
              <img 
                src={getConfigValue('logo_url', '')} 
                alt={getConfigValue('nombre_centro', 'NAGO-KINE')}
                style={{ 
                  maxHeight: '70px', 
                  maxWidth: '220px', 
                  objectFit: 'contain' 
                }}
              />
            </div>
          ) : (
            <div className="logo-circle-small">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          )}
          <div>
            <h1>{getConfigValue('nombre_centro', 'NAGO-KINE')}</h1>
            <p>Sistema de Gestión Kinesiológica</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <div>
              <p className="user-name">{user?.nombre} {user?.apellido}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Dashboard Main */}
      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2>Bienvenido, {user?.nombre}</h2>
          <p>Selecciona un módulo para comenzar</p>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Total Pacientes</p>
              <h3 className="stat-value">{stats.totalPacientes}</h3>
              <p className={`stat-trend ${stats.pacientesNuevos > 0 ? 'positive' : 'neutral'}`}>
                {stats.pacientesNuevos > 0 ? `+${stats.pacientesNuevos} este mes` : 'Sin cambios este mes'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Citas Hoy</p>
              <h3 className="stat-value">{stats.citasHoy}</h3>
              <p className="stat-trend neutral">
                {stats.citasHoy > 0 ? `${stats.citasHoy} programadas` : 'Sin citas programadas'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Sesiones del Mes</p>
              <h3 className="stat-value">{stats.sesionesMes}</h3>
              <p className="stat-trend neutral">{stats.sesionesCompletadas} completadas</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Ingresos del Mes</p>
              <h3 className="stat-value">${stats.ingresosMes.toLocaleString('es-CL')}</h3>
              <p className="stat-trend neutral">
                {stats.ingresosMes > 0 ? 'Pagos registrados' : 'Sin pagos registrados'}
              </p>
            </div>
          </div>
        </div>

        {/* Módulos Cards */}
        <div className="modules-grid">
          <div className="module-card" onClick={() => setSelectedModule('pacientes')}>
            <div className="module-card-header">
              <div className="module-icon green">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Pacientes</h3>
            </div>
            <p className="module-description">
              Gestiona la información completa de tus pacientes, fichas médicas y historial clínico.
            </p>
            <div className="module-stats">
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.pacientesActivos}</span>
                <span className="module-stat-label">Activos</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.pacientesNuevos}</span>
                <span className="module-stat-label">Nuevos</span>
              </div>
            </div>
            <div className="module-footer">
              <span>Ir al módulo</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="module-card" onClick={() => setSelectedModule('citas')}>
            <div className="module-card-header">
              <div className="module-icon blue">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Citas</h3>
            </div>
            <p className="module-description">
              Programa y administra las citas de tus pacientes con calendario integrado.
            </p>
            <div className="module-stats">
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.citasHoy}</span>
                <span className="module-stat-label">Hoy</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.citasSemana}</span>
                <span className="module-stat-label">Semana</span>
              </div>
            </div>
            <div className="module-footer">
              <span>Ir al módulo</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="module-card" onClick={() => setSelectedModule('sesiones')}>
            <div className="module-card-header">
              <div className="module-icon purple">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Sesiones</h3>
            </div>
            <p className="module-description">
              Registra y da seguimiento a las sesiones de kinesiología de cada paciente.
            </p>
            <div className="module-stats">
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.sesionesMes}</span>
                <span className="module-stat-label">Mes Actual</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.sesionesCompletadas}</span>
                <span className="module-stat-label">Completadas</span>
              </div>
            </div>
            <div className="module-footer">
              <span>Ir al módulo</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="module-card" onClick={() => setSelectedModule('pagos')}>
            <div className="module-card-header">
              <div className="module-icon orange">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Pagos</h3>
            </div>
            <p className="module-description">
              Administra los pagos, facturas y reportes financieros del centro.
            </p>
            <div className="module-stats">
              <div className="module-stat-item">
                <span className="module-stat-value">${stats.ingresosMes.toLocaleString('es-CL')}</span>
                <span className="module-stat-label">Este mes</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value">{stats.pagosPendientes}</span>
                <span className="module-stat-label">Pendientes</span>
              </div>
            </div>
            <div className="module-footer">
              <span>Ir al módulo</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="module-card" onClick={() => setSelectedModule('configuracion')}>
            <div className="module-card-header">
              <div className="module-icon gray">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                  <path d="m18.36 5.64-4.24 4.24m0 4.24 4.24 4.24M5.64 5.64l4.24 4.24m0 4.24-4.24 4.24" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Configuración</h3>
            </div>
            <p className="module-description">
              Personaliza el sistema según las necesidades de tu centro kinesiológico.
            </p>
            <div className="module-stats">
              <div className="module-stat-item">
                <span className="module-stat-value">5</span>
                <span className="module-stat-label">Secciones</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value">✓</span>
                <span className="module-stat-label">Activo</span>
              </div>
            </div>
            <div className="module-footer">
              <span>Ir al módulo</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Módulo Pacientes
function PacientesModule({ configuraciones = {} }: { configuraciones?: any }) {
  const [showModal, setShowModal] = useState(false);
  const [showFichaCompleta, setShowFichaCompleta] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const getConfigValue = (clave: string, defaultValue: any = '') => {
    return configuraciones[clave]?.valor ?? defaultValue;
  };
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [sesionesPaciente, setSesionesPaciente] = useState<any[]>([]);
  const [loadingSesiones, setLoadingSesiones] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
  }, []);

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
      
      // Cerrar modal y limpiar formulario
      setShowModal(false);
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
    
    // Cargar sesiones del paciente
    try {
      setLoadingSesiones(true);
      const response = await fetch(`/api/pacientes/${paciente.id}/sesiones`);
      const data = await response.json();
      
      if (data.success) {
        setSesionesPaciente(data.sesiones);
      }
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      setSesionesPaciente([]);
    } finally {
      setLoadingSesiones(false);
    }
  };

  const handleDescargarPDF = () => {
    if (!pacienteSeleccionado) return;
    
    // Obtener configuraciones
    const logoUrl = getConfigValue('logo_url', '');
    const nombreCentro = getConfigValue('nombre_centro', 'NAGO-KINE');
    
    // Crear contenido HTML para el PDF
    const contenidoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ficha Paciente - ${pacienteSeleccionado.nombre}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #1e293b;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
          }
          .titulo {
            text-align: center;
            color: #1e293b;
            margin: 20px 0;
          }
          .seccion {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          .seccion-titulo {
            background: #10b981;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            margin-bottom: 15px;
            border-radius: 5px;
          }
          .campo {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .campo-label {
            font-weight: bold;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
          }
          .campo-valor {
            color: #1e293b;
            margin-top: 5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${logoUrl ? 
              `<img src="${window.location.origin}${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;" />` : 
              nombreCentro
            }
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b;">Fecha de emisión</div>
            <div style="font-weight: bold;">${new Date().toLocaleDateString('es-CL')}</div>
          </div>
        </div>

        <h1 class="titulo">FICHA CLÍNICA DE PACIENTE</h1>

        <div class="seccion">
          <div class="seccion-titulo">Datos Personales</div>
          <div class="grid-2">
            <div class="campo">
              <div class="campo-label">Nombre Completo</div>
              <div class="campo-valor">${pacienteSeleccionado.nombre}</div>
            </div>
            <div class="campo">
              <div class="campo-label">RUT</div>
              <div class="campo-valor">${pacienteSeleccionado.rut}</div>
            </div>
            <div class="campo">
              <div class="campo-label">Teléfono</div>
              <div class="campo-valor">${pacienteSeleccionado.telefono}</div>
            </div>
            <div class="campo">
              <div class="campo-label">Edad</div>
              <div class="campo-valor">${pacienteSeleccionado.edad} años</div>
            </div>
            <div class="campo">
              <div class="campo-label">Altura</div>
              <div class="campo-valor">${pacienteSeleccionado.altura} cm</div>
            </div>
            <div class="campo">
              <div class="campo-label">Peso</div>
              <div class="campo-valor">${pacienteSeleccionado.peso} kg</div>
            </div>
          </div>
          <div class="campo">
            <div class="campo-label">Ocupación</div>
            <div class="campo-valor">${pacienteSeleccionado.ocupacion || 'No especificado'}</div>
          </div>
        </div>

        <div class="seccion">
          <div class="seccion-titulo">Antecedentes Médicos</div>
          <div class="campo">
            <div class="campo-label">Enfermedades</div>
            <div class="campo-valor">${pacienteSeleccionado.enfermedades || 'Ninguna'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Enfermedades Hereditarias</div>
            <div class="campo-valor">${pacienteSeleccionado.enfermedades_hereditarias || 'Ninguna'}</div>
          </div>
        </div>

        <div class="seccion">
          <div class="seccion-titulo">Estilo de Vida</div>
          <div class="campo">
            <div class="campo-label">Deportes</div>
            <div class="campo-valor">${pacienteSeleccionado.deportes || 'No especificado'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Alimentación</div>
            <div class="campo-valor">${pacienteSeleccionado.alimentacion || 'No especificado'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Consumo de Agua</div>
            <div class="campo-valor">${pacienteSeleccionado.consumo_agua || 'No especificado'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Descanso</div>
            <div class="campo-valor">${pacienteSeleccionado.descanso || 'No especificado'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Estado Psicológico</div>
            <div class="campo-valor">${pacienteSeleccionado.psicologicamente || 'No especificado'}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Digestión</div>
            <div class="campo-valor">${pacienteSeleccionado.digestion || 'No especificado'}</div>
          </div>
        </div>

        <div class="seccion">
          <div class="seccion-titulo">Motivo de Consulta</div>
          <div class="campo">
            <div class="campo-label">Lesión por la que consulta</div>
            <div class="campo-valor">${pacienteSeleccionado.lesion_consulta}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Objetivo del Paciente</div>
            <div class="campo-valor">${pacienteSeleccionado.objetivo_paciente}</div>
          </div>
          <div class="campo">
            <div class="campo-label">Evaluación Física</div>
            <div class="campo-valor">${pacienteSeleccionado.evaluacion_fisica || 'No especificado'}</div>
          </div>
        </div>

        <div class="seccion">
          <div class="seccion-titulo">Historial de Sesiones (${sesionesPaciente.length})</div>
          ${sesionesPaciente.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #64748b;">
              No hay sesiones registradas para este paciente
            </div>
          ` : `
            ${sesionesPaciente.map((sesion: any, index: number) => `
              <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div style="font-weight: bold; color: #1e293b;">
                    Sesión #${sesionesPaciente.length - index} - ${formatearFechaLocal(sesion.fecha)}
                  </div>
                  <div style="background: ${
                    sesion.estado === 'completada' ? '#10b981' :
                    sesion.estado === 'programada' ? '#3b82f6' :
                    sesion.estado === 'confirmada' ? '#3FFF00' : '#ef4444'
                  }; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                    ${sesion.estado}
                  </div>
                </div>
                
                <div class="grid-2">
                  <div class="campo">
                    <div class="campo-label">Hora</div>
                    <div class="campo-valor">${sesion.hora}</div>
                  </div>
                  <div class="campo">
                    <div class="campo-label">Duración</div>
                    <div class="campo-valor">${sesion.duracion} minutos</div>
                  </div>
                  <div class="campo">
                    <div class="campo-label">Tipo</div>
                    <div class="campo-valor">${sesion.tipo}</div>
                  </div>
                  ${sesion.progresoGeneral ? `
                    <div class="campo">
                      <div class="campo-label">Progreso General</div>
                      <div class="campo-valor" style="color: #10b981; font-weight: 600; text-transform: capitalize;">
                        ${sesion.progresoGeneral.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ` : ''}
                </div>
                
                ${sesion.notasSesion ? `
                  <div class="campo">
                    <div class="campo-label">Notas de la Sesión</div>
                    <div class="campo-valor">${sesion.notasSesion}</div>
                  </div>
                ` : ''}
                
                ${(sesion.dolorInicial !== null || sesion.dolorFinal !== null) ? `
                  <div class="campo">
                    <div class="campo-label">Nivel de Dolor</div>
                    <div class="campo-valor">
                      Inicial: <strong>${sesion.dolorInicial}/10</strong> → 
                      Final: <strong>${sesion.dolorFinal}/10</strong>
                      ${sesion.dolorFinal < sesion.dolorInicial ? 
                        '<span style="color: #10b981; margin-left: 10px;">✓ Mejoría</span>' : 
                        sesion.dolorFinal > sesion.dolorInicial ?
                        '<span style="color: #ef4444; margin-left: 10px;">⚠ Aumento</span>' :
                        '<span style="color: #64748b; margin-left: 10px;">= Sin cambio</span>'
                      }
                    </div>
                  </div>
                ` : ''}
                
                ${sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 ? `
                  <div class="campo">
                    <div class="campo-label">Ejercicios Realizados</div>
                    <div class="campo-valor">
                      <ul style="margin: 5px 0; padding-left: 20px;">
                        ${sesion.ejerciciosRealizados.map((ejercicio: string) => `
                          <li style="margin: 3px 0;">${ejercicio}</li>
                        `).join('')}
                      </ul>
                    </div>
                  </div>
                ` : ''}
                
                ${sesion.observaciones ? `
                  <div class="campo">
                    <div class="campo-label">Observaciones</div>
                    <div class="campo-valor">${sesion.observaciones}</div>
                  </div>
                ` : ''}
                
                ${sesion.recomendaciones ? `
                  <div class="campo">
                    <div class="campo-label">Recomendaciones</div>
                    <div class="campo-valor">${sesion.recomendaciones}</div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          `}
        </div>

        ${pacienteSeleccionado.evaluacion_final ? `
          <div class="seccion" style="margin-top: 30px; border: 2px solid #10b981; background: #f0fdf4;">
            <div class="seccion-titulo" style="background: #10b981; color: white;">
              📋 Evaluación Final del Tratamiento
            </div>
            <div style="padding: 20px; white-space: pre-wrap; line-height: 1.8; color: #1e293b;">
              ${pacienteSeleccionado.evaluacion_final}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p><strong>${nombreCentro}</strong> - Sistema de Gestión Kinesiológica</p>
          <p>Documento generado el ${new Date().toLocaleString('es-CL')}</p>
          <p style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
            Desarrollado por Thomas Landeros - Nagotar Tech SPA | +56 9 4888 1923
          </p>
        </div>
      </body>
      </html>
    `;

    // Crear ventana para imprimir
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(contenidoPDF);
      ventana.document.close();
      setTimeout(() => {
        ventana.print();
      }, 250);
    }
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
      
      // Mostrar mensaje de éxito (opcional)
      alert('Ficha actualizada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar la ficha');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar pacientes por búsqueda
  const pacientesFiltrados = pacientes.filter(paciente => {
    if (!busqueda) return true;
    
    const searchLower = busqueda.toLowerCase();
    return (
      paciente.nombre?.toLowerCase().includes(searchLower) ||
      paciente.rut?.toLowerCase().includes(searchLower) ||
      paciente.telefono?.includes(busqueda) ||
      paciente.ocupacion?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Gestión de Pacientes</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nuevo Paciente
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="filtros-container" style={{ padding: '1rem', background: '#1a1a1a', borderRadius: '8px', marginBottom: '1rem' }}>
        <div className="search-box">
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
        {busqueda && (
          <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
            {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
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
                  </div>
                </div>
                <div className="paciente-info">
                  <div className="info-row">
                    <span>RUT:</span>
                    <strong>{paciente.rut}</strong>
                  </div>
                  <div className="info-row">
                    <span>Teléfono:</span>
                    <strong>{paciente.telefono}</strong>
                  </div>
                  <div className="info-row">
                    <span>Altura:</span>
                    <strong>{paciente.altura} cm</strong>
                  </div>
                  <div className="info-row">
                    <span>Peso:</span>
                    <strong>{paciente.peso} kg</strong>
                  </div>
                  <div className="info-row info-row-lesion">
                    <span>Lesión:</span>
                    <strong className="lesion-text">{paciente.lesion_consulta}</strong>
                  </div>
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => handleVerFicha(paciente)}
                >
                  Ver Ficha Completa
                </button>
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
                    <label>RUT *</label>
                    <input
                      type="text"
                      name="rut"
                      value={formData.rut}
                      onChange={handleChange}
                      placeholder="12.345.678-9"
                      maxLength={12}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Teléfono *</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="+56 9 1234 5678"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Edad *</label>
                    <input
                      type="number"
                      name="edad"
                      value={formData.edad}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Altura (cm) *</label>
                    <input
                      type="number"
                      name="altura"
                      value={formData.altura}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Peso (kg) *</label>
                    <input
                      type="number"
                      name="peso"
                      value={formData.peso}
                      onChange={handleChange}
                      required
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
                    <label>Lesión por la que consulta *</label>
                    <textarea
                      name="lesionConsulta"
                      value={formData.lesionConsulta}
                      onChange={handleChange}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Objetivo del paciente *</label>
                    <textarea
                      name="objetivoPaciente"
                      value={formData.objetivoPaciente}
                      onChange={handleChange}
                      rows={3}
                      required
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

      {/* Modal Ficha Completa */}
      {showFichaCompleta && pacienteSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowFichaCompleta(false)}>
          <div className="modal-content ficha-completa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ficha Completa - {pacienteSeleccionado.nombre}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!modoEdicion ? (
                  <>
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
              {/* Datos Personales */}
              <div className="ficha-section">
                <h3 className="section-title">Datos Personales</h3>
                <div className="ficha-grid">
                  <div className="ficha-field">
                    <span className="field-label">Nombre Completo</span>
                    <span className="field-value">{pacienteSeleccionado.nombre}</span>
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">RUT</span>
                    <span className="field-value">{pacienteSeleccionado.rut}</span>
                  </div>
                  <div className="ficha-field">
                    <span className="field-label">Teléfono</span>
                    <span className="field-value">{pacienteSeleccionado.telefono}</span>
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
                                <strong>Dolor:</strong> Inicial {sesion.dolorInicial}/10 → Final {sesion.dolorFinal}/10
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
                                <ul style={{ margin: '0.5rem 0 0 1.5rem', listStyle: 'disc' }}>
                                  {sesion.ejerciciosRealizados.map((ejercicio: string, idx: number) => (
                                    <li key={idx}>{ejercicio}</li>
                                  ))}
                                </ul>
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
    </div>
  );
}

// Módulo Citas
function CitasModule() {
  // Detectar si es móvil y establecer vista inicial
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [vistaCalendario, setVistaCalendario] = useState<'mes' | 'semana' | 'lista'>(isMobile ? 'semana' : 'mes');
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
    tipo: 'Evaluación',
    notas: ''
  });

  const [editandoCita, setEditandoCita] = useState<any>(null);
  const [citaArrastrada, setCitaArrastrada] = useState<any>(null);
  const [horariosBloqueados, setHorariosBloqueados] = useState<any[]>([]);
  const [showModalBloqueo, setShowModalBloqueo] = useState(false);
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
    fechaPago: new Date().toISOString().split('T')[0],
    concepto: 'Pago de sesión',
    notas: '',
    numeroFactura: ''
  });

  // Cargar citas y pacientes al montar el componente
  useEffect(() => {
    cargarCitas();
    cargarPacientes();
    cargarHorariosBloqueados();

    // Polling: Recargar citas cada 30 segundos para detectar cambios de WhatsApp
    const interval = setInterval(() => {
      cargarCitas(false); // false = no mostrar loading en refresh automático
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  const cargarCitas = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) {
        setLoading(true);
      }
      const response = await fetch('/api/citas');
      const data = await response.json();
      
      console.log('📋 Citas cargadas:', data);
      
      if (data.success) {
        console.log('✅ Total de citas:', data.citas.length);
        console.log('📅 Fechas de citas:', data.citas.map((c: any) => c.fecha));
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
    const fechaStr = fecha.toISOString().split('T')[0];
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
    const fechaStr = fecha.toISOString().split('T')[0];
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
          fechaPago: new Date().toISOString().split('T')[0],
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
        tipo: 'Evaluación',
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
    const fechaStr = fecha.toISOString().split('T')[0];
    setEditandoCita(null);
    setFormData({
      pacienteId: '',
      fecha: fechaStr,
      hora: hora,
      duracion: '60',
      tipo: 'Evaluación',
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

  // Funciones para drag and drop
  const handleDragStart = (e: React.DragEvent, cita: any) => {
    setCitaArrastrada(cita);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, nuevaFecha: Date) => {
    e.preventDefault();
    
    if (citaArrastrada) {
      const fechaStr = nuevaFecha.toISOString().split('T')[0];
      
      try {
        const response = await fetch(`/api/citas/${citaArrastrada.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pacienteId: citaArrastrada.pacienteId,
            fecha: fechaStr,
            hora: citaArrastrada.hora,
            duracion: citaArrastrada.duracion,
            tipo: citaArrastrada.tipo,
            notas: citaArrastrada.notas
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          await cargarCitas();
          mostrarMensaje('Cita movida exitosamente');
        } else {
          mostrarMensaje(data.error || 'Error al mover la cita', true);
        }
      } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al mover la cita', true);
      } finally {
        setCitaArrastrada(null);
      }
    }
  };

  const handleDropEnHorario = async (nuevaFecha: Date, nuevaHora: string) => {
    if (!citaArrastrada) return;
    
    const fechaStr = nuevaFecha.toISOString().split('T')[0];
    const fechaOriginal = citaArrastrada.fecha;
    
    try {
      const response = await fetch(`/api/citas/${citaArrastrada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: citaArrastrada.pacienteId,
          fecha: fechaStr,
          hora: nuevaHora,
          duracion: citaArrastrada.duracion,
          tipo: citaArrastrada.tipo,
          notas: citaArrastrada.notas
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await cargarCitas();
        
        // Determinar si cambió de día
        const cambioDeDay = fechaOriginal !== fechaStr;
        
        let mensaje = '';
        if (cambioDeDay) {
          // Formatear la fecha para mostrar (ej: "Lun 10 Dic")
          const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const fecha = new Date(nuevaFecha);
          const diaSemana = diasSemana[fecha.getDay()];
          const dia = fecha.getDate();
          const mes = meses[fecha.getMonth()];
          
          mensaje = `Cita movida a ${diaSemana} ${dia} ${mes} - ${nuevaHora}`;
        } else {
          // Mismo día, solo mostrar hora
          mensaje = `Cita movida a ${nuevaHora}`;
        }
        
        mostrarMensaje(mensaje);
      } else {
        mostrarMensaje(data.error || 'Error al mover la cita', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al mover la cita', true);
    } finally {
      setCitaArrastrada(null);
    }
  };

  // Funciones para touch (móvil)
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);
  const [isReallyDragging, setIsReallyDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{x: number, y: number} | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para long press (bloquear horarios en móvil)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressTarget, setLongPressTarget] = useState<{dia: Date, hora: string, bloqueado: any} | null>(null);

  // Efecto para bloquear scroll manual cuando está arrastrando
  useEffect(() => {
    if (isReallyDragging) {
      // NO bloquear overflow para permitir scroll programático
      // Solo prevenir eventos de scroll del usuario con preventDefault en touchmove
    } else {
      // Restaurar scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Limpiar auto-scroll si quedó activo
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    }
    
    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, [isReallyDragging]);

  // Funciones para long press en slots vacíos (bloquear horarios)
  const handleSlotTouchStart = (e: React.TouchEvent, dia: Date, hora: string, bloqueado: any, citasEnHora: any[]) => {
    // Solo activar long press si el slot está vacío
    if (citasEnHora.length > 0) return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setLongPressTarget({ dia, hora, bloqueado });
    
    // Iniciar timer de long press (500ms)
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Mostrar modal de bloqueo o desbloqueo
      if (bloqueado) {
        handleEliminarBloqueo(bloqueado.id);
      } else {
        handleBloquearHorario(dia, hora);
      }
      
      // Limpiar estados
      setLongPressTimer(null);
      setIsLongPressing(false);
      setLongPressTarget(null);
      setTouchStartPos(null);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleSlotTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || !longPressTimer) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Si se mueve más de 10px, cancelar long press
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      setIsLongPressing(false);
      setLongPressTarget(null);
    }
  };

  const handleSlotTouchEnd = (e: React.TouchEvent, dia: Date, hora: string, bloqueado: any, citasEnHora: any[]) => {
    // Limpiar timer si existe
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Si no fue long press y no hay movimiento, es un tap normal (crear cita)
    if (!isLongPressing && touchStartPos && citasEnHora.length === 0 && !bloqueado) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      
      if (deltaX < 10 && deltaY < 10) {
        // Es un tap, crear cita
        handleCrearCitaDesdeCalendario(dia, hora);
      }
    }
    
    setIsLongPressing(false);
    setLongPressTarget(null);
    setTouchStartPos(null);
  };

  const handleSlotTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
    setLongPressTarget(null);
    setTouchStartPos(null);
  };

  const handleTouchStart = (e: React.TouchEvent, cita: any) => {
    e.preventDefault(); // Prevenir scroll desde el inicio
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    setCitaArrastrada(cita);
    setIsDraggingTouch(true);
    setIsReallyDragging(false);
    
    // Agregar clase para prevenir scroll
    document.body.classList.add('dragging');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingTouch || !touchStartPos) return;
    
    e.preventDefault(); // Siempre prevenir scroll cuando hay una cita tocada
    e.stopPropagation();
    
    const touch = e.touches[0];
    
    // Actualizar posición del touch para feedback visual
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    
    // Solo marcar como "realmente arrastrando" si movió más de 10px
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Solo marcar como "realmente arrastrando" si movió más de 10px
    if ((deltaX > 10 || deltaY > 10) && !isReallyDragging) {
      setIsReallyDragging(true);
    }

    // Auto-scroll cuando está cerca de los bordes
    const scrollThreshold = 100; // Píxeles desde el borde para activar scroll
    const scrollSpeed = 10; // Velocidad de scroll
    
    const viewportHeight = window.innerHeight;
    const touchY = touch.clientY;
    
    // Limpiar intervalo anterior
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    
    // Scroll hacia arriba
    if (touchY < scrollThreshold) {
      autoScrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -scrollSpeed);
      }, 16); // ~60fps
    }
    // Scroll hacia abajo
    else if (touchY > viewportHeight - scrollThreshold) {
      autoScrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, scrollSpeed);
      }, 16); // ~60fps
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    // Limpiar auto-scroll
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (!citaArrastrada || !isDraggingTouch) {
      // Limpiar estados de todas formas por si quedaron colgados
      setIsDraggingTouch(false);
      setIsReallyDragging(false);
      setTouchStartPos(null);
      setTouchPosition(null);
      setCitaArrastrada(null);
      document.body.classList.remove('dragging');
      // Forzar restauración de scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      return;
    }
    
    const touch = e.changedTouches[0];
    
    // Verificar si hubo movimiento significativo
    if (touchStartPos) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      
      // Si no hubo movimiento significativo, es un tap normal
      if (deltaX < 10 && deltaY < 10) {
        setIsDraggingTouch(false);
        setIsReallyDragging(false);
        setTouchStartPos(null);
        setTouchPosition(null);
        setCitaArrastrada(null);
        document.body.classList.remove('dragging');
        // Forzar restauración de scroll
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        return;
      }
    }
    
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      // Buscar el slot de hora más cercano
      const horaSlot = element.closest('.hora-slot');
      if (horaSlot) {
        const diaIndex = parseInt(horaSlot.getAttribute('data-dia-index') || '0');
        const horaBase = horaSlot.getAttribute('data-hora') || '';
        
        if (horaBase) {
          // Calcular en qué cuarto del slot (15 minutos) soltó la cita
          const rect = horaSlot.getBoundingClientRect();
          const relativeY = touch.clientY - rect.top;
          const slotHeight = rect.height;
          const quarter = Math.floor((relativeY / slotHeight) * 4); // 0, 1, 2, 3
          
          // Convertir quarter a minutos (0=00, 1=15, 2=30, 3=45)
          const minutos = Math.min(quarter * 15, 45);
          
          // Construir la hora completa (HH:MM)
          const [horaNum] = horaBase.split(':');
          const horaCompleta = `${horaNum}:${minutos.toString().padStart(2, '0')}`;
          
          const diasSemana = obtenerDiasSemana();
          const nuevaFecha = diasSemana[diaIndex];
          
          if (nuevaFecha) {
            await handleDropEnHorario(nuevaFecha, horaCompleta);
          }
        }
      }
    }
    
    setIsDraggingTouch(false);
    setIsReallyDragging(false);
    setTouchStartPos(null);
    setTouchPosition(null);
    setCitaArrastrada(null);
    
    // Remover clase y forzar restauración de scroll
    document.body.classList.remove('dragging');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };

  const handleTouchCancel = () => {
    // Limpiar auto-scroll
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    // Limpiar todo si el touch se cancela (llamada, notificación, etc.)
    setIsDraggingTouch(false);
    setIsReallyDragging(false);
    setTouchStartPos(null);
    setTouchPosition(null);
    setCitaArrastrada(null);
    document.body.classList.remove('dragging');
    // Forzar restauración de scroll
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };

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

  const handleEnviarRecordatorio = async (cita: any) => {
    if (!confirm(`¿Enviar recordatorio por WhatsApp a ${cita.paciente}?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/citas/${cita.id}/recordatorio`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('✅ Recordatorio enviado por WhatsApp');
        handleCerrarModal();
      } else {
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
      tipo: 'Evaluación',
      notas: ''
    });
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

  const obtenerDiasMes = () => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasMes = ultimoDia.getDate();
    // Ajustar para que Lunes sea el primer día (0=Dom, 1=Lun, etc.)
    // Si es Domingo (0), convertir a 6, sino restar 1
    const primerDiaSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
    
    const dias = [];
    
    // Días del mes anterior
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    
    // Días del mes actual
    for (let i = 1; i <= diasMes; i++) {
      dias.push(new Date(año, mes, i));
    }
    
    return dias;
  };

  const obtenerDiasSemana = () => {
    const dias = [];
    const inicioSemana = new Date(fechaActual);
    // Ajustar para que la semana empiece en Lunes
    const diaSemana = inicioSemana.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioSemana.setDate(inicioSemana.getDate() + diff);
    
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana);
      dia.setDate(dia.getDate() + i);
      dias.push(dia);
    }
    
    return dias;
  };

  const obtenerCitasDia = (fecha: Date) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    const citasDelDia = citas.filter(cita => cita.fecha === fechaStr);
    
    if (citasDelDia.length > 0) {
      console.log(`📅 ${fechaStr}: ${citasDelDia.length} cita(s)`, citasDelDia);
    }
    
    return citasDelDia;
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
                            
                            handleDropEnHorario(dia, horaCompleta);
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
                        {cita.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
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
                  <div className="form-field full-width">
                    <label>Paciente *</label>
                    <select
                      name="pacienteId"
                      value={formData.pacienteId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar paciente...</option>
                      {pacientes.map(paciente => (
                        <option key={paciente.id} value={paciente.id}>
                          {paciente.nombre} - {paciente.rut}
                        </option>
                      ))}
                    </select>
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
                      <option value="Evaluación">Evaluación</option>
                      <option value="Seguimiento">Seguimiento</option>
                      <option value="Terapia">Terapia</option>
                      <option value="Control">Control</option>
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

// Módulo Sesiones
function SesionesModule() {
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoSesion, setEditandoSesion] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [vistaSesiones, setVistaSesiones] = useState<'tabla' | 'pacientes'>('tabla');
  const [showModalEvaluacion, setShowModalEvaluacion] = useState(false);
  const [pacienteEvaluacion, setPacienteEvaluacion] = useState<any>(null);
  const [evaluacionTexto, setEvaluacionTexto] = useState('');
  const [showModalProgreso, setShowModalProgreso] = useState(false);
  const [pacienteProgreso, setPacienteProgreso] = useState<any>(null);
  const [sesionesProgreso, setSesionesProgreso] = useState<any[]>([]);

  // Filtros
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
    tipo: 'Evaluación',
    estado: 'programada',
    notasSesion: '',
    ejerciciosRealizados: [] as string[],
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

  useEffect(() => {
    cargarSesiones();
    cargarPacientes();
  }, [filtros]);

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

  const cargarPacientes = async () => {
    try {
      const response = await fetch('/api/pacientes');
      const data = await response.json();
      if (data.success) {
        setPacientes(data.pacientes);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
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
    setFormData({
      pacienteId: sesion.pacienteId,
      fecha: sesion.fecha,
      hora: sesion.hora,
      duracion: sesion.duracion,
      tipo: sesion.tipo,
      estado: sesion.estado,
      notasSesion: sesion.notasSesion || '',
      ejerciciosRealizados: sesion.ejerciciosRealizados || [],
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

  const calcularPromedioMetrica = (metrica: string) => {
    const valores = sesionesProgreso
      .map(s => s[metrica])
      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (valores.length === 0) return 'N/A';
    
    if (typeof valores[0] === 'number') {
      const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      return promedio.toFixed(1);
    }
    
    return valores[valores.length - 1];
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    setEditandoSesion(null);
    setFormData({
      pacienteId: '',
      fecha: '',
      hora: '',
      duracion: 60,
      tipo: 'Evaluación',
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

  const agregarEjercicio = () => {
    if (nuevoEjercicio.trim()) {
      setFormData({
        ...formData,
        ejerciciosRealizados: [...formData.ejerciciosRealizados, nuevoEjercicio.trim()]
      });
      setNuevoEjercicio('');
    }
  };

  const eliminarEjercicio = (index: number) => {
    setFormData({
      ...formData,
      ejerciciosRealizados: formData.ejerciciosRealizados.filter((_, i) => i !== index)
    });
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10b981';
      case 'programada': return '#3b82f6';
      case 'confirmada': return '#3FFF00';
      case 'cancelada': return '#ef4444';
      default: return '#a0a0a0';
    }
  };

  // Agrupar sesiones por paciente
  const agruparSesionesPorPaciente = () => {
    const grupos: { [key: string]: any } = {};
    
    sesiones.forEach(sesion => {
      const pacienteId = sesion.pacienteId || sesion.paciente_id;
      if (!grupos[pacienteId]) {
        grupos[pacienteId] = {
          pacienteId,
          pacienteNombre: sesion.paciente,
          sesiones: []
        };
      }
      grupos[pacienteId].sesiones.push(sesion);
    });

    return Object.values(grupos).sort((a, b) => 
      a.pacienteNombre.localeCompare(b.pacienteNombre)
    );
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Gestión de Sesiones</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Selector de Vista */}
          <div className="vista-selector">
            <button 
              className={vistaSesiones === 'tabla' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaSesiones('tabla')}
            >
              Tabla
            </button>
            <button 
              className={vistaSesiones === 'pacientes' ? 'vista-btn active' : 'vista-btn'}
              onClick={() => setVistaSesiones('pacientes')}
            >
              Por Paciente
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Nueva Sesión
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="module-content">
        {/* Filtros */}
        <div className="filtros-container">
          <select
            value={filtros.pacienteId}
            onChange={(e) => setFiltros({ ...filtros, pacienteId: e.target.value })}
            className="filtro-select"
          >
            <option value="">Todos los pacientes</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="filtro-select"
          >
            <option value="">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="confirmada">Confirmada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
            className="filtro-input"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
            className="filtro-input"
            placeholder="Hasta"
          />

          <button
            onClick={() => setFiltros({ pacienteId: '', estado: '', fechaDesde: '', fechaHasta: '' })}
            className="btn-secondary"
          >
            Limpiar
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Tabla de sesiones */}
        {!loading && sesiones.length === 0 && (
          <p className="empty-state">No hay sesiones registradas</p>
        )}

        {/* Vista Tabla */}
        {!loading && sesiones.length > 0 && vistaSesiones === 'tabla' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th>Progreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map(sesion => (
                  <tr key={sesion.id}>
                    <td>{formatearFechaLocal(sesion.fecha)}</td>
                    <td>{sesion.hora}</td>
                    <td>{sesion.paciente}</td>
                    <td>{sesion.tipo}</td>
                    <td>{sesion.duracion} min</td>
                    <td>
                      <span className={`badge ${sesion.estado}`}>
                        {sesion.estado.toUpperCase()}
                      </span>
                    </td>
                    <td>{sesion.progresoGeneral || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEditarSesion(sesion)}
                          className="btn-icon"
                          title="Ver/Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEliminarSesion(sesion.id)}
                          className="btn-icon btn-danger"
                          title="Eliminar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista Por Paciente */}
        {!loading && sesiones.length > 0 && vistaSesiones === 'pacientes' && (
          <div className="pacientes-sesiones-container">
            {agruparSesionesPorPaciente().map(grupo => (
              <div key={grupo.pacienteId} className="paciente-grupo" style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #3FFF00'
                }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#3FFF00', fontSize: '1.25rem' }}>
                      {grupo.pacienteNombre}
                    </h3>
                    {grupo.sesiones[0]?.sesionesProgramadas && (
                      <div style={{ fontSize: '0.875rem', color: '#888', marginTop: '0.25rem' }}>
                        Sesiones programadas: {grupo.sesiones.length} / {grupo.sesiones[0].sesionesProgramadas}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(63, 255, 0, 0.1)',
                      color: '#3FFF00',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 600
                    }}>
                      {grupo.sesiones.length} {grupo.sesiones.length === 1 ? 'sesión' : 'sesiones'}
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                        if (paciente) {
                          handleAbrirModalProgreso(paciente, grupo.sesiones);
                        }
                      }}
                      style={{ 
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      title="Ver progreso del tratamiento"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      Ver Progreso
                    </button>
                    {grupo.sesiones[0]?.sesionesProgramadas && 
                     grupo.sesiones.length >= grupo.sesiones[0].sesionesProgramadas && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          const paciente = pacientes.find((p: any) => p.id === grupo.pacienteId);
                          if (paciente) {
                            handleAbrirModalEvaluacion(paciente);
                          }
                        }}
                        style={{ fontSize: '0.875rem' }}
                      >
                        {grupo.sesiones[0]?.evaluacionFinal ? 'Editar' : 'Agregar'} Evaluación Final
                      </button>
                    )}
                  </div>
                </div>

                <div className="sesiones-lista" style={{ display: 'grid', gap: '1rem' }}>
                  {grupo.sesiones.map((sesion: any) => (
                    <div key={sesion.id} style={{
                      background: '#0a0a0a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '1rem',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3FFF00';
                      e.currentTarget.style.background = 'rgba(63, 255, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a2a';
                      e.currentTarget.style.background = '#0a0a0a';
                    }}>
                      {/* Fecha y Hora */}
                      <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>
                          {formatearFechaLocal(sesion.fecha)}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                          {sesion.hora}
                        </div>
                      </div>

                      {/* Información */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Tipo</div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>{sesion.tipo}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Duración</div>
                          <div style={{ color: '#fff', fontWeight: 500 }}>{sesion.duracion} min</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Estado</div>
                          <span 
                            className="badge"
                            style={{ 
                              backgroundColor: obtenerColorEstado(sesion.estado),
                              display: 'inline-block'
                            }}
                          >
                            {sesion.estado}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Progreso</div>
                          <div style={{ color: '#3FFF00', fontWeight: 600 }}>{sesion.progresoGeneral || '-'}</div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditarSesion(sesion)}
                          className="btn-icon"
                          title="Ver/Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEliminarSesion(sesion.id)}
                          className="btn-icon btn-danger"
                          title="Eliminar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                      <option value="Evaluación">Evaluación</option>
                      <option value="Tratamiento">Tratamiento</option>
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

              {/* Evaluación */}
              <div className="form-section">
                <h4>Evaluación</h4>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Dolor Inicial (0-10)</label>
                    <input
                      type="number"
                      value={formData.dolorInicial}
                      onChange={(e) => setFormData({ ...formData, dolorInicial: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="form-field">
                    <label>Dolor Final (0-10)</label>
                    <input
                      type="number"
                      value={formData.dolorFinal}
                      onChange={(e) => setFormData({ ...formData, dolorFinal: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="10"
                    />
                  </div>

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
                    <label>Fuerza</label>
                    <select
                      value={formData.fuerza}
                      onChange={(e) => setFormData({ ...formData, fuerza: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="muy_debil">Muy débil</option>
                      <option value="debil">Débil</option>
                      <option value="normal">Normal</option>
                      <option value="buena">Buena</option>
                      <option value="excelente">Excelente</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Progreso General</label>
                    <select
                      value={formData.progresoGeneral}
                      onChange={(e) => setFormData({ ...formData, progresoGeneral: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="sin_cambios">Sin cambios</option>
                      <option value="leve_mejoria">Leve mejoría</option>
                      <option value="mejoria_moderada">Mejoría moderada</option>
                      <option value="mejoria_significativa">Mejoría significativa</option>
                      <option value="recuperacion_completa">Recuperación completa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ejercicios */}
              <div className="form-section">
                <h4>Ejercicios Realizados</h4>
                <div className="ejercicios-input-group">
                  <input
                    type="text"
                    value={nuevoEjercicio}
                    onChange={(e) => setNuevoEjercicio(e.target.value)}
                    placeholder="Agregar ejercicio..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarEjercicio())}
                  />
                  <button type="button" onClick={agregarEjercicio} className="btn-secondary">
                    Agregar
                  </button>
                </div>
                <div className="ejercicios-lista">
                  {formData.ejerciciosRealizados.map((ejercicio, index) => (
                    <div key={index} className="ejercicio-item">
                      <span>{ejercicio}</span>
                      <button
                        type="button"
                        onClick={() => eliminarEjercicio(index)}
                        className="btn-eliminar-ejercicio"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas y observaciones */}
              <div className="form-section">
                <h4>Notas y Observaciones</h4>
                <div className="form-field">
                  <label>Notas de la Sesión</label>
                  <textarea
                    value={formData.notasSesion}
                    onChange={(e) => setFormData({ ...formData, notasSesion: e.target.value })}
                    rows={3}
                    placeholder="Descripción de la sesión..."
                  />
                </div>

                <div className="form-field">
                  <label>Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                    placeholder="Observaciones adicionales..."
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
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #3FFF00' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#3FFF00' }}>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px', color: '#3FFF00' }}>
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
                background: 'linear-gradient(135deg, rgba(63, 255, 0, 0.1) 0%, rgba(63, 255, 0, 0.05) 100%)', 
                borderRadius: '12px', 
                border: '2px solid #3FFF00' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#3FFF00', fontSize: '1.5rem' }}>
                      {pacienteProgreso.nombre}
                    </h4>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                      RUT: {pacienteProgreso.rut} • Teléfono: {pacienteProgreso.telefono}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3FFF00' }}>
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
                <h4 style={{ marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem' }}>📊 Métricas Generales</h4>
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
                <h4 style={{ marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem' }}>📋 Historial de Sesiones</h4>
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
                            background: '#3FFF00',
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
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Fuerza</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f59e0b', textTransform: 'capitalize' }}>{sesion.fuerza}</div>
                          </div>
                        )}
                        {sesion.progresoGeneral && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Progreso</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3FFF00', textTransform: 'capitalize' }}>{sesion.progresoGeneral}</div>
                          </div>
                        )}
                      </div>

                      {/* Ejercicios realizados */}
                      {sesion.ejerciciosRealizados && sesion.ejerciciosRealizados.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>Ejercicios:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {sesion.ejerciciosRealizados.map((ejercicio: string, idx: number) => (
                              <span key={idx} style={{
                                background: 'rgba(63, 255, 0, 0.1)',
                                color: '#3FFF00',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                border: '1px solid rgba(63, 255, 0, 0.3)'
                              }}>
                                {ejercicio}
                              </span>
                            ))}
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
                              <strong style={{ color: '#3FFF00' }}>Notas:</strong> {sesion.notasSesion}
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
    </div>
  );
}

// Módulo Pagos
function PagosModule() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoPago, setEditandoPago] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [filtros, setFiltros] = useState({
    pacienteId: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });
  const [formData, setFormData] = useState({
    pacienteId: '',
    sesionId: '',
    monto: '',
    metodoPago: 'Efectivo',
    estado: 'completado',
    fechaPago: new Date().toISOString().split('T')[0],
    concepto: '',
    notas: '',
    numeroFactura: ''
  });

  useEffect(() => {
    cargarPagos();
    cargarPacientes();
    cargarEstadisticas();
  }, []);

  const cargarPagos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.pacienteId) params.append('pacienteId', filtros.pacienteId);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

      const response = await fetch(`/api/pagos?${params}`);
      const data = await response.json();
      if (data.success) {
        setPagos(data.pagos);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cargar pagos', true);
    } finally {
      setLoading(false);
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
      console.error('Error:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch('/api/pagos/estadisticas');
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.estadisticas);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const handleNuevoPago = () => {
    setEditandoPago(null);
    setFormData({
      pacienteId: '',
      sesionId: '',
      monto: '',
      metodoPago: 'Efectivo',
      estado: 'completado',
      fechaPago: new Date().toISOString().split('T')[0],
      concepto: '',
      notas: '',
      numeroFactura: ''
    });
    setShowModal(true);
  };

  const handleEditarPago = (pago: any) => {
    setEditandoPago(pago);
    setFormData({
      pacienteId: pago.paciente_id,
      sesionId: pago.sesion_id || '',
      monto: pago.monto,
      metodoPago: pago.metodo_pago,
      estado: pago.estado,
      fechaPago: pago.fecha_pago,
      concepto: pago.concepto || '',
      notas: pago.notas || '',
      numeroFactura: pago.numero_factura || ''
    });
    setShowModal(true);
  };

  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editandoPago ? `/api/pagos/${editandoPago.id}` : '/api/pagos';
      const method = editandoPago ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        await cargarPagos();
        await cargarEstadisticas();
        setShowModal(false);
        mostrarMensaje(editandoPago ? '✅ Pago actualizado' : '✅ Pago registrado');
      } else {
        mostrarMensaje(data.error || 'Error al guardar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar pago', true);
    }
  };

  const handleEliminarPago = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return;

    try {
      const response = await fetch(`/api/pagos/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        await cargarPagos();
        await cargarEstadisticas();
        mostrarMensaje('✅ Pago eliminado');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar pago', true);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto);
  };

  const aplicarFiltros = () => {
    cargarPagos();
  };

  const limpiarFiltros = () => {
    setFiltros({
      pacienteId: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    });
    setTimeout(() => cargarPagos(), 100);
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Gestión de Pagos
        </h2>
        <button className="btn-primary" onClick={handleNuevoPago}>
          + Registrar Pago
        </button>
      </div>

      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#10b981' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Ingresos del Mes</p>
              <p className="stat-value">{formatearMonto(estadisticas.ingresosMes)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#3b82f6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Total Ingresos</p>
              <p className="stat-value">{formatearMonto(estadisticas.ingresosTotales)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f59e0b' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Pagos Pendientes</p>
              <p className="stat-value">{estadisticas.pagosPendientes.cantidad}</p>
              <p className="stat-sublabel">{formatearMonto(estadisticas.pagosPendientes.monto)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#8b5cf6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M16 13H8"/>
                <path d="M16 17H8"/>
                <path d="M10 9H8"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Total Pagos</p>
              <p className="stat-value">{estadisticas.totalPagos}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-container" style={{ marginBottom: '1.5rem' }}>
        <div className="filtros-grid">
          <div className="form-group">
            <label>Paciente</label>
            <select
              value={filtros.pacienteId}
              onChange={(e) => setFiltros({ ...filtros, pacienteId: e.target.value })}
            >
              <option value="">Todos los pacientes</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            >
              <option value="">Todos los estados</option>
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
            />
          </div>
        </div>
        <div className="filtros-actions">
          <button className="btn-primary" onClick={aplicarFiltros}>Aplicar Filtros</button>
          <button className="btn-secondary" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="module-content">
        {loading ? (
          <div className="loading">Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="empty-state">
            <p>No hay pagos registrados</p>
            <button className="btn-primary" onClick={handleNuevoPago}>
              Registrar primer pago
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Concepto</th>
                  <th>Método</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td>{formatearFechaLocal(pago.fecha_pago)}</td>
                    <td>
                      <div>
                        <strong>{pago.paciente_nombre}</strong>
                        <small>{pago.paciente_rut}</small>
                      </div>
                    </td>
                    <td>{pago.concepto || pago.sesion_tipo || 'Pago general'}</td>
                    <td>
                      <span className="badge badge-info">{pago.metodo_pago}</span>
                    </td>
                    <td>
                      <strong>{formatearMonto(pago.monto)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        pago.estado === 'completado' ? 'badge-success' :
                        pago.estado === 'pendiente' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {pago.estado.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleEditarPago(pago)}
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleEliminarPago(pago.id)}
                          title="Eliminar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Pago */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoPago ? 'Editar Pago' : 'Registrar Nuevo Pago'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarPago}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Paciente *</label>
                    <select
                      value={formData.pacienteId}
                      onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                      required
                      disabled={!!editandoPago}
                    >
                      <option value="">Seleccionar paciente</option>
                      {pacientes.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} - {p.rut}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Monto *</label>
                    <input
                      type="number"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      required
                      min="0"
                      step="100"
                      placeholder="Ej: 25000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Método de Pago *</label>
                    <select
                      value={formData.metodoPago}
                      onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                      required
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estado *</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      required
                    >
                      <option value="completado">Completado</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha de Pago *</label>
                    <input
                      type="date"
                      value={formData.fechaPago}
                      onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>N° Factura</label>
                    <input
                      type="text"
                      value={formData.numeroFactura}
                      onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                      placeholder="Ej: F-001234"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Concepto</label>
                    <input
                      type="text"
                      value={formData.concepto}
                      onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                      placeholder="Ej: Sesión de evaluación"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notas</label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      rows={3}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editandoPago ? 'Actualizar' : 'Registrar'} Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Configuración
function ConfiguracionModule() {
  const [configuraciones, setConfiguraciones] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cronEstado, setCronEstado] = useState<any>(null);
  const [loadingCron, setLoadingCron] = useState(false);

  useEffect(() => {
    cargarConfiguraciones();
    inicializarCron();
  }, []);

  const inicializarCron = async () => {
    try {
      // Iniciar el cron automáticamente al cargar
      await fetch('/api/cron/init', { method: 'POST' });
      // Luego cargar el estado
      await cargarEstadoCron();
    } catch (error) {
      console.error('Error al inicializar cron:', error);
      await cargarEstadoCron();
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuraciones');
      const data = await response.json();
      
      if (data.success) {
        // Organizar configuraciones por clave
        const configMap: any = {};
        data.configuraciones.forEach((config: any) => {
          configMap[config.clave] = config;
        });
        setConfiguraciones(configMap);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cargar configuraciones', true);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  const cargarEstadoCron = async () => {
    try {
      const response = await fetch('/api/cron/recordatorios');
      const data = await response.json();
      if (data.success) {
        setCronEstado(data.estado);
      }
    } catch (error) {
      console.error('Error al cargar estado del cron:', error);
    }
  };

  const handleControlCron = async (accion: string) => {
    try {
      setLoadingCron(true);
      const response = await fetch('/api/cron/recordatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion })
      });

      const data = await response.json();

      if (data.success) {
        setCronEstado(data.estado);
        mostrarMensaje(`✅ ${data.mensaje}`);
      } else {
        mostrarMensaje(data.error || 'Error al controlar cron', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al controlar cron', true);
    } finally {
      setLoadingCron(false);
    }
  };

  const handleEditarConfig = (clave: string) => {
    const config = configuraciones[clave];
    if (!config) {
      console.error(`Configuración no encontrada: ${clave}`);
      mostrarMensaje('Error: Configuración no encontrada', true);
      return;
    }
    setModalConfig(config);
    setShowModal(true);
  };

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Si es una imagen y hay un archivo temporal, subirlo primero
      if (modalConfig.tipo === 'image' && modalConfig.archivoTemporal) {
        const formData = new FormData();
        formData.append('logo', modalConfig.archivoTemporal);

        const uploadResponse = await fetch('/api/upload/logo', {
          method: 'POST',
          body: formData
        });

        const uploadData = await uploadResponse.json();

        if (uploadData.success) {
          await cargarConfiguraciones();
          // Recargar configuraciones globales del componente padre
          window.location.reload();
        } else {
          mostrarMensaje(uploadData.error || 'Error al subir logo', true);
        }
      } else {
        // Para otros tipos de configuración
        const response = await fetch('/api/configuraciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clave: modalConfig.clave,
            valor: modalConfig.valor
          })
        });

        const data = await response.json();

        if (data.success) {
          await cargarConfiguraciones();
          setShowModal(false);
          setModalConfig(null);
          mostrarMensaje('✅ Configuración actualizada');
        } else {
          mostrarMensaje(data.error || 'Error al guardar', true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar configuración', true);
    }
  };

  const handleToggleConfig = async (clave: string, valorActual: boolean) => {
    try {
      const response = await fetch('/api/configuraciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: clave,
          valor: !valorActual
        })
      });

      const data = await response.json();

      if (data.success) {
        await cargarConfiguraciones();
        mostrarMensaje('✅ Configuración actualizada');
      } else {
        mostrarMensaje(data.error || 'Error al actualizar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al actualizar configuración', true);
    }
  };

  const getConfigValue = (clave: string, defaultValue: any = '') => {
    return configuraciones[clave]?.valor ?? defaultValue;
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="loading">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="module-container">
      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="module-header">
        <h2>Configuración del Sistema</h2>
      </div>
      <div className="module-content">
        <div className="config-grid">
          {/* Configuración General */}
          <div className="config-section">
            <h3 className="config-title">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              General
            </h3>
            <div className="config-items">
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Logo del Centro</p>
                  <p className="config-item-desc">
                    {getConfigValue('logo_url', '') ? (
                      <img 
                        src={getConfigValue('logo_url', '')} 
                        alt="Logo" 
                        style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }}
                      />
                    ) : (
                      'Sin logo configurado'
                    )}
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('logo_url')}>Cambiar Logo</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Nombre del Centro</p>
                  <p className="config-item-desc">{getConfigValue('nombre_centro', 'NAGO-KINE')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('nombre_centro')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Horario de Atención</p>
                  <p className="config-item-desc">
                    {getConfigValue('dias_atencion', 'Lunes a Viernes')}: {getConfigValue('horario_inicio', '09:00')} - {getConfigValue('horario_fin', '18:00')}
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('horario_inicio')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Duración de Sesiones</p>
                  <p className="config-item-desc">Tiempo predeterminado: {getConfigValue('duracion_sesion_default', '60')} minutos</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('duracion_sesion_default')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Teléfono de Contacto</p>
                  <p className="config-item-desc">{getConfigValue('telefono_contacto', '+56948881923')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('telefono_contacto')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Email de Contacto</p>
                  <p className="config-item-desc">{getConfigValue('email_contacto', 'contacto@nago-kine.cl')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('email_contacto')}>Editar</button>
              </div>
            </div>
          </div>

          {/* Configuración de Citas */}
          <div className="config-section">
            <h3 className="config-title">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Citas
            </h3>
            <div className="config-items">
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Recordatorios Automáticos</p>
                  <p className="config-item-desc">Enviar recordatorios {getConfigValue('recordatorios_horas_antes', '24')}h antes</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('recordatorios_automaticos', true)}
                    onChange={(e) => handleToggleConfig('recordatorios_automaticos', getConfigValue('recordatorios_automaticos', true))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="config-item" style={{ 
                background: cronEstado?.activo ? 'rgba(63, 255, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)',
                border: `1px solid ${cronEstado?.activo ? '#3FFF00' : '#ff4444'}`
              }}>
                <div className="config-item-info">
                  <p className="config-item-label">
                    Sistema de Recordatorios
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: cronEstado?.activo ? '#3FFF00' : '#ff4444',
                      color: '#000',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      verticalAlign: 'middle'
                    }}>
                      {cronEstado?.activo ? 'ACTIVO' : 'DETENIDO'}
                    </span>
                  </p>
                  <p className="config-item-desc">
                    {cronEstado?.activo 
                      ? `Ejecutándose cada 2 horas` 
                      : 'Sistema detenido'}
                    {cronEstado?.proximaEjecucion && cronEstado.activo && (
                      <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                        Próxima: {new Date(cronEstado.proximaEjecucion).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!cronEstado?.activo ? (
                    <button 
                      className="btn-primary" 
                      onClick={() => handleControlCron('iniciar')}
                      disabled={loadingCron}
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                    >
                      {loadingCron ? '...' : 'Iniciar'}
                    </button>
                  ) : (
                    <button 
                      className="btn-secondary" 
                      onClick={() => handleControlCron('detener')}
                      disabled={loadingCron}
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                    >
                      {loadingCron ? '...' : 'Detener'}
                    </button>
                  )}
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleControlCron('ejecutar')}
                    disabled={loadingCron}
                    title="Ejecutar manualmente ahora"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                  >
                    {loadingCron ? '...' : 'Ejecutar'}
                  </button>
                </div>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Horas para Recordatorio</p>
                  <p className="config-item-desc">{getConfigValue('recordatorios_horas_antes', '24')} horas antes</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('recordatorios_horas_antes')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Cancelación de Citas</p>
                  <p className="config-item-desc">Permitir hasta {getConfigValue('cancelacion_horas_minimas', '2')} horas antes</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('cancelacion_horas_minimas')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Permitir Reagendar</p>
                  <p className="config-item-desc">Los pacientes pueden reagendar citas</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('permitir_reagendar', true)}
                    onChange={(e) => handleToggleConfig('permitir_reagendar', getConfigValue('permitir_reagendar', true))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de Pagos */}
          <div className="config-section">
            <h3 className="config-title">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Pagos
            </h3>
            <div className="config-items">
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Métodos de Pago</p>
                  <p className="config-item-desc">{getConfigValue('metodos_pago', 'Efectivo, Transferencia, Tarjeta')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('metodos_pago')}>Gestionar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Tarifa Evaluación</p>
                  <p className="config-item-desc">${parseInt(getConfigValue('tarifa_evaluacion', '25000')).toLocaleString('es-CL')} {getConfigValue('moneda', 'CLP')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('tarifa_evaluacion')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Tarifa Tratamiento</p>
                  <p className="config-item-desc">${parseInt(getConfigValue('tarifa_tratamiento', '20000')).toLocaleString('es-CL')} {getConfigValue('moneda', 'CLP')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('tarifa_tratamiento')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Tarifa Control</p>
                  <p className="config-item-desc">${parseInt(getConfigValue('tarifa_control', '15000')).toLocaleString('es-CL')} {getConfigValue('moneda', 'CLP')}</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('tarifa_control')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Facturación Automática</p>
                  <p className="config-item-desc">Generar facturas al finalizar</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('facturacion_automatica', false)}
                    onChange={(e) => handleToggleConfig('facturacion_automatica', getConfigValue('facturacion_automatica', false))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de Notificaciones */}
          <div className="config-section">
            <h3 className="config-title">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Notificaciones
            </h3>
            <div className="config-items">
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Email</p>
                  <p className="config-item-desc">Notificaciones por correo</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('notif_email', true)}
                    onChange={(e) => handleToggleConfig('notif_email', getConfigValue('notif_email', true))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">SMS</p>
                  <p className="config-item-desc">Mensajes de texto</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('notif_sms', false)}
                    onChange={(e) => handleToggleConfig('notif_sms', getConfigValue('notif_sms', false))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">WhatsApp</p>
                  <p className="config-item-desc">Mensajes por WhatsApp</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('notif_whatsapp', true)}
                    onChange={(e) => handleToggleConfig('notif_whatsapp', getConfigValue('notif_whatsapp', true))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de WhatsApp */}
          <div className="config-section">
            <h3 className="config-title">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 18h.01" stroke="currentColor" strokeWidth="2"/>
              </svg>
              WhatsApp
            </h3>
            <div className="config-items">
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">WhatsApp Activado</p>
                  <p className="config-item-desc">Habilitar envío de mensajes por WhatsApp</p>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={getConfigValue('whatsapp_activo', true)}
                    onChange={(e) => handleToggleConfig('whatsapp_activo', getConfigValue('whatsapp_activo', true))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="config-item" style={{ 
                background: !getConfigValue('whatsapp_phone_number_id') ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
                border: !getConfigValue('whatsapp_phone_number_id') ? '1px solid rgba(255, 193, 7, 0.3)' : 'none'
              }}>
                <div className="config-item-info">
                  <p className="config-item-label">
                    Phone Number ID (WhatsApp Business API)
                    {!getConfigValue('whatsapp_phone_number_id') && (
                      <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: '#ff9800', color: '#000', borderRadius: '4px', fontWeight: 'bold' }}>
                        REQUERIDO
                      </span>
                    )}
                  </p>
                  <p className="config-item-desc">
                    {getConfigValue('whatsapp_phone_number_id') 
                      ? `Configurado: ${getConfigValue('whatsapp_phone_number_id').substring(0, 20)}...`
                      : 'Ingresa tu Phone Number ID de WhatsApp Business API'}
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_phone_number_id')}>
                  {getConfigValue('whatsapp_phone_number_id') ? 'Editar' : 'Configurar'}
                </button>
              </div>
              <div className="config-item" style={{ 
                background: !getConfigValue('whatsapp_access_token') ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
                border: !getConfigValue('whatsapp_access_token') ? '1px solid rgba(255, 193, 7, 0.3)' : 'none'
              }}>
                <div className="config-item-info">
                  <p className="config-item-label">
                    Access Token (WhatsApp Business API)
                    {!getConfigValue('whatsapp_access_token') && (
                      <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: '#ff9800', color: '#000', borderRadius: '4px', fontWeight: 'bold' }}>
                        REQUERIDO
                      </span>
                    )}
                  </p>
                  <p className="config-item-desc">
                    {getConfigValue('whatsapp_access_token') 
                      ? 'Token configurado (oculto por seguridad)'
                      : 'Ingresa tu Access Token de WhatsApp Business API'}
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_access_token')}>
                  {getConfigValue('whatsapp_access_token') ? 'Editar' : 'Configurar'}
                </button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Mensaje de Recordatorio</p>
                  <p className="config-item-desc">Personalizar plantilla del mensaje de recordatorio</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_recordatorio')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Mensaje de Confirmación</p>
                  <p className="config-item-desc">Respuesta cuando el paciente confirma</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_confirmacion')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Mensaje de Cancelación</p>
                  <p className="config-item-desc">Respuesta cuando el paciente cancela</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_cancelacion')}>Editar</button>
              </div>
              <div className="config-item">
                <div className="config-item-info">
                  <p className="config-item-label">Mensaje de Reagendamiento</p>
                  <p className="config-item-desc">Respuesta cuando el paciente quiere reagendar</p>
                </div>
                <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_reagendamiento')}>Editar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {showModal && modalConfig && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Configuración</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarConfig}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{modalConfig.descripcion}</label>
                  {modalConfig.tipo === 'number' ? (
                    <input
                      type="number"
                      value={modalConfig.valor}
                      onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                      required
                    />
                  ) : modalConfig.tipo === 'email' ? (
                    <input
                      type="email"
                      value={modalConfig.valor}
                      onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                      required
                    />
                  ) : modalConfig.tipo === 'time' ? (
                    <input
                      type="time"
                      value={modalConfig.valor}
                      onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                      required
                    />
                  ) : modalConfig.tipo === 'image' ? (
                    <div>
                      {modalConfig.valor && (
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                          <img 
                            src={modalConfig.valor} 
                            alt="Logo actual" 
                            style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px', background: '#1a1a1a' }}
                          />
                          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>Logo actual</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validar tamaño
                            if (file.size > 2 * 1024 * 1024) {
                              alert('El archivo es demasiado grande. Máximo 2MB');
                              e.target.value = '';
                              return;
                            }
                            // Guardar archivo en el estado temporal
                            setModalConfig({ ...modalConfig, archivoTemporal: file });
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        Formatos: JPG, PNG, WEBP, SVG | Máximo: 2MB
                      </p>
                      {modalConfig.valor && (
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ marginTop: '0.75rem', width: '100%' }}
                          onClick={async () => {
                            if (confirm('¿Estás seguro de eliminar el logo?')) {
                              try {
                                const response = await fetch('/api/upload/logo', { method: 'DELETE' });
                                const data = await response.json();
                                if (data.success) {
                                  window.location.reload();
                                }
                              } catch (error) {
                                mostrarMensaje('Error al eliminar logo', true);
                              }
                            }
                          }}
                        >
                          🗑️ Eliminar Logo
                        </button>
                      )}
                    </div>
                  ) : modalConfig.tipo === 'textarea' ? (
                    <>
                      <textarea
                        value={modalConfig.valor}
                        onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                        rows={8}
                        required
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                      {modalConfig.clave?.includes('whatsapp_mensaje') && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.75rem', 
                          background: '#1a1a1a', 
                          border: '1px solid #2a2a2a',
                          borderRadius: '6px',
                          fontSize: '0.85rem'
                        }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#3FFF00' }}>
                            📝 Variables disponibles:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#a0a0a0' }}>
                            {modalConfig.clave === 'whatsapp_mensaje_recordatorio' && (
                              <>
                                <code>{'{nombre_centro}'}</code>
                                <code>{'{paciente}'}</code>
                                <code>{'{fecha}'}</code>
                                <code>{'{hora}'}</code>
                                <code>{'{duracion}'}</code>
                                <code>{'{tipo}'}</code>
                              </>
                            )}
                            {modalConfig.clave === 'whatsapp_mensaje_confirmacion' && (
                              <>
                                <code>{'{paciente}'}</code>
                                <code>{'{fecha}'}</code>
                                <code>{'{hora}'}</code>
                              </>
                            )}
                            {modalConfig.clave === 'whatsapp_mensaje_cancelacion' && (
                              <>
                                <code>{'{paciente}'}</code>
                              </>
                            )}
                            {modalConfig.clave === 'whatsapp_mensaje_reagendamiento' && (
                              <>
                                <code>{'{telefono}'}</code>
                              </>
                            )}
                          </div>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                            💡 Usa estas variables en tu mensaje y se reemplazarán automáticamente
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={modalConfig.valor}
                      onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                      required
                    />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
