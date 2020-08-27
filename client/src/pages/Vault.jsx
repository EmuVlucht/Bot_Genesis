import { useState, useEffect } from 'react';
import { Search, Plus, Filter, LogOut, User, Download, Upload, Lock } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { useVault } from '@contexts/VaultContext';
import { useNavigate } from 'react-router-dom';
import AccountCard from '@components/AccountCard';
import AccountFormModal from '@components/AccountFormModal';
import AccountDetailModal from '@components/AccountDetailModal';
import Modal from '@components/ui/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import useToast from '@hooks/useToast';
import { ToastContainer } from '@components/ui/Toast';

export default function Vault() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    accounts, 
    categories, 
    loading, 
    filters, 
    updateFilters, 
    getAccountById,
    createAccount,
    updateAccount,
    deleteAccount 
  } = useVault();
  const { toasts, removeToast, success, error } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [detailedAccount, setDetailedAccount] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters({ search: searchQuery });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateFilters]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    updateFilters({ category });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleViewAccount = async (account) => {
    setModalLoading(true);
    const result = await getAccountById(account.id);
    setModalLoading(false);
    
    if (result.success) {
      setDetailedAccount(result.account);
      setShowDetailModal(true);
    } else {
      error(result.error || 'Gagal mengambil detail akun');
    }
  };

  const handleEditAccount = async (account) => {
    if (!detailedAccount && account.id) {
      const result = await getAccountById(account.id);
      if (result.success) {
        setSelectedAccount(result.account);
      }
    } else {
      setSelectedAccount(detailedAccount || account);
    }
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDeleteAccount = (account) => {
    setSelectedAccount(detailedAccount || account);
    setShowDetailModal(false);
    setShowDeleteModal(true);
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (formData) => {
    setModalLoading(true);
    
    const result = selectedAccount
      ? await updateAccount(selectedAccount.id, formData)
      : await createAccount(formData);
    
    setModalLoading(false);
    
    if (result.success) {
      success(result.message);
      setShowFormModal(false);
      setSelectedAccount(null);
    } else {
      error(result.error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAccount) return;
    
    setModalLoading(true);
    const result = await deleteAccount(selectedAccount.id);
    setModalLoading(false);
    
    if (result.success) {
      success(result.message);
      setShowDeleteModal(false);
      setSelectedAccount(null);
    } else {
      error(result.error);
    }
  };

  const handleCopySuccess = (message) => {
    success(message);
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-dark-text">VaultVerse</h1>
                <p className="text-xs text-dark-textMuted">Password Manager</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" icon={Download} size="sm">
                Export
              </Button>
              <Button variant="ghost" icon={Upload} size="sm">
                Import
              </Button>
              
              <div className="w-px h-6 bg-dark-border"></div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-sm text-dark-text font-medium hidden sm:inline">
                  {user?.username}
                </span>
              </div>
              
              <Button variant="ghost" icon={LogOut} size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Cari akun berdasarkan nama situs, email, atau username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filter
              </Button>
              
              <Button
                variant="primary"
                icon={Plus}
                onClick={handleAddAccount}
              >
                Tambah Akun
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          {showFilters && (
            <div className="mt-4 p-4 bg-dark-surface rounded-lg border border-dark-border animate-slide-down">
              <h3 className="text-sm font-medium text-dark-text mb-3">Kategori</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
                  }`}
                >
                  Semua ({accounts.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => handleCategoryChange(cat.category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat.category
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-surfaceHover text-dark-textSecondary hover:text-dark-text'
                    }`}
                  >
                    {cat.category} ({cat.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-dark p-4">
            <p className="text-sm text-dark-textSecondary mb-1">Total Akun</p>
            <p className="text-2xl font-bold text-dark-text">{accounts.length}</p>
          </div>
          <div className="card-dark p-4">
            <p className="text-sm text-dark-textSecondary mb-1">Kategori</p>
            <p className="text-2xl font-bold text-dark-text">{categories.length}</p>
          </div>
          <div className="card-dark p-4">
            <p className="text-sm text-dark-textSecondary mb-1">Favorit</p>
            <p className="text-2xl font-bold text-dark-text">
              {accounts.filter(a => a.is_favorite === 1).length}
            </p>
          </div>
        </div>

        {/* Accounts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-dark-surface border border-dark-border flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-dark-textMuted" />
            </div>
            <h3 className="text-lg font-semibold text-dark-text mb-2">
              {searchQuery ? 'Tidak ada hasil' : 'Vault masih kosong'}
            </h3>
            <p className="text-dark-textSecondary mb-6">
              {searchQuery 
                ? 'Coba kata kunci lain atau ubah filter'
                : 'Mulai tambahkan akun pertama Anda ke vault'
              }
            </p>
            {!searchQuery && (
              <Button variant="primary" icon={Plus} onClick={handleAddAccount}>
                Tambah Akun Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onView={handleViewAccount}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AccountFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedAccount(null);
        }}
        onSubmit={handleFormSubmit}
        account={selectedAccount}
        loading={modalLoading}
      />

      <AccountDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailedAccount(null);
        }}
        account={detailedAccount}
        onEdit={handleEditAccount}
        onDelete={handleDeleteAccount}
        onCopy={handleCopySuccess}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAccount(null);
        }}
        title="Konfirmasi Hapus"
        size="sm"
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedAccount(null);
              }}
              disabled={modalLoading}
            >
              Batal
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmDelete}
              loading={modalLoading}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-dark-text">
          Apakah Anda yakin ingin menghapus akun <strong>{selectedAccount?.site_name}</strong>? 
          Tindakan ini tidak dapat dibatalkan dan semua data terkait akan dihapus secara permanen.
        </p>
      </Modal>
    </div>
  );
}