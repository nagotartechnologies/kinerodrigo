# 🔍 DIAGNÓSTICO: Mensajes de Respuesta WhatsApp

## 📋 PROBLEMA
Los mensajes de confirmación automática no se están enviando cuando un paciente responde al recordatorio.

---

## ✅ PASOS PARA DIAGNOSTICAR

### 1️⃣ Verificar Configuración de Green API

Ejecuta en el navegador:
```
http://localhost:3000/api/webhook/diagnostico
```

Esto te mostrará:
- ✅ Si Green API está configurado
- 📊 Estadísticas de recordatorios
- 📱 Últimos recordatorios enviados
- ⚠️ Recomendaciones

---

### 2️⃣ Verificar Variables de Entorno

Revisa tu archivo `.env.local`:

```env
GREEN_API_INSTANCE_ID=tu_instance_id
GREEN_API_TOKEN=tu_token
GREEN_API_URL=https://api.green-api.com
GREEN_API_TEST_MODE=false
```

**IMPORTANTE:** 
- ❌ Si `GREEN_API_TEST_MODE=true`, los mensajes NO se envían realmente
- ✅ Debe estar en `false` para enviar mensajes reales

---

### 3️⃣ Configurar Webhook en Green API

1. **Ir a Green API Dashboard:**
   - https://console.green-api.com

2. **Seleccionar tu instancia**

3. **Ir a "Settings" → "Webhooks"**

4. **Configurar URL del webhook:**
   ```
   https://tu-dominio.com/api/webhook/whatsapp
   ```
   
   Si estás en desarrollo local, usa **ngrok** o **localtunnel**:
   ```bash
   # Con ngrok
   ngrok http 3000
   
   # Luego usa la URL generada:
   https://abc123.ngrok.io/api/webhook/whatsapp
   ```

5. **Activar eventos:**
   - ✅ `incomingMessageReceived`
   - ✅ `outgoingMessageReceived` (opcional)

6. **Guardar configuración**

---

### 4️⃣ Probar Manualmente

#### A. Enviar un recordatorio de prueba:

1. Ve al módulo de Citas
2. Selecciona una cita
3. Haz clic en "Enviar Recordatorio"
4. Verifica que se envíe correctamente

#### B. Responder desde WhatsApp:

Desde el teléfono del paciente, responde con:
- `1` o `confirmar`
- `2` o `cancelar`
- `3` o `reagendar`

#### C. Verificar logs del servidor:

Deberías ver en la consola:
```
📱 Webhook WhatsApp recibido: {...}
🔍 Buscando recordatorio para teléfono: +56XXXXXXXXX
✅ Recordatorio encontrado para cita #X
✅ Cita #X CONFIRMADA
📤 Enviando mensaje de respuesta a +56XXXXXXXXX
📝 Mensaje: ✅ *CITA CONFIRMADA*...
✅ Mensaje de respuesta enviado exitosamente
```

---

## 🐛 PROBLEMAS COMUNES

### ❌ Problema 1: "No hay recordatorio pendiente"

**Causa:** El número de teléfono no coincide

**Solución:**
1. Verifica que el número en la base de datos sea correcto
2. El sistema busca por los últimos 8 dígitos
3. Revisa los logs para ver qué número está llegando

---

### ❌ Problema 2: "Webhook no llega"

**Causa:** Webhook no configurado o URL incorrecta

**Solución:**
1. Verifica la URL del webhook en Green API
2. Si estás en local, usa ngrok
3. Verifica que el servidor esté corriendo
4. Prueba la URL manualmente: `GET https://tu-url/api/webhook/whatsapp`

---

### ❌ Problema 3: "Mensaje no se envía"

**Causa:** Credenciales incorrectas o modo de prueba activo

**Solución:**
1. Verifica `GREEN_API_INSTANCE_ID` y `GREEN_API_TOKEN`
2. Asegúrate que `GREEN_API_TEST_MODE=false`
3. Verifica que la instancia de Green API esté activa
4. Revisa los logs para ver errores específicos

---

### ❌ Problema 4: "Error al enviar mensaje"

**Causa:** Número de teléfono inválido o instancia sin saldo

**Solución:**
1. Verifica que el número tenga el formato correcto: `+56912345678`
2. Verifica que la instancia de Green API tenga saldo
3. Verifica que el número esté registrado en WhatsApp

---

## 🧪 MODO DE PRUEBA

Si quieres probar sin enviar mensajes reales:

```env
GREEN_API_TEST_MODE=true
```

Los mensajes se mostrarán en los logs pero NO se enviarán.

---

## 📞 SOPORTE

Si el problema persiste:

1. **Ejecuta el diagnóstico:**
   ```
   http://localhost:3000/api/webhook/diagnostico
   ```

2. **Revisa los logs del servidor** cuando un paciente responde

3. **Verifica en Green API Dashboard:**
   - Estado de la instancia
   - Historial de mensajes
   - Configuración del webhook

4. **Contacta al desarrollador:**
   - Thomas Landeros
   - +56 9 4888 1923
   - Nagotar Tech SPA

---

## ✅ CHECKLIST RÁPIDO

- [ ] Variables de entorno configuradas
- [ ] `GREEN_API_TEST_MODE=false`
- [ ] Webhook configurado en Green API
- [ ] Instancia de Green API activa
- [ ] Servidor corriendo
- [ ] Recordatorio enviado correctamente
- [ ] Número de teléfono correcto en BD
- [ ] Logs del servidor sin errores

---

**Última actualización:** Diciembre 2024
