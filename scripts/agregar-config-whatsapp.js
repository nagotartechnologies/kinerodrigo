// Script para agregar configuraciones de WhatsApp a la base de datos existente
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

console.log('📱 Agregando configuraciones de WhatsApp...\n');

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

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO configuraciones (clave, valor, tipo, categoria, descripcion, updated_at)
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

let agregadas = 0;
let actualizadas = 0;

for (const config of configuraciones) {
  const existe = db.prepare('SELECT id FROM configuraciones WHERE clave = ?').get(config.clave);
  
  insertStmt.run(config.clave, config.valor, config.tipo, config.categoria, config.descripcion);
  
  if (existe) {
    actualizadas++;
    console.log(`✅ Actualizada: ${config.clave}`);
  } else {
    agregadas++;
    console.log(`➕ Agregada: ${config.clave}`);
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   Agregadas: ${agregadas}`);
console.log(`   Actualizadas: ${actualizadas}`);
console.log(`   Total: ${configuraciones.length}`);

// Verificar
const total = db.prepare('SELECT COUNT(*) as count FROM configuraciones WHERE categoria = ?').get('whatsapp');
console.log(`\n✅ Configuraciones de WhatsApp en BD: ${total.count}`);

db.close();
console.log('\n✅ Script completado!');
