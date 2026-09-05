import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'destructive' | 'tertiary';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  style,
  ...props 
}) => {
  const baseClasses = 'btn fw-semibold';
  
  const variantClasses: Record<string, string> = {
    primary: 'btn-zen-primary text-white',
    secondary: 'btn-zen-secondary',
    outline: 'btn-outline-secondary',
    danger: 'btn-zen-destructive text-white',
    destructive: 'btn-zen-destructive text-white',
    tertiary: 'btn-zen-tertiary'
  };

  const getStyle = (): React.CSSProperties => {
    const combinedStyle: React.CSSProperties = { ...style };
    if (variant === 'primary') {
      combinedStyle.backgroundColor = '#006B3C';
      combinedStyle.borderColor = '#006B3C';
    } else if (variant === 'destructive' || variant === 'danger') {
      combinedStyle.backgroundColor = '#C62828';
      combinedStyle.borderColor = '#C62828';
    }
    if (isLoading) {
      combinedStyle.opacity = 0.75;
      combinedStyle.pointerEvents = 'none';
    }
    return combinedStyle;
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${isLoading ? 'is-busy' : ''} ${className}`}
      style={getStyle()}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      ) : null}
      {children}
    </button>
  );
};
