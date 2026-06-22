import { createClient } from '@libsql/client/web';
import path from 'path';

// Credenciales de conexion a la base de datos en la nube
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Si no existen las variables de entorno el servidor no puede arrancar
if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('ERROR: Las variables de entorno de Turso no estan configuradas.');
  console.error('Agrega las siguientes variables en el archivo .env.local:');
  console.error('  - TURSO_DATABASE_URL');
  console.error('  - TURSO_AUTH_TOKEN');
  console.error('');
  console.error('Puedes obtener estas credenciales desde: https://turso.tech');
  throw new Error('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN son requeridos. Verifica tu archivo .env.local');
}

// Se usa el cliente web de Turso para evitar dependencias de binarios nativos en Netlify
const tursoClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
});

console.log('Conexion establecida con la base de datos Turso.');

// Esta clase envuelve el cliente de Turso imitando la API de better-sqlite3
// para no tener que reescribir todas las consultas del sistema
class TursoDatabase {
  private client = tursoClient;

  // Ejecuta una sentencia SQL sin parametros
  exec(sql: string) {
    return this.client.execute(sql);
  }

  // Prepara una consulta SQL y devuelve metodos para ejecutarla con parametros
  prepare(sql: string) {
    return {
      run: async (...params: any[]) => {
        const result = await this.client.execute({
          sql,
          args: params
        });
        return {
          changes: result.rowsAffected,
          lastInsertRowid: result.lastInsertRowid
        };
      },
      get: async (...params: any[]) => {
        const result = await this.client.execute({
          sql,
          args: params
        });
        return result.rows[0] || null;
      },
      all: async (...params: any[]) => {
        const result = await this.client.execute({
          sql,
          args: params
        });
        return result.rows;
      }
    };
  }

  // Turso no soporta pragmas de SQLite, pero se mantiene el metodo para no romper
  // codigo que lo llame por compatibilidad con better-sqlite3
  pragma(pragma: string) {
    console.log(`Pragma ignorado en Turso: ${pragma}`);
    return this;
  }

  // Turso no soporta transacciones locales de la misma forma que SQLite.
  // Esta implementacion ejecuta la funcion directamente sin garantia de atomicidad.
  transaction(fn: (...args: any[]) => void) {
    return (...args: any[]) => {
      return fn(...args);
    };
  }
}

const db = new TursoDatabase();

// Reintenta una operacion async hasta N veces si falla por timeout de red.
// Util en entornos serverless donde la conexion puede tardar en establecerse.
async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  timeout: number = 20000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout después de ${timeout}ms`)), timeout);
      });
      
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isTimeoutError = error.message?.includes('Timeout') || 
                            error.message?.includes('fetch failed') ||
                            error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                            error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
      
      if (isLastAttempt) {
        console.error(`Error despues de ${maxRetries} intentos:`, error.message);
        throw error;
      }
      
      if (isTimeoutError) {
        const waitTime = 2000 * attempt;
        console.log(`Intento ${attempt}/${maxRetries} fallo por timeout, reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  throw new Error('No se pudo completar la operación');
}

// Crea todas las tablas y datos iniciales si no existen.
// Se ejecuta una sola vez por arranque del servidor.
let dbInitialized = false;

export async function initDatabase() {
  if (dbInitialized) return;
  
  try {
    console.log('Iniciando conexion con la base de datos Turso...');
    console.log(`URL de conexion: ${TURSO_URL?.substring(0, 30)}...`);

    // Se crean todas las tablas en una sola llamada HTTP para minimizar la latencia
    // en entornos serverless. Si las tablas ya existen no hace nada.
    await retryWithTimeout(() => tursoClient.batch([
      `CREATE TABLE IF NOT EXISTS usuarios (
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
      )`,
      `CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        rut TEXT,
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
        deportes TEXT,
        alimentacion TEXT,
        consumo_agua TEXT,
        descanso TEXT,
        psicologicamente TEXT,
        digestion TEXT,
        lesion_consulta TEXT,
        objetivo_paciente TEXT,
        evaluacion_fisica TEXT,
        motivo_consulta TEXT,
        diagnostico TEXT,
        tratamiento TEXT,
        observaciones TEXT,
        sesiones_programadas INTEGER DEFAULT NULL,
        evaluacion_final TEXT DEFAULT NULL,
        numero_sesion INTEGER DEFAULT NULL,
        estado_tratamiento TEXT DEFAULT 'en_tratamiento',
        activo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS citas (
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
      )`,
      `CREATE TABLE IF NOT EXISTS horarios_bloqueados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        motivo TEXT DEFAULT 'Bloqueado',
        tipo TEXT DEFAULT 'bloqueo',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS evaluaciones (
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
      )`,
      `CREATE TABLE IF NOT EXISTS planes_rehabilitacion (
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
      )`,
      `CREATE TABLE IF NOT EXISTS ejercicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        categoria TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sesiones (
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
      )`,
      `CREATE TABLE IF NOT EXISTS recordatorios (
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
      )`,
      `CREATE TABLE IF NOT EXISTS pagos (
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
      )`,
      `CREATE TABLE IF NOT EXISTS categorias_gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6b7280',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS gastos_fijos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL,
        activo INTEGER DEFAULT 1,
        dia_generacion INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        fecha_gasto TEXT NOT NULL,
        metodo_pago TEXT,
        notas TEXT,
        gasto_fijo_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gasto_fijo_id) REFERENCES gastos_fijos(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS configuraciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE NOT NULL,
        valor TEXT,
        tipo TEXT DEFAULT 'text',
        categoria TEXT NOT NULL,
        descripcion TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS documentos_paciente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT DEFAULT 'imagen',
        url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        formato TEXT,
        tamano INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS historial_estados_paciente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        estado_anterior TEXT,
        estado_nuevo TEXT NOT NULL,
        motivo TEXT,
        notas TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS episodios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        numero_episodio INTEGER NOT NULL DEFAULT 1,
        motivo_lesion TEXT,
        objetivo TEXT,
        evaluacion_fisica TEXT,
        evaluacion_final TEXT,
        estado TEXT DEFAULT 'en_tratamiento',
        fecha_inicio TEXT DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
      )`
    ], 'write'));

    // Se agregan columnas nuevas a tablas existentes.
    // Si la columna ya existe la base de datos lanza un error que se ignora intencionalmente.
    const columnsToAdd = [
      'deportes TEXT', 'alimentacion TEXT', 'consumo_agua TEXT', 'descanso TEXT',
      'psicologicamente TEXT', 'digestion TEXT', 'lesion_consulta TEXT',
      'objetivo_paciente TEXT', 'evaluacion_fisica TEXT',
      'estado_tratamiento TEXT DEFAULT en_tratamiento',
      'estado_paciente TEXT DEFAULT activo'
    ];
    for (const column of columnsToAdd) {
      try {
        await tursoClient.execute(`ALTER TABLE pacientes ADD COLUMN ${column}`);
      } catch (error) {
        // Si la columna ya existe se ignora el error sin hacer nada
      }
    }

    // Columnas agregadas en versiones posteriores del schema de sesiones
    const sesionesColumnsToAdd = [
      'borg_percepcion INTEGER',
      'episodio_id INTEGER'
    ];
    for (const column of sesionesColumnsToAdd) {
      try {
        await tursoClient.execute(`ALTER TABLE sesiones ADD COLUMN ${column}`);
      } catch (error) {
        // Si la columna ya existe se ignora el error sin hacer nada
      }
    }

    // Se insertan los datos iniciales: categorias de gastos, configuraciones por defecto
    // y una correccion de datos legacy. Todos usan INSERT OR IGNORE para ser idem potentes.
    const seedStatements: any[] = [
      // Categorias de gastos por defecto
      { sql: 'INSERT OR IGNORE INTO categorias_gastos (nombre, color) VALUES (?, ?)', args: ['Arriendo', '#ef4444'] },
      { sql: 'INSERT OR IGNORE INTO categorias_gastos (nombre, color) VALUES (?, ?)', args: ['Servicios', '#3b82f6'] },
      { sql: 'INSERT OR IGNORE INTO categorias_gastos (nombre, color) VALUES (?, ?)', args: ['Insumos', '#10b981'] },
      { sql: 'INSERT OR IGNORE INTO categorias_gastos (nombre, color) VALUES (?, ?)', args: ['Materiales', '#f59e0b'] },
      { sql: 'INSERT OR IGNORE INTO categorias_gastos (nombre, color) VALUES (?, ?)', args: ['Otros', '#6b7280'] },
      // Correccion de datos: citas antiguas con estado 'programada' se normalizan a 'pendiente'
      { sql: `UPDATE citas SET estado = 'pendiente' WHERE estado = 'programada'`, args: [] }
    ];

    // Valores iniciales para todas las claves de configuracion del sistema.
    // Se usan INSERT OR IGNORE, asi que si ya existen no se sobreescriben.
    const configDefault = [
      { clave: 'nombre_centro', valor: 'NAGO-KINE', tipo: 'text', categoria: 'general', descripcion: 'Nombre del centro' },
      { clave: 'logo_url', valor: '', tipo: 'image', categoria: 'general', descripcion: 'Logo del centro' },
      { clave: 'direccion', valor: 'Av. Principal 123', tipo: 'text', categoria: 'general', descripcion: 'Dirección' },
      { clave: 'telefono_contacto', valor: '+56 9 4888 1923', tipo: 'text', categoria: 'general', descripcion: 'Teléfono de contacto' },
      { clave: 'email_contacto', valor: 'contacto@nagokine.cl', tipo: 'email', categoria: 'general', descripcion: 'Email de contacto' },
      { clave: 'horario_apertura', valor: '09:00', tipo: 'time', categoria: 'general', descripcion: 'Horario de apertura' },
      { clave: 'horario_cierre', valor: '18:00', tipo: 'time', categoria: 'general', descripcion: 'Horario de cierre' },
      { clave: 'recordatorios_automaticos', valor: 'true', tipo: 'boolean', categoria: 'citas', descripcion: 'Enviar recordatorios automáticos' },
      { clave: 'recordatorios_horas_antes', valor: '24', tipo: 'number', categoria: 'citas', descripcion: 'Horas antes para enviar recordatorio' },
      { clave: 'cancelacion_horas_minimas', valor: '2', tipo: 'number', categoria: 'citas', descripcion: 'Horas mínimas para cancelar' },
      { clave: 'permitir_reagendar', valor: 'true', tipo: 'boolean', categoria: 'citas', descripcion: 'Permitir reagendar citas' },
      { clave: 'metodos_pago', valor: 'Efectivo,Transferencia,Tarjeta', tipo: 'text', categoria: 'pagos', descripcion: 'Métodos de pago aceptados' },
      { clave: 'tarifa_evaluacion', valor: '25000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de evaluación' },
      { clave: 'tarifa_tratamiento', valor: '20000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de tratamiento' },
      { clave: 'tarifa_control', valor: '15000', tipo: 'number', categoria: 'pagos', descripcion: 'Tarifa sesión de control' },
      { clave: 'facturacion_automatica', valor: 'false', tipo: 'boolean', categoria: 'pagos', descripcion: 'Generar facturas automáticamente' },
      { clave: 'moneda', valor: 'CLP', tipo: 'text', categoria: 'pagos', descripcion: 'Moneda' },
      { clave: 'notif_email', valor: 'true', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por email' },
      { clave: 'notif_sms', valor: 'false', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por SMS' },
      { clave: 'notif_whatsapp', valor: 'true', tipo: 'boolean', categoria: 'notificaciones', descripcion: 'Notificaciones por WhatsApp' },
      { clave: 'whatsapp_activo', valor: 'true', tipo: 'boolean', categoria: 'whatsapp', descripcion: 'WhatsApp activado' },
      { clave: 'whatsapp_mensaje_recordatorio', valor: '🏥 *RECORDATORIO DE CITA - {nombre_centro}*\n\nHola {paciente},\n\nTe recordamos tu cita programada:\n\n📅 *Fecha:* {fecha}\n🕐 *Hora:* {hora}\n⏱️ *Duración:* {duracion} minutos\n📋 *Tipo:* {tipo}\n\nPor favor, responde con una de las siguientes opciones:\n\n1️⃣ *CONFIRMAR* - Para confirmar tu asistencia\n2️⃣ *CANCELAR* - Para cancelar la cita\n3️⃣ *REAGENDAR* - Para cambiar la fecha/hora\n\n¡Te esperamos! 💪', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Plantilla de mensaje de recordatorio' },
      { clave: 'whatsapp_mensaje_confirmacion', valor: '✅ *CITA CONFIRMADA*\n\nGracias {paciente}!\nTu cita ha sido confirmada para el {fecha} a las {hora}.\n\nNos vemos pronto! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de confirmación' },
      { clave: 'whatsapp_mensaje_cancelacion', valor: '❌ *CITA CANCELADA*\n\nHola {paciente},\nTu cita ha sido cancelada exitosamente.\n\nSi deseas agendar una nueva cita, contáctanos.\n¡Esperamos verte pronto! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de cancelación' },
      { clave: 'whatsapp_mensaje_reagendamiento', valor: '📅 *REAGENDAR CITA*\n\nPara reagendar tu cita, contáctanos:\n📞 Teléfono: {telefono}\n\n¡Gracias! 🏥', tipo: 'textarea', categoria: 'whatsapp', descripcion: 'Mensaje de reagendamiento' }
    ];

    for (const config of configDefault) {
      seedStatements.push({
        sql: `INSERT OR IGNORE INTO configuraciones (clave, valor, tipo, categoria, descripcion) VALUES (?, ?, ?, ?, ?)`,
        args: [config.clave, config.valor, config.tipo, config.categoria, config.descripcion]
      });
    }

    await retryWithTimeout(() => tursoClient.batch(seedStatements, 'write'));

    dbInitialized = true;
    console.log('Base de datos lista y todas las tablas verificadas.');
  } catch (error) {
    console.error('Error al inicializar la base de datos Turso:', error);
    throw error;
  }
}

// Se inicia automaticamente cuando este modulo se importa en el servidor.
// En el navegador no hace nada porque typeof window !== 'undefined'.
if (typeof window === 'undefined') {
  initDatabase().catch(console.error);
}

export default db;
