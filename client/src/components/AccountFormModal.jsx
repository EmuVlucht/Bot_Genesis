import { useState, useEffect } from 'react';
import { Globe, Mail, User, Lock, FileText, Tag } from 'lucide-react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

const CATEGORIES = [
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social Media' },
  { value: 'work', label: 'Pekerjaan' },
  { value: 'shopping', label: 'Belanja' },
  { value: 'entertainment', label: 'Hiburan' },
  { value: 'cloud', label: 'Cloud Storage' },
  { value: 'general', label: 'Umum' }
];

export default function AccountFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  account = null,
  loading = false
}) {
  const isEdit = !!account;
  
  const [formData, setFormData] = useState({
    siteName: '',
    siteUrl: '',
    username: '',
    email: '',
    password: '',
    notes: '',
    category: 'general',
    isFavorite: false
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        siteName: account.site_name || '',
        siteUrl: account.site_url || '',
        username: account.username || '',
        email: account.email || '',
        password: account.password || '',
        notes: account.notes || '',
        category: account.category || 'general',
        isFavorite: account.is_favorite === 1
      });
    } else {
      resetForm();
    }
  }, [account, isOpen]);

  const resetForm = () => {
    setFormData({
      siteName: '',
      siteUrl: '',
      username: '',
      email: '',
      password: '',
      notes: '',
      category: 'general',
      isFavorite: false
    });
    setErrors({});
    setShowPassword(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.siteName.trim()) {
      newErrors.siteName = 'Nama situs harus diisi';
    }
    
    if (!formData.password && !isEdit) {
      newErrors.password = 'Password harus diisi';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    
    if (formData.siteUrl && formData.siteUrl.trim()) {
      try {
        new URL(formData.siteUrl.startsWith('http') ? formData.siteUrl : `https://${formData.siteUrl}`);
      } catch {
        newErrors.siteUrl = 'Format URL tidak valid';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const submitData = {
      siteName: formData.siteName.trim(),
      siteUrl: formData.siteUrl.trim() || null,
      username: formData.username.trim() || null,
      email: formData.email.trim() || null,
      password: formData.password,
      notes: formData.notes.trim() || null,
      category: formData.category,
      isFavorite: formData.isFavorite
    };
    
    await onSubmit(submitData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Akun' : 'Tambah Akun Baru'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Simpan Perubahan' : 'Tambah Akun'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Situs"
          type="text"
          name="siteName"
          value={formData.siteName}
          onChange={handleChange}
          placeholder="Contoh: Gmail, Facebook, Netflix"
          error={errors.siteName}
          icon={Globe}
          required
        />

        <Input
          label="URL Situs"
          type="text"
          name="siteUrl"
          value={formData.siteUrl}
          onChange={handleChange}
          placeholder="https://example.com"
          error={errors.siteUrl}
          helperText="Opsional - URL lengkap situs web"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="username"
            icon={User}
            helperText="Opsional"
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@example.com"
            error={errors.email}
            icon={Mail}
            helperText="Opsional"
          />
        </div>

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder={isEdit ? "Kosongkan jika tidak ingin mengubah" : "Password untuk akun ini"}
          error={errors.password}
          icon={Lock}
          showPasswordToggle
          required={!isEdit}
        />

        <div>
          <label className="block text-sm font-medium text-dark-text mb-1.5">
            Kategori
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text mb-1.5">
            Catatan
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Tambahkan catatan tambahan (opsional)"
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text placeholder-dark-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
          />
          <p className="mt-1.5 text-sm text-dark-textMuted">
            Catatan akan dienkripsi bersama password
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isFavorite"
            name="isFavorite"
            checked={formData.isFavorite}
            onChange={handleChange}
            className="w-4 h-4 rounded border-dark-border bg-dark-surface text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-bg"
          />
          <label htmlFor="isFavorite" className="text-sm text-dark-text cursor-pointer">
            Tandai sebagai favorit
          </label>
        </div>
      </form>
    </Modal>
  );
}