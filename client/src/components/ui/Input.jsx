import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  showPasswordToggle = false,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  
  const inputType = type === 'password' && showPasswordToggle
    ? (showPassword ? 'text' : 'password')
    : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className="block text-sm font-medium text-dark-text mb-1.5"
        >
          {label}
          {required && <span className="text-accent-red ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-textMuted">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-dark-surface border border-dark-border
            text-dark-text placeholder-dark-textMuted
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${Icon ? 'pl-11' : ''}
            ${showPasswordToggle ? 'pr-11' : ''}
            ${error ? 'border-accent-red focus:ring-accent-red' : ''}
          `}
          {...props}
        />
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-textMuted hover:text-dark-text transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-1.5 text-sm text-accent-red">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-dark-textMuted">
          {helperText}
        </p>
      )}
    </div>
  );
}