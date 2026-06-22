'use client';

import { ConfigSectionProps } from '../../types';

export default function ConfigPagos({ getConfigValue, handleEditarConfig, handleToggleConfig }: ConfigSectionProps) {
  return (
    <div className="config-section">
      <h3 className="config-title">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
        </svg>
        Pagos
      </h3>
      <div className="config-items">
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Metodos de Pago</p>
            <p className="config-item-desc">{getConfigValue('metodos_pago', 'Efectivo, Transferencia, Tarjeta')}</p>
          </div>
          <button className="btn-secondary" onClick={() => handleEditarConfig('metodos_pago')}>Gestionar</button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Tarifa Evaluacion</p>
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
            <p className="config-item-label">Facturacion Automatica</p>
            <p className="config-item-desc">Generar facturas al finalizar</p>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={getConfigValue('facturacion_automatica', false)}
              onChange={() => handleToggleConfig('facturacion_automatica', !getConfigValue('facturacion_automatica', false))}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
