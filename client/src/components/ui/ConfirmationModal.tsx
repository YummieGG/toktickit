import React, { useEffect, useRef } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmVariant?: 'primary' | 'destructive';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  warning,
  confirmVariant = 'primary',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-custom"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        aria-describedby="status-modal-description"
        className="card shadow-lg p-4 bg-white"
        onKeyDown={handleModalKeyDown}
        style={{
          maxWidth: '520px',
          width: '100%',
          borderRadius: '0.5rem',
          border: '1px solid var(--surface-border)',
        }}
      >
        <h3 id="status-modal-title" className="h4 mb-3" style={{ color: 'var(--text-primary, #1A2E1A)' }}>
          {title}
        </h3>
        <p id="status-modal-description" className="mb-2">
          {description}
        </p>
        {warning && (
          <Alert variant="warning" role="note" className="py-2 px-3 mb-4 small">
            ⚠ {warning}
          </Alert>
        )}
        <div className="d-flex justify-content-end gap-2">
          <Button
            type="button"
            variant="tertiary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            autoFocus
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
