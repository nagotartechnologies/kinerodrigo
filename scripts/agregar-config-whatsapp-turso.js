// Script para agregar configuraciones de WhatsApp a Turso (base de datos en la nube)
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('❌ Error: TURSO_DATABASE_URL y TURSO_AUTH_TOKEN deben estar configurados en .env.local');
  process.exit(1);
}

const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

console.log('📱 Agregando configuraciones de WhatsApp a Turso...\n');

const configuraciones = [
  {
    clave: 'whatsapp_phone_number_id',
    valor: '',
    tipo: 'text',
    categoria: 'whatsapp',
    descripcion: 'Phone Number ID de WhatsApp Business API'
  },
  {
    clave: 'whatsapp_access_token',
    valor: '',
    tipo: 'text',
    categoria: 'whatsapp',
    descripcion: 'Access Token de WhatsApp Business API'
  },
  {
    clave: 'whatsapp_mensaje_recordatorio',
    valor: '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente},\n\nTe recordamos tu cita programada:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} minutos\n📋 *Tipo:* {tipo}\n\nPor favor, responde con una de las siguientes opciones:\n\n1️⃣ *CONFIRMAR* - Para confirmar tu asistencia\n2️⃣ *CANCELAR* - Para cancelar la cita\n3️⃣ *REAGENDAR* - Para cambiar la fecha/hora\n\n¡Te esperamos! 💪',
    tipo: 'textarea',
    categoria: 'whatsapp',
    descripcion: 'Plantilla de mensaje de recordatorio'
  },
  {
    clave: 'whatsapp_mensaje_confirmacion',
    valor: '✅ *CITA CONFIRMADA*\n\nGracias {paciente}!\nTu cita ha sido confirmada para el {fecha} a las {hora}.\n\nNos vemos pronto! 🏥',
    tipo: 'textarea',
    categoria: 'whatsapp',
    descripcion: 'Mensaje de confirmación'
  },
  {
    clave: 'whatsapp_mensaje_cancelacion',
    valor: '❌ *CITA CANCELADA*\n\nHola {paciente},\nTu cita ha sido cancelada exitosamente.\n\nSi deseas agendar una nueva cita, contáctanos.\n¡Esperamos verte pronto! 🏥',
    tipo: 'textarea',
    categoria: 'whatsapp',
    descripcion: 'Mensaje de cancelación'
  },
  {
    clave: 'whatsapp_mensaje_reagendamiento',
    valor: '📅 *REAGENDAR CITA*\n\nPara reagendar tu cita, contáctanos:\n📞 Teléfono: {telefono}\n\n¡Gracias! 🏥',
    tipo: 'textarea',
    categoria: 'whatsapp',
    descripcion: 'Mensaje de reagendamiento'
  }
];

async function agregarConfiguraciones() {
  let agregadas = 0;
  let actualizadas = 0;

  for (const config of configuraciones) {
    try {
      // Verificar si existe
      const existe = await db.execute({
        sql: 'SELECT id FROM configuraciones WHERE clave = ?',
        args: [config.clave]
      });
      
      if (existe.rows.length > 0) {
        // Actualizar
        await db.execute({
          sql: `UPDATE configuraciones 
                SET valor = ?, tipo = ?, categoria = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP
                WHERE clave = ?`,
          args: [config.valor, config.tipo, config.categoria, config.descripcion, config.clave]
        });
        actualizadas++;
        console.log(`✅ Actualizada: ${config.clave}`);
      } else {
        // Insertar
        await db.execute({
          sql: `INSERT INTO configuraciones (clave, valor, tipo, categoria, descripcion, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [config.clave, config.valor, config.tipo, config.categoria, config.descripcion]
        });
        agregadas++;
        console.log(`➕ Agregada: ${config.clave}`);
      }
    } catch (error) {
      console.error(`❌ Error con ${config.clave}:`, error.message);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Agregadas: ${agregadas}`);
  console.log(`   Actualizadas: ${actualizadas}`);
  console.log(`   Total: ${configuraciones.length}`);

  // Verificar
  const total = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM configuraciones WHERE categoria = ?',
    args: ['whatsapp']
  });
  console.log(`\n✅ Configuraciones de WhatsApp en Turso: ${total.rows[0].count}`);
}

agregarConfiguraciones()
  .then(() => {
    console.log('\n✅ Script completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
