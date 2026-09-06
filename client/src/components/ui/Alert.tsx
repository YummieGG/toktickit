import React from 'react';

export type AlertVariant = 'danger' | 'warning' | 'success';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'danger',
  children,
  className = '',
  role = 'alert',
  ...props
}) => {
  return (
    <div
      role={role}
      className={`alert alert-${variant} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
