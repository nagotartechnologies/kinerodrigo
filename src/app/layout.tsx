import type { Metadata, Viewport } from 'next';
import './globals.css';
import DynamicFavicon from '@/components/DynamicFavicon';

export const metadata: Metadata = {
  title: 'KINE-CITAS - Sistema de Gestión Kinesiológica',
  description: 'Sistema de gestión integral para centros kinesiológicos. Administra citas, pacientes, evaluaciones y planes de rehabilitación.',
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KINE-CITAS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'KINE-CITAS - Sistema de Gestión Kinesiológica',
    description: 'Sistema de gestión integral para centros kinesiológicos. Administra citas, pacientes, evaluaciones y planes de rehabilitación.',
    url: 'https://rodrigoulloakine.netlify.app',
    siteName: 'KINE-CITAS',
    images: [
      {
        url: 'https://rodrigoulloakine.netlify.app/api/icon',
        width: 512,
        height: 512,
        alt: 'KINE-CITAS Logo',
      },
    ],
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KINE-CITAS - Sistema de Gestión Kinesiológica',
    description: 'Sistema de gestión integral para centros kinesiológicos',
    images: ['https://rodrigoulloakine.netlify.app/api/icon'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Apple Touch Icons - iOS */}
        <link rel="apple-touch-icon" href="/api/icon" sizes="152x152" />
        <link rel="apple-touch-icon" href="/api/icon" sizes="192x192" />
        <link rel="apple-touch-icon" href="/api/icon" sizes="512x512" />
        
        {/* Apple Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KINE-CITAS" />
        
        {/* Android/Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="KINE-CITAS" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-72x72.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
        <meta name="msapplication-config" content="none" />
      </head>
      <body>
        <DynamicFavicon />
        {children}
      </body>
    </html>
  );
}
