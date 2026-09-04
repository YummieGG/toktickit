import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'tertiary';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseClasses = 'btn fw-semibold';
  
  const variantClasses = {
    primary: 'text-white', // Primary color is set via inline style to match #006B3C if needed, or we can use custom CSS class. Let's use custom style.
    secondary: 'btn-zen-secondary',
    outline: 'btn-outline-secondary',
    danger: 'btn-danger',
    tertiary: 'btn-zen-tertiary'
  };

  const primaryStyle = variant === 'primary' ? { backgroundColor: '#006B3C', borderColor: '#006B3C' } : {};

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={primaryStyle}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      ) : null}
      {children}
    </button>
  );
};
