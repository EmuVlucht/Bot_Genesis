import validator from 'validator';
import { encryptData, decryptData, sanitizeInput } from '../utils/encryption.js';
import { executeUpdate, getOne, executeQuery } from '../db/database.js';
import { logActivity } from '../utils/logger.js';

/**
 * Get All Accounts for Current User
 * Endpoint untuk mengambil semua vault accounts milik user dengan optional filtering
 */
export async function getAllAccounts(req, res) {
  try {
    const userId = req.user.id;
    const { search, category, favorite } = req.query;

    let query = `
      SELECT 
        id, site_name, site_url, username, email,
        category, is_favorite, created_at, updated_at, last_accessed
      FROM accounts
      WHERE user_id = ?
    `;

    const params = [userId];

    // Apply search filter jika ada
    if (search) {
      query += ` AND (site_name LIKE ? OR email LIKE ? OR username LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Apply category filter
    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }

    // Apply favorite filter
    if (favorite === 'true') {
      query += ` AND is_favorite = 1`;
    }

    query += ` ORDER BY site_name ASC`;

    const accounts = executeQuery(query, params);

    // Password tidak disertakan dalam list untuk keamanan
    // User harus request detail account untuk melihat password

    await logActivity(
      userId, 
      'view_accounts', 
      'accounts', 
      null, 
      `Melihat ${accounts.length} akun`, 
      req.ip
    );

    return res.status(200).json({
      success: true,
      data: {
        accounts: accounts,
        total: accounts.length
      }
    });

  } catch (error) {
    console.error('Get all accounts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil data akun'
    });
  }
}

/**
 * Get Single Account Detail
 * Endpoint untuk mengambil detail lengkap termasuk password yang terdekripsi
 */
export async function getAccountById(req, res) {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    const account = getOne(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Akun tidak ditemukan'
      });
    }

    // Dekripsi password dan notes
    try {
      account.password = decryptData(account.password_encrypted);
      
      if (account.notes_encrypted) {
        account.notes = decryptData(account.notes_encrypted);
      }
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({
        success: false,
        error: 'Gagal mendekripsi data. Kunci enkripsi mungkin berubah.'
      });
    }

    // Hapus field encrypted dari response
    delete account.password_encrypted;
    delete account.notes_encrypted;

    // Update last accessed timestamp
    executeUpdate(
      'UPDATE accounts SET last_accessed = datetime("now") WHERE id = ?',
      [accountId]
    );

    await logActivity(
      userId, 
      'view_account_detail', 
      'account', 
      accountId, 
      `Melihat detail akun: ${account.site_name}`, 
      req.ip
    );

    return res.status(200).json({
      success: true,
      data: { account }
    });

  } catch (error) {
    console.error('Get account by ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil detail akun'
    });
  }
}

/**
 * Create New Account
 * Endpoint untuk menambahkan vault account baru dengan enkripsi
 */
export async function createAccount(req, res) {
  try {
    const userId = req.user.id;
    const { siteName, siteUrl, username, email, password, notes, category } = req.body;

    // Validasi required fields
    if (!siteName || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nama situs dan password wajib diisi'
      });
    }

    // Sanitize inputs
    const cleanSiteName = sanitizeInput(siteName);
    const cleanSiteUrl = siteUrl ? sanitizeInput(siteUrl) : null;
    const cleanUsername = username ? sanitizeInput(username) : null;
    const cleanEmail = email ? sanitizeInput(email) : null;
    const cleanCategory = category ? sanitizeInput(category) : 'general';

    // Validasi email jika diisi
    if (cleanEmail && !validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Format email tidak valid'
      });
    }

    // Validasi URL jika diisi
    if (cleanSiteUrl && !validator.isURL(cleanSiteUrl, { require_protocol: false })) {
      return res.status(400).json({
        success: false,
        error: 'Format URL tidak valid'
      });
    }

    // Enkripsi password dan notes
    let encryptedPassword, encryptedNotes = null;
    
    try {
      encryptedPassword = encryptData(password);
      
      if (notes) {
        encryptedNotes = encryptData(notes);
      }
    } catch (encryptError) {
      console.error('Encryption error:', encryptError);
      return res.status(500).json({
        success: false,
        error: 'Gagal mengenkripsi data'
      });
    }

    // Insert account ke database
    const insertQuery = `
      INSERT INTO accounts (
        user_id, site_name, site_url, username, email,
        password_encrypted, notes_encrypted, category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = executeUpdate(insertQuery, [
      userId,
      cleanSiteName,
      cleanSiteUrl,
      cleanUsername,
      cleanEmail,
      encryptedPassword,
      encryptedNotes,
      cleanCategory
    ]);

    const accountId = result.lastInsertRowid;

    await logActivity(
      userId,
      'create_account',
      'account',
      accountId,
      `Menambahkan akun baru: ${cleanSiteName}`,
      req.ip
    );

    // Get created account (tanpa password untuk response)
    const newAccount = getOne(
      `SELECT 
        id, site_name, site_url, username, email,
        category, is_favorite, created_at, updated_at
      FROM accounts WHERE id = ?`,
      [accountId]
    );

    return res.status(201).json({
      success: true,
      message: 'Akun berhasil ditambahkan ke vault',
      data: { account: newAccount }
    });

  } catch (error) {
    console.error('Create account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat menambahkan akun'
    });
  }
}

/**
 * Update Account
 * Endpoint untuk mengupdate data account yang sudah ada
 */
export async function updateAccount(req, res) {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;
    const { siteName, siteUrl, username, email, password, notes, category, isFavorite } = req.body;

    // Check ownership
    const existingAccount = getOne(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: 'Akun tidak ditemukan'
      });
    }

    // Prepare update fields
    const updates = [];
    const params = [];

    if (siteName !== undefined) {
      updates.push('site_name = ?');
      params.push(sanitizeInput(siteName));
    }

    if (siteUrl !== undefined) {
      const cleanUrl = siteUrl ? sanitizeInput(siteUrl) : null;
      if (cleanUrl && !validator.isURL(cleanUrl, { require_protocol: false })) {
        return res.status(400).json({
          success: false,
          error: 'Format URL tidak valid'
        });
      }
      updates.push('site_url = ?');
      params.push(cleanUrl);
    }

    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username ? sanitizeInput(username) : null);
    }

    if (email !== undefined) {
      const cleanEmail = email ? sanitizeInput(email) : null;
      if (cleanEmail && !validator.isEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Format email tidak valid'
        });
      }
      updates.push('email = ?');
      params.push(cleanEmail);
    }

    if (password !== undefined) {
      try {
        const encryptedPassword = encryptData(password);
        updates.push('password_encrypted = ?');
        params.push(encryptedPassword);
      } catch (encryptError) {
        return res.status(500).json({
          success: false,
          error: 'Gagal mengenkripsi password baru'
        });
      }
    }

    if (notes !== undefined) {
      try {
        const encryptedNotes = notes ? encryptData(notes) : null;
        updates.push('notes_encrypted = ?');
        params.push(encryptedNotes);
      } catch (encryptError) {
        return res.status(500).json({
          success: false,
          error: 'Gagal mengenkripsi catatan'
        });
      }
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(sanitizeInput(category));
    }

    if (isFavorite !== undefined) {
      updates.push('is_favorite = ?');
      params.push(isFavorite ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada data yang diupdate'
      });
    }

    // Execute update
    params.push(accountId);
    const updateQuery = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`;
    executeUpdate(updateQuery, params);

    await logActivity(
      userId,
      'update_account',
      'account',
      accountId,
      `Mengupdate akun: ${existingAccount.site_name}`,
      req.ip
    );

    // Get updated account
    const updatedAccount = getOne(
      `SELECT 
        id, site_name, site_url, username, email,
        category, is_favorite, created_at, updated_at
      FROM accounts WHERE id = ?`,
      [accountId]
    );

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil diupdate',
      data: { account: updatedAccount }
    });

  } catch (error) {
    console.error('Update account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengupdate akun'
    });
  }
}

/**
 * Delete Account
 * Endpoint untuk menghapus account dari vault
 */
export async function deleteAccount(req, res) {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    // Check ownership
    const account = getOne(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Akun tidak ditemukan'
      });
    }

    // Delete account
    executeUpdate('DELETE FROM accounts WHERE id = ?', [accountId]);

    await logActivity(
      userId,
      'delete_account',
      'account',
      accountId,
      `Menghapus akun: ${account.site_name}`,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: 'Akun berhasil dihapus dari vault'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus akun'
    });
  }
}

/**
 * Get Categories
 * Endpoint untuk mendapatkan daftar kategori yang digunakan user
 */
export async function getCategories(req, res) {
  try {
    const userId = req.user.id;

    const categories = executeQuery(
      `SELECT DISTINCT category, COUNT(*) as count
       FROM accounts 
       WHERE user_id = ?
       GROUP BY category
       ORDER BY count DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil kategori'
    });
  }
}

export default {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getCategories
};