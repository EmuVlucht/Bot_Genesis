import { executeUpdate, executeQuery } from '../db/database.js';

/**
 * Log Activity
 * Mencatat semua aktivitas user untuk audit trail dan security monitoring
 */
export async function logActivity(
  userId,
  actionType,
  resourceType = null,
  resourceId = null,
  details = null,
  ipAddress = null,
  userAgent = null,
  status = 'success'
) {
  try {
    const query = `
      INSERT INTO activity_logs (
        user_id, action_type, resource_type, resource_id, 
        details, ip_address, user_agent, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    executeUpdate(query, [
      userId,
      actionType,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status
    ]);

    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Get User Activity Logs
 * Mengambil riwayat aktivitas user dengan filter dan pagination
 */
export function getUserActivityLogs(userId, limit = 50, offset = 0, actionType = null) {
  try {
    let query = `
      SELECT 
        action_type,
        resource_type,
        resource_id,
        details,
        ip_address,
        status,
        created_at
      FROM activity_logs
      WHERE user_id = ?
    `;

    const params = [userId];

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return executeQuery(query, params);
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return [];
  }
}

/**
 * Get Activity Statistics
 * Mendapatkan statistik aktivitas untuk dashboard
 */
export function getActivityStats(userId) {
  try {
    const stats = executeQuery(`
      SELECT 
        action_type,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM activity_logs
      WHERE user_id = ?
      GROUP BY action_type
    `, [userId]);

    return stats;
  } catch (error) {
    console.error('Error getting activity stats:', error);
    return [];
  }
}

/**
 * Clean Old Logs
 * Menghapus log yang sudah terlalu lama (lebih dari 90 hari)
 */
export function cleanOldLogs(daysToKeep = 90) {
  try {
    const result = executeUpdate(`
      DELETE FROM activity_logs 
      WHERE created_at < datetime('now', '-${daysToKeep} days')
    `);

    if (result.changes > 0) {
      console.log(`🧹 Membersihkan ${result.changes} log lama`);
    }

    return result.changes;
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    return 0;
  }
}

export default {
  logActivity,
  getUserActivityLogs,
  getActivityStats,
  cleanOldLogs
};