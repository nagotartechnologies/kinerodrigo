const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

console.log('🌱 Sembrando datos iniciales...');

// Crear usuario de ejemplo
const passwordHash = bcrypt.hashSync('demo123', 10);

const insertUser = db.prepare(`
  INSERT INTO usuarios (email, password, nombre, apellido, telefono, activo)
  VALUES (?, ?, ?, ?, ?, ?)
`);

try {
  insertUser.run(
    'usuario@kinecitas.com',
    passwordHash,
    'Usuario',
    'Demo',
    '+56912345678',
    1
  );
  console.log('✅ Usuario de ejemplo creado');
  console.log('   Email: usuario@kinecitas.com');
  console.log('   Password: demo123');
} catch (error) {
  if (error.message.includes('UNIQUE')) {
    console.log('ℹ️  Usuario ya existe');
  } else {
    console.error('❌ Error creando usuario:', error.message);
  }
}

db.close();
console.log('🎉 Datos iniciales sembrados exitosamente');
