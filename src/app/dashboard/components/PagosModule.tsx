'use client';

import { useState, useEffect } from 'react';
import { formatearFechaLocal, fechaAString } from '../utils';


// Módulo Pagos
export default function PagosModule() {
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
    fechaPago: fechaAString(new Date()),
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
      fechaPago: fechaAString(new Date()),
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
            <table className="data-table pagos-table">
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
                      <option value="Tarjeta Débito">Tarjeta Débito</option>
                      <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                      <option value="Bono Fonasa">Bono Fonasa</option>
                      <option value="Isapre">Isapre</option>
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
