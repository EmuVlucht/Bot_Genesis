import Dexie from 'dexie';

// Inisialisasi IndexedDB dengan Dexie
const db = new Dexie('VaultVerseDB');

db.version(1).stores({
  accounts: '++id, userId, siteName, category, isFavorite, syncStatus, lastModified',
  syncQueue: '++id, action, accountId, timestamp',
  userCache: 'userId, data, lastSync'
});

// Helper: Check apakah browser support IndexedDB
export const isIndexedDBSupported = () => {
  try {
    return 'indexedDB' in window;
  } catch {
    return false;
  }
};

// Sync status constants
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict'
};

// Offline Storage Service
export const offlineStorage = {
  // Save accounts ke IndexedDB
  async saveAccounts(accounts, userId) {
    try {
      const accountsWithMeta = accounts.map(account => ({
        ...account,
        userId,
        syncStatus: SYNC_STATUS.SYNCED,
        lastModified: new Date().toISOString()
      }));

      await db.accounts.clear();
      await db.accounts.bulkAdd(accountsWithMeta);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving to offline storage:', error);
      return { success: false, error: error.message };
    }
  },

  // Get accounts dari IndexedDB
  async getAccounts(userId) {
    try {
      const accounts = await db.accounts
        .where('userId')
        .equals(userId)
        .toArray();
      
      return { success: true, accounts };
    } catch (error) {
      console.error('Error getting from offline storage:', error);
      return { success: false, error: error.message, accounts: [] };
    }
  },

  // Add account ke offline storage
  async addAccount(account, userId) {
    try {
      const accountWithMeta = {
        ...account,
        userId,
        syncStatus: SYNC_STATUS.PENDING,
        lastModified: new Date().toISOString()
      };

      const id = await db.accounts.add(accountWithMeta);
      
      await db.syncQueue.add({
        action: 'create',
        accountId: id,
        timestamp: new Date().toISOString(),
        data: accountWithMeta
      });

      return { success: true, id };
    } catch (error) {
      console.error('Error adding to offline storage:', error);
      return { success: false, error: error.message };
    }
  },

  // Update account di offline storage
  async updateAccount(id, updates, userId) {
    try {
      await db.accounts.update(id, {
        ...updates,
        syncStatus: SYNC_STATUS.PENDING,
        lastModified: new Date().toISOString()
      });

      await db.syncQueue.add({
        action: 'update',
        accountId: id,
        timestamp: new Date().toISOString(),
        data: updates
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating offline storage:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete account dari offline storage
  async deleteAccount(id) {
    try {
      await db.accounts.delete(id);
      
      await db.syncQueue.add({
        action: 'delete',
        accountId: id,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting from offline storage:', error);
      return { success: false, error: error.message };
    }
  },

  // Get pending sync queue
  async getSyncQueue() {
    try {
      const queue = await db.syncQueue.toArray();
      return { success: true, queue };
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return { success: false, queue: [] };
    }
  },

  // Clear sync queue setelah berhasil sync
  async clearSyncQueue() {
    try {
      await db.syncQueue.clear();
      return { success: true };
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      return { success: false };
    }
  },

  // Save user cache
  async saveUserCache(userId, data) {
    try {
      await db.userCache.put({
        userId,
        data,
        lastSync: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving user cache:', error);
      return { success: false };
    }
  },

  // Get user cache
  async getUserCache(userId) {
    try {
      const cache = await db.userCache.get(userId);
      return { success: true, cache };
    } catch (error) {
      console.error('Error getting user cache:', error);
      return { success: false, cache: null };
    }
  },

  // Clear all offline data
  async clearAll() {
    try {
      await db.accounts.clear();
      await db.syncQueue.clear();
      await db.userCache.clear();
      return { success: true };
    } catch (error) {
      console.error('Error clearing offline storage:', error);
      return { success: false };
    }
  },

  // Get storage statistics
  async getStats(userId) {
    try {
      const totalAccounts = await db.accounts.where('userId').equals(userId).count();
      const pendingSync = await db.accounts
        .where('userId').equals(userId)
        .and(account => account.syncStatus === SYNC_STATUS.PENDING)
        .count();
      const queueSize = await db.syncQueue.count();

      return {
        success: true,
        stats: {
          totalAccounts,
          pendingSync,
          queueSize
        }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { success: false };
    }
  }
};

export default offlineStorage;