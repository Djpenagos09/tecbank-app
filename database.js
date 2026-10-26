const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tecbank.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite TecBank.');
  }
});

db.serialize(() => {
  // 1. Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '0000000000',
      password TEXT NOT NULL,
      accountNumber TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 4250000,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Recrear tabla de transferencias sin restricciones bloqueantes
  db.run(`DROP TABLE IF EXISTS transfers`);
  db.run(`
    CREATE TABLE transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL,
      senderId INTEGER,
      senderUsername TEXT,
      senderName TEXT,
      senderAccountNumber TEXT,
      receiverId INTEGER,
      receiverUsername TEXT,
      receiverName TEXT,
      receiverAccountNumber TEXT,
      amount REAL NOT NULL,
      concept TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;