import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';

describe('ConfirmationModal Component (ui-spec.md §7, §9)', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        title="Test Modal"
        description="Modal description"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders accessible dialog with title, description, warning, and action buttons', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Resolution"
        description="Are you sure you want to resolve?"
        warning="All active actions must be closed."
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'status-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'status-modal-description');

    expect(screen.getByRole('heading', { name: 'Confirm Resolution' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to resolve?')).toBeInTheDocument();
    expect(screen.getByText(/All active actions must be closed/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to trigger cancel', () => {
    const handleCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Action"
        description="Modal description"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('disables cancel and escape when isLoading is true', () => {
    const handleCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirm Action"
        description="Modal description"
        isLoading={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toBeDisabled();
  });
});
