import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg',
  secondary: 'bg-dark-surface hover:bg-dark-surfaceHover text-dark-text border border-dark-border',
  danger: 'bg-accent-red hover:bg-red-600 text-white shadow-md hover:shadow-lg',
  ghost: 'hover:bg-dark-surface text-dark-text',
  success: 'bg-accent-green hover:bg-green-600 text-white shadow-md hover:shadow-lg'
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;
  const widthClass = fullWidth ? 'w-full' : '';
  
  const baseClasses = `
    inline-flex items-center justify-center gap-2 
    rounded-lg font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-bg
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
    active:scale-95
  `;

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memproses...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
}