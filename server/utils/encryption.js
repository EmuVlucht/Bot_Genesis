import crypto from 'crypto';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';
import config from '../config/config.js';

/**
 * Password Hashing dengan Bcrypt
 * Digunakan untuk hash password pengguna sebelum disimpan ke database
 */
export async function hashPassword(password) {
  try {
    if (!password || password.length < 8) {
      throw new Error('Password harus minimal 8 karakter');
    }
    
    const salt = await bcrypt.genSalt(config.encryption.bcryptRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error saat hashing password:', error);
    throw new Error('Gagal mengenkripsi password');
  }
}

/**
 * Verifikasi Password dengan Hash
 * Membandingkan password plaintext dengan hash yang tersimpan
 */
export async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error saat verifikasi password:', error);
    return false;
  }
}

/**
 * Enkripsi Data dengan AES-256
 * Digunakan untuk mengenkripsi password vault dan data sensitif lainnya
 */
export function encryptData(plaintext) {
  try {
    if (!plaintext) {
      throw new Error('Data yang akan dienkripsi tidak boleh kosong');
    }

    // Generate random IV untuk setiap enkripsi
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(config.encryption.aesKey, 'hex');
    
    // Buat cipher dengan AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Gabungkan IV dengan ciphertext (IV:ciphertext)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error saat enkripsi data:', error);
    throw new Error('Gagal mengenkripsi data');
  }
}

/**
 * Dekripsi Data dengan AES-256
 * Mendekripsi data yang telah dienkripsi dengan encryptData()
 */
export function decryptData(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.includes(':')) {
      throw new Error('Format data terenkripsi tidak valid');
    }

    // Pisahkan IV dan ciphertext
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = Buffer.from(config.encryption.aesKey, 'hex');
    
    // Buat decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error saat dekripsi data:', error);
    throw new Error('Gagal mendekripsi data. Pastikan kunci enkripsi benar.');
  }
}

/**
 * Enkripsi untuk Export File
 * Menggunakan key terpisah untuk export/import data
 */
export function encryptExportData(data, customKey = null) {
  try {
    const key = customKey || config.encryption.exportKey;
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    
    // Tambahkan metadata untuk validasi
    const exportPackage = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: encrypted
    };
    
    return JSON.stringify(exportPackage);
  } catch (error) {
    console.error('Error saat enkripsi export data:', error);
    throw new Error('Gagal mengenkripsi data export');
  }
}

/**
 * Dekripsi untuk Import File
 * Mendekripsi file yang diekspor dengan encryptExportData()
 */
export function decryptImportData(encryptedPackage, customKey = null) {
  try {
    const key = customKey || config.encryption.exportKey;
    const packageData = JSON.parse(encryptedPackage);
    
    // Validasi format export
    if (!packageData.version || !packageData.data) {
      throw new Error('Format file import tidak valid');
    }
    
    const decrypted = CryptoJS.AES.decrypt(packageData.data, key);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Gagal mendekripsi. Key salah atau file corrupt.');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error saat dekripsi import data:', error);
    throw new Error('Gagal mendekripsi file import. Pastikan password benar.');
  }
}

/**
 * Generate Master Key Hash
 * Digunakan untuk validasi tambahan saat login
 */
export async function generateMasterKeyHash(username, password) {
  try {
    const combined = `${username}:${password}:${config.jwt.secret}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    return hash;
  } catch (error) {
    console.error('Error saat generate master key hash:', error);
    throw new Error('Gagal membuat master key hash');
  }
}

/**
 * Generate Random Token
 * Untuk refresh tokens, reset tokens, dll
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash Token untuk Penyimpanan
 * Token yang disimpan di database harus di-hash untuk keamanan
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validasi Kekuatan Password
 * Memastikan password memenuhi standar keamanan minimum
 */
export function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password harus minimal ${minLength} karakter`);
  }
  if (!hasUpperCase) {
    errors.push('Password harus mengandung huruf kapital');
  }
  if (!hasLowerCase) {
    errors.push('Password harus mengandung huruf kecil');
  }
  if (!hasNumber) {
    errors.push('Password harus mengandung angka');
  }
  if (!hasSpecialChar) {
    errors.push('Password harus mengandung karakter spesial');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: calculatePasswordStrength(password)
  };
}

/**
 * Kalkulasi Skor Kekuatan Password
 * Returns: weak, medium, strong, very-strong
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  if (/[^\w\s]/.test(password)) score++;
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  if (score <= 7) return 'strong';
  return 'very-strong';
}

/**
 * Sanitize Input Data
 * Membersihkan input dari karakter berbahaya
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 1000); // Limit length
}

export default {
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  encryptExportData,
  decryptImportData,
  generateMasterKeyHash,
  generateSecureToken,
  hashToken,
  validatePasswordStrength,
  sanitizeInput
};