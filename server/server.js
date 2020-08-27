import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config, { displayConfig } from './config/config.js';
import { initializeSQLite, closeDatabase, healthCheck } from './db/database.js';
import { cleanExpiredSessions } from './utils/jwt.js';
import { cleanOldLogs } from './utils/logger.js';
import apiRoutes from './routes/api.js';

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ============================================
// CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600
};

app.use(cors(corsOptions));

// ============================================
// GENERAL MIDDLEWARE
// ============================================

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.logging.enableRequestLogging) {
  app.use(morgan('combined'));
}

// Request ID middleware untuk tracking
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ============================================
// API ROUTES
// ============================================

app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Selamat datang di VaultVerse API',
    version: '1.0.0',
    documentation: '/api/info',
    health: '/api/health'
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' 
    ? 'Terjadi kesalahan internal server' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.id,
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// 404 handler untuk non-API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route tidak ditemukan',
    path: req.path
  });
});

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeDatabase() {
  try {
    console.log('🔧 Menginisialisasi database...');
    
    if (config.database.type === 'sqlite') {
      initializeSQLite();
    } else {
      throw new Error('Database type tidak didukung. Gunakan sqlite.');
    }

    const isHealthy = healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check gagal');
    }

    console.log('✅ Database siap digunakan\n');
    return true;
  } catch (error) {
    console.error('❌ Gagal menginisialisasi database:', error);
    return false;
  }
}

// ============================================
// MAINTENANCE TASKS
// ============================================

function scheduleMaintenance() {
  console.log('⏰ Menjadwalkan maintenance tasks...\n');

  setInterval(() => {
    console.log('🧹 Menjalankan maintenance: membersihkan expired sessions...');
    cleanExpiredSessions();
  }, 3600000);

  setInterval(() => {
    console.log('🧹 Menjalankan maintenance: membersihkan old logs...');
    cleanOldLogs(90);
  }, 86400000);
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      closeDatabase();
      console.log('✅ Database connection closed');
      
      console.log('👋 VaultVerse API shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    console.log('\n═══════════════════════════════════════════');
    console.log('🔐 VaultVerse - Secure Password Vault');
    console.log('═══════════════════════════════════════════\n');

    displayConfig();
    console.log('');

    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      throw new Error('Database initialization failed');
    }

    const server = app.listen(config.port, () => {
      console.log('═══════════════════════════════════════════');
      console.log(`✅ Server berjalan di port ${config.port}`);
      console.log(`🌐 URL: http://localhost:${config.port}`);
      console.log(`📡 API: http://localhost:${config.port}/api`);
      console.log(`🏥 Health: http://localhost:${config.port}/api/health`);
      console.log('═══════════════════════════════════════════\n');
      console.log('Server siap menerima request...\n');
    });

    scheduleMaintenance();
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('❌ Fatal error saat startup server:', error);
    process.exit(1);
  }
}

startServer();

export default app;