'use client';

import { useState, useEffect } from 'react';

interface WhatsAppProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessage: (message: string, isError?: boolean) => void;
}

export default function WhatsAppProvidersModal({ isOpen, onClose, onMessage }: WhatsAppProvidersModalProps) {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proveedorActivo, setProveedorActivo] = useState('auto');
  const [credencialesProveedor, setCredencialesProveedor] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarProveedores();
    }
  }, [isOpen]);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/providers');
      const data = await response.json();
      if (data.success) {
        setProveedores(data.providers);
        setProveedorActivo(data.activeProvider);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      onMessage('Error al cargar proveedores', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarProveedor = async (provider: string) => {
    try {
      const response = await fetch('/api/whatsapp/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await response.json();
      if (data.success) {
        setProveedorActivo(provider);
        onMessage(`✅ Proveedor cambiado a: ${provider}`);
      } else {
        onMessage(data.error || 'Error al cambiar proveedor', true);
      }
    } catch (error: any) {
      onMessage('Error al cambiar proveedor', true);
    }
  };

  const handleGuardarCredenciales = async (provider: string) => {
    try {
      const response = await fetch('/api/whatsapp/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider, 
          credentials: credencialesProveedor[provider] || {} 
        })
      });
      const data = await response.json();
      if (data.success) {
        onMessage(`✅ Credenciales de ${provider} guardadas`);
        await cargarProveedores();
        setCredencialesProveedor({});
      } else {
        onMessage(data.error || 'Error al guardar credenciales', true);
      }
    } catch (error: any) {
      onMessage('Error al guardar credenciales', true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
        <div className="modal-header">
          <h3>Gestión de Proveedores de WhatsApp</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando proveedores...</div>
          ) : (
            <>
              {/* Selector de Proveedor Activo */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Proveedor Activo</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'auto', name: 'Automático', desc: 'Usa el primer proveedor configurado' },
                    { key: 'greenapi', name: 'Green API', desc: 'Tu proveedor actual' },
                    { key: 'twilio', name: 'Twilio', desc: 'Oficial, pago por uso' },
                    { key: 'meta', name: 'Meta Cloud API', desc: 'Oficial, gratis hasta 1000/mes' },
                    { key: 'wassenger', name: 'Wassenger', desc: 'Simple, $19/mes, 1000 mensajes' },
                    { key: 'ultramsg', name: 'Ultramsg', desc: 'Sin Facebook, $20/mes, 1000 mensajes' }
                  ].map(prov => (
                    <button
                      key={prov.key}
                      onClick={() => handleCambiarProveedor(prov.key)}
                      style={{
                        flex: '1 1 200px',
                        padding: '1rem',
                        background: proveedorActivo === prov.key ? '#10b981' : '#2a2a2a',
                        border: `2px solid ${proveedorActivo === prov.key ? '#10b981' : '#333'}`,
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (proveedorActivo !== prov.key) {
                          e.currentTarget.style.borderColor = '#10b981';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (proveedorActivo !== prov.key) {
                          e.currentTarget.style.borderColor = '#333';
                        }
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{prov.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>{prov.desc}</div>
                      {proveedorActivo === prov.key && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#000', fontWeight: 'bold' }}>
                          ✓ ACTIVO
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado de Proveedores */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Estado de Proveedores</h4>
                <button 
                  onClick={cargarProveedores}
                  className="btn-secondary"
                  style={{ marginBottom: '1rem' }}
                >
                  🔄 Actualizar Estado
                </button>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {proveedores.map(prov => (
                    <div 
                      key={prov.key}
                      style={{
                        padding: '1rem',
                        background: prov.configured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${prov.configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{prov.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                          {prov.configured ? '✅ Configurado' : '❌ No configurado'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuración de Green API */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Green API</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Instance ID</label>
                    <input
                      type="text"
                      placeholder="ej: 1101234567"
                      value={credencialesProveedor.greenapi?.instanceId || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        greenapi: { ...credencialesProveedor.greenapi, instanceId: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>API Token</label>
                    <input
                      type="password"
                      placeholder="Tu API Token"
                      value={credencialesProveedor.greenapi?.apiToken || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        greenapi: { ...credencialesProveedor.greenapi, apiToken: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <button 
                    onClick={() => handleGuardarCredenciales('greenapi')}
                    className="btn-primary"
                  >
                    Guardar Credenciales Green API
                  </button>
                </div>
              </div>

              {/* Configuración de Twilio */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Twilio</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account SID</label>
                    <input
                      type="text"
                      placeholder="ACxxxxx"
                      value={credencialesProveedor.twilio?.accountSid || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        twilio: { ...credencialesProveedor.twilio, accountSid: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Auth Token</label>
                    <input
                      type="password"
                      placeholder="Tu Auth Token"
                      value={credencialesProveedor.twilio?.authToken || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        twilio: { ...credencialesProveedor.twilio, authToken: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Número WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+14155238886"
                      value={credencialesProveedor.twilio?.whatsappNumber || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        twilio: { ...credencialesProveedor.twilio, whatsappNumber: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <button 
                    onClick={() => handleGuardarCredenciales('twilio')}
                    className="btn-primary"
                  >
                    Guardar Credenciales Twilio
                  </button>
                </div>
              </div>

              {/* Configuración de Meta Cloud API */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Meta Cloud API (Gratis)</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="123456789"
                      value={credencialesProveedor.meta?.phoneNumberId || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        meta: { ...credencialesProveedor.meta, phoneNumberId: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Access Token</label>
                    <input
                      type="password"
                      placeholder="EAAxxxxx"
                      value={credencialesProveedor.meta?.accessToken || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        meta: { ...credencialesProveedor.meta, accessToken: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <button 
                    onClick={() => handleGuardarCredenciales('meta')}
                    className="btn-primary"
                  >
                    Guardar Credenciales Meta Cloud API
                  </button>
                </div>
              </div>

              {/* Configuración de Wassenger */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Wassenger ($19/mes)</h4>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                  API simple y confiable. 1,000 mensajes incluidos. Setup en 10 minutos.
                </p>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>API Key</label>
                    <input
                      type="password"
                      placeholder="Tu API Key de Wassenger"
                      value={credencialesProveedor.wassenger?.apiKey || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        wassenger: { ...credencialesProveedor.wassenger, apiKey: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Device ID</label>
                    <input
                      type="text"
                      placeholder="Tu Device ID"
                      value={credencialesProveedor.wassenger?.deviceId || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        wassenger: { ...credencialesProveedor.wassenger, deviceId: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <strong>Cómo obtener credenciales:</strong>
                    </p>
                    <ol style={{ fontSize: '0.85rem', color: '#888', marginLeft: '1.5rem' }}>
                      <li>Ve a <a href="https://wassenger.com" target="_blank" style={{ color: '#10b981' }}>wassenger.com</a></li>
                      <li>Crea una cuenta (gratis por 7 días)</li>
                      <li>Conecta tu WhatsApp escaneando el QR</li>
                      <li>Copia el API Key y Device ID</li>
                    </ol>
                  </div>
                  <button 
                    onClick={() => handleGuardarCredenciales('wassenger')}
                    className="btn-primary"
                  >
                    Guardar Credenciales Wassenger
                  </button>
                </div>
              </div>

              {/* Configuración de Ultramsg */}
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', border: '2px solid #10b981' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>
                  Ultramsg ($20/mes) ⭐ RECOMENDADO
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                  <strong>Sin Facebook.</strong> API simple y confiable. 1,000 mensajes incluidos. Setup en 5 minutos.
                </p>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Instance ID</label>
                    <input
                      type="text"
                      placeholder="instance12345"
                      value={credencialesProveedor.ultramsg?.instanceId || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        ultramsg: { ...credencialesProveedor.ultramsg, instanceId: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Token</label>
                    <input
                      type="password"
                      placeholder="Tu token de Ultramsg"
                      value={credencialesProveedor.ultramsg?.token || ''}
                      onChange={(e) => setCredencialesProveedor({
                        ...credencialesProveedor,
                        ultramsg: { ...credencialesProveedor.ultramsg, token: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.75rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                    />
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <strong>✅ Cómo obtener credenciales (5 minutos):</strong>
                    </p>
                    <ol style={{ fontSize: '0.85rem', color: '#888', marginLeft: '1.5rem' }}>
                      <li>Ve a <a href="https://ultramsg.com" target="_blank" style={{ color: '#10b981' }}>ultramsg.com</a></li>
                      <li>Crea una cuenta (7 días gratis)</li>
                      <li>Click en "Connect Instance"</li>
                      <li>Escanea el QR con tu WhatsApp</li>
                      <li>Copia el Instance ID y Token</li>
                    </ol>
                    <p style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.5rem' }}>
                      ⚡ No requiere Facebook ni verificaciones complejas
                    </p>
                  </div>
                  <button 
                    onClick={() => handleGuardarCredenciales('ultramsg')}
                    className="btn-primary"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                  >
                    Guardar Credenciales Ultramsg
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
