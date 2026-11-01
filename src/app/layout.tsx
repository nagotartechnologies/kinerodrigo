import type { Metadata, Viewport } from 'next';
import './globals.css';
import DynamicFavicon from '@/components/DynamicFavicon';
import AppPwa from '@/components/AppPwa';
import { MARCA } from '@/lib/marca';

export const metadata: Metadata = {
  title: MARCA.nombreCompleto,
  description: MARCA.descripcion,
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: MARCA.nombreCorto,
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL('https://rodrigoulloakine.netlify.app'),
  // Íconos del brand kit (ver /brand-kit/web/head-snippet.html)
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: MARCA.nombreCompleto,
    description: MARCA.descripcion,
    url: '/',
    siteName: MARCA.nombreCompleto,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: MARCA.nombreCompleto,
      },
    ],
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: MARCA.nombreCompleto,
    description: MARCA.descripcion,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: MARCA.colorFondo,
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
        {/* Apple Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={MARCA.nombreCorto} />

        {/* Android/Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content={MARCA.nombreCompleto} />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content={MARCA.colorFondo} />
        <meta name="msapplication-TileImage" content="/android-chrome-192.png" />
        <meta name="msapplication-config" content="none" />
      </head>
      <body>
        <DynamicFavicon />
        <AppPwa />
        {children}
      </body>
    </html>
  );
}
