import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRequester } from '../contexts/RequesterContext';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { TextAreaField } from '../components/ui/TextAreaField';
import { Alert } from '../components/ui/Alert';
import { MAX_ACTIVE_ATTACHMENTS, validateAttachmentSelection } from '../utils/attachment';

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

export const CreateTicket: React.FC = () => {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [relatedSystemId, setRelatedSystemId] = useState<number | ''>('');
  const [requestedPriority, setRequestedPriority] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const handleCreateAnother = () => {
    setSuccessTicketNumber(null);
    setCategoryId('');
    setRelatedSystemId('');
    setRequestedPriority('');
    setSummary('');
    setDescription('');
    setSelectedFiles([]);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors({});
    setApiError(null);
  };

  useEffect(() => {
    if (!requester) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [catRes, sysRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/related-systems')
        ]);
        
        if (!catRes.ok) {
          throw new Error('Failed to load categories');
        }
        if (!sysRes.ok) {
          throw new Error('Failed to load related systems');
        }

        const catJson = await catRes.json();
        const sysJson = await sysRes.json();
        setCategories(catJson.data || []);
        setSystems(sysJson.data || []);
      } catch (err: unknown) {
        console.error('Failed to load master data', err);
        setApiError((err as Error).message || 'Failed to load master data. Please refresh.');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [requester, navigate]);

  const processFiles = (files: FileList | File[]) => {
    setAttachmentError(null);
    setErrors(prev => {
      if (!prev.attachments) return prev;
      const copy = { ...prev };
      delete copy.attachments;
      return copy;
    });
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const acceptedFiles: File[] = [];
    let firstError: string | null = null;

    // Reject invalid files individually while retaining valid files from the same selection.
    for (const file of newFiles) {
      const validationMessage = validateAttachmentSelection(
        file,
        selectedFiles.length + acceptedFiles.length,
        'attachments'
      );
      if (validationMessage) {
        firstError ??= validationMessage;
        continue;
      }
      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }
    setAttachmentError(firstError);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isSubmitting && !isLoadingData && selectedFiles.length < MAX_ACTIVE_ATTACHMENTS) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isSubmitting || isLoadingData || selectedFiles.length >= MAX_ACTIVE_ATTACHMENTS) return;
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
    setErrors(prev => {
      if (!prev.attachments) return prev;
      const copy = { ...prev };
      delete copy.attachments;
      return copy;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!categoryId) newErrors.categoryId = 'Category is required';
    if (!requestedPriority) newErrors.requestedPriority = 'Priority is required';
    
    const sumTrim = summary.trim();
    if (sumTrim.length < 5 || sumTrim.length > 200) {
      newErrors.summary = 'Summary must be between 5 and 200 characters';
    }
    
    const descTrim = description.trim();
    if (descTrim.length < 10 || descTrim.length > 2000) {
      newErrors.description = 'Description must be between 10 and 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setApiError(null);
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('requesterId', String(requester?.id));
      formData.append('categoryId', String(categoryId));
      if (relatedSystemId) formData.append('relatedSystemId', String(relatedSystemId));
      formData.append('requestedPriority', requestedPriority);
      formData.append('summary', summary.trim());
      formData.append('description', description.trim());
      for (const file of selectedFiles) {
        formData.append('attachments', file);
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        const nonFieldErrors: string[] = [];
        if (data.details && Array.isArray(data.details)) {
          const backendErrors: Record<string, string> = {};
          data.details.forEach((d: { field: string; message: string }) => {
            backendErrors[d.field] = d.message;
            if (!['categoryId', 'relatedSystemId', 'requestedPriority', 'summary', 'description', 'attachments'].includes(d.field)) {
              nonFieldErrors.push(d.message);
            }
          });
          setErrors(backendErrors);
        }
        const errorMsg = nonFieldErrors.length > 0
          ? nonFieldErrors.join('; ')
          : (data.error || 'Failed to create ticket');
        throw new Error(errorMsg);
      }

      setSuccessTicketNumber(data.data.ticketNumber);
    } catch (err: unknown) {
      setApiError((err as Error).message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successTicketNumber) {
    return (
      <div 
        className="card shadow-sm mt-4 text-center p-4 p-md-5 rounded-3"
        style={{ backgroundColor: '#E8F5E9', border: '1px solid #2E7D32' }}
        role="alert"
        aria-live="polite"
      >
        <div className="card-body">
          <div className="mb-4" style={{ fontSize: '4rem', color: '#2E7D32' }}>✓</div>
          <h2 className="fw-bold mb-3" style={{ color: '#1B5E20' }}>Ticket Created Successfully</h2>
          <p className="lead mb-4" style={{ color: '#1B5E20' }}>
            Your ticket number is <strong style={{ color: '#006B3C', fontSize: '1.25em' }}>{successTicketNumber}</strong>
          </p>
          <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
            <Link
              to="/tickets"
              className="btn btn-lg btn-zen-primary text-white px-4 py-2 w-100 w-md-auto"
              style={{ backgroundColor: '#006B3C', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              View My Tickets
            </Link>
            <button 
              type="button" 
              onClick={handleCreateAnother}
              className="btn btn-lg btn-zen-secondary px-4 py-2 bg-white w-100 w-md-auto"
              style={{ minHeight: '44px' }}
            >
              Create Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoadingData && (
        <div className="text-center mb-4 py-2" role="status">
          <div className="spinner-border mb-2" role="status" style={{ width: '2.5rem', height: '2.5rem', color: '#006B3C' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="fw-semibold fs-5" style={{ color: 'var(--text-secondary)' }}>Loading...</h4>
        </div>
      )}

      <div className="card shadow-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <div className="card-body p-3 p-md-4">
          <h2 className="mb-4 fw-semibold border-bottom pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--surface-border)' }}>
            Create New Ticket
          </h2>

          {apiError && (
            <Alert variant="danger" className="mb-4">
              {apiError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <div className="col-12 col-md-6">
              <SelectField
                id="categoryId"
                label="Category"
                required
                disabled={isLoadingData || isSubmitting}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={categoryId}
                onChange={e => {
                  setCategoryId(e.target.value ? Number(e.target.value) : '');
                  clearFieldError('categoryId');
                }}
                error={errors.categoryId}
              />
            </div>
            <div className="col-12 col-md-6">
              <SelectField
                id="relatedSystemId"
                label="Related System"
                placeholder="-- None --"
                disabled={isLoadingData || isSubmitting}
                options={systems.map(s => ({ value: s.id, label: s.name }))}
                value={relatedSystemId}
                onChange={e => {
                  setRelatedSystemId(e.target.value ? Number(e.target.value) : '');
                  clearFieldError('relatedSystemId');
                }}
                error={errors.relatedSystemId}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-12 col-md-6">
              <SelectField
                id="requestedPriority"
                label="Requested Priority"
                required
                disabled={isLoadingData || isSubmitting}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' }
                ]}
                value={requestedPriority}
                onChange={e => {
                  setRequestedPriority(e.target.value);
                  clearFieldError('requestedPriority');
                }}
                error={errors.requestedPriority}
              />
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-12">
              <InputField
                id="summary"
                label="Summary"
                required
                disabled={isLoadingData || isSubmitting}
                placeholder="Brief description of the issue"
                value={summary}
                onChange={e => {
                  setSummary(e.target.value);
                  clearFieldError('summary');
                }}
                error={errors.summary}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <TextAreaField
                id="description"
                label="Description"
                required
                rows={5}
                disabled={isLoadingData || isSubmitting}
                placeholder="Provide detailed information..."
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  clearFieldError('description');
                }}
                error={errors.description}
              />
            </div>
          </div>

          {/* Attachment Selection (ui-spec §6) */}
          <div className="row mt-2">
            <div className="col-12">
              <div
                className={`mb-3 p-3 rounded ${isDragging ? 'bg-light' : ''}`}
                style={{
                  border: isDragging ? '2px dashed var(--primary-green)' : '1px solid transparent',
                  transition: 'background-color 0.15s, border-color 0.15s'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <label htmlFor="attachments" className="form-label">
                  Attachments
                </label>
                <input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  className={`form-control ${attachmentError || errors.attachments ? 'is-invalid' : ''}`}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  multiple
                  disabled={isLoadingData || isSubmitting || selectedFiles.length >= MAX_ACTIVE_ATTACHMENTS}
                  onChange={handleFileChange}
                  aria-label="Choose File"
                  aria-invalid={!!(attachmentError || errors.attachments)}
                  aria-describedby={`${attachmentError || errors.attachments ? 'attachments-error ' : ''}attachments-help`}
                />
                <div id="attachments-help" className="form-text mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Supported formats: JPG, PNG, WEBP, PDF. Max size: 5 MB per file.
                </div>

                {(attachmentError || errors.attachments) && (
                  <Alert id="attachments-error" variant="danger" className="py-2 px-3 mt-2 mb-0">
                    ⚠ {attachmentError || errors.attachments}
                  </Alert>
                )}

                {selectedFiles.length > 0 && (
                  <ul className="list-group mt-2">
                    {selectedFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                        <span className="text-truncate me-2" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-zen-destructive text-white border-0 px-2 py-1"
                          style={{ backgroundColor: '#C62828', fontSize: '0.75rem', minHeight: '44px' }}
                          onClick={() => handleRemoveFile(index)}
                          disabled={isLoadingData || isSubmitting}
                          aria-label={`Remove ${file.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex flex-column-reverse flex-md-row justify-content-md-end gap-3 mt-4 pt-3 border-top" style={{ borderColor: 'var(--surface-border)' }}>
            <Link 
              to="/tickets" 
              className={`btn btn-zen-secondary px-4 py-2 text-center w-100 w-md-auto ${isLoadingData || isSubmitting ? 'disabled' : ''}`}
              aria-disabled={isLoadingData || isSubmitting}
              tabIndex={isLoadingData || isSubmitting ? -1 : undefined}
              onClick={e => { if (isLoadingData || isSubmitting) e.preventDefault(); }}
              style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isLoadingData || isSubmitting}
              className="px-4 py-2 w-100 w-md-auto"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};
