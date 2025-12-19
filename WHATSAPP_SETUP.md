# Configuración de Recordatorios por WhatsApp

## 📱 Sistema de Recordatorios Automáticos

Este sistema permite enviar recordatorios de citas por WhatsApp y procesar las respuestas de los pacientes automáticamente.

## 🔧 Configuración de Green API

### 1. Crear Cuenta en Green API

1. Ve a [green-api.com](https://green-api.com)
2. Crea una cuenta gratuita o de pago
3. Crea una nueva instancia de WhatsApp
4. Escanea el código QR con tu WhatsApp Business

### 2. Obtener Credenciales

Una vez creada la instancia, obtendrás:
- **Instance ID**: Tu identificador de instancia (ej: `1101234567`)
- **API Token**: Tu token de autenticación (ej: `abc123def456...`)

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Green API Configuration
GREEN_API_INSTANCE_ID="tu-instance-id"
GREEN_API_TOKEN="tu-api-token"
GREEN_API_URL="https://api.green-api.com"
```

### 4. Configurar Webhook

Para recibir respuestas de los pacientes, configura el webhook en Green API:

1. Ve a tu panel de Green API
2. Navega a **Settings** → **Webhooks**
3. Configura la URL del webhook:
   ```
   https://tu-dominio.com/api/webhook/whatsapp
   ```
4. Activa los siguientes eventos:
   - ✅ `incomingMessageReceived`

## 📋 Uso del Sistema

### Enviar Recordatorio

1. Abre el calendario de citas
2. Click en una cita para editarla
3. Click en el botón verde **"WhatsApp"**
4. Confirma el envío

### Mensaje Enviado al Paciente

```
🏥 RECORDATORIO DE CITA - NAGO-KINE

Hola [Nombre del Paciente],

Te recordamos tu cita programada:

📅 Fecha: 27/11/2025
🕐 Hora: 10:00
⏱️ Duración: 60 minutos
📋 Tipo: Evaluación

Por favor, responde con una de las siguientes opciones:

1️⃣ CONFIRMAR - Para confirmar tu asistencia
2️⃣ CANCELAR - Para cancelar la cita
3️⃣ REAGENDAR - Para cambiar la fecha/hora

¡Te esperamos! 💪
```

### Respuestas del Paciente

El paciente puede responder con:

#### ✅ Confirmar
- Respuesta: `CONFIRMAR` o `1`
- Acción: La cita cambia a estado "confirmada"
- Mensaje automático: Confirmación de la cita

#### ❌ Cancelar
- Respuesta: `CANCELAR` o `2`
- Acción: La cita cambia a estado "cancelada"
- Mensaje automático: Confirmación de cancelación

#### 📅 Reagendar
- Respuesta: `REAGENDAR` o `3`
- Acción: Se envía mensaje con información de contacto
- El paciente debe llamar para reagendar

## 🗄️ Base de Datos

### Tabla `recordatorios`

```sql
CREATE TABLE recordatorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cita_id INTEGER NOT NULL,
  mensaje_id TEXT,
  telefono TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  estado TEXT DEFAULT 'enviado',
  respuesta TEXT,
  respuesta_at TEXT,
  enviado_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
);
```

## 🔍 Monitoreo

### Ver Recordatorios Enviados

```sql
SELECT 
  r.id,
  r.telefono,
  r.estado,
  r.respuesta,
  c.fecha,
  c.hora,
  p.nombre
FROM recordatorios r
INNER JOIN citas c ON r.cita_id = c.id
INNER JOIN pacientes p ON c.paciente_id = p.id
ORDER BY r.enviado_at DESC;
```

### Ver Respuestas Pendientes

```sql
SELECT * FROM recordatorios 
WHERE estado = 'enviado' 
  AND respuesta IS NULL
ORDER BY enviado_at DESC;
```

## 🚨 Solución de Problemas

### Error: "Green API no está configurado"
- Verifica que las variables de entorno estén correctamente configuradas
- Reinicia el servidor de desarrollo

### Error: "El paciente no tiene número de teléfono"
- Asegúrate de que el paciente tenga un teléfono registrado
- El formato debe ser: `+56912345678` o `912345678`

### No se reciben respuestas
- Verifica que el webhook esté correctamente configurado en Green API
- Comprueba que la URL del webhook sea accesible públicamente
- Revisa los logs del servidor

### Formato de Teléfono

El sistema acepta varios formatos:
- ✅ `+56912345678`
- ✅ `56912345678`
- ✅ `912345678`
- ✅ `+56 9 1234 5678`

Todos se normalizan automáticamente al formato de Green API.

## 📊 Estadísticas

Puedes consultar estadísticas de recordatorios:

```sql
-- Total de recordatorios enviados
SELECT COUNT(*) FROM recordatorios;

-- Tasa de respuesta
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN respuesta IS NOT NULL THEN 1 ELSE 0 END) as respondidos,
  ROUND(SUM(CASE WHEN respuesta IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as tasa_respuesta
FROM recordatorios;

-- Respuestas por tipo
SELECT 
  respuesta,
  COUNT(*) as cantidad
FROM recordatorios
WHERE respuesta IS NOT NULL
GROUP BY respuesta;
```

## 🔐 Seguridad

- ✅ Las credenciales de Green API están en variables de entorno
- ✅ Los webhooks validan el origen de los mensajes
- ✅ Solo se procesan mensajes de números registrados
- ✅ Los recordatorios se asocian a citas específicas

## 💡 Mejoras Futuras

- [ ] Recordatorios automáticos programados (24h antes)
- [ ] Plantillas de mensajes personalizables
- [ ] Estadísticas en el dashboard
- [ ] Historial de conversaciones
- [ ] Soporte para múltiples idiomas
- [ ] Envío masivo de recordatorios

## 📞 Soporte

Para problemas o consultas:
- Email: thomas@nagotar.tech
- Teléfono: +56 9 4888 1923
- Documentación Green API: [docs.green-api.com](https://docs.green-api.com)
