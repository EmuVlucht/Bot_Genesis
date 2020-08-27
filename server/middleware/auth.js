import { verifyAccessToken, validateSession } from '../utils/jwt.js';
import { getOne } from '../db/database.js';

/**
 * Authentication Middleware
 * Memvalidasi JWT token dan memastikan user terautentikasi
 */
export function authenticateToken(req, res, next) {
  try {
    // Extract token dari Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.'
      });
    }

    // Verify JWT token
    const verification = verifyAccessToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        error: verification.error
      });
    }

    // Validate session in database
    const sessionValidation = validateSession(token);

    if (!sessionValidation.valid) {
      return res.status(401).json({
        success: false,
        error: sessionValidation.error
      });
    }

    // Attach user info to request object
    req.user = {
      id: verification.decoded.userId,
      username: verification.decoded.username,
      email: verification.decoded.email
    };

    req.session = sessionValidation.session;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memverifikasi autentikasi'
    });
  }
}

/**
 * Optional Authentication Middleware
 * Tidak wajib login, tapi jika ada token akan divalidasi
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const verification = verifyAccessToken(token);
      
      if (verification.valid) {
        req.user = {
          id: verification.decoded.userId,
          username: verification.decoded.username,
          email: verification.decoded.email
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

/**
 * Check Account Ownership Middleware
 * Memastikan user hanya bisa akses data miliknya sendiri
 */
export async function checkAccountOwnership(req, res, next) {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'ID akun tidak valid'
      });
    }

    // Check if account belongs to user
    const account = getOne(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Akun tidak ditemukan atau Anda tidak memiliki akses'
      });
    }

    req.account = account;
    next();
  } catch (error) {
    console.error('Account ownership check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memverifikasi kepemilikan akun'
    });
  }
}

/**
 * Rate Limiting Middleware
 * Membatasi jumlah request untuk mencegah abuse
 */
const requestCounts = new Map();

export function rateLimiter(maxRequests = 100, windowMs = 900000) {
  return (req, res, next) => {
    try {
      const identifier = req.user ? req.user.id : req.ip;
      const now = Date.now();
      
      if (!requestCounts.has(identifier)) {
        requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const userLimit = requestCounts.get(identifier);

      if (now > userLimit.resetTime) {
        // Reset counter jika window sudah lewat
        requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (userLimit.count >= maxRequests) {
        const resetIn = Math.ceil((userLimit.resetTime - now) / 1000 / 60);
        return res.status(429).json({
          success: false,
          error: `Terlalu banyak request. Silakan coba lagi dalam ${resetIn} menit.`
        });
      }

      userLimit.count++;
      requestCounts.set(identifier, userLimit);
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Allow request to proceed on error
    }
  };
}

/**
 * Login Attempt Limiter
 * Khusus untuk endpoint login, lebih ketat
 */
export function loginRateLimiter(req, res, next) {
  const maxAttempts = 5;
  const windowMs = 900000; // 15 menit

  const identifier = req.body.username || req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(`login:${identifier}`)) {
    requestCounts.set(`login:${identifier}`, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const attempts = requestCounts.get(`login:${identifier}`);

  if (now > attempts.resetTime) {
    requestCounts.set(`login:${identifier}`, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (attempts.count >= maxAttempts) {
    const resetIn = Math.ceil((attempts.resetTime - now) / 1000 / 60);
    return res.status(429).json({
      success: false,
      error: `Terlalu banyak percobaan login. Akun dikunci selama ${resetIn} menit.`
    });
  }

  attempts.count++;
  requestCounts.set(`login:${identifier}`, attempts);
  next();
}

/**
 * Validate User Status
 * Memastikan user aktif dan tidak di-ban
 */
export function validateUserStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const user = getOne('SELECT is_active, locked_until FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.'
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until);
      return res.status(403).json({
        success: false,
        error: `Akun Anda terkunci hingga ${unlockTime.toLocaleString('id-ID')}`
      });
    }

    next();
  } catch (error) {
    console.error('User status validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memvalidasi status user'
    });
  }
}

export default {
  authenticateToken,
  optionalAuth,
  checkAccountOwnership,
  rateLimiter,
  loginRateLimiter,
  validateUserStatus
};