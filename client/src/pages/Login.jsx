import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import useToast from '@hooks/useToast';
import { ToastContainer } from '@components/ui/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Username atau email harus diisi';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password harus diisi';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await login({
        identifier: formData.identifier,
        password: formData.password
      });
      
      if (result.success) {
        success(result.message || 'Login berhasil!');
        setTimeout(() => navigate('/vault'), 500);
      } else {
        error(result.error || 'Login gagal. Silakan coba lagi.');
      }
    } catch (err) {
      error('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4">
            <Lock className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-dark-text mb-2">
            Selamat Datang
          </h1>
          <p className="text-dark-textSecondary">
            Masuk ke VaultVerse untuk mengakses vault Anda
          </p>
        </div>

        <div className="card-dark p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username atau Email"
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Masukkan username atau email"
              error={errors.identifier}
              icon={User}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Masukkan password"
              error={errors.password}
              showPasswordToggle
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="mt-6"
            >
              Masuk
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-border text-center">
            <p className="text-sm text-dark-textSecondary">
              Belum punya akun?{' '}
              <Link 
                to="/register" 
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-dark-textMuted mt-6">
          Data Anda dilindungi dengan enkripsi end-to-end AES-256
        </p>
      </div>
    </div>
  );
}