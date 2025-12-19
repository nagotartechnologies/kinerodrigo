# KINE-CITAS

Sistema de gestión de kinesiología y citas médicas construido con Next.js 16 y better-sqlite3.

## 🚀 Características

- ✅ Autenticación con JWT y cookies httpOnly
- ✅ Base de datos SQLite con better-sqlite3
- ✅ Login con branding lateral profesional
- ✅ Sistema unificado de usuarios
- ✅ Gestión de citas médicas
- ✅ Evaluaciones y planes de rehabilitación
- ✅ Diseño responsive y moderno

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Inicializar la base de datos:**
```bash
npm run db:init
```

3. **Sembrar datos de prueba:**
```bash
npm run db:seed
```

4. **Iniciar el servidor de desarrollo:**
```bash
npm run dev
```

5. **Abrir en el navegador:**
```
http://localhost:3000
```

## 👥 Usuario de Prueba

- **Email:** usuario@kinecitas.com
- **Password:** demo123

## 📁 Estructura del Proyecto

```
KINE-CITAS/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── login/
│   │   │       ├── logout/
│   │   │       └── me/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── login.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       ├── db.ts
│       └── auth.ts
├── scripts/
│   ├── init-db.js
│   └── seed-db.js
├── database.db (generado)
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🗄️ Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **usuarios** - Información de usuarios del sistema
- **citas** - Gestión de citas médicas
- **evaluaciones** - Evaluaciones kinesiológicas
- **planes_rehabilitacion** - Planes de tratamiento

## 🔐 Autenticación

- JWT con expiración de 7 días
- Cookies httpOnly para seguridad
- Middleware de autenticación en rutas protegidas
- Redirección automática según rol de usuario

## 🎨 Diseño

- Layout de dos columnas en login
- Branding lateral con gradientes
- Formularios modernos y accesibles
- Responsive design para móviles y tablets
- Animaciones suaves con CSS

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run db:init` - Inicializa la base de datos
- `npm run db:seed` - Siembra datos de prueba

## 🔧 Configuración

Las variables de entorno se configuran en el archivo `.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-secreto-super-seguro"
NEXT_PUBLIC_APP_NAME="KINE-CITAS"
```

## 📦 Tecnologías

- **Framework:** Next.js 15
- **Base de datos:** better-sqlite3
- **Autenticación:** JWT + bcryptjs
- **Estilos:** CSS Modules
- **TypeScript:** Tipado estático

## 🚧 Próximas Funcionalidades

- [ ] Panel de administración completo
- [ ] Panel de kinesiólogo
- [ ] Panel de paciente
- [ ] Calendario de citas interactivo
- [ ] Sistema de notificaciones
- [ ] Reportes y estadísticas
- [ ] Exportación de datos

## 📄 Licencia

Este proyecto es privado y de uso interno.
