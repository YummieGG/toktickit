import React from 'react';

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({ 
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
      <textarea
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
