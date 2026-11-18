'use client';

import { useState } from 'react';
import { ConfigSectionProps, Usuario } from '../../types';
import { useConfirm } from '@/components/ConfirmDialog';

export default function ConfigUsuarios({ mostrarMensaje }: ConfigSectionProps) {
  const confirmar = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: ''
  });

  const cargarUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      const data = await response.json();
      if (data.success) {
        setUsuarios(data.usuarios);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      mostrarMensaje('Error al cargar usuarios', true);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      });

      const data = await response.json();

      if (data.success) {
        await cargarUsuarios();
        setNuevoUsuario({ nombre: '', apellido: '', email: '', password: '' });
        mostrarMensaje('Usuario creado exitosamente');
      } else {
        mostrarMensaje(data.error || 'Error al crear usuario', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al crear usuario', true);
    }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (!(await confirmar('Estas seguro de eliminar este usuario?', { peligro: true }))) return;

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await cargarUsuarios();
        mostrarMensaje('Usuario eliminado exitosamente');
      } else {
        mostrarMensaje(data.error || 'Error al eliminar usuario', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar usuario', true);
    }
  };

  const handleToggleUsuarioActivo = async (id: number, activoActual: boolean) => {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activoActual })
      });

      const data = await response.json();

      if (data.success) {
        await cargarUsuarios();
        mostrarMensaje('Usuario actualizado');
      } else {
        mostrarMensaje(data.error || 'Error al actualizar usuario', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al actualizar usuario', true);
    }
  };

  const handleCambiarPassword = async (usuario: Usuario) => {
    const nueva = prompt(`Nueva contraseña para ${usuario.nombre} ${usuario.apellido} (mínimo 6 caracteres):`);
    if (nueva === null) return;
    if (nueva.length < 6) {
      mostrarMensaje('La contraseña debe tener al menos 6 caracteres', true);
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nueva })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Contraseña actualizada');
      } else {
        mostrarMensaje(data.error || 'Error al cambiar la contraseña', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cambiar la contraseña', true);
    }
  };

  const handleOpenModal = () => {
    cargarUsuarios();
    setShowModal(true);
  };

  return (
    <>
      <div className="config-section">
        <h3 className="config-title">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Usuarios del Sistema
        </h3>
        <div className="config-items">
          <div className="config-item">
            <div className="config-item-info">
              <p className="config-item-label">Gestion de Usuarios</p>
              <p className="config-item-desc">Administrar usuarios que pueden acceder al sistema</p>
            </div>
            <button className="btn-primary" onClick={handleOpenModal}>
              Gestionar Usuarios
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Gestion de Usuarios */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>Gestion de Usuarios</h3>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCrearUsuario} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#10b981' }}>Crear Nuevo Usuario</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={nuevoUsuario.nombre}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido</label>
                    <input
                      type="text"
                      value={nuevoUsuario.apellido}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellido: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={nuevoUsuario.email}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contrasena (minimo 6 caracteres)</label>
                    <input
                      type="password"
                      value={nuevoUsuario.password}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                  Crear Usuario
                </button>
              </form>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <h4 style={{ marginBottom: '1rem' }}>Usuarios Existentes ({usuarios.length})</h4>
                {usuarios.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No hay usuarios registrados</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {usuarios.map((usuario) => (
                      <div key={usuario.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: '#1a1a1a',
                        borderRadius: '8px',
                        border: '1px solid #2a2a2a'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {usuario.nombre} {usuario.apellido}
                          </p>
                          <p style={{ fontSize: '0.85rem', color: '#888' }}>{usuario.email}</p>
                          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                            Creado: {new Date(usuario.createdAt).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <label className="toggle">
                            <input 
                              type="checkbox" 
                              checked={usuario.activo}
                              onChange={() => handleToggleUsuarioActivo(usuario.id, usuario.activo)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          <span className={`config-badge ${usuario.activo ? 'config-badge--success' : 'config-badge--error'}`}>
                            {usuario.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={() => handleCambiarPassword(usuario)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            Contraseña
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={() => handleEliminarUsuario(usuario.id)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
