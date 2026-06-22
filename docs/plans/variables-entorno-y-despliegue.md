# Variables de Entorno y Consideraciones de Despliegue

> Este documento es crítico si el sistema va a ser instalado en un entorno nuevo, traspasado a otro cliente, o desplegado por alguien distinto al desarrollador original.

---

## ⚠️ Advertencia importante antes de empezar

El archivo `.env.local` contiene **credenciales privadas** que dan acceso real a:
- La base de datos de producción (Turso)
- El almacenamiento de archivos (Cloudinary)
- La API de WhatsApp (Green API)
- El sistema de autenticación (JWT)

**Este archivo NUNCA debe ser compartido, subido a GitHub, enviado por correo ni incluido en un zip del código fuente.**

Ya está protegido por `.gitignore`, lo que significa que Git no lo rastrea. Pero si alguien copia la carpeta del proyecto manualmente (por ejemplo, via `cp -r` o comprimiendo la carpeta), el archivo **sí se incluye** porque está en disco. Hay que borrarlo o vaciarlo antes de entregar el código a otra persona.

---

## ¿Qué pasa si instalo esto en un entorno nuevo?

Si el software se traspasa a otro cliente, otro desarrollador, o se despliega en una cuenta diferente de Netlify, **las credenciales del `.env.local` actual NO sirven**. Esas credenciales apuntan a cuentas específicas (la cuenta de Turso, la cuenta de Cloudinary, la cuenta de Green API del propietario actual). Usar las mismas en otro entorno implica que:

1. Los datos del cliente original podrían ser vistos o modificados desde el nuevo entorno.
2. Los límites de uso (almacenamiento, mensajes enviados, consultas a la BD) se comparten entre ambos entornos.
3. Si el propietario original revoca o rota las credenciales, el nuevo entorno deja de funcionar.

**La solución correcta es crear cuentas nuevas en cada servicio y generar credenciales propias.**

---

## Variables de entorno requeridas

Estas son todas las variables que el sistema necesita para funcionar. Deben estar definidas en el archivo `.env.local` en desarrollo local, y en las variables de entorno del panel de Netlify en producción.

### Base de datos — Turso

```env
TURSO_DATABASE_URL=libsql://nombre-base-de-datos.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...
```

Turso es una base de datos SQLite distribuida en la nube. Para obtener estas credenciales:

1. Crear cuenta en [https://turso.tech](https://turso.tech)
2. Crear una nueva base de datos (`turso db create nombre-del-proyecto`)
3. Obtener la URL: `turso db show nombre-del-proyecto --url`
4. Generar token: `turso db tokens create nombre-del-proyecto`

La base de datos existente se puede exportar con `turso db shell nombre-bd .dump > backup.sql` y luego importar a la nueva con `turso db shell nueva-bd < backup.sql`. Esto migra todos los datos del paciente a la nueva instancia.

---

### Almacenamiento de archivos — Cloudinary

```env
CLOUDINARY_CLOUD_NAME=nombre_del_cloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=clave_secreta_aqui
```

Cloudinary almacena los documentos e imágenes subidos en la ficha de cada paciente. Para obtener estas credenciales:

1. Crear cuenta en [https://cloudinary.com](https://cloudinary.com) (tiene plan gratuito generoso)
2. Ir al Dashboard → API Keys
3. Copiar `Cloud Name`, `API Key` y `API Secret`

Los archivos existentes viven en la carpeta `kine-citas/pacientes/` de la cuenta de Cloudinary original. Para migrarlos hay que descargarlos manualmente (o vía API) y re-subirlos al nuevo cloud. Las URLs en la base de datos también deberán actualizarse ya que apuntan al cloud original.

---

### Mensajería WhatsApp — Green API

```env
GREEN_API_INSTANCE_ID=1234567890
GREEN_API_TOKEN=abcdef1234567890abcdef
GREEN_API_URL=https://api.green-api.com
GREEN_API_TEST_MODE=false
WHATSAPP_TEST_MODE=false
```

Green API conecta el sistema al número de WhatsApp del kinesiólogo. Cada instancia de Green API corresponde a un número de teléfono específico escaneado con QR. Para configurar en un entorno nuevo:

1. Crear cuenta en [https://green-api.com](https://green-api.com)
2. Crear una instancia nueva
3. Escanear el QR con el número de WhatsApp del nuevo propietario
4. Copiar el `Instance ID` y el `API Token` desde el panel
5. Configurar la URL del webhook en Green API: `https://tu-dominio.netlify.app/api/webhook/whatsapp`

`GREEN_API_TEST_MODE=true` o `WHATSAPP_TEST_MODE=true` activa un modo simulado donde los mensajes NO se envían realmente. Útil para pruebas. En producción debe estar en `false`.

---

### Autenticación — JWT

```env
JWT_SECRET=una-cadena-larga-aleatoria-y-secreta
```

Esta clave se usa para firmar los tokens de sesión de los usuarios del dashboard. Si se cambia, todos los usuarios activos quedan deslogueados automáticamente (sus tokens ya no son válidos).

Generar una clave segura:
```bash
openssl rand -base64 64
```

**Nunca usar el valor por defecto** (`tu-secreto-super-seguro-cambiar-en-produccion`) que está hardcodeado como fallback en `src/lib/auth.ts`. Es solo un placeholder para desarrollo.

---

### URL pública de la app

```env
NEXT_PUBLIC_APP_URL=https://tu-subdominio.netlify.app
```

Se usa para construir la URL del webhook de WhatsApp en el diagnóstico. Debe coincidir con el dominio real donde está desplegada la app.

---

## Resumen de cuentas necesarias por entorno

| Servicio | Para qué | URL para crear cuenta |
|---|---|---|
| Turso | Base de datos | turso.tech |
| Cloudinary | Documentos e imágenes de pacientes | cloudinary.com |
| Green API | Envío de mensajes WhatsApp | green-api.com |
| Netlify | Hosting del sistema | netlify.com |

---

## Pasos para instalar en un entorno nuevo desde cero

1. **Clonar el repositorio** (sin el `.env.local` del propietario anterior).
2. **Crear cuentas nuevas** en Turso, Cloudinary y Green API.
3. **Importar la base de datos** si se desea mantener los datos:
   - Exportar desde la cuenta original: `turso db shell bd-original .dump > datos.sql`
   - Crear nueva BD en Turso: `turso db create bd-nueva`
   - Importar: `turso db shell bd-nueva < datos.sql`
4. **Crear el archivo `.env.local`** en la raíz del proyecto con todas las variables nuevas.
5. **Probar localmente**: `pnpm run dev` (NO usar `npm`).
6. **Configurar variables en Netlify**: Panel → Site configuration → Environment variables. Agregar cada variable igual que en `.env.local`.
7. **Desplegar**: `pnpm run build && netlify deploy --prod`
8. **Configurar webhook de WhatsApp** en el panel de Green API con la URL del nuevo dominio.
9. **Correr la migración de episodios** visitando `GET /api/db/migrate/episodios` una sola vez (solo si se importaron datos de una versión anterior al sistema de episodios).

---

## Lo que NO hacer

- No compartir el `.env.local` por ningún medio (WhatsApp, correo, GitHub, etc.)
- No hardcodear credenciales directamente en el código fuente
- No usar `npm run build` ni `npm run dev`; siempre usar `pnpm`
- No reutilizar las mismas credenciales de Turso o Cloudinary entre dos clientes distintos
- No dejar `JWT_SECRET` con el valor por defecto en producción
