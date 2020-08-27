import validator from 'validator';
import { 
  hashPassword, 
  verifyPassword, 
  generateMasterKeyHash,
  validatePasswordStrength,
  sanitizeInput 
} from '../utils/encryption.js';
import {
  generateAccessToken,
  generateRefreshToken,
  storeSession,
  invalidateSession,
  invalidateAllUserSessions,
  refreshAccessToken
} from '../utils/jwt.js';
import { executeUpdate, getOne, executeQuery } from '../db/database.js';
import { logActivity } from '../utils/logger.js';

/**
 * Register New User
 * Endpoint untuk pendaftaran user baru dengan validasi lengkap
 */
export async function register(req, res) {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validasi input kosong
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Semua field harus diisi'
      });
    }

    // Sanitize input
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);

    // Validasi format email
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Format email tidak valid'
      });
    }

    // Validasi username length
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Username harus antara 3-50 karakter'
      });
    }

    // Validasi username format (alphanumeric dan underscore saja)
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Username hanya boleh mengandung huruf, angka, dan underscore'
      });
    }

    // Validasi password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password dan konfirmasi password tidak cocok'
      });
    }

    // Validasi kekuatan password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password tidak memenuhi syarat keamanan',
        details: passwordValidation.errors
      });
    }

    // Check apakah username sudah digunakan
    const existingUsername = getOne('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'Username sudah digunakan. Silakan pilih username lain.'
      });
    }

    // Check apakah email sudah digunakan
    const existingEmail = getOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.'
      });
    }

    // Hash password dan generate master key
    const passwordHash = await hashPassword(password);
    const masterKeyHash = await generateMasterKeyHash(cleanUsername, password);

    // Insert user baru ke database
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, master_key_hash)
      VALUES (?, ?, ?, ?)
    `;

    const result = executeUpdate(insertQuery, [
      cleanUsername,
      cleanEmail,
      passwordHash,
      masterKeyHash
    ]);

    const userId = result.lastInsertRowid;

    // Log activity
    await logActivity(userId, 'register', 'user', userId, 'Registrasi user baru', req.ip);

    // Generate tokens untuk auto-login setelah register
    const user = { id: userId, username: cleanUsername, email: cleanEmail };
    const accessToken = generateAccessToken(user);
    const refreshTokenData = generateRefreshToken(user);

    // Store session
    await storeSession(
      userId,
      accessToken,
      refreshTokenData.tokenHash,
      req.headers['user-agent'],
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Selamat datang di VaultVerse.',
      data: {
        user: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail
        },
        accessToken: accessToken,
        refreshToken: refreshTokenData.token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mendaftarkan user. Silakan coba lagi.'
    });
  }
}

/**
 * Login User
 * Endpoint untuk autentikasi user dengan username/email dan password
 */
export async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    // Validasi input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/email dan password harus diisi'
      });
    }

    const cleanIdentifier = sanitizeInput(identifier);

    // Cari user berdasarkan username atau email
    const user = getOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [cleanIdentifier, cleanIdentifier]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Username/email atau password salah'
      });
    }

    // Check apakah akun aktif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.'
      });
    }

    // Check apakah akun terkunci
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until);
      const minutesLeft = Math.ceil((unlockTime - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        error: `Akun terkunci karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutesLeft} menit.`
      });
    }

    // Verifikasi password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment login attempts
      const newAttempts = user.login_attempts + 1;
      let updateQuery = 'UPDATE users SET login_attempts = ? WHERE id = ?';
      let params = [newAttempts, user.id];

      // Lock account jika sudah 5 kali gagal
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60000).toISOString(); // 30 menit
        updateQuery = 'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?';
        params = [newAttempts, lockUntil, user.id];
      }

      executeUpdate(updateQuery, params);

      await logActivity(user.id, 'login_failed', 'user', user.id, 'Percobaan login gagal', req.ip);

      return res.status(401).json({
        success: false,
        error: `Username/email atau password salah. Percobaan ke-${newAttempts} dari 5.`
      });
    }

    // Reset login attempts setelah berhasil login
    executeUpdate(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = datetime("now") WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const userData = { id: user.id, username: user.username, email: user.email };
    const accessToken = generateAccessToken(userData);
    const refreshTokenData = generateRefreshToken(userData);

    // Store session
    await storeSession(
      user.id,
      accessToken,
      refreshTokenData.tokenHash,
      req.headers['user-agent'],
      req.ip
    );

    // Log activity
    await logActivity(user.id, 'login', 'user', user.id, 'Login berhasil', req.ip);

    return res.status(200).json({
      success: true,
      message: 'Login berhasil! Selamat datang kembali.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          lastLogin: user.last_login
        },
        accessToken: accessToken,
        refreshToken: refreshTokenData.token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat login. Silakan coba lagi.'
    });
  }
}

/**
 * Logout User
 * Endpoint untuk logout dan invalidasi session
 */
export async function logout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      invalidateSession(token);
      await logActivity(req.user.id, 'logout', 'user', req.user.id, 'User logout', req.ip);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout berhasil. Sampai jumpa!'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat logout'
    });
  }
}

/**
 * Refresh Token
 * Endpoint untuk mendapatkan access token baru menggunakan refresh token
 */
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token tidak ditemukan'
      });
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token berhasil diperbarui',
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memperbarui token'
    });
  }
}

/**
 * Get Current User Profile
 * Endpoint untuk mendapatkan informasi profile user yang sedang login
 */
export async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const user = getOne(
      'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan'
      });
    }

    // Get vault statistics
    const stats = getOne(
      'SELECT COUNT(*) as total_accounts FROM accounts WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        user: user,
        stats: {
          totalAccounts: stats.total_accounts
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil data profile'
    });
  }
}

/**
 * Logout All Devices
 * Endpoint untuk logout dari semua device sekaligus
 */
export async function logoutAll(req, res) {
  try {
    const userId = req.user.id;
    const count = invalidateAllUserSessions(userId);

    await logActivity(userId, 'logout_all', 'user', userId, `Logout dari ${count} device`, req.ip);

    return res.status(200).json({
      success: true,
      message: `Berhasil logout dari ${count} device`
    });

  } catch (error) {
    console.error('Logout all error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat logout dari semua device'
    });
  }
}

export default {
  register,
  login,
  logout,
  refresh,
  getProfile,
  logoutAll
};