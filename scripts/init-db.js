const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'database.db');

// Eliminar base de datos existente si existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Base de datos anterior eliminada');
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('📦 Creando tablas...');

// Crear tablas
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

db.exec(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rut TEXT UNIQUE NOT NULL,
    telefono TEXT NOT NULL,
    edad INTEGER NOT NULL,
    altura INTEGER NOT NULL,
    peso REAL NOT NULL,
    ocupacion TEXT,
    enfermedades TEXT,
    enfermedades_hereditarias TEXT,
    deportes TEXT,
    alimentacion TEXT,
    consumo_agua TEXT,
    descanso TEXT,
    psicologicamente TEXT,
    digestion TEXT,
    lesion_consulta TEXT NOT NULL,
    objetivo_paciente TEXT NOT NULL,
    evaluacion_fisica TEXT,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    duracion INTEGER DEFAULT 60,
    tipo TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    motivo TEXT,
    observaciones TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )
`);

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

console.log('✅ Tablas creadas correctamente');

db.close();
console.log('🎉 Base de datos inicializada exitosamente');
