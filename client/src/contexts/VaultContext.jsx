import { createContext, useContext, useState, useEffect } from 'react';
import { accountsService } from '@services/api';
import { useAuth } from './AuthContext';

const VaultContext = createContext(null);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault harus digunakan dalam VaultProvider');
  }
  return context;
};

export const VaultProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    favorite: false
  });

  // Load accounts saat user authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
      loadCategories();
    } else {
      setAccounts([]);
      setFilteredAccounts([]);
      setCategories([]);
    }
  }, [isAuthenticated]);

  // Apply filters saat accounts atau filters berubah
  useEffect(() => {
    applyFilters();
  }, [accounts, filters]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsService.getAll(filters);
      
      if (response.success) {
        setAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await accountsService.getCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(account => 
        account.site_name.toLowerCase().includes(searchLower) ||
        account.email?.toLowerCase().includes(searchLower) ||
        account.username?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(account => account.category === filters.category);
    }

    if (filters.favorite) {
      filtered = filtered.filter(account => account.is_favorite === 1);
    }

    setFilteredAccounts(filtered);
  };

  const getAccountById = async (id) => {
    try {
      const response = await accountsService.getById(id);
      if (response.success) {
        return { success: true, account: response.data.account };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error getting account:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal mengambil detail akun' 
      };
    }
  };

  const createAccount = async (accountData) => {
    try {
      const response = await accountsService.create(accountData);
      
      if (response.success) {
        await loadAccounts();
        await loadCategories();
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error creating account:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal menambahkan akun' 
      };
    }
  };

  const updateAccount = async (id, accountData) => {
    try {
      const response = await accountsService.update(id, accountData);
      
      if (response.success) {
        await loadAccounts();
        await loadCategories();
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error updating account:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal mengupdate akun' 
      };
    }
  };

  const deleteAccount = async (id) => {
    try {
      const response = await accountsService.delete(id);
      
      if (response.success) {
        await loadAccounts();
        await loadCategories();
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Gagal menghapus akun' 
      };
    }
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      favorite: false
    });
  };

  const refreshAccounts = async () => {
    await loadAccounts();
    await loadCategories();
  };

  const value = {
    accounts: filteredAccounts,
    allAccounts: accounts,
    categories,
    loading,
    filters,
    getAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    updateFilters,
    clearFilters,
    refreshAccounts
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
};