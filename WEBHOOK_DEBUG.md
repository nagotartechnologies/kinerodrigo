# 🔧 Diagnóstico de Webhook WhatsApp

## Problema: Las citas no se confirman automáticamente

### ✅ Checklist de Verificación

#### 1. **Verificar que Green API está configurado correctamente**

```bash
# En .env.local debe tener:
GREEN_API_INSTANCE_ID="tu-instance-id-real"
GREEN_API_TOKEN="tu-token-real"
GREEN_API_TEST_MODE="false"  # IMPORTANTE: debe ser false
```

#### 2. **Verificar que el webhook está configurado en Green API**

Ve a: https://console.green-api.com

1. Selecciona tu instancia
2. Ve a **Settings → API**
3. En la sección **Webhooks**:
   - **Webhook URL**: `https://silver-vans-tap.loca.lt/api/webhook/whatsapp`
   - **Activar**: ✅ `Receive webhooks on incoming messages and files`
   - **Guardar cambios**

#### 3. **Verificar que el túnel está activo**

```bash
# En una terminal separada, ejecuta:
lt --port 3000

# Deberías ver algo como:
# your url is: https://silver-vans-tap.loca.lt
```

⚠️ **IMPORTANTE**: La URL del túnel cambia cada vez que lo reinicias. Si reinicias el túnel, debes actualizar la URL en Green API.

#### 4. **Probar el webhook manualmente**

Abre en el navegador (reemplaza el ID de la cita):
```
http://localhost:3000/api/webhook/test?citaId=3&accion=confirmar
```

Deberías ver:
```json
{
  "success": true,
  "message": "Cita confirmada exitosamente",
  "cita": { ... }
}
```

#### 5. **Ver logs del servidor**

En la terminal donde corre `npm run dev`, deberías ver:

**Cuando envías un recordatorio:**
```
🧪 MODO DE PRUEBA - WhatsApp  (si está en modo prueba)
📱 Teléfono: +56948881923
💬 Mensaje: ...
```

**Cuando el paciente responde:**
```
📱 Webhook WhatsApp recibido: { ... }
📞 Mensaje de 56948881923: "confirmar"
🔍 Buscando recordatorio para teléfono: ...
✅ Recordatorio encontrado para cita #3
✅ Cita #3 CONFIRMADA
```

## 🐛 Problemas Comunes

### Problema 1: No llegan webhooks

**Síntomas**: No ves logs de "📱 Webhook WhatsApp recibido"

**Soluciones**:
1. ✅ Verifica que el túnel esté activo (`lt --port 3000`)
2. ✅ Verifica que la URL del webhook en Green API sea correcta
3. ✅ Verifica que "Receive webhooks on incoming messages" esté activado
4. ✅ Reinicia el servidor (`npm run dev`)

### Problema 2: Webhook llega pero no encuentra recordatorio

**Síntomas**: Ves "❌ No se encontró recordatorio pendiente"

**Soluciones**:
1. ✅ Verifica que el recordatorio se haya enviado (debe estar en la BD)
2. ✅ Verifica que el número de teléfono coincida
3. ✅ Verifica que el recordatorio no tenga respuesta previa

**Ver recordatorios en la BD**:
```bash
sqlite3 database.db "SELECT * FROM recordatorios ORDER BY enviado_at DESC LIMIT 5;"
```

### Problema 3: Modo de prueba activado

**Síntomas**: Ves "🧪 MODO DE PRUEBA - WhatsApp"

**Solución**:
```bash
# En .env.local cambiar:
GREEN_API_TEST_MODE="false"

# Reiniciar servidor:
npm run dev
```

### Problema 4: Respuesta no reconocida

**Síntomas**: Ves "⚠️ Respuesta no reconocida"

**Solución**: El paciente debe responder exactamente:
- `CONFIRMAR` o `1`
- `CANCELAR` o `2`
- `REAGENDAR` o `3`

(No distingue mayúsculas/minúsculas)

## 🧪 Prueba Completa

### Paso 1: Enviar recordatorio
1. Abre el dashboard
2. Ve a una cita
3. Click en el botón de WhatsApp
4. Verifica que llegue el mensaje

### Paso 2: Responder desde WhatsApp
1. Desde tu teléfono, responde: `CONFIRMAR` o `1`
2. Deberías recibir mensaje de confirmación
3. La cita debe cambiar a "confirmada" en el dashboard

### Paso 3: Verificar logs
En la consola del servidor deberías ver:
```
📱 Webhook WhatsApp recibido: ...
📞 Mensaje de 56948881923: "confirmar"
✅ Recordatorio encontrado para cita #3
✅ Cita #3 CONFIRMADA
```

## 📞 Verificar Estado Actual

### Ver configuración actual:
```bash
# Ver variables de entorno
cat .env.local | grep GREEN_API

# Ver recordatorios recientes
sqlite3 database.db "SELECT r.id, r.cita_id, r.telefono, r.estado, r.respuesta, r.enviado_at FROM recordatorios r ORDER BY r.enviado_at DESC LIMIT 10;"

# Ver citas recientes
sqlite3 database.db "SELECT id, paciente_id, fecha, hora, estado FROM citas ORDER BY created_at DESC LIMIT 10;"
```

## 🆘 Si nada funciona

1. **Reinicia todo**:
   ```bash
   # Detener servidor (Ctrl+C)
   # Detener túnel (Ctrl+C)
   
   # Reiniciar túnel
   lt --port 3000
   
   # Copiar nueva URL
   # Actualizar webhook en Green API
   
   # Reiniciar servidor
   npm run dev
   ```

2. **Prueba manual**:
   ```
   http://localhost:3000/api/webhook/test?citaId=TU_CITA_ID&accion=confirmar
   ```

3. **Verifica que Green API esté funcionando**:
   - Ve a https://console.green-api.com
   - Verifica que la instancia esté "Authorized" (verde)
   - Envía un mensaje de prueba desde el panel

## 📝 Notas Importantes

- ⏰ El túnel (`lt`) expira y cambia de URL cada vez que lo reinicias
- 🔄 Debes actualizar la URL del webhook en Green API cada vez que cambies el túnel
- 🚀 En producción (Railway/Vercel), la URL será permanente
- 📱 El número de teléfono debe coincidir entre el paciente y el recordatorio
