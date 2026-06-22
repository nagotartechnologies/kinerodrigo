'use client';

import { useState, useEffect } from 'react';
import { ConfigSectionProps, CronEstado } from '../../types';

export default function ConfigCitas({ getConfigValue, handleEditarConfig, handleToggleConfig, mostrarMensaje }: ConfigSectionProps) {
  const [cronEstado, setCronEstado] = useState<CronEstado | null>(null);
  const [loadingCron, setLoadingCron] = useState(false);

  useEffect(() => {
    cargarEstadoCron();
  }, []);

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
        mostrarMensaje(data.mensaje);
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

  return (
    <div className="config-section">
      <h3 className="config-title">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2"/>
        </svg>
        Citas
      </h3>
      <div className="config-items">
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Recordatorios Automaticos</p>
            <p className="config-item-desc">Enviar recordatorios {getConfigValue('recordatorios_horas_antes', '24')}h antes</p>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={getConfigValue('recordatorios_automaticos', true)}
              onChange={(e) => handleToggleConfig('recordatorios_automaticos', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Sistema de Recordatorios (Cron) */}
        <div className="config-item" style={{ 
          background: cronEstado?.activo ? 'rgba(63, 255, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)',
          border: `1px solid ${cronEstado?.activo ? '#3FFF00' : '#ff4444'}`
        }}>
          <div className="config-item-info">
            <p className="config-item-label">
              Sistema de Recordatorios
              <span className={`config-badge ${cronEstado?.activo ? 'config-badge--success' : 'config-badge--error'}`}>
                {cronEstado?.activo ? 'ACTIVO' : 'DETENIDO'}
              </span>
            </p>
            <p className="config-item-desc">
              {cronEstado?.activo 
                ? `Ejecutandose cada 2 horas - Envia recordatorios ${getConfigValue('recordatorios_horas_antes', '24')}h antes` 
                : 'Sistema detenido'}
              {cronEstado?.proximaEjecucion && cronEstado.activo && (
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                  Proxima: {new Date(cronEstado.proximaEjecucion).toLocaleString('es-CL', {
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
                className="btn-primary btn-sm" 
                onClick={() => handleControlCron('iniciar')}
                disabled={loadingCron}
              >
                {loadingCron ? '...' : 'Iniciar'}
              </button>
            ) : (
              <button 
                className="btn-secondary btn-sm" 
                onClick={() => handleControlCron('detener')}
                disabled={loadingCron}
              >
                {loadingCron ? '...' : 'Detener'}
              </button>
            )}
            <button 
              className="btn-secondary btn-sm" 
              onClick={() => handleControlCron('ejecutar')}
              disabled={loadingCron}
              title="Ejecutar manualmente ahora"
            >
              {loadingCron ? '...' : 'Ejecutar'}
            </button>
          </div>
        </div>

        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Horas para Recordatorio</p>
            <p className="config-item-desc">
              Enviar recordatorios {getConfigValue('recordatorios_horas_antes', '24')} hora{getConfigValue('recordatorios_horas_antes', '24') === '1' ? '' : 's'} antes de cada cita
            </p>
          </div>
          <button className="btn-secondary" onClick={() => handleEditarConfig('recordatorios_horas_antes')}>Editar</button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Cancelacion de Citas</p>
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
              onChange={() => handleToggleConfig('permitir_reagendar', !getConfigValue('permitir_reagendar', true))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
