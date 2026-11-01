'use client';

import { useState } from 'react';
import { MARCA } from '@/lib/marca';
import { usePwa, instalarApp } from '@/lib/pwa';
import './login.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [recordarme, setRecordarme] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarPasosIOS, setMostrarPasosIOS] = useState(false);
  const { puedeInstalar, esIOS, instalada } = usePwa();

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
        body: JSON.stringify({ ...formData, recordarme }),
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
    <main className="login">
      {/* Fondo: líneas de relieve de la marca */}
      <div className="login-fondo" aria-hidden="true" />

      <section className="login-card" aria-labelledby="login-titulo">
        <header className="login-marca">
          <img className="login-logo" src={MARCA.logos.vertical} alt="" width={1721} height={1645} />
          <h1 id="login-titulo" className="sr-only">{MARCA.nombreCompleto}</h1>
        </header>

        <form onSubmit={handleSubmit} className="login-form" noValidate={false}>
          <p className="login-intro">Inicia sesión para continuar</p>

          {error && (
            <div className="login-error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              {error}
            </div>
          )}

          <div className="login-campo">
            <label htmlFor="email">Correo electrónico</label>
            <div className="login-input">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="password">Contraseña</label>
            <div className="login-input">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-opciones">
            <label className="login-switch">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
                disabled={loading}
              />
              <span className="login-switch__pista" aria-hidden="true" />
              <span>Mantener sesión iniciada</span>
            </label>
            <button
              type="button"
              className="login-link"
              onClick={() => setMostrarAyuda(v => !v)}
              aria-expanded={mostrarAyuda}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {mostrarAyuda && (
            <p className="login-ayuda">
              Pide a un administrador que la restablezca desde <strong>Configuración → Usuarios</strong>.
            </p>
          )}

          <button type="submit" className="login-boton" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden="true"></span>
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        {!instalada && (puedeInstalar || esIOS) && (
          <div className="login-instalar">
            <button
              type="button"
              className="login-instalar__boton"
              onClick={() => (puedeInstalar ? instalarApp() : setMostrarPasosIOS(v => !v))}
              aria-expanded={esIOS ? mostrarPasosIOS : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Descargar la app
            </button>
            {esIOS && mostrarPasosIOS && (
              <ol className="login-instalar__pasos">
                <li>Toca el botón <strong>Compartir</strong> de Safari (el cuadrado con la flecha hacia arriba).</li>
                <li>Elige <strong>Agregar a inicio</strong>.</li>
                <li>Confirma con <strong>Agregar</strong>.</li>
              </ol>
            )}
          </div>
        )}

        <footer className="login-pie">
          <span className="login-pie__punto" aria-hidden="true" />
          Desarrollado por {MARCA.desarrollador}
        </footer>
      </section>
    </main>
  );
}
