'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [nombreCentro, setNombreCentro] = useState('NAGO-KINE');

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      const response = await fetch('/api/configuraciones');
      const data = await response.json();
      if (data.success) {
        const logo = data.configuraciones.find((c: any) => c.clave === 'logo_url');
        const nombre = data.configuraciones.find((c: any) => c.clave === 'nombre_centro');
        if (logo?.valor) setLogoUrl(logo.valor);
        if (nombre?.valor) setNombreCentro(nombre.valor);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error en el inicio de sesión');
        setLoading(false);
        return;
      }

      // Redirigir según el rol - usar window.location para forzar recarga completa
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="login-container">
      {/* Sección de Branding - Izquierda */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="logo-container">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={nombreCentro}
                style={{
                  maxHeight: '120px',
                  maxWidth: '300px',
                  objectFit: 'contain',
                  marginBottom: '1rem'
                }}
              />
            ) : (
              <div className="logo-circle">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          <h1 className="brand-title">{nombreCentro}</h1>
          <p className="brand-subtitle">Sistema de Gestión Kinesiológica</p>
          <div className="brand-features">
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Agenda de citas online</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Evaluaciones digitales</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Planes de rehabilitación</span>
            </div>
          </div>
          <div className="developer-info">
            <div className="developer-divider"></div>
            <p className="developer-title">Desarrollado por</p>
            <p className="developer-name">Thomas Landeros</p>
            <p className="developer-company">Nagotar Tech SPA</p>
            <a href="tel:+56948881923" className="developer-contact">
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '16px', height: '16px' }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              +56 9 4888 1923
            </a>
          </div>
        </div>
      </div>

      {/* Sección de Formulario - Derecha */}
      <div className="login-form-section">
        <div className="form-container">
          <div className="form-header">
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Recordarme</span>
              </label>
              <a href="#" className="forgot-password">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="form-footer">
            <p className="info-text">
              Sistema de gestión integral para centros kinesiológicos. 
              Administra citas, pacientes, evaluaciones y planes de rehabilitación de forma eficiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
