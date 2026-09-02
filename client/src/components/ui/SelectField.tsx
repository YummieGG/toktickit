import React from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  error?: string;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ 
  label, 
  options,
  error, 
  id, 
  required,
  placeholder = '-- Select an option --',
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="form-label fw-semibold">
        {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
      </label>
      <select
        id={id}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : "false"}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};
