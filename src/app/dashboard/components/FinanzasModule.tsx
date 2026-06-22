'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatearFechaLocal, fechaAString } from '../utils';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function FinanzasModule() {
  // Estado del mes seleccionado
  const [mesActual, setMesActual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Datos
  const [resumen, setResumen] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [gastosFijos, setGastosFijos] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [vista, setVista] = useState<'movimientos' | 'gastos-fijos'>('movimientos');
  const [showModalIngreso, setShowModalIngreso] = useState(false);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showModalGastoFijo, setShowModalGastoFijo] = useState(false);
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [editandoPago, setEditandoPago] = useState<any>(null);
  const [editandoGasto, setEditandoGasto] = useState<any>(null);
  const [editandoGastoFijo, setEditandoGastoFijo] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [filtroTipo, setFiltroTipo] = useState<'' | 'ingreso' | 'gasto'>('');

  // Forms
  const [formIngreso, setFormIngreso] = useState({
    pacienteId: '', monto: '', metodoPago: 'Efectivo', estado: 'completado',
    fechaPago: fechaAString(new Date()), concepto: '', notas: '', numeroFactura: ''
  });
  const [formGasto, setFormGasto] = useState({
    categoria: '', descripcion: '', monto: '', estado: 'pendiente',
    fechaGasto: fechaAString(new Date()), metodoPago: '', notas: ''
  });
  const [formGastoFijo, setFormGastoFijo] = useState({
    categoria: '', descripcion: '', monto: '', diaGeneracion: '1'
  });
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', color: '#6b7280' });

  // Mes label
  const mesLabel = useMemo(() => {
    const [anio, mes] = mesActual.split('-');
    return `${MESES[parseInt(mes) - 1]} ${anio}`;
  }, [mesActual]);

  // Carga inicial
  useEffect(() => {
    const cargarDatosBase = async () => {
      const [catRes, pacRes, gfRes] = await Promise.allSettled([
        fetch('/api/categorias-gastos').then(r => r.json()),
        fetch('/api/pacientes').then(r => r.json()),
        fetch('/api/gastos-fijos').then(r => r.json())
      ]);
      if (catRes.status === 'fulfilled' && catRes.value.success) setCategorias(catRes.value.categorias);
      if (pacRes.status === 'fulfilled' && pacRes.value.success) setPacientes(pacRes.value.pacientes);
      if (gfRes.status === 'fulfilled' && gfRes.value.success) setGastosFijos(gfRes.value.gastosFijos);
    };
    cargarDatosBase();
  }, []);

  // Cargar resumen cuando cambia el mes
  useEffect(() => {
    cargarResumen();
  }, [mesActual]);

  const cargarResumen = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finanzas/resumen?mes=${mesActual}`);
      const data = await response.json();
      if (data.success) {
        setResumen(data.resumen);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al cargar resumen financiero', true);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto: string, esError = false) => {
    setMensaje({ texto, tipo: esError ? 'error' : 'success' });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
  };

  // Navegacion de meses
  const mesAnterior = () => {
    const [anio, mes] = mesActual.split('-').map(Number);
    const d = new Date(anio, mes - 2, 1);
    setMesActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const mesSiguiente = () => {
    const [anio, mes] = mesActual.split('-').map(Number);
    const d = new Date(anio, mes, 1);
    setMesActual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Movimientos filtrados
  const movimientosFiltrados = useMemo(() => {
    if (!resumen?.movimientos) return [];
    if (!filtroTipo) return resumen.movimientos;
    return resumen.movimientos.filter((m: any) => m.tipo === filtroTipo);
  }, [resumen?.movimientos, filtroTipo]);

  // --- HANDLERS INGRESO (pago) ---
  const handleNuevoIngreso = () => {
    setEditandoPago(null);
    setFormIngreso({
      pacienteId: '', monto: '', metodoPago: 'Efectivo', estado: 'completado',
      fechaPago: fechaAString(new Date()), concepto: '', notas: '', numeroFactura: ''
    });
    setShowModalIngreso(true);
  };

  const handleEditarIngreso = (mov: any) => {
    setEditandoPago(mov);
    setFormIngreso({
      pacienteId: '', monto: mov.monto, metodoPago: mov.metodo_pago || 'Efectivo',
      estado: mov.estado, fechaPago: mov.fecha, concepto: mov.descripcion || '',
      notas: '', numeroFactura: ''
    });
    setShowModalIngreso(true);
  };

  const handleGuardarIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editandoPago ? `/api/pagos/${editandoPago.id}` : '/api/pagos';
      const method = editandoPago ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formIngreso)
      });
      const data = await response.json();
      if (data.success) {
        setShowModalIngreso(false);
        await cargarResumen();
        mostrarMensaje(editandoPago ? 'Ingreso actualizado' : 'Ingreso registrado');
      } else {
        mostrarMensaje(data.error || 'Error al guardar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar ingreso', true);
    }
  };

  // --- HANDLERS GASTO ---
  const handleNuevoGasto = () => {
    setEditandoGasto(null);
    setFormGasto({
      categoria: categorias[0]?.nombre || '', descripcion: '', monto: '', estado: 'pendiente',
      fechaGasto: fechaAString(new Date()), metodoPago: '', notas: ''
    });
    setShowModalGasto(true);
  };

  const handleEditarGasto = (mov: any) => {
    setEditandoGasto(mov);
    setFormGasto({
      categoria: mov.categoria, descripcion: mov.descripcion, monto: mov.monto,
      estado: mov.estado, fechaGasto: mov.fecha, metodoPago: mov.metodo_pago || '', notas: ''
    });
    setShowModalGasto(true);
  };

  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editandoGasto ? `/api/gastos/${editandoGasto.id}` : '/api/gastos';
      const method = editandoGasto ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formGasto)
      });
      const data = await response.json();
      if (data.success) {
        setShowModalGasto(false);
        await cargarResumen();
        mostrarMensaje(editandoGasto ? 'Gasto actualizado' : 'Gasto registrado');
      } else {
        mostrarMensaje(data.error || 'Error al guardar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar gasto', true);
    }
  };

  const handleEliminarMovimiento = async (mov: any) => {
    const tipo = mov.tipo === 'ingreso' ? 'ingreso' : 'gasto';
    if (!confirm(`¿Eliminar este ${tipo}?`)) return;
    try {
      const url = mov.tipo === 'ingreso' ? `/api/pagos/${mov.id}` : `/api/gastos/${mov.id}`;
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await cargarResumen();
        mostrarMensaje(`${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} eliminado`);
      } else {
        mostrarMensaje(data.error || 'Error al eliminar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar', true);
    }
  };

  // --- HANDLERS GASTOS FIJOS ---
  const handleNuevoGastoFijo = () => {
    setEditandoGastoFijo(null);
    setFormGastoFijo({ categoria: categorias[0]?.nombre || '', descripcion: '', monto: '', diaGeneracion: '1' });
    setShowModalGastoFijo(true);
  };

  const handleGuardarGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editandoGastoFijo ? `/api/gastos-fijos/${editandoGastoFijo.id}` : '/api/gastos-fijos';
      const method = editandoGastoFijo ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formGastoFijo)
      });
      const data = await response.json();
      if (data.success) {
        setShowModalGastoFijo(false);
        // Recargar gastos fijos
        const gfRes = await fetch('/api/gastos-fijos').then(r => r.json());
        if (gfRes.success) setGastosFijos(gfRes.gastosFijos);
        mostrarMensaje(editandoGastoFijo ? 'Gasto fijo actualizado' : 'Gasto fijo creado');
      } else {
        mostrarMensaje(data.error || 'Error al guardar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al guardar gasto fijo', true);
    }
  };

  const handleToggleGastoFijo = async (gf: any) => {
    try {
      const response = await fetch(`/api/gastos-fijos/${gf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: gf.activo ? 0 : 1 })
      });
      const data = await response.json();
      if (data.success) {
        setGastosFijos(prev => prev.map(g => g.id === gf.id ? { ...g, activo: gf.activo ? 0 : 1 } : g));
        mostrarMensaje(gf.activo ? 'Gasto fijo desactivado' : 'Gasto fijo activado');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEliminarGastoFijo = async (id: number) => {
    if (!confirm('¿Eliminar este gasto fijo?')) return;
    try {
      const response = await fetch(`/api/gastos-fijos/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setGastosFijos(prev => prev.filter(g => g.id !== id));
        mostrarMensaje('Gasto fijo eliminado');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al eliminar', true);
    }
  };

  const handleGenerarGastosMes = async () => {
    try {
      const response = await fetch(`/api/gastos-fijos?mes=${mesActual}`, { method: 'PATCH' });
      const data = await response.json();
      if (data.success) {
        await cargarResumen();
        mostrarMensaje(data.message);
      } else {
        mostrarMensaje(data.error || 'Error al generar', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al generar gastos del mes', true);
    }
  };

  // --- HANDLER CATEGORIA ---
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/categorias-gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCategoria)
      });
      const data = await response.json();
      if (data.success) {
        setCategorias(prev => [...prev, data.categoria]);
        setShowModalCategoria(false);
        setNuevaCategoria({ nombre: '', color: '#6b7280' });
        mostrarMensaje('Categoria creada');
      } else {
        mostrarMensaje(data.error || 'Error al crear', true);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al crear categoria', true);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto);
  };

  const getColorCategoria = (nombre: string) => {
    const cat = categorias.find(c => c.nombre === nombre);
    return cat?.color || '#6b7280';
  };

  return (
    <div className="module-container">
      {/* Header */}
      <div className="module-header">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Finanzas
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn-primary" style={{ background: '#10b981' }} onClick={handleNuevoIngreso}>
            + Ingreso
          </button>
          <button className="btn-primary" style={{ background: '#ef4444' }} onClick={handleNuevoGasto}>
            + Gasto
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {/* Selector de mes */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '1rem 0', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px' }}>
        <button onClick={mesAnterior} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>◀</button>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', minWidth: '200px', textAlign: 'center' }}>{mesLabel}</span>
        <button onClick={mesSiguiente} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>▶</button>
      </div>

      {/* Tarjetas de resumen */}
      {resumen && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#10b981' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Ingresos</p>
              <p className="stat-value" style={{ color: '#10b981' }}>{formatearMonto(resumen.ingresos.total)}</p>
              <p className="stat-sublabel">{resumen.ingresos.cantidad} pago(s)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ef4444' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Gastos</p>
              <p className="stat-value" style={{ color: '#ef4444' }}>{formatearMonto(resumen.gastos.total)}</p>
              <p className="stat-sublabel">{resumen.gastos.cantidad} gasto(s)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: resumen.balance >= 0 ? '#3b82f6' : '#ef4444' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Balance</p>
              <p className="stat-value" style={{ color: resumen.balance >= 0 ? '#10b981' : '#ef4444' }}>
                {formatearMonto(resumen.balance)}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f59e0b' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Gastos Pendientes</p>
              <p className="stat-value">{resumen.gastos.pendientes.cantidad}</p>
              <p className="stat-sublabel">{formatearMonto(resumen.gastos.pendientes.total)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selector de vista */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="vista-selector">
          <button className={vista === 'movimientos' ? 'vista-btn active' : 'vista-btn'} onClick={() => setVista('movimientos')}>
            Movimientos
          </button>
          <button className={vista === 'gastos-fijos' ? 'vista-btn active' : 'vista-btn'} onClick={() => setVista('gastos-fijos')}>
            Gastos Fijos
          </button>
        </div>
        {vista === 'movimientos' && (
          <div className="vista-selector" style={{ marginLeft: 'auto' }}>
            <button className={filtroTipo === '' ? 'vista-btn active' : 'vista-btn'} onClick={() => setFiltroTipo('')}>Todos</button>
            <button className={filtroTipo === 'ingreso' ? 'vista-btn active' : 'vista-btn'} onClick={() => setFiltroTipo('ingreso')} style={{ color: filtroTipo === 'ingreso' ? '#10b981' : undefined }}>Ingresos</button>
            <button className={filtroTipo === 'gasto' ? 'vista-btn active' : 'vista-btn'} onClick={() => setFiltroTipo('gasto')} style={{ color: filtroTipo === 'gasto' ? '#ef4444' : undefined }}>Gastos</button>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="module-content">
        {vista === 'movimientos' && (
          <>
            {loading ? (
              <div className="loading">Cargando...</div>
            ) : movimientosFiltrados.length === 0 ? (
              <div className="empty-state">
                <p>No hay movimientos en {mesLabel}</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table finanzas-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripcion</th>
                      <th>Categoria</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosFiltrados.map((mov: any, idx: number) => (
                      <tr key={`${mov.tipo}-${mov.id}-${idx}`}>
                        <td>{formatearFechaLocal(mov.fecha)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                              background: mov.tipo === 'ingreso' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: mov.tipo === 'ingreso' ? '#10b981' : '#ef4444',
                              fontWeight: 'bold', fontSize: '1rem'
                            }}>
                              {mov.tipo === 'ingreso' ? '↑' : '↓'}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mov.descripcion}</strong>
                              <small style={{ color: '#888', fontSize: '0.8rem' }}>
                                {mov.detalle || ''}{mov.detalle && mov.metodo_pago ? ' · ' : ''}{mov.metodo_pago || ''}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: mov.tipo === 'gasto' ? getColorCategoria(mov.categoria) : '#3b82f6', color: '#fff', fontSize: '0.75rem', padding: '3px 8px' }}>
                            {mov.categoria || 'Pago'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: mov.tipo === 'ingreso' ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                            {mov.tipo === 'ingreso' ? '+' : '-'}{formatearMonto(mov.monto)}
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${
                            mov.estado === 'completado' || mov.estado === 'pagado' ? 'badge-success' :
                            mov.estado === 'pendiente' ? 'badge-warning' : 'badge-danger'
                          }`} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                            {mov.estado.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                            <button className="btn-icon" onClick={() => mov.tipo === 'ingreso' ? handleEditarIngreso(mov) : handleEditarGasto(mov)} title="Editar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="btn-icon btn-danger" onClick={() => handleEliminarMovimiento(mov)} title="Eliminar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
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
          </>
        )}

        {vista === 'gastos-fijos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ color: '#888', margin: 0 }}>Gastos que se generan automaticamente cada mes como pendientes.</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ background: '#f59e0b' }} onClick={handleGenerarGastosMes}>
                  Generar {mesLabel}
                </button>
                <button className="btn-primary" onClick={handleNuevoGastoFijo}>
                  + Gasto Fijo
                </button>
              </div>
            </div>

            {gastosFijos.length === 0 ? (
              <div className="empty-state">
                <p>No hay gastos fijos configurados</p>
                <button className="btn-primary" onClick={handleNuevoGastoFijo}>Crear primer gasto fijo</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Descripcion</th>
                      <th>Monto</th>
                      <th>Dia del mes</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFijos.map((gf) => (
                      <tr key={gf.id} style={{ opacity: gf.activo ? 1 : 0.5 }}>
                        <td>
                          <span className="badge" style={{ background: getColorCategoria(gf.categoria), color: '#fff' }}>
                            {gf.categoria}
                          </span>
                        </td>
                        <td><strong>{gf.descripcion}</strong></td>
                        <td><strong>{formatearMonto(gf.monto)}</strong></td>
                        <td>Dia {gf.dia_generacion}</td>
                        <td>
                          <button
                            onClick={() => handleToggleGastoFijo(gf)}
                            style={{
                              background: gf.activo ? '#10b981' : '#6b7280',
                              color: '#fff', border: 'none', borderRadius: '12px',
                              padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                          >
                            {gf.activo ? 'ACTIVO' : 'INACTIVO'}
                          </button>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon" onClick={() => {
                              setEditandoGastoFijo(gf);
                              setFormGastoFijo({
                                categoria: gf.categoria, descripcion: gf.descripcion,
                                monto: gf.monto.toString(), diaGeneracion: gf.dia_generacion.toString()
                              });
                              setShowModalGastoFijo(true);
                            }} title="Editar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="btn-icon btn-danger" onClick={() => handleEliminarGastoFijo(gf.id)} title="Eliminar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
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
        )}
      </div>

      {/* Modal Ingreso */}
      {showModalIngreso && (
        <div className="modal-overlay" onClick={() => setShowModalIngreso(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoPago ? 'Editar Ingreso' : 'Registrar Ingreso'}</h3>
              <button className="modal-close" onClick={() => setShowModalIngreso(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarIngreso}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Paciente *</label>
                    <select value={formIngreso.pacienteId} onChange={(e) => setFormIngreso({ ...formIngreso, pacienteId: e.target.value })} required disabled={!!editandoPago}>
                      <option value="">Seleccionar paciente</option>
                      {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} - {p.rut}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Monto *</label>
                    <input type="number" value={formIngreso.monto} onChange={(e) => setFormIngreso({ ...formIngreso, monto: e.target.value })} required min="0" step="100" placeholder="Ej: 25000" />
                  </div>
                  <div className="form-group">
                    <label>Metodo de Pago *</label>
                    <select value={formIngreso.metodoPago} onChange={(e) => setFormIngreso({ ...formIngreso, metodoPago: e.target.value })} required>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta Débito">Tarjeta Debito</option>
                      <option value="Tarjeta Crédito">Tarjeta Credito</option>
                      <option value="Bono Fonasa">Bono Fonasa</option>
                      <option value="Isapre">Isapre</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estado *</label>
                    <select value={formIngreso.estado} onChange={(e) => setFormIngreso({ ...formIngreso, estado: e.target.value })} required>
                      <option value="completado">Completado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input type="date" value={formIngreso.fechaPago} onChange={(e) => setFormIngreso({ ...formIngreso, fechaPago: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>N° Factura</label>
                    <input type="text" value={formIngreso.numeroFactura} onChange={(e) => setFormIngreso({ ...formIngreso, numeroFactura: e.target.value })} placeholder="Ej: F-001234" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Concepto</label>
                    <input type="text" value={formIngreso.concepto} onChange={(e) => setFormIngreso({ ...formIngreso, concepto: e.target.value })} placeholder="Ej: Sesion de evaluacion" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalIngreso(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">{editandoPago ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gasto */}
      {showModalGasto && (
        <div className="modal-overlay" onClick={() => setShowModalGasto(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoGasto ? 'Editar Gasto' : 'Registrar Gasto'}</h3>
              <button className="modal-close" onClick={() => setShowModalGasto(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarGasto}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Categoria *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select value={formGasto.categoria} onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })} required style={{ flex: 1 }}>
                        <option value="">Seleccionar</option>
                        {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowModalCategoria(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Nueva</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Monto *</label>
                    <input type="number" value={formGasto.monto} onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })} required min="0" step="100" placeholder="Ej: 50000" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Descripcion *</label>
                    <input type="text" value={formGasto.descripcion} onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })} required placeholder="Ej: Cuenta de luz Febrero" />
                  </div>
                  <div className="form-group">
                    <label>Estado *</label>
                    <select value={formGasto.estado} onChange={(e) => setFormGasto({ ...formGasto, estado: e.target.value })} required>
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Metodo de Pago</label>
                    <select value={formGasto.metodoPago} onChange={(e) => setFormGasto({ ...formGasto, metodoPago: e.target.value })}>
                      <option value="">Sin especificar</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta Débito">Tarjeta Debito</option>
                      <option value="Tarjeta Crédito">Tarjeta Credito</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input type="date" value={formGasto.fechaGasto} onChange={(e) => setFormGasto({ ...formGasto, fechaGasto: e.target.value })} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notas</label>
                    <textarea value={formGasto.notas} onChange={(e) => setFormGasto({ ...formGasto, notas: e.target.value })} rows={2} placeholder="Notas adicionales..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalGasto(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>{editandoGasto ? 'Actualizar' : 'Registrar'} Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gasto Fijo */}
      {showModalGastoFijo && (
        <div className="modal-overlay" onClick={() => setShowModalGastoFijo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoGastoFijo ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}</h3>
              <button className="modal-close" onClick={() => setShowModalGastoFijo(false)}>×</button>
            </div>
            <form onSubmit={handleGuardarGastoFijo}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Categoria *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={formGastoFijo.categoria} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, categoria: e.target.value })} required style={{ flex: 1 }}>
                      <option value="">Seleccionar</option>
                      {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowModalCategoria(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripcion *</label>
                  <input type="text" value={formGastoFijo.descripcion} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, descripcion: e.target.value })} required placeholder="Ej: Arriendo local" />
                </div>
                <div className="form-group">
                  <label>Monto mensual *</label>
                  <input type="number" value={formGastoFijo.monto} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, monto: e.target.value })} required min="0" step="100" placeholder="Ej: 200000" />
                </div>
                <div className="form-group">
                  <label>Dia de generacion (1-28)</label>
                  <input type="number" value={formGastoFijo.diaGeneracion} onChange={(e) => setFormGastoFijo({ ...formGastoFijo, diaGeneracion: e.target.value })} min="1" max="28" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalGastoFijo(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">{editandoGastoFijo ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Categoria */}
      {showModalCategoria && (
        <div className="modal-overlay" onClick={() => setShowModalCategoria(false)} style={{ zIndex: 1001 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Nueva Categoria</h3>
              <button className="modal-close" onClick={() => setShowModalCategoria(false)}>×</button>
            </div>
            <form onSubmit={handleCrearCategoria}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" value={nuevaCategoria.nombre} onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })} required placeholder="Ej: Marketing" />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input type="color" value={nuevaCategoria.color} onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, color: e.target.value })} style={{ height: '40px', width: '100%' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModalCategoria(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
