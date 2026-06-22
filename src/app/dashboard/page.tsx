'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import './dashboard.css';
import './calendario.css';

const PacientesModule = dynamic(() => import('./components/PacientesModule'), {
  loading: () => <div className="loading">Cargando modulo...</div>
});
const CitasModule = dynamic(() => import('./components/CitasModule'), {
  loading: () => <div className="loading">Cargando modulo...</div>
});
const SesionesModule = dynamic(() => import('./components/SesionesModule'), {
  loading: () => <div className="loading">Cargando modulo...</div>
});
const FinanzasModule = dynamic(() => import('./components/FinanzasModule'), {
  loading: () => <div className="loading">Cargando modulo...</div>
});
const ConfiguracionModule = dynamic(() => import('./components/ConfiguracionModule'), {
  loading: () => <div className="loading">Cargando modulo...</div>
});
const RelojDashboard = dynamic(() => import('./components/RelojDashboard'), { ssr: false });

type Module = 'pacientes' | 'citas' | 'sesiones' | 'pagos' | 'configuracion';

export default function DashboardPage() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [navigateContext, setNavigateContext] = useState<{ pacienteId?: number } | null>(null);

  const handleNavigate = (modulo: string, context?: { pacienteId?: number }) => {
    setNavigateContext(context || null);
    setSelectedModule(modulo as Module);
  };

  // === SWIPE NAVIGATION ===
  const moduleOrder: Module[] = ['pacientes', 'citas', 'sesiones', 'pagos', 'configuracion'];
  const moduleNames: Record<Module, string> = {
    pacientes: 'Pacientes',
    citas: 'Citas',
    sesiones: 'Sesiones',
    pagos: 'Finanzas',
    configuracion: 'Configuración'
  };
  const [swipeIndicator, setSwipeIndicator] = useState<string | null>(null);

  // Se usan event listeners nativos en vez de los de React para tener control total del passive flag en mobile
  const mainRef = useRef<HTMLElement>(null);
  const dashboardMainRef = useRef<HTMLElement>(null);

  // Navegacion por swipe dentro de un modulo activo
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !selectedModule) return;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      endX = startX;
      endY = startY;
    };

    const onTouchMove = (e: TouchEvent) => {
      endX = e.touches[0].clientX;
      endY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      const deltaX = startX - endX;
      const deltaY = startY - endY;
      const minSwipeDistance = 80;

      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > minSwipeDistance) {
        if (document.querySelector('.modal-overlay')) return;

        const currentIndex = moduleOrder.indexOf(selectedModule!);
        if (currentIndex === -1) return;

        let newIndex: number;
        if (deltaX > 0) {
          newIndex = currentIndex + 1;
        } else {
          newIndex = currentIndex - 1;
        }

        if (newIndex >= 0 && newIndex < moduleOrder.length) {
          const newModule = moduleOrder[newIndex];
          setNavigateContext(null);
          setSelectedModule(newModule);
          setSwipeIndicator(moduleNames[newModule]);
          setTimeout(() => setSwipeIndicator(null), 1200);
        } else if (newIndex < 0) {
          // Si el usuario desliza a la derecha desde el primer modulo, vuelve al dashboard
          setNavigateContext(null);
          setSelectedModule(null);
          setSwipeIndicator('Dashboard');
          setTimeout(() => setSwipeIndicator(null), 1200);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [selectedModule]);

  // Navegacion por swipe desde la pantalla principal del dashboard (sin modulo abierto)
  useEffect(() => {
    const el = dashboardMainRef.current;
    if (!el || selectedModule) return;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      endX = startX;
      endY = startY;
    };

    const onTouchMove = (e: TouchEvent) => {
      endX = e.touches[0].clientX;
      endY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      const deltaX = startX - endX;
      const deltaY = startY - endY;
      const minSwipeDistance = 80;

      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Deslizar a la izquierda desde el dashboard abre el primer modulo (Pacientes)
          setNavigateContext(null);
          setSelectedModule(moduleOrder[0]);
          setSwipeIndicator(moduleNames[moduleOrder[0]]);
          setTimeout(() => setSwipeIndicator(null), 1200);
        }
        // Deslizar a la derecha desde el dashboard no hace nada porque no hay mas pantallas a la izquierda
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [selectedModule]);

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
    pagosPendientes: 0,
    pacientesAlta: 0,
    pacientesAbandono: 0
  });
  const [configuracionesGlobales, setConfiguracionesGlobales] = useState<any>({});

  useEffect(() => {
    fetchUser();
    cargarEstadisticas();
    cargarConfiguracionesGlobales();
    inicializarCronAutomatico();
    
    // Bloquea el boton atras del navegador para que el usuario no salga del dashboard accidentalmente
    window.history.pushState({ module: null }, '', window.location.href);
    
    const handlePopState = (e: PopStateEvent) => {
      // Cada vez que se intenta navegar hacia atras, se vuelve a pushear el estado para quedarse aqui
      window.history.pushState({ module: null }, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const inicializarCronAutomatico = async () => {
    try {
      console.log('Iniciando sistema de recordatorios automaticos...');
      const response = await fetch('/api/cron/init', { method: 'POST' });
      
      if (!response.ok) {
        console.warn('No se pudo inicializar el sistema de recordatorios');
        return;
      }
      
      const data = await response.json();
      console.log('Sistema de recordatorios iniciado:', data);
    } catch (error) {
      console.error('Error al inicializar el sistema de recordatorios:', error);
      // El error se captura sin relanzar para no interrumpir la carga del dashboard
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

  // Cada vez que el usuario cierra un modulo y vuelve al dashboard se refrescan los numeros de las tarjetas
  useEffect(() => {
    if (!selectedModule) {
      cargarEstadisticas();
    }
  }, [selectedModule]);

  const cargarEstadisticas = async () => {
    try {
      // Se lanzan las 4 llamadas al mismo tiempo para que el dashboard cargue mas rapido
      const [resPacientes, resCitas, resSesiones, resPagos] = await Promise.allSettled([
        fetch('/api/pacientes').then(r => r.json()),
        fetch('/api/citas/estadisticas').then(r => r.json()),
        fetch('/api/sesiones/estadisticas').then(r => r.json()),
        fetch('/api/pagos/estadisticas').then(r => r.json())
      ]);

      // Se acumulan todos los datos en un solo objeto para actualizar el estado una sola vez y evitar renders multiples
      const newStats: Partial<typeof stats> = {};

      if (resPacientes.status === 'fulfilled' && resPacientes.value.success) {
        const pacientes = resPacientes.value.pacientes || [];
        newStats.totalPacientes = pacientes.length;
        newStats.pacientesActivos = pacientes.filter((p: any) => !p.estado_paciente || p.estado_paciente === 'activo').length;
        newStats.pacientesAlta = pacientes.filter((p: any) => p.estado_paciente === 'alta').length;
        newStats.pacientesAbandono = pacientes.filter((p: any) => p.estado_paciente === 'abandono').length;
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        newStats.pacientesNuevos = pacientes.filter((p: any) => new Date(p.createdAt) >= inicioMes).length;
      }

      if (resCitas.status === 'fulfilled' && resCitas.value.success) {
        newStats.citasHoy = resCitas.value.estadisticas.hoy;
        newStats.citasSemana = resCitas.value.estadisticas.proximasCitas?.length || 0;
      }

      if (resSesiones.status === 'fulfilled' && resSesiones.value.success) {
        newStats.sesionesMes = resSesiones.value.estadisticas.mesActual;
        newStats.sesionesCompletadas = resSesiones.value.estadisticas.completadasMes;
      }

      if (resPagos.status === 'fulfilled' && resPagos.value.success) {
        newStats.ingresosMes = resPagos.value.estadisticas.ingresosMes || 0;
        newStats.ingresosTotales = resPagos.value.estadisticas.ingresosTotales || 0;
        newStats.pagosPendientes = resPagos.value.estadisticas.pagosPendientes?.cantidad || 0;
      }

      setStats(prev => ({ ...prev, ...newStats }));
    } catch (error) {
      console.error('Error al cargar estadisticas:', error);
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
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si hay un modulo activo, se renderiza solo ese modulo ocupando toda la pantalla
  if (selectedModule) {
    const currentModuleIndex = moduleOrder.indexOf(selectedModule);
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="back-button" onClick={() => { setNavigateContext(null); setSelectedModule(null); }}>
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

        {/* Puntitos de navegacion entre modulos, solo visibles en movil */}
        <div className="swipe-nav-dots">
          {moduleOrder.map((mod, i) => (
            <button
              key={mod}
              onClick={() => { setNavigateContext(null); setSelectedModule(mod); }}
              className={`swipe-dot ${mod === selectedModule ? 'active' : ''}`}
              title={moduleNames[mod]}
            >
              <span className="swipe-dot-label">{moduleNames[mod]}</span>
            </button>
          ))}
        </div>

        {/* Mensaje que aparece brevemente al deslizar entre modulos */}
        {swipeIndicator && (
          <div className="swipe-indicator">
            {swipeIndicator}
          </div>
        )}

        <main className="dashboard-main" ref={mainRef}>
          {selectedModule === 'pacientes' && <PacientesModule configuraciones={configuracionesGlobales} onNavigate={handleNavigate} initialPacienteId={navigateContext?.pacienteId} />}
          {selectedModule === 'citas' && <CitasModule />}
          {selectedModule === 'sesiones' && <SesionesModule onNavigate={handleNavigate} initialPacienteId={navigateContext?.pacienteId} />}
          {selectedModule === 'pagos' && <FinanzasModule />}
          {selectedModule === 'configuracion' && <ConfiguracionModule />}
        </main>
      </div>
    );
  }

  // Pantalla principal con las tarjetas de resumen y acceso a cada modulo
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
          <RelojDashboard />
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

      {/* Mensaje transitorio al deslizar desde el dashboard */}
      {swipeIndicator && !selectedModule && (
        <div className="swipe-indicator">
          {swipeIndicator}
        </div>
      )}

      {/* Dashboard Main */}
      <main className="dashboard-main" ref={dashboardMainRef}>
        <div className="dashboard-welcome">
          <h2>Bienvenido, {user?.nombre}</h2>
          <p>Selecciona un módulo para comenzar</p>
        </div>

        {/* Tarjetas de resumen con los indicadores principales */}
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

        {/* Grilla de acceso a cada modulo del sistema */}
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
                <span className="module-stat-value" style={{ color: '#3b82f6' }}>{stats.pacientesAlta}</span>
                <span className="module-stat-label">Alta</span>
              </div>
              <div className="module-stat-item">
                <span className="module-stat-value" style={{ color: '#ef4444' }}>{stats.pacientesAbandono}</span>
                <span className="module-stat-label">Receso</span>
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
              <h3>Finanzas</h3>
            </div>
            <p className="module-description">
              Ingresos, gastos, balance mensual y gastos fijos del centro.
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
