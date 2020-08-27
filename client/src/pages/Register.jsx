import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Mail, Shield } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import useToast from '@hooks/useToast';
import { ToastContainer } from '@components/ui/Toast';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 4) setPasswordStrength('medium');
    else if (strength <= 5) setPasswordStrength('strong');
    else setPasswordStrength('very-strong');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username harus diisi';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username hanya boleh huruf, angka, dan underscore';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password harus diisi';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await register(formData);
      
      if (result.success) {
        success(result.message || 'Registrasi berhasil!');
        setTimeout(() => navigate('/vault'), 500);
      } else {
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach(detail => error(detail));
        } else {
          error(result.error || 'Registrasi gagal. Silakan coba lagi.');
        }
      }
    } catch (err) {
      error('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = {
    weak: 'bg-accent-red',
    medium: 'bg-accent-yellow',
    strong: 'bg-accent-green',
    'very-strong': 'bg-primary-500'
  };

  const strengthLabels = {
    weak: 'Lemah',
    medium: 'Sedang',
    strong: 'Kuat',
    'very-strong': 'Sangat Kuat'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4">
            <Shield className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-dark-text mb-2">
            Buat Akun Baru
          </h1>
          <p className="text-dark-textSecondary">
            Mulai amankan password Anda dengan VaultVerse
          </p>
        </div>

        <div className="card-dark p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Pilih username unik"
              error={errors.username}
              icon={User}
              autoComplete="username"
              required
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
              autoComplete="email"
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimal 8 karakter"
                error={errors.password}
                showPasswordToggle
                autoComplete="new-password"
                required
              />
              
              {formData.password && passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1 bg-dark-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strengthColors[passwordStrength]}`}
                        style={{ 
                          width: passwordStrength === 'weak' ? '25%' : 
                                 passwordStrength === 'medium' ? '50%' : 
                                 passwordStrength === 'strong' ? '75%' : '100%' 
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength === 'weak' ? 'text-accent-red' :
                      passwordStrength === 'medium' ? 'text-accent-yellow' :
                      passwordStrength === 'strong' ? 'text-accent-green' :
                      'text-primary-400'
                    }`}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Konfirmasi Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Ketik ulang password"
              error={errors.confirmPassword}
              showPasswordToggle
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="mt-6"
            >
              Daftar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-border text-center">
            <p className="text-sm text-dark-textSecondary">
              Sudah punya akun?{' '}
              <Link 
                to="/login" 
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-dark-textMuted mt-6">
          Dengan mendaftar, Anda menyetujui penggunaan enkripsi end-to-end untuk melindungi data Anda
        </p>
      </div>
    </div>
  );
}