import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { generateSecureToken, hashToken } from './encryption.js';
import { executeUpdate, executeQuery, getOne } from '../db/database.js';

/**
 * Generate Access Token (JWT)
 * Token ini digunakan untuk autentikasi setiap request API
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    type: 'access'
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'vaultverse-api',
    audience: 'vaultverse-client'
  });
}

/**
 * Generate Refresh Token
 * Token untuk mendapatkan access token baru tanpa login ulang
 */
export function generateRefreshToken(user) {
  const token = generateSecureToken(64);
  const tokenHash = hashToken(token);
  
  const payload = {
    userId: user.id,
    tokenHash: tokenHash,
    type: 'refresh'
  };

  const jwtToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'vaultverse-api',
    audience: 'vaultverse-client'
  });

  return { token: jwtToken, tokenHash: tokenHash };
}

/**
 * Verify Access Token
 * Memvalidasi JWT token dan mengembalikan payload jika valid
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'vaultverse-api',
      audience: 'vaultverse-client'
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return { valid: true, decoded: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token telah kadaluarsa' };
    } else if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Token tidak valid' };
    } else {
      return { valid: false, error: 'Gagal memverifikasi token' };
    }
  }
}

/**
 * Verify Refresh Token
 * Memvalidasi refresh token untuk generate access token baru
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'vaultverse-api',
      audience: 'vaultverse-client'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return { valid: true, decoded: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Refresh token telah kadaluarsa. Silakan login kembali.' };
    } else {
      return { valid: false, error: 'Refresh token tidak valid' };
    }
  }
}

/**
 * Store Session in Database
 * Menyimpan informasi session untuk tracking dan invalidation
 */
export async function storeSession(userId, accessToken, refreshTokenHash, deviceInfo = null, ipAddress = null) {
  try {
    const decoded = jwt.decode(accessToken);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    const tokenHash = hashToken(accessToken);

    const query = `
      INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at, device_info, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = executeUpdate(query, [
      userId,
      tokenHash,
      refreshTokenHash,
      expiresAt,
      deviceInfo ? JSON.stringify(deviceInfo) : null,
      ipAddress
    ]);

    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error storing session:', error);
    throw new Error('Gagal menyimpan session');
  }
}

/**
 * Validate Session
 * Memeriksa apakah session masih valid di database
 */
export function validateSession(token) {
  try {
    const tokenHash = hashToken(token);
    
    const query = `
      SELECT s.*, u.username, u.email, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? 
        AND s.is_valid = 1 
        AND s.expires_at > datetime('now')
        AND u.is_active = 1
    `;

    const session = getOne(query, [tokenHash]);

    if (!session) {
      return { valid: false, error: 'Session tidak ditemukan atau telah kadaluarsa' };
    }

    // Update last activity
    executeUpdate(
      'UPDATE sessions SET last_activity = datetime("now") WHERE id = ?',
      [session.id]
    );

    return { valid: true, session: session };
  } catch (error) {
    console.error('Error validating session:', error);
    return { valid: false, error: 'Gagal memvalidasi session' };
  }
}

/**
 * Invalidate Session (Logout)
 * Menandai session sebagai invalid untuk logout
 */
export function invalidateSession(token) {
  try {
    const tokenHash = hashToken(token);
    
    const result = executeUpdate(
      'UPDATE sessions SET is_valid = 0 WHERE token_hash = ?',
      [tokenHash]
    );

    return result.changes > 0;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
}

/**
 * Invalidate All User Sessions
 * Logout dari semua device
 */
export function invalidateAllUserSessions(userId) {
  try {
    const result = executeUpdate(
      'UPDATE sessions SET is_valid = 0 WHERE user_id = ? AND is_valid = 1',
      [userId]
    );

    return result.changes;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    return 0;
  }
}

/**
 * Clean Expired Sessions
 * Menghapus session yang sudah kadaluarsa dari database
 */
export function cleanExpiredSessions() {
  try {
    const result = executeUpdate(
      `DELETE FROM sessions WHERE expires_at < datetime('now') OR is_valid = 0`
    );

    if (result.changes > 0) {
      console.log(`🧹 Membersihkan ${result.changes} expired sessions`);
    }

    return result.changes;
  } catch (error) {
    console.error('Error cleaning expired sessions:', error);
    return 0;
  }
}

/**
 * Get Active Sessions for User
 * Mendapatkan daftar session aktif untuk monitoring
 */
export function getUserActiveSessions(userId) {
  try {
    const query = `
      SELECT 
        id,
        created_at,
        last_activity,
        expires_at,
        device_info,
        ip_address
      FROM sessions
      WHERE user_id = ? AND is_valid = 1 AND expires_at > datetime('now')
      ORDER BY last_activity DESC
    `;

    return executeQuery(query, [userId]);
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

/**
 * Refresh Access Token
 * Menggunakan refresh token untuk mendapatkan access token baru
 */
export async function refreshAccessToken(refreshToken) {
  try {
    const verification = verifyRefreshToken(refreshToken);
    
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const decoded = verification.decoded;
    
    // Validasi refresh token di database
    const session = getOne(
      `SELECT * FROM sessions WHERE refresh_token_hash = ? AND is_valid = 1`,
      [decoded.tokenHash]
    );

    if (!session) {
      return { success: false, error: 'Refresh token tidak valid atau telah dicabut' };
    }

    // Get user data
    const user = getOne('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);
    
    if (!user) {
      return { success: false, error: 'User tidak ditemukan atau tidak aktif' };
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    const newTokenHash = hashToken(newAccessToken);

    // Update session dengan token baru
    executeUpdate(
      `UPDATE sessions SET token_hash = ?, expires_at = datetime('now', '+7 days') WHERE id = ?`,
      [newTokenHash, session.id]
    );

    return {
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return { success: false, error: 'Gagal memperbarui token' };
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  cleanExpiredSessions,
  getUserActiveSessions,
  refreshAccessToken
};