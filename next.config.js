// Versión única por build: el cliente la compara con /api/version para detectar
// despliegues nuevos. Se guarda en process.env para que los workers del build
// (que vuelven a cargar este archivo) reutilicen el mismo valor.
process.env.APP_VERSION ||= process.env.DEPLOY_ID || Date.now().toString(36);

// El service worker es propio (public/sw.js). next-pwa ya no se usa porque su
// plugin de webpack no corre con Turbopack (build por defecto en Next 16).

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    APP_VERSION: process.env.APP_VERSION,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {},
}

module.exports = nextConfig
