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
  name,
  value,
  onChange,
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="form-label fw-medium text-dark">
        {label} {required && <span className="required-asterisk" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <div className="invalid-feedback-custom mt-1">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};
