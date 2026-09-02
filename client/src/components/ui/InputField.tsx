import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  error, 
  id, 
  required,
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};
