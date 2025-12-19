# 🚀 Guía PM2 - NAGO-KINE (Windows)

## 📋 Índice
1. [Instalación en Windows](#instalación-en-windows)
2. [Configuración](#configuración)
3. [Comandos Básicos](#comandos-básicos)
4. [Monitoreo](#monitoreo)
5. [Logs](#logs)
6. [Auto-inicio en Windows](#auto-inicio-en-windows)
7. [Solución de Problemas](#solución-de-problemas)

---

## 📦 Instalación en Windows

### **Prerrequisitos:**
- ✅ Node.js instalado (v18 o superior)
- ✅ npm funcionando
- ✅ PowerShell o CMD con permisos de administrador

### **Instalar PM2 globalmente:**

#### **Opción 1: PowerShell (Recomendado)**
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

#### **Opción 2: CMD como Administrador**
```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

### **Verificar instalación:**
```powershell
pm2 --version
```

### **Instalar pm2-windows-service (para auto-inicio):**
```powershell
npm install -g pm2-windows-service
```

---

## ⚙️ Configuración

Ya está todo configurado en el proyecto:

### **Archivos creados:**
- ✅ `ecosystem.config.js` - Configuración de PM2
- ✅ `package.json` - Scripts PM2 agregados
- ✅ `logs/` - Carpeta para logs (se crea automáticamente)

### **Configuración actual (Windows):**
```javascript
{
  name: 'nago-kine',           // Nombre de la app
  script: 'node_modules\\next\\dist\\bin\\next',  // Rutas Windows
  instances: 1,                // Número de instancias
  max_memory_restart: '1G',    // Reiniciar si usa más de 1GB
  autorestart: true,           // Auto-reiniciar si falla
  watch: false,                // No observar cambios en archivos
  windowsHide: true,           // Ocultar ventana de consola
  interpreter: 'node',         // Usar Node.js
  exec_mode: 'fork',           // Modo fork (mejor para Windows)
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  }
}
```

---

## 🎯 Comandos Básicos

### **1. Primera vez - Build y Start:**
```bash
# 1. Hacer build de producción
npm run build

# 2. Iniciar con PM2
npm run pm2:start
```

### **2. Comandos diarios:**

#### **Ver estado:**
```bash
npm run pm2:status
# o directamente:
pm2 status
```

#### **Detener la app:**
```bash
npm run pm2:stop
```

#### **Reiniciar la app:**
```bash
npm run pm2:restart
```

#### **Reload (sin downtime):**
```bash
npm run pm2:reload
```

#### **Eliminar de PM2:**
```bash
npm run pm2:delete
```

---

## 📊 Monitoreo

### **Monitor en tiempo real:**
```bash
npm run pm2:monit
# o:
pm2 monit
```

**Muestra:**
- 📈 CPU usage
- 💾 Memory usage
- 🔄 Restart count
- ⏱️ Uptime
- 📝 Logs en tiempo real

**Controles:**
- `↑↓` - Navegar
- `q` - Salir

### **Dashboard web (opcional):**
```bash
pm2 web
```
Abre en: http://localhost:9615

---

## 📝 Logs

### **Ver logs en tiempo real:**
```bash
npm run pm2:logs
# o:
pm2 logs nago-kine
```

### **Ver solo errores:**
```bash
pm2 logs nago-kine --err
```

### **Ver solo output:**
```bash
pm2 logs nago-kine --out
```

### **Ver últimas 100 líneas:**
```bash
pm2 logs nago-kine --lines 100
```

### **Limpiar logs:**
```bash
pm2 flush
```

### **Archivos de logs:**
```
logs/
├── pm2-error.log      # Errores
├── pm2-out.log        # Output normal
└── pm2-combined.log   # Todo junto
```

---

## 🔄 Auto-inicio en Windows

### **Método 1: pm2-windows-startup (Recomendado)**

#### **1. Instalar el paquete:**
```powershell
npm install -g pm2-windows-startup
```

#### **2. Configurar auto-inicio:**
```powershell
pm2-startup install
```

#### **3. Iniciar tu app:**
```powershell
npm run pm2:start
```

#### **4. Guardar la configuración:**
```powershell
pm2 save
```

#### **5. Verificar:**
```powershell
pm2 list
```

**¡Listo!** Ahora PM2 iniciará automáticamente con Windows.

### **Método 2: pm2-windows-service**

#### **1. Instalar:**
```powershell
npm install -g pm2-windows-service
```

#### **2. Configurar (PowerShell como Administrador):**
```powershell
pm2-service-install
```

**Responde las preguntas:**
- PM2_HOME: Deja el valor por defecto
- PM2_SERVICE_SCRIPTS: Deja vacío
- Presiona Enter para continuar

#### **3. Iniciar el servicio:**
```powershell
pm2 start ecosystem.config.js
pm2 save
```

### **Desactivar auto-inicio:**

#### **Método 1:**
```powershell
pm2-startup uninstall
```

#### **Método 2:**
```powershell
pm2-service-uninstall
```

### **Verificar servicio de Windows:**
```powershell
# Ver servicios
Get-Service | Where-Object {$_.Name -like "*PM2*"}

# O abrir servicios de Windows
services.msc
```

---

## 🔧 Comandos Avanzados

### **Actualizar después de cambios en el código:**
```bash
# 1. Hacer nuevo build
npm run build

# 2. Reload sin downtime
npm run pm2:reload
```

### **Reiniciar con delay:**
```bash
pm2 restart nago-kine --update-env
```

### **Ver información detallada:**
```bash
pm2 show nago-kine
```

### **Ver uso de recursos:**
```bash
pm2 describe nago-kine
```

### **Listar todas las apps:**
```bash
pm2 list
```

---

## 🌐 Múltiples Instancias (Cluster Mode)

Para aprovechar todos los núcleos del CPU:

### **Editar `ecosystem.config.js`:**
```javascript
instances: 'max',  // Usar todos los CPUs disponibles
exec_mode: 'cluster'
```

### **O especificar número:**
```javascript
instances: 4,  // 4 instancias
exec_mode: 'cluster'
```

### **Reiniciar con nueva configuración:**
```bash
pm2 delete nago-kine
npm run pm2:start
```

---

## 🔐 Variables de Entorno

### **Cambiar puerto u otras variables:**

#### **Editar `ecosystem.config.js`:**
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 8080,  // Cambiar puerto
  DATABASE_URL: 'tu-database-url'
}
```

#### **O usar archivo .env:**
```bash
pm2 start ecosystem.config.js --env production
```

---

## 🐛 Solución de Problemas

### **La app no inicia:**
```bash
# Ver logs de error
pm2 logs nago-kine --err

# Ver información detallada
pm2 show nago-kine

# Verificar que el build existe
ls -la .next/
```

### **La app se reinicia constantemente:**
```bash
# Ver por qué se reinicia
pm2 logs nago-kine

# Aumentar memoria máxima en ecosystem.config.js
max_memory_restart: '2G'
```

### **Puerto en uso:**
```powershell
# Cambiar puerto en ecosystem.config.js
env: {
  PORT: 3001  # Usar otro puerto
}

# O matar proceso en el puerto (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# O con CMD
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### **PM2 no encuentra la app:**
```bash
# Verificar que PM2 está corriendo
pm2 ping

# Reinstalar PM2
npm install -g pm2
```

---

## 📊 Comandos de Monitoreo

### **Ver métricas:**
```bash
pm2 monit
```

### **Ver en formato JSON:**
```bash
pm2 jlist
```

### **Exportar métricas:**
```bash
pm2 dump
```

### **Reset contadores:**
```bash
pm2 reset nago-kine
```

---

## 🔄 Workflow Completo

### **Desarrollo:**
```bash
npm run dev
```

### **Desplegar a producción:**
```bash
# 1. Build
npm run build

# 2. Iniciar con PM2 (primera vez)
npm run pm2:start

# 3. Verificar
npm run pm2:status
```

### **Actualizar después de cambios:**
```bash
# 1. Pull cambios
git pull

# 2. Instalar dependencias (si hay nuevas)
npm install

# 3. Build
npm run build

# 4. Reload sin downtime
npm run pm2:reload

# 5. Verificar
npm run pm2:logs
```

---

## 📱 Integración con PWA

La PWA funciona perfectamente con PM2:

```bash
# 1. Build (incluye PWA)
npm run build

# 2. Start con PM2
npm run pm2:start

# 3. La PWA estará disponible automáticamente
```

---

## 🎯 Mejores Prácticas

### ✅ **DO:**
- Usar `pm2 reload` en lugar de `restart` para zero-downtime
- Revisar logs regularmente: `pm2 logs`
- Configurar auto-inicio en servidores de producción
- Hacer `pm2 save` después de cambios
- Usar cluster mode en producción

### ❌ **DON'T:**
- No usar `pm2 start` múltiples veces (usa `reload` o `restart`)
- No olvidar hacer `npm run build` antes de reload
- No ignorar los logs de error
- No usar `watch: true` en producción

---

## 📚 Comandos Rápidos

```bash
# Iniciar
npm run pm2:start

# Ver estado
npm run pm2:status

# Ver logs
npm run pm2:logs

# Reiniciar
npm run pm2:restart

# Reload (sin downtime)
npm run pm2:reload

# Detener
npm run pm2:stop

# Eliminar
npm run pm2:delete

# Monitor
npm run pm2:monit
```

---

## 🆘 Ayuda Rápida

```bash
# Ver todos los comandos
pm2 --help

# Ayuda de un comando específico
pm2 start --help

# Documentación oficial
https://pm2.keymetrics.io/docs/usage/quick-start/
```

---

## 🎉 ¡Listo!

Tu aplicación NAGO-KINE está lista para correr con PM2:

1. ✅ Configuración completa
2. ✅ Scripts en package.json
3. ✅ Logs configurados
4. ✅ Auto-restart habilitado
5. ✅ Listo para producción

**Siguiente paso:**
```bash
npm run build
npm run pm2:start
```

**¡Tu app estará corriendo 24/7!** 🚀
