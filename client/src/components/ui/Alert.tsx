import React from 'react';

export type AlertVariant = 'danger' | 'warning' | 'success';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  children: React.ReactNode;
}

const ALERT_STYLES: Record<AlertVariant, React.CSSProperties> = {
  danger: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    border: '1px solid #C62828',
  },
  warning: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
    border: '1px solid #E65100',
  },
  success: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    border: '1px solid #2E7D32',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'danger',
  children,
  className = '',
  role = 'alert',
  style,
  ...props
}) => {
  return (
    <div
      role={role}
      className={`alert alert-${variant} ${className}`}
      style={{ ...ALERT_STYLES[variant], ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
