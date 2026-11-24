'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfigMap, Configuracion } from '../types';
import ConfigGeneral from './config/ConfigGeneral';
import ConfigCitas from './config/ConfigCitas';
import ConfigPagos from './config/ConfigPagos';
import ConfigWhatsApp from './config/ConfigWhatsApp';
import ConfigUsuarios from './config/ConfigUsuarios';
import ConfigRespaldos from './config/ConfigRespaldos';
import { useConfirm } from '@/components/ConfirmDialog';


// Módulo Configuración (Orquestador)
export default function ConfiguracionModule() {
  const confirmar = useConfirm();
  const [configuraciones, setConfiguraciones] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<Configuracion | null>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuraciones');
      const data = await response.json();
      
      if (data.success) {
        const configMap: ConfigMap = {};
        data.configuraciones.forEach((config: Configuracion) => {
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

  const mostrarMensaje = useCallback((texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  }, []);

  const getConfigValue = useCallback((clave: string, defaultValue: any = '') => {
    return configuraciones[clave]?.valor ?? defaultValue;
  }, [configuraciones]);

  const handleEditarConfig = useCallback((clave: string) => {
    const config = configuraciones[clave];
    
    if (!config) {
      const nuevaConfig: Configuracion = {
        clave,
        valor: '',
        tipo: 'text',
        descripcion: `Configuracion de ${clave}`
      };
      setModalConfig(nuevaConfig);
      setShowModal(true);
      return;
    }
    
    setModalConfig({ ...config });
    setShowModal(true);
  }, [configuraciones]);

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConfig) return;
    
    try {
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
          setShowModal(false);
          setModalConfig(null);
          mostrarMensaje('Logo actualizado correctamente');
        } else {
          mostrarMensaje(uploadData.error || 'Error al subir logo', true);
        }
      } else {
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
          mostrarMensaje('Configuracion actualizada');
        } else {
          mostrarMensaje(data.error || 'Error al guardar', true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar configuracion', true);
    }
  };

  const handleToggleConfig = useCallback(async (clave: string, nuevoValor: boolean) => {
    try {
      const response = await fetch('/api/configuraciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: clave,
          valor: nuevoValor
        })
      });

      const data = await response.json();

      if (data.success) {
        await cargarConfiguraciones();
        mostrarMensaje('Configuracion actualizada');
      } else {
        mostrarMensaje(data.error || 'Error al actualizar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al actualizar configuracion', true);
    }
  }, [mostrarMensaje]);

  const sectionProps = {
    configuraciones,
    getConfigValue,
    handleEditarConfig,
    handleToggleConfig,
    mostrarMensaje
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="loading">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="module-container configuracion-module">
      {mensaje.texto && (
        <div className={`toast ${mensaje.tipo === 'error' ? 'toast--error' : 'toast--ok'}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
          {mensaje.texto}
        </div>
      )}

      <div className="module-header pac-header">
        <h2>Configuración del Sistema</h2>
      </div>
      <div className="module-content">
        <div className="config-grid">
          <ConfigGeneral {...sectionProps} />
          <ConfigCitas {...sectionProps} />
          <ConfigPagos {...sectionProps} />
          <ConfigWhatsApp {...sectionProps} />
          <ConfigUsuarios {...sectionProps} />
          <ConfigRespaldos />
        </div>
      </div>

      {/* Modal de Edicion */}
      {showModal && modalConfig && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Configuracion</h3>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleGuardarConfig}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{modalConfig.descripcion}</label>
                  {modalConfig.clave === 'recordatorios_horas_antes' ? (
                    <div>
                      <select
                        value={modalConfig.valor}
                        onChange={(e) => setModalConfig({ ...modalConfig, valor: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                      >
                        <option value="1">1 hora antes</option>
                        <option value="2">2 horas antes</option>
                        <option value="3">3 horas antes</option>
                        <option value="4">4 horas antes</option>
                        <option value="6">6 horas antes</option>
                        <option value="8">8 horas antes</option>
                        <option value="12">12 horas antes</option>
                        <option value="24">24 horas antes (1 dia)</option>
                      </select>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        Los recordatorios se enviaran automaticamente con esta anticipacion
                      </p>
                    </div>
                  ) : modalConfig.tipo === 'number' ? (
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
                            if (file.size > 2 * 1024 * 1024) {
                              void confirmar('El archivo es demasiado grande. Máximo 2 MB', { soloAviso: true });
                              e.target.value = '';
                              return;
                            }
                            setModalConfig({ ...modalConfig, archivoTemporal: file });
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                        Formatos: JPG, PNG, WEBP, SVG | Maximo: 2MB
                      </p>
                      {modalConfig.valor && (
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ marginTop: '0.75rem', width: '100%' }}
                          onClick={async () => {
                            if (await confirmar('Estas seguro de eliminar el logo?', { peligro: true })) {
                              try {
                                const response = await fetch('/api/upload/logo', { method: 'DELETE' });
                                const data = await response.json();
                                if (data.success) {
                                  await cargarConfiguraciones();
                                  setShowModal(false);
                                  setModalConfig(null);
                                  mostrarMensaje('Logo eliminado');
                                }
                              } catch (error) {
                                mostrarMensaje('Error al eliminar logo', true);
                              }
                            }
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Eliminar Logo
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
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#2AD636' }}>
                            <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Variables disponibles:
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
                            {modalConfig.clave === 'whatsapp_mensaje_cobro' && (
                              <>
                                <code>{'{nombre_centro}'}</code>
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
                            <svg viewBox="0 0 24 24" fill="none" width="12" height="12" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Usa estas variables en tu mensaje y se reemplazaran automaticamente
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
