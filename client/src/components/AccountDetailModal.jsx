import { useState } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, Star, Calendar, Edit, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function AccountDetailModal({ 
  isOpen, 
  onClose, 
  account,
  onEdit,
  onDelete,
  onCopy
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  if (!account) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    if (onCopy) onCopy(`${fieldName} berhasil disalin`);
    
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DetailRow = ({ label, value, icon: Icon, copyable = false, isPassword = false }) => {
    if (!value && value !== '') return null;

    return (
      <div className="py-3 border-b border-dark-border last:border-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="w-4 h-4 text-dark-textMuted flex-shrink-0" />}
              <span className="text-sm text-dark-textSecondary">{label}</span>
            </div>
            <div className="font-mono text-dark-text break-all">
              {isPassword && !showPassword ? '••••••••••••' : value}
            </div>
          </div>
          
          {copyable && (
            <button
              onClick={() => handleCopy(value, label)}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-dark-surfaceHover text-dark-textMuted hover:text-dark-text transition-colors"
              title={`Salin ${label}`}
            >
              {copiedField === label ? (
                <span className="text-xs text-accent-green font-medium">✓ Disalin</span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{account.site_name}</span>
          {account.is_favorite === 1 && (
            <Star className="w-5 h-5 text-accent-yellow fill-accent-yellow" />
          )}
        </div>
      }
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => onDelete(account)}>
              Hapus
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            <Button variant="primary" icon={Edit} onClick={() => onEdit(account)}>
              Edit
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-1">
        {/* Site URL */}
        {account.site_url && (
          <div className="py-3 border-b border-dark-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-dark-textSecondary block mb-1">Website</span>
                <a
                  href={account.site_url.startsWith('http') ? account.site_url : `https://${account.site_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 font-mono break-all flex items-center gap-2 transition-colors"
                >
                  {account.site_url}
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Username */}
        <DetailRow
          label="Username"
          value={account.username}
          copyable={true}
        />

        {/* Email */}
        <DetailRow
          label="Email"
          value={account.email}
          copyable={true}
        />

        {/* Password */}
        <div className="py-3 border-b border-dark-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-dark-textSecondary block mb-1">Password</span>
              <div className="font-mono text-dark-text break-all">
                {showPassword ? account.password : '••••••••••••'}
              </div>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 rounded-lg hover:bg-dark-surfaceHover text-dark-textMuted hover:text-dark-text transition-colors"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleCopy(account.password, 'Password')}
                className="p-2 rounded-lg hover:bg-dark-surfaceHover text-dark-textMuted hover:text-dark-text transition-colors"
                title="Salin password"
              >
                {copiedField === 'Password' ? (
                  <span className="text-xs text-accent-green font-medium">✓</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        {account.notes && (
          <div className="py-3 border-b border-dark-border">
            <span className="text-sm text-dark-textSecondary block mb-2">Catatan</span>
            <p className="text-dark-text whitespace-pre-wrap">{account.notes}</p>
          </div>
        )}

        {/* Category */}
        <div className="py-3 border-b border-dark-border">
          <span className="text-sm text-dark-textSecondary block mb-2">Kategori</span>
          <span className="inline-block px-3 py-1 rounded-full text-sm bg-primary-500/10 text-primary-400 border border-primary-500/20">
            {account.category}
          </span>
        </div>

        {/* Metadata */}
        <div className="pt-4 space-y-2 text-sm text-dark-textMuted">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Dibuat: {formatDate(account.created_at)}</span>
          </div>
          {account.updated_at && account.updated_at !== account.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Diperbarui: {formatDate(account.updated_at)}</span>
            </div>
          )}
          {account.last_accessed && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Terakhir diakses: {formatDate(account.last_accessed)}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}