# 📱 Plantillas de Mensajes WhatsApp

## Variables Disponibles

Las plantillas de mensajes de WhatsApp soportan variables que se reemplazan automáticamente con información de la cita y el paciente.

### Formato de Variables

Las variables se escriben entre llaves: `{nombre_variable}`

Ejemplo:
```
Hola {paciente}, tu cita es el {fecha} a las {hora}.
```

Se convierte en:
```
Hola Juan Pérez, tu cita es el 27/11/2025 a las 10:00.
```

---

## 📋 Variables por Tipo de Mensaje

### 1. Mensaje de Recordatorio

**Configuración**: `whatsapp_mensaje_recordatorio`

**Variables disponibles**:
- `{nombre_centro}` - Nombre del centro (ej: "NAGO-KINE")
- `{paciente}` - Nombre completo del paciente
- `{fecha}` - Fecha de la cita en formato DD/MM/YYYY
- `{hora}` - Hora de la cita en formato HH:MM
- `{duracion}` - Duración en minutos
- `{tipo}` - Tipo de cita (Evaluación, Tratamiento, Control)

**Plantilla por defecto**:
```
🏥 *RECORDATORIO DE CITA - {nombre_centro}*

Hola {paciente},

Te recordamos tu cita programada:

📅 *Fecha:* {fecha}
🕐 *Hora:* {hora}
⏱️ *Duración:* {duracion} minutos
📋 *Tipo:* {tipo}

Por favor, responde con una de las siguientes opciones:

1️⃣ *CONFIRMAR* - Para confirmar tu asistencia
2️⃣ *CANCELAR* - Para cancelar la cita
3️⃣ *REAGENDAR* - Para cambiar la fecha/hora

¡Te esperamos! 💪
```

---

### 2. Mensaje de Confirmación

**Configuración**: `whatsapp_mensaje_confirmacion`

**Variables disponibles**:
- `{paciente}` - Nombre completo del paciente
- `{fecha}` - Fecha de la cita en formato DD/MM/YYYY
- `{hora}` - Hora de la cita en formato HH:MM

**Plantilla por defecto**:
```
✅ *CITA CONFIRMADA*

Gracias {paciente}!
Tu cita ha sido confirmada para el {fecha} a las {hora}.

Nos vemos pronto! 🏥
```

---

### 3. Mensaje de Cancelación

**Configuración**: `whatsapp_mensaje_cancelacion`

**Variables disponibles**:
- `{paciente}` - Nombre completo del paciente

**Plantilla por defecto**:
```
❌ *CITA CANCELADA*

Hola {paciente},
Tu cita ha sido cancelada exitosamente.

Si deseas agendar una nueva cita, contáctanos.
¡Esperamos verte pronto! 🏥
```

---

### 4. Mensaje de Reagendamiento

**Configuración**: `whatsapp_mensaje_reagendamiento`

**Variables disponibles**:
- `{telefono}` - Teléfono de contacto del centro

**Plantilla por defecto**:
```
📅 *REAGENDAR CITA*

Para reagendar tu cita, contáctanos:
📞 Teléfono: {telefono}

¡Gracias! 🏥
```

---

## 🎨 Formato de Texto en WhatsApp

WhatsApp soporta formato de texto básico:

- **Negrita**: `*texto*` → **texto**
- *Cursiva*: `_texto_` → _texto_
- ~Tachado~: `~texto~` → ~~texto~~
- `Monoespaciado`: `` `texto` `` → `texto`

**Ejemplo**:
```
🏥 *RECORDATORIO DE CITA*

Hola _Juan Pérez_,

Tu cita es:
📅 Fecha: *27/11/2025*
🕐 Hora: *10:00*
```

---

## 🔧 Cómo Personalizar

### Desde el Dashboard

1. Ve al módulo **Configuración**
2. Busca la sección **WhatsApp**
3. Click en **Editar** en el mensaje que quieres personalizar
4. Modifica el texto usando las variables disponibles
5. Click en **Guardar**

### Ejemplo de Personalización

**Original**:
```
Hola {paciente}, tu cita es el {fecha} a las {hora}.
```

**Personalizado**:
```
¡Hola {paciente}! 👋

Te esperamos en *{nombre_centro}* el día {fecha} a las {hora}.

📍 Dirección: Av. Principal 123
🚗 Estacionamiento disponible

¡Nos vemos pronto! 💪
```

---

## ⚠️ Consideraciones Importantes

### 1. Variables Obligatorias

Algunas variables son importantes para que el paciente tenga la información necesaria:

**Mensaje de Recordatorio**:
- ✅ Debe incluir: `{fecha}`, `{hora}`
- ✅ Recomendado: `{paciente}`, `{tipo}`

**Mensaje de Confirmación**:
- ✅ Debe incluir: `{fecha}`, `{hora}`
- ✅ Recomendado: `{paciente}`

### 2. Longitud del Mensaje

- WhatsApp no tiene límite estricto de caracteres
- Recomendado: Mantener mensajes entre 200-500 caracteres
- Mensajes muy largos pueden ser difíciles de leer en móvil

### 3. Emojis

- ✅ Los emojis funcionan perfectamente en WhatsApp
- 💡 Usa emojis para hacer los mensajes más visuales
- ⚠️ No abuses de los emojis (2-5 por mensaje es suficiente)

### 4. Saltos de Línea

- Usa `\n` para saltos de línea en las plantillas
- Ejemplo: `Hola {paciente}\n\nTu cita es...`

### 5. Opciones de Respuesta

El mensaje de recordatorio debe incluir las opciones:
```
1️⃣ *CONFIRMAR*
2️⃣ *CANCELAR*
3️⃣ *REAGENDAR*
```

El sistema reconoce:
- `CONFIRMAR` o `1`
- `CANCELAR` o `2`
- `REAGENDAR` o `3`

(No distingue mayúsculas/minúsculas)

---

## 📝 Ejemplos de Plantillas

### Estilo Formal

```
Estimado/a {paciente},

Le recordamos su cita médica programada:

📅 Fecha: {fecha}
🕐 Hora: {hora}
⏱️ Duración: {duracion} minutos

Por favor, confirme su asistencia respondiendo:
1 - CONFIRMAR
2 - CANCELAR
3 - REAGENDAR

Atentamente,
{nombre_centro}
```

### Estilo Casual

```
¡Hola {paciente}! 👋

Te recordamos tu cita:

📅 {fecha} a las {hora}
⏱️ Duración: {duracion} min
📋 Tipo: {tipo}

Responde:
1️⃣ CONFIRMAR
2️⃣ CANCELAR
3️⃣ REAGENDAR

¡Nos vemos! 💪
```

### Estilo Minimalista

```
{paciente}, tu cita:

📅 {fecha} - {hora}
⏱️ {duracion} min

Responde: 1=Confirmar 2=Cancelar 3=Reagendar
```

---

## 🧪 Probar Plantillas

### Método 1: Enviar Recordatorio Real

1. Crea una cita de prueba
2. Envía el recordatorio desde el dashboard
3. Verifica el mensaje en WhatsApp

### Método 2: Vista Previa (Próximamente)

Estamos trabajando en una función de vista previa para ver cómo se verá el mensaje antes de enviarlo.

---

## 🆘 Solución de Problemas

### Problema: Variable no se reemplaza

**Síntoma**: El mensaje muestra `{paciente}` en lugar del nombre

**Solución**:
- Verifica que la variable esté escrita correctamente
- Las variables distinguen mayúsculas/minúsculas
- Debe ser exactamente: `{paciente}` no `{Paciente}` o `{PACIENTE}`

### Problema: Formato no se aplica

**Síntoma**: Los asteriscos `*` se muestran en el mensaje

**Solución**:
- El formato de WhatsApp solo funciona en la app de WhatsApp
- En la base de datos y logs se verán los caracteres especiales
- El formato se aplicará cuando el paciente reciba el mensaje

### Problema: Saltos de línea no funcionan

**Síntoma**: Todo el texto aparece en una sola línea

**Solución**:
- Usa `\n` para saltos de línea en las plantillas
- Ejemplo: `Hola\n\nTu cita es...`
- Dos `\n\n` crean un párrafo nuevo

---

## 📚 Recursos Adicionales

- [Formato de texto en WhatsApp](https://faq.whatsapp.com/539178204879377)
- [Emojis para copiar](https://emojipedia.org/)
- [Green API Documentación](https://green-api.com/docs/)

---

**Última actualización**: Noviembre 2025
