import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

const toastColors = {
  success: 'bg-accent-green/10 border-accent-green/20 text-accent-green',
  error: 'bg-accent-red/10 border-accent-red/20 text-accent-red',
  warning: 'bg-accent-yellow/10 border-accent-yellow/20 text-accent-yellow',
  info: 'bg-primary-500/10 border-primary-500/20 text-primary-500'
};

export default function Toast({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose 
}) {
  const Icon = toastIcons[type];
  const colorClasses = toastColors[type];

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`
      toast flex items-center gap-3 px-4 py-3 rounded-lg border
      bg-dark-surface ${colorClasses}
      shadow-dark-lg min-w-[320px] max-w-md
    `}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm text-dark-text">{message}</p>
      <button
        onClick={onClose}
        className="text-dark-textMuted hover:text-dark-text transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast Container Component
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}