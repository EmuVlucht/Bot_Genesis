import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Validasi environment variables yang wajib ada
const requiredEnvVars = [
  'JWT_SECRET',
  'AES_ENCRYPTION_KEY',
  'PORT'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} tidak ditemukan. Pastikan file .env sudah dikonfigurasi dengan benar.`);
  }
});

// Validasi panjang key untuk keamanan
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET harus minimal 32 karakter untuk keamanan optimal');
}

if (process.env.AES_ENCRYPTION_KEY.length < 32) {
  throw new Error('AES_ENCRYPTION_KEY harus 32 karakter (256-bit) untuk AES-256');
}

const config = {
  // Server settings
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Database settings
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    mongoUri: process.env.MONGODB_URI,
    sqlitePath: process.env.SQLITE_PATH || './db/vaultverse.db'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  // Encryption configuration
  encryption: {
    aesKey: process.env.AES_ENCRYPTION_KEY,
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    exportKey: process.env.EXPORT_ENCRYPTION_KEY || process.env.AES_ENCRYPTION_KEY
  },
  
  // Security settings
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 menit
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 1800000, // 30 menit
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000 // 1 jam
  },
  
  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true'
  }
};

// Helper function: Generate random encryption key
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function: Generate JWT secret
export function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Fungsi untuk menampilkan konfigurasi saat startup (tanpa data sensitif)
export function displayConfig() {
  console.log('📋 Konfigurasi VaultVerse:');
  console.log(`   Environment: ${config.env}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database.type}`);
  console.log(`   JWT Expiry: ${config.jwt.expiresIn}`);
  console.log(`   Rate Limit: ${config.security.rateLimitMax} requests per ${config.security.rateLimitWindow / 60000} menit`);
}

export default config;