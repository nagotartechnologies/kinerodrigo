'use client';

import { useState } from 'react';
import { ConfigSectionProps } from '../../types';
import WhatsAppProvidersModal from '../../WhatsAppProvidersModal';

export default function ConfigWhatsApp({ getConfigValue, handleEditarConfig, handleToggleConfig, mostrarMensaje }: ConfigSectionProps) {
  const [showProveedoresModal, setShowProveedoresModal] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConexion = async () => {
    const telefono = getConfigValue('telefono_contacto', '');
    if (!telefono) {
      mostrarMensaje('Configura un telefono de contacto primero', true);
      return;
    }

    try {
      setTestLoading(true);
      setTestResult(null);
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono })
      });
      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: `Mensaje enviado via ${data.provider || 'WhatsApp'}` });
        mostrarMensaje('Mensaje de prueba enviado correctamente');
      } else {
        setTestResult({ success: false, message: data.error || 'Error al enviar mensaje' });
        mostrarMensaje(data.error || 'Error al enviar mensaje de prueba', true);
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error de conexion con el servidor' });
      mostrarMensaje('Error de conexion con el servidor', true);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <>
      <div className="config-section">
        <h3 className="config-title">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 18h.01" stroke="currentColor" strokeWidth="2"/>
          </svg>
          WhatsApp
        </h3>
        <div className="config-items">
          {/* Toggle WhatsApp activo */}
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">WhatsApp Activado</p>
              <p className="config-item-desc">Habilitar envio de mensajes por WhatsApp</p>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={getConfigValue('whatsapp_activo', true)}
                onChange={() => handleToggleConfig('whatsapp_activo', !getConfigValue('whatsapp_activo', true))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Gestion de Proveedores (unificado) */}
          <div className="config-item" style={{ 
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '1rem'
          }}>
            <div className="config-item-info">
              <p className="config-item-label">
                Proveedores de WhatsApp
              </p>
              <p className="config-item-desc">Gestionar credenciales y seleccionar proveedor activo (Green API, Twilio, Meta Cloud API, etc.)</p>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => setShowProveedoresModal(true)}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              Gestionar Proveedores
            </button>
          </div>

          {/* Boton Test de Conexion */}
          <div className="config-item" style={{
            background: testResult 
              ? testResult.success ? 'rgba(42, 214, 54, 0.05)' : 'rgba(255, 0, 0, 0.05)'
              : 'transparent',
            border: testResult 
              ? `1px solid ${testResult.success ? '#2AD636' : '#ff4444'}`
              : undefined
          }}>
            <div className="config-item-info">
              <p className="config-item-label">
                Probar Conexion
                {testResult && (
                  <span className={`config-badge ${testResult.success ? 'config-badge--success' : 'config-badge--error'}`}>
                    {testResult.success ? 'OK' : 'ERROR'}
                  </span>
                )}
              </p>
              <p className="config-item-desc">
                {testResult 
                  ? testResult.message
                  : `Enviar mensaje de prueba al telefono de contacto (${getConfigValue('telefono_contacto', 'no configurado')})`
                }
              </p>
            </div>
            <button 
              className="btn-secondary"
              onClick={handleTestConexion}
              disabled={testLoading}
              style={{ minWidth: '120px' }}
            >
              {testLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Enviando...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Enviar Prueba
                </span>
              )}
            </button>
          </div>

          {/* Avisos al profesional cuando un paciente cancela o pide reagendar */}
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Avisos al Profesional</p>
              <p className="config-item-desc">Recibir un WhatsApp cuando un paciente cancela o pide reagendar</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={getConfigValue('notif_whatsapp', true)}
                onChange={() => handleToggleConfig('notif_whatsapp', !getConfigValue('notif_whatsapp', true))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Teléfono para Avisos</p>
              <p className="config-item-desc">
                {getConfigValue('notif_whatsapp_telefono', '') ||
                  `Sin configurar: se usa el teléfono de contacto (${getConfigValue('telefono_contacto', 'no configurado')})`}
              </p>
            </div>
            <button className="btn-secondary" onClick={() => handleEditarConfig('notif_whatsapp_telefono')}>Editar</button>
          </div>

          {/* Plantillas de mensajes */}
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Mensaje de Recordatorio</p>
              <p className="config-item-desc">Personalizar plantilla del mensaje de recordatorio</p>
            </div>
            <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_recordatorio')}>Editar</button>
          </div>
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Mensaje de Confirmacion</p>
              <p className="config-item-desc">Respuesta cuando el paciente confirma</p>
            </div>
            <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_confirmacion')}>Editar</button>
          </div>
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Mensaje de Cancelacion</p>
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
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Mensaje de Cobro</p>
              <p className="config-item-desc">Recordatorio de pago que se envía desde Finanzas → Recordatorios</p>
            </div>
            <button className="btn-secondary" onClick={() => handleEditarConfig('whatsapp_mensaje_cobro')}>Editar</button>
          </div>
        </div>
      </div>

      <WhatsAppProvidersModal 
        isOpen={showProveedoresModal}
        onClose={() => setShowProveedoresModal(false)}
        onMessage={mostrarMensaje}
      />
    </>
  );
}
