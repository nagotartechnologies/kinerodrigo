import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Crear tablas si no existen
export function initDatabase() {
  // Tabla de usuarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      telefono TEXT,
      fecha_nacimiento TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de pacientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rut TEXT UNIQUE NOT NULL,
      telefono TEXT,
      edad INTEGER,
      altura REAL,
      peso REAL,
      ocupacion TEXT,
      enfermedades TEXT,
      enfermedades_hereditarias TEXT,
      medicamentos TEXT,
      alergias TEXT,
      cirugias TEXT,
      motivo_consulta TEXT,
      diagnostico TEXT,
      tratamiento TEXT,
      observaciones TEXT,
      sesiones_programadas INTEGER DEFAULT NULL,
      evaluacion_final TEXT DEFAULT NULL,
      numero_sesion INTEGER DEFAULT NULL,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de citas
  db.exec(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      duracion INTEGER DEFAULT 60,
      tipo TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);

  // Tabla de horarios bloqueados
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_bloqueados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      motivo TEXT DEFAULT 'Bloqueado',
      tipo TEXT DEFAULT 'bloqueo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de evaluaciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      cita_id INTEGER,
      fecha TEXT NOT NULL,
      diagnostico TEXT,
      observaciones TEXT,
      plan_tratamiento TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
    )
  `);

  // Tabla de planes de rehabilitación
  db.exec(`
    CREATE TABLE IF NOT EXISTS planes_rehabilitacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      evaluacion_id INTEGER,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT,
      objetivos TEXT,
      ejercicios TEXT,
      frecuencia_semanal INTEGER,
      estado TEXT DEFAULT 'activo',
      progreso INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE SET NULL
    )
  `);

  // Tabla de ejercicios (biblioteca)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ejercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de sesiones
  db.exec(`
    CREATE TABLE IF NOT EXISTS sesiones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      cita_id INTEGER,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      duracion INTEGER DEFAULT 60,
      tipo TEXT NOT NULL,
      estado TEXT DEFAULT 'programada',
      numero_sesion INTEGER DEFAULT NULL,
      notas_sesion TEXT,
      ejercicios_realizados TEXT,
      observaciones TEXT,
      dolor_inicial INTEGER,
      dolor_final INTEGER,
      movilidad TEXT,
      fuerza TEXT,
      progreso_general TEXT,
      recomendaciones TEXT,
      proxima_sesion TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
    )
  `);

  // Tabla de recordatorios de WhatsApp
  db.exec(`
    CREATE TABLE IF NOT EXISTS recordatorios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cita_id INTEGER NOT NULL,
      mensaje_id TEXT,
      telefono TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      estado TEXT DEFAULT 'enviado',
      respuesta TEXT,
      respuesta_at TEXT,
      mensaje_respuesta_id TEXT,
      mensaje_respuesta_enviado INTEGER DEFAULT 0,
      error_respuesta TEXT,
      enviado_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
    )
  `);

  // Tabla de pagos
  db.exec(`
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      sesion_id INTEGER,
      monto REAL NOT NULL,
      metodo_pago TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      fecha_pago TEXT NOT NULL,
      concepto TEXT,
      notas TEXT,
      numero_factura TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE SET NULL
    )
  `);

  // Tabla de configuraciones del sistema
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuraciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT,
      tipo TEXT DEFAULT 'text',
      categoria TEXT NOT NULL,
      descripcion TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insertar configuraciones por defecto si no existen
  const configDefault = [
    // General
    { clave: 'nombre_centro', valor: 'NAGO-KINE', tipo: 'text', categoria: 'general', descripcion: 'Nombre del centro' },
    { clave: 'logo_url', valor: '', tipo: 'image', categoria: 'general', descripcion: 'Logo del centro' },
    { clave: 'direccion', valor: 'Av. Principal 123', tipo: 'text', categoria: 'general', descripcion: 'Dirección' },
    { clave: 'telefono_contacto', valor: '+56 9 4888 1923', tipo: 'text', categoria: 'general', descripcion: 'Teléfono de contacto' },
    { clave: 'email_contacto', valor: 'contacto@nagokine.cl', tipo: 'email', categoria: 'general', descripcion: 'Email de contacto' },
    { clave: 'horario_apertura', valor: '09:00', tipo: 'time', categoria: 'general', descripcion: 'Horario de apertura' },
    { clave: 'horario_cierre', valor: '18:00', tipo: 'time', categoria: 'general', descripcion: 'Horario de cierre' },
    { clave: 'email_contacto', valor: 'contacto@nago-kine.cl', tipo: 'email', categoria: 'general', descripcion: 'Email de contacto' },
    { clave: 'direccion', valor: '', tipo: 'text', categoria: 'general', descripcion: 'Dirección del centro' },
    
    // Citas
    { clave: 'recordatorios_automaticos', valor: 'true', tipo: 'boolean', categoria: 'citas', descripcion: 'Enviar recordatorios automáticos' },
    { clave: 'recordatorios_horas_antes', valor: '24', tipo: 'number', categoria: 'citas', descripcion: 'Horas antes para enviar recordatorio' },
    { clave: 'cancelacion_horas_minimas', valor: '2', tipo: 'number', categoria: 'citas', descripcion: 'Horas mínimas para cancelar' },
    { clave: 'permitir_reagendar', valor: 'true', tipo: 'boolean', categoria: 'citas', descripcion: 'Permitir reagendar citas' },
    
    // Pagos
    { clave: 'metodos_pago', valor: 'Efectivo,Transferencia,Tarjeta', tipo: 'text', categoria: 'pagos', descripcion: 'Métodos de pago aceptados' },
    { clave: 'tarifa_evaluacion', valor: '25000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de evaluación' },
    { clave: 'tarifa_tratamiento', valor: '20000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de tratamiento' },
    { clave: 'tarifa_control', valor: '15000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de control' },
    { clave: 'facturacion_automatica', valor: 'false', tipo: 'boolean', categoria: 'pagos', descripcion: 'Generar facturas automáticamente' },
    { clave: 'moneda', valor: 'CLP', tipo: 'text', categoria: 'pagos', descripcion: 'Moneda' },
    
    // Notificaciones
    { clave: 'notif_email', valor: 'true', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por email' },
    { clave: 'notif_sms', valor: 'false', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por SMS' },
    { clave: 'notif_whatsapp', valor: 'true', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por WhatsApp' },
    
    // WhatsApp
    { clave: 'whatsapp_activo', valor: 'true', tipo: 'boolean', categoria: 'whatsapp', descripcion: 'WhatsApp activado' },
    { clave: 'whatsapp_mensaje_recordatorio', valor: '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente},\n\nTe recordamos tu cita programada:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} minutos\n📋 *Tipo:* {tipo}\n\nPor favor, responde con una de las siguientes opciones:\n\n1️⃣ *CONFIRMAR* - Para confirmar tu asistencia\n2️⃣ *CANCELAR* - Para cancelar la cita\n3️⃣ *REAGENDAR* - Para cambiar la fecha/hora\n\n¡Te esperamos! 💪', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Plantilla de mensaje de recordatorio' },
    { clave: 'whatsapp_mensaje_confirmacion', valor: '✅ *CITA CONFIRMADA*\n\nGracias {paciente}!\nTu cita ha sido confirmada para el {fecha} a las {hora}.\n\nNos vemos pronto! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de confirmación' },
    { clave: 'whatsapp_mensaje_cancelacion', valor: '❌ *CITA CANCELADA*\n\nHola {paciente},\nTu cita ha sido cancelada exitosamente.\n\nSi deseas agendar una nueva cita, contáctanos.\n¡Esperamos verte pronto! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de cancelación' },
    { clave: 'whatsapp_mensaje_reagendamiento', valor: '📅 *REAGENDAR CITA*\n\nPara reagendar tu cita, contáctanos:\n📞 Teléfono: {telefono}\n\n¡Gracias! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de reagendamiento' }
  ];

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configuraciones (clave, valor, tipo, categoria, descripcion)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const config of configDefault) {
    insertConfig.run(config.clave, config.valor, config.tipo, config.categoria, config.descripcion);
  }

  console.log('✅ Base de datos inicializada correctamente');
}

// Inicializar la base de datos al importar
initDatabase();

export default db;
