'use client';

import { useState, useEffect } from 'react';

interface Backup {
  id: string;
  url: string;
  fecha: string;
  tamano: number;
  nombre: string;
}

export default function ConfigRespaldos() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    cargarBackups();
  }, []);

  const cargarBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Error cargando backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearRespaldo = async () => {
    try {
      setCreando(true);
      setMensaje({ texto: 'Generando respaldo...', tipo: 'info' });
      
      const res = await fetch('/api/backups', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setMensaje({ texto: 'Respaldo creado exitosamente', tipo: 'success' });
        await cargarBackups();
      } else {
        setMensaje({ texto: data.error || 'Error al crear respaldo', tipo: 'error' });
      }
    } catch (error) {
      setMensaje({ texto: 'Error al crear respaldo', tipo: 'error' });
    } finally {
      setCreando(false);
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="config-section">
      <div className="config-section-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
          </svg>
          Respaldos de Base de Datos
        </h3>
      </div>

      {mensaje.texto && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          background: mensaje.tipo === 'error' ? '#3a1a1a' : mensaje.tipo === 'success' ? '#1a3a1a' : '#1a2a3a',
          color: mensaje.tipo === 'error' ? '#ff6b6b' : mensaje.tipo === 'success' ? '#51cf66' : '#74c0fc',
          border: `1px solid ${mensaje.tipo === 'error' ? '#5a2a2a' : mensaje.tipo === 'success' ? '#2a5a2a' : '#2a3a5a'}`,
        }}>
          {mensaje.texto}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>
          Los respaldos se generan automaticamente cada dia a las 00:00 (Chile). 
          Se conservan los ultimos 15 respaldos. Puedes crear uno manual o descargar cualquiera.
        </p>
        <button
          onClick={crearRespaldo}
          disabled={creando}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem',
            opacity: creando ? 0.6 : 1,
            cursor: creando ? 'not-allowed' : 'pointer',
          }}
        >
          {creando ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
              </svg>
              Generando...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Crear Respaldo Ahora
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {loading ? (
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Cargando respaldos...</p>
      ) : backups.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.9rem' }}>No hay respaldos disponibles. Crea el primero.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {backups.map((backup) => (
            <div
              key={backup.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#e0e0e0' }}>
                  {backup.nombre}.sql
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                  {formatearFecha(backup.fecha)} &middot; {formatearTamano(backup.tamano)}
                </div>
              </div>
              <a
                href={backup.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.8rem',
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  color: '#3FFF00',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3a3a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a2a')}
              >
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
