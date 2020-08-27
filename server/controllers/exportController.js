import { decryptData, encryptExportData, decryptImportData } from '../utils/encryption.js';
import { executeQuery, executeUpdate, transaction } from '../db/database.js';
import { logActivity } from '../utils/logger.js';

/**
 * Export Vault Data
 * Endpoint untuk mengekspor semua vault accounts dalam format JSON terenkripsi
 */
export async function exportVault(req, res) {
  try {
    const userId = req.user.id;
    const { exportPassword } = req.body;

    // Validasi export password
    if (!exportPassword || exportPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password export harus minimal 8 karakter untuk keamanan'
      });
    }

    // Get all accounts milik user
    const accounts = executeQuery(
      `SELECT 
        site_name, site_url, username, email,
        password_encrypted, notes_encrypted, category,
        is_favorite, created_at
      FROM accounts 
      WHERE user_id = ?
      ORDER BY site_name ASC`,
      [userId]
    );

    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada akun untuk diekspor. Vault Anda masih kosong.'
      });
    }

    // Dekripsi semua password untuk export
    const decryptedAccounts = accounts.map(account => {
      try {
        return {
          siteName: account.site_name,
          siteUrl: account.site_url,
          username: account.username,
          email: account.email,
          password: decryptData(account.password_encrypted),
          notes: account.notes_encrypted ? decryptData(account.notes_encrypted) : null,
          category: account.category,
          isFavorite: account.is_favorite === 1,
          createdAt: account.created_at
        };
      } catch (decryptError) {
        console.error('Error decrypting account during export:', decryptError);
        return null;
      }
    }).filter(acc => acc !== null);

    // Prepare export data dengan metadata
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      totalAccounts: decryptedAccounts.length,
      accounts: decryptedAccounts
    };

    // Enkripsi export data dengan password yang diberikan user
    let encryptedExport;
    try {
      encryptedExport = encryptExportData(exportData, exportPassword);
    } catch (encryptError) {
      console.error('Error encrypting export:', encryptError);
      return res.status(500).json({
        success: false,
        error: 'Gagal mengenkripsi data export'
      });
    }

    await logActivity(
      userId,
      'export_vault',
      'vault',
      null,
      `Mengekspor ${decryptedAccounts.length} akun`,
      req.ip
    );

    // Generate filename dengan timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `vaultverse-backup-${timestamp}.json`;

    return res.status(200).json({
      success: true,
      message: `Berhasil mengekspor ${decryptedAccounts.length} akun`,
      data: {
        filename: filename,
        exportData: encryptedExport,
        totalAccounts: decryptedAccounts.length,
        exportedAt: exportData.exportedAt
      }
    });

  } catch (error) {
    console.error('Export vault error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengekspor vault'
    });
  }
}

/**
 * Import Vault Data
 * Endpoint untuk mengimpor data vault dari file backup terenkripsi
 */
export async function importVault(req, res) {
  try {
    const userId = req.user.id;
    const { importData, importPassword, mergeMode } = req.body;

    // Validasi input
    if (!importData || !importPassword) {
      return res.status(400).json({
        success: false,
        error: 'Data import dan password harus diisi'
      });
    }

    // Dekripsi import data
    let decryptedData;
    try {
      decryptedData = decryptImportData(importData, importPassword);
    } catch (decryptError) {
      console.error('Error decrypting import:', decryptError);
      return res.status(400).json({
        success: false,
        error: 'Gagal mendekripsi file import. Password salah atau file rusak.'
      });
    }

    // Validasi struktur data
    if (!decryptedData.accounts || !Array.isArray(decryptedData.accounts)) {
      return res.status(400).json({
        success: false,
        error: 'Format file import tidak valid'
      });
    }

    const accountsToImport = decryptedData.accounts;

    if (accountsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File import tidak mengandung akun untuk diimpor'
      });
    }

    // Mode import: replace (hapus semua lalu import) atau merge (tambahkan saja)
    const shouldReplace = mergeMode === 'replace';

    // Gunakan transaction untuk atomicity
    const importTransaction = transaction((accounts, shouldClear) => {
      let importedCount = 0;
      let skippedCount = 0;
      let errors = [];

      // Hapus semua akun existing jika mode replace
      if (shouldClear) {
        const deleteResult = executeUpdate('DELETE FROM accounts WHERE user_id = ?', [userId]);
        console.log(`Deleted ${deleteResult.changes} existing accounts`);
      }

      // Import setiap account
      for (const account of accounts) {
        try {
          // Validasi required fields
          if (!account.siteName || !account.password) {
            skippedCount++;
            errors.push(`Skipped account: missing required fields`);
            continue;
          }

          // Enkripsi password dan notes untuk storage
          const encryptedPassword = encryptData(account.password);
          const encryptedNotes = account.notes ? encryptData(account.notes) : null;

          // Insert ke database
          const insertQuery = `
            INSERT INTO accounts (
              user_id, site_name, site_url, username, email,
              password_encrypted, notes_encrypted, category, is_favorite
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          executeUpdate(insertQuery, [
            userId,
            account.siteName,
            account.siteUrl || null,
            account.username || null,
            account.email || null,
            encryptedPassword,
            encryptedNotes,
            account.category || 'general',
            account.isFavorite ? 1 : 0
          ]);

          importedCount++;
        } catch (err) {
          skippedCount++;
          errors.push(`Error importing ${account.siteName}: ${err.message}`);
          console.error('Import account error:', err);
        }
      }

      return { importedCount, skippedCount, errors };
    });

    // Execute transaction
    const result = importTransaction(accountsToImport, shouldReplace);

    await logActivity(
      userId,
      'import_vault',
      'vault',
      null,
      `Mengimpor ${result.importedCount} akun (${result.skippedCount} dilewati)`,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: `Berhasil mengimpor ${result.importedCount} akun`,
      data: {
        imported: result.importedCount,
        skipped: result.skippedCount,
        mode: shouldReplace ? 'replace' : 'merge',
        errors: result.errors.length > 0 ? result.errors : null
      }
    });

  } catch (error) {
    console.error('Import vault error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengimpor vault'
    });
  }
}

/**
 * Validate Import File
 * Endpoint untuk memvalidasi file import sebelum benar-benar diimpor
 */
export async function validateImportFile(req, res) {
  try {
    const { importData, importPassword } = req.body;

    if (!importData || !importPassword) {
      return res.status(400).json({
        success: false,
        error: 'Data import dan password harus diisi'
      });
    }

    // Coba dekripsi untuk validasi
    let decryptedData;
    try {
      decryptedData = decryptImportData(importData, importPassword);
    } catch (decryptError) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Password salah atau file rusak'
      });
    }

    // Validasi struktur
    if (!decryptedData.accounts || !Array.isArray(decryptedData.accounts)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Format file tidak valid'
      });
    }

    // Hitung statistik
    const totalAccounts = decryptedData.accounts.length;
    const categories = [...new Set(decryptedData.accounts.map(a => a.category || 'general'))];
    const favoriteCount = decryptedData.accounts.filter(a => a.isFavorite).length;

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        version: decryptedData.version,
        exportedAt: decryptedData.exportedAt,
        exportedBy: decryptedData.exportedBy,
        totalAccounts: totalAccounts,
        categories: categories,
        favoriteCount: favoriteCount
      }
    });

  } catch (error) {
    console.error('Validate import error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memvalidasi file import'
    });
  }
}

/**
 * Get Export History
 * Endpoint untuk melihat riwayat export yang pernah dilakukan
 */
export async function getExportHistory(req, res) {
  try {
    const userId = req.user.id;

    const history = executeQuery(
      `SELECT 
        details, created_at, ip_address
      FROM activity_logs
      WHERE user_id = ? AND action_type = 'export_vault'
      ORDER BY created_at DESC
      LIMIT 20`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: { history }
    });

  } catch (error) {
    console.error('Get export history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil riwayat export'
    });
  }
}

// Helper function untuk re-import (dipanggil dari transaction)
import { encryptData } from '../utils/encryption.js';

export default {
  exportVault,
  importVault,
  validateImportFile,
  getExportHistory
};