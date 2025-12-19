# 📱 NAGO-KINE - Progressive Web App (PWA)

## ✨ Características PWA Implementadas

### ✅ **Instalable**
- La aplicación se puede instalar en dispositivos móviles y escritorio
- Funciona como una app nativa sin necesidad de tiendas de aplicaciones
- Icono en la pantalla de inicio

### ✅ **Funciona Offline**
- Caché inteligente de recursos estáticos
- Estrategias de caché optimizadas:
  - **CacheFirst**: Fuentes, audio, video
  - **StaleWhileRevalidate**: Imágenes, CSS, JS
  - **NetworkFirst**: APIs y contenido dinámico

### ✅ **Rápida**
- Carga instantánea después de la primera visita
- Recursos en caché para mejor rendimiento
- Experiencia fluida sin retrasos

### ✅ **Responsive**
- Diseño adaptable a todos los tamaños de pantalla
- Optimizada para móviles y tablets
- Modo standalone (pantalla completa)

---

## 🚀 Cómo Instalar la PWA

### **En Android (Chrome/Edge):**
1. Abre la aplicación en el navegador
2. Toca el menú (⋮) en la esquina superior derecha
3. Selecciona "Agregar a pantalla de inicio" o "Instalar app"
4. Confirma la instalación
5. ¡Listo! El icono aparecerá en tu pantalla de inicio

### **En iOS (Safari):**
1. Abre la aplicación en Safari
2. Toca el botón de compartir (□↑)
3. Desplázate y selecciona "Agregar a pantalla de inicio"
4. Personaliza el nombre si lo deseas
5. Toca "Agregar"
6. ¡Listo! El icono aparecerá en tu pantalla de inicio

### **En Desktop (Chrome/Edge):**
1. Abre la aplicación en el navegador
2. Busca el ícono de instalación (⊕) en la barra de direcciones
3. Haz clic en "Instalar"
4. La app se abrirá en una ventana independiente

---

## 🎨 Personalizar Iconos

Los iconos PWA se generan automáticamente desde `public/icon.svg`.

### **Para cambiar el logo:**

1. Reemplaza el archivo `public/icon.svg` con tu propio logo
2. Ejecuta el script de generación:
   ```bash
   npm run generate:icons
   ```
3. Los iconos se generarán en todos los tamaños necesarios

### **Tamaños generados:**
- 72x72px
- 96x96px
- 128x128px
- 144x144px
- 152x152px (Apple Touch Icon)
- 192x192px
- 384x384px
- 512x512px
- favicon.ico (32x32px)

---

## 🔧 Configuración Técnica

### **Archivos PWA:**
- `public/manifest.json` - Configuración de la PWA
- `next.config.js` - Configuración de next-pwa
- `public/sw.js` - Service Worker (generado automáticamente)
- `public/icon-*.png` - Iconos en diferentes tamaños

### **Estrategias de Caché:**

#### **CacheFirst** (Caché primero)
- Fuentes de Google
- Archivos de audio y video
- Recursos que no cambian frecuentemente

#### **StaleWhileRevalidate** (Caché con actualización en segundo plano)
- Imágenes
- CSS y JavaScript
- Fuentes locales

#### **NetworkFirst** (Red primero, caché como respaldo)
- APIs (`/api/*`)
- Contenido dinámico
- Fallback a caché después de 10 segundos sin conexión

---

## 📊 Verificar PWA

### **Chrome DevTools:**
1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. Revisa:
   - **Manifest**: Debe mostrar todos los iconos y configuración
   - **Service Workers**: Debe estar activo
   - **Cache Storage**: Debe mostrar los recursos en caché

### **Lighthouse:**
1. Abre DevTools (F12)
2. Ve a la pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Haz clic en "Generate report"
5. Deberías obtener un puntaje alto (>90)

---

## 🔄 Actualizar la PWA

Cuando hagas cambios en la aplicación:

1. **En desarrollo**: La PWA está deshabilitada automáticamente
2. **En producción**: 
   - El service worker se actualiza automáticamente
   - Los usuarios verán los cambios en la próxima visita
   - El caché se invalida según las estrategias configuradas

---

## 🌐 Desplegar en Producción

### **Build de producción:**
```bash
npm run build
npm start
```

### **Variables de entorno:**
La PWA solo se activa en producción (`NODE_ENV=production`)

---

## 📱 Funcionalidades Offline

### **Qué funciona offline:**
- ✅ Navegación entre páginas ya visitadas
- ✅ Visualización de datos en caché
- ✅ Recursos estáticos (CSS, JS, imágenes)
- ✅ Interfaz de usuario completa

### **Qué requiere conexión:**
- ❌ Crear/editar pacientes
- ❌ Crear/editar sesiones
- ❌ Sincronización de datos
- ❌ Autenticación inicial

---

## 🎯 Mejores Prácticas

1. **Mantén el icon.svg actualizado** con tu logo oficial
2. **Prueba la instalación** en diferentes dispositivos
3. **Verifica el funcionamiento offline** regularmente
4. **Monitorea el tamaño del caché** para no exceder límites
5. **Actualiza el manifest.json** si cambias nombre o colores

---

## 🐛 Solución de Problemas

### **La PWA no se puede instalar:**
- Verifica que estés en HTTPS (o localhost)
- Revisa que el manifest.json sea válido
- Asegúrate de que los iconos existan

### **Los cambios no se reflejan:**
- Limpia el caché del navegador
- Desinstala y reinstala la PWA
- Verifica que el service worker se haya actualizado

### **Errores en consola:**
- Revisa que todos los iconos existan
- Verifica que las rutas en manifest.json sean correctas
- Asegúrate de que next-pwa esté instalado correctamente

---

## 📚 Recursos Adicionales

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

**¡Tu aplicación NAGO-KINE ahora es una PWA completa!** 🎉
