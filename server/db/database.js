import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

// Inisialisasi SQLite database
export function initializeSQLite() {
  try {
    // Pastikan direktori db ada
    const dbDir = path.dirname(config.database.sqlitePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Buat koneksi database
    db = new Database(config.database.sqlitePath);
    
    // Enable foreign keys dan WAL mode untuk performa
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    
    console.log('✅ SQLite database terhubung:', config.database.sqlitePath);

    // Jalankan schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split dan execute setiap statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    statements.forEach(statement => {
      try {
        db.exec(statement);
      } catch (err) {
        // Skip error jika table/index sudah ada
        if (!err.message.includes('already exists')) {
          console.warn('Warning saat execute statement:', err.message);
        }
      }
    });

    console.log('✅ Database schema berhasil diinisialisasi');
    
    return db;
  } catch (error) {
    console.error('❌ Error inisialisasi SQLite:', error);
    throw error;
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database belum diinisialisasi. Panggil initializeSQLite() terlebih dahulu.');
  }
  return db;
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close();
    console.log('✅ Database connection ditutup');
  }
}

// Helper: Execute prepared statement dengan error handling
export function executeQuery(query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.all(params);
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Helper: Execute single insert/update/delete
export function executeUpdate(query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.run(params);
  } catch (error) {
    console.error('Update error:', error.message);
    throw error;
  }
}

// Helper: Get single row
export function getOne(query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.get(params);
  } catch (error) {
    console.error('Get one error:', error.message);
    throw error;
  }
}

// Transaction wrapper untuk operasi multi-step
export function transaction(callback) {
  const transact = db.transaction(callback);
  return transact;
}

// Database health check
export function healthCheck() {
  try {
    const result = db.prepare('SELECT 1 as health').get();
    return result.health === 1;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Get database statistics
export function getDatabaseStats() {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_valid = 1').get();
    
    return {
      totalUsers: userCount.count,
      totalAccounts: accountCount.count,
      activeSessions: sessionCount.count,
      databaseSize: fs.statSync(config.database.sqlitePath).size,
      healthy: true
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { healthy: false, error: error.message };
  }
}

export default {
  initializeSQLite,
  getDatabase,
  closeDatabase,
  executeQuery,
  executeUpdate,
  getOne,
  transaction,
  healthCheck,
  getDatabaseStats
};