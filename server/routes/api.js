import express from 'express';
import authController from '../controllers/authController.js';
import accountsController from '../controllers/accountsController.js';
import exportController from '../controllers/exportController.js';
import { 
  authenticateToken, 
  checkAccountOwnership, 
  loginRateLimiter,
  rateLimiter,
  validateUserStatus 
} from '../middleware/auth.js';

const router = express.Router();

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Public routes (tidak perlu autentikasi)
router.post('/auth/register', loginRateLimiter, authController.register);
router.post('/auth/login', loginRateLimiter, authController.login);
router.post('/auth/refresh', authController.refresh);

// Protected routes (perlu autentikasi)
router.post('/auth/logout', authenticateToken, authController.logout);
router.post('/auth/logout-all', authenticateToken, validateUserStatus, authController.logoutAll);
router.get('/auth/profile', authenticateToken, validateUserStatus, authController.getProfile);

// ============================================
// VAULT ACCOUNTS ROUTES
// ============================================

// GET /accounts - Mendapatkan semua vault accounts
router.get(
  '/accounts',
  authenticateToken,
  validateUserStatus,
  rateLimiter(200, 900000),
  accountsController.getAllAccounts
);

// GET /accounts/:id - Mendapatkan detail account tertentu
router.get(
  '/accounts/:id',
  authenticateToken,
  validateUserStatus,
  checkAccountOwnership,
  accountsController.getAccountById
);

// POST /accounts - Menambahkan account baru
router.post(
  '/accounts',
  authenticateToken,
  validateUserStatus,
  rateLimiter(100, 900000),
  accountsController.createAccount
);

// PUT /accounts/:id - Mengupdate account
router.put(
  '/accounts/:id',
  authenticateToken,
  validateUserStatus,
  checkAccountOwnership,
  accountsController.updateAccount
);

// DELETE /accounts/:id - Menghapus account
router.delete(
  '/accounts/:id',
  authenticateToken,
  validateUserStatus,
  checkAccountOwnership,
  accountsController.deleteAccount
);

// GET /accounts/categories - Mendapatkan daftar kategori
router.get(
  '/categories',
  authenticateToken,
  validateUserStatus,
  accountsController.getCategories
);

// ============================================
// EXPORT & IMPORT ROUTES
// ============================================

// POST /export - Export vault data
router.post(
  '/export',
  authenticateToken,
  validateUserStatus,
  rateLimiter(10, 3600000), // Max 10 export per jam
  exportController.exportVault
);

// POST /import - Import vault data
router.post(
  '/import',
  authenticateToken,
  validateUserStatus,
  rateLimiter(10, 3600000), // Max 10 import per jam
  exportController.importVault
);

// POST /import/validate - Validate import file
router.post(
  '/import/validate',
  authenticateToken,
  validateUserStatus,
  exportController.validateImportFile
);

// GET /export/history - Get export history
router.get(
  '/export/history',
  authenticateToken,
  validateUserStatus,
  exportController.getExportHistory
);

// ============================================
// HEALTH CHECK & INFO ROUTES
// ============================================

// GET /health - Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VaultVerse API',
    version: '1.0.0'
  });
});

// GET /info - API information
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'VaultVerse API',
      version: '1.0.0',
      description: 'Secure Password Vault Management System',
      endpoints: {
        auth: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/logout',
          'POST /api/auth/refresh',
          'GET /api/auth/profile'
        ],
        accounts: [
          'GET /api/accounts',
          'GET /api/accounts/:id',
          'POST /api/accounts',
          'PUT /api/accounts/:id',
          'DELETE /api/accounts/:id'
        ],
        export: [
          'POST /api/export',
          'POST /api/import',
          'POST /api/import/validate'
        ]
      }
    }
  });
});

// 404 handler untuk routes yang tidak ada
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint tidak ditemukan'
  });
});

export default router;