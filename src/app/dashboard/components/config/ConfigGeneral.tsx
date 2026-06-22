'use client';

import { ConfigSectionProps } from '../../types';

export default function ConfigGeneral({ getConfigValue, handleEditarConfig }: ConfigSectionProps) {
  return (
    <div className="config-section">
      <h3 className="config-title">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
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
            <p className="config-item-label">Horario de Atencion</p>
            <p className="config-item-desc">
              {getConfigValue('dias_atencion', 'Lunes a Viernes')}: {getConfigValue('horario_inicio', '09:00')} - {getConfigValue('horario_fin', '18:00')}
            </p>
          </div>
          <button className="btn-secondary" onClick={() => handleEditarConfig('horario_inicio')}>Editar</button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Duracion de Sesiones</p>
            <p className="config-item-desc">Tiempo predeterminado: {getConfigValue('duracion_sesion_default', '60')} minutos</p>
          </div>
          <button className="btn-secondary" onClick={() => handleEditarConfig('duracion_sesion_default')}>Editar</button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <p className="config-item-label">Telefono de Contacto</p>
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
  );
}
