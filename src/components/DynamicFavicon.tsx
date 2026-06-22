'use client';

import { useEffect } from 'react';

// Crea o reutiliza un link en <head> por ID, sin eliminar nodos de React
function upsertLink(id: string, rel: string, type: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    link.type = type;
    document.head.appendChild(link);
  }
  link.href = href;
}

// Crea o reutiliza un meta tag por selector, sin eliminar nodos de React
function upsertMeta(selector: string, attr: string, attrValue: string, content: string) {
  let meta = document.querySelector(selector) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, attrValue);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export default function DynamicFavicon() {
  useEffect(() => {
    const updateMetadata = async () => {
      try {
        const response = await fetch('/api/configuraciones');
        const data = await response.json();
        
        if (data.success && data.configuraciones) {
          const logoUrl = data.configuraciones.find((c: any) => c.clave === 'logo_url')?.valor;
          const nombreCentro = data.configuraciones.find((c: any) => c.clave === 'nombre_centro')?.valor;
          
          if (logoUrl) {
            const cacheBust = `${logoUrl}?v=${Date.now()}`;
            
            // Crear/actualizar favicons con IDs propios (no toca los de React/Next.js)
            upsertLink('dynamic-favicon', 'icon', 'image/jpeg', cacheBust);
            upsertLink('dynamic-shortcut-icon', 'shortcut icon', 'image/jpeg', cacheBust);
            
            // Actualizar Open Graph image para WhatsApp
            upsertMeta('meta[property="og:image"]', 'property', 'og:image', logoUrl);
            upsertMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', logoUrl);
            upsertMeta('meta[property="og:image:type"]', 'property', 'og:image:type', 'image/jpeg');
            upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '512');
            upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '512');
            
            // Twitter Card
            upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', logoUrl);
          }
          
          if (nombreCentro) {
            document.title = `${nombreCentro} - Sistema de Gestion`;
            
            upsertMeta('meta[property="og:title"]', 'property', 'og:title', `${nombreCentro} - Sistema de Gestion`);
            upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', nombreCentro);
            upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', `${nombreCentro} - Sistema de Gestion`);
          }
        }
      } catch (error) {
        console.error('Error al cargar configuracion para metadata:', error);
      }
    };

    updateMetadata();
  }, []);

  return null;
}
