'use client';

// Estado compartido de la PWA en el cliente: instalación y versión nueva.
// Los eventos del navegador se capturan una sola vez (iniciarPwa) y los
// componentes se suscriben con usePwa().
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface EstadoPwa {
  /** El navegador permite instalar con un clic (Chrome, Edge, Android) */
  puedeInstalar: boolean;
  /** iOS/iPadOS en Safari: se instala a mano con Compartir → Agregar a inicio */
  esIOS: boolean;
  /** Ya se está usando como app instalada */
  instalada: boolean;
  /** Hay una versión nueva desplegada distinta a la que está corriendo */
  versionNueva: boolean;
}

const VERSION_ACTUAL = process.env.APP_VERSION || '';
const INTERVALO_REVISION_MS = 5 * 60 * 1000;

let promptDiferido: BeforeInstallPromptEvent | null = null;
let estado: EstadoPwa = { puedeInstalar: false, esIOS: false, instalada: false, versionNueva: false };
const suscriptores = new Set<() => void>();
let iniciado = false;

function actualizar(cambios: Partial<EstadoPwa>) {
  estado = { ...estado, ...cambios };
  suscriptores.forEach(fn => fn());
}

function esModoApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

function detectarIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ se presenta como Mac con pantalla táctil
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

async function revisarVersion() {
  if (!VERSION_ACTUAL || estado.versionNueva) return;
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = await res.json();
    if (version && version !== VERSION_ACTUAL) actualizar({ versionNueva: true });
  } catch {
    // Sin conexión: se revisa de nuevo más tarde
  }
}

/** Registra el service worker y los listeners. Idempotente. */
export function iniciarPwa() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  actualizar({ instalada: esModoApp(), esIOS: detectarIOS() && !esModoApp() });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptDiferido = e as BeforeInstallPromptEvent;
    actualizar({ puedeInstalar: true });
  });

  window.addEventListener('appinstalled', () => {
    promptDiferido = null;
    actualizar({ puedeInstalar: false, instalada: true, esIOS: false });
  });

  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('Error al registrar el service worker:', err));
  }

  // Revisar si hay versión nueva al abrir, al volver a la app y cada 5 minutos
  revisarVersion();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revisarVersion();
  });
  setInterval(revisarVersion, INTERVALO_REVISION_MS);
}

/** Abre el diálogo nativo de instalación (solo si puedeInstalar) */
export async function instalarApp(): Promise<boolean> {
  if (!promptDiferido) return false;
  const evento = promptDiferido;
  promptDiferido = null;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  actualizar({ puedeInstalar: false });
  return outcome === 'accepted';
}

/** Descarta las cachés del service worker y recarga con la versión nueva */
export async function aplicarVersionNueva() {
  try {
    if ('caches' in window) {
      const claves = await caches.keys();
      await Promise.all(claves.map(clave => caches.delete(clave)));
    }
    const registro = await navigator.serviceWorker?.getRegistration();
    await registro?.update();
  } catch {
    // Si falla la limpieza igual se recarga
  }
  window.location.reload();
}

function suscribir(fn: () => void) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

const ESTADO_SERVIDOR: EstadoPwa = { puedeInstalar: false, esIOS: false, instalada: false, versionNueva: false };

export function usePwa(): EstadoPwa {
  return useSyncExternalStore(suscribir, () => estado, () => ESTADO_SERVIDOR);
}
