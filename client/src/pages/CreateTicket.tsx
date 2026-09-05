import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRequester } from '../contexts/RequesterContext';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { TextAreaField } from '../components/ui/TextAreaField';

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

  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const MAX_FILE_COUNT = 5;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

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
      } catch (err: any) {
        console.error('Failed to load master data', err);
        setApiError(err.message || 'Failed to load master data. Please refresh.');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [requester, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    setErrors(prev => {
      if (!prev.attachments) return prev;
      const copy = { ...prev };
      delete copy.attachments;
      return copy;
    });
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const allFiles = [...selectedFiles, ...newFiles];

    // Validate count
    if (allFiles.length > MAX_FILE_COUNT) {
      setAttachmentError(`Maximum ${MAX_FILE_COUNT} attachments allowed per ticket`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate each new file
    for (const file of newFiles) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`File type ${ext} is not permitted. Supported formats: JPG, PNG, WEBP, PDF`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`File "${file.name}" exceeds the 5 MB limit`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setSelectedFiles(allFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setApiError(null);
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('requesterId', String(requester?.id));
      formData.append('categoryId', String(categoryId));
      if (relatedSystemId) formData.append('relatedSystemId', String(relatedSystemId));
      formData.append('requestedPriority', requestedPriority);
      formData.append('summary', summary);
      formData.append('description', description);
      for (const file of selectedFiles) {
        formData.append('attachments', file);
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          const backendErrors: Record<string, string> = {};
          data.details.forEach((d: { field: string; message: string }) => {
            backendErrors[d.field] = d.message;
          });
          setErrors(backendErrors);
        }
        throw new Error(data.error || 'Failed to create ticket');
      }

      setSuccessTicketNumber(data.data.ticketNumber);
    } catch (err: any) {
      setApiError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="card shadow-sm border-0 mt-4 text-center p-5">
        <div className="card-body">
          <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="text-muted fw-semibold">Loading...</h4>
        </div>
      </div>
    );
  }

  if (successTicketNumber) {
    return (
      <div className="card shadow-sm border-0 mt-4 text-center p-5">
        <div className="card-body">
          <div className="mb-4 text-success" style={{ fontSize: '4rem' }}>✓</div>
          <h2 className="fw-bold text-black mb-3">Ticket Created Successfully</h2>
          <p className="lead mb-4">
            Your ticket number is <strong className="text-primary">{successTicketNumber}</strong>
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/tickets" className="btn btn-lg text-white px-4" style={{ backgroundColor: '#006B3C' }}>
              View My Tickets
            </Link>
            <button 
              type="button" 
              onClick={handleCreateAnother}
              className="btn btn-lg btn-outline-secondary px-4"
            >
              Create Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 mt-4">
      <div className="card-body p-4 p-md-5">
        <h2 className="mb-4 fw-bold border-bottom text-black pb-2">Create New Ticket</h2>
        
        {apiError && (
          <div className="alert alert-danger" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <div className="col-12 col-md-6">
              <SelectField
                id="categoryId"
                label="Category"
                required
                disabled={isSubmitting}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={categoryId}
                onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                error={errors.categoryId}
              />
            </div>
            <div className="col-12 col-md-6">
              <SelectField
                id="relatedSystemId"
                label="Related System"
                placeholder="-- None --"
                disabled={isSubmitting}
                options={systems.map(s => ({ value: s.id, label: s.name }))}
                value={relatedSystemId}
                onChange={e => setRelatedSystemId(e.target.value ? Number(e.target.value) : '')}
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
                disabled={isSubmitting}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' }
                ]}
                value={requestedPriority}
                onChange={e => setRequestedPriority(e.target.value)}
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
                disabled={isSubmitting}
                placeholder="Brief description of the issue"
                value={summary}
                onChange={e => setSummary(e.target.value)}
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
                disabled={isSubmitting}
                placeholder="Provide detailed information..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                error={errors.description}
              />
            </div>
          </div>

          {/* Attachment Selection (ui-spec §6) */}
          <div className="row mt-2">
            <div className="col-12">
              <div className="mb-3">
                <label htmlFor="attachments" className="form-label fw-semibold">
                  Attachments
                </label>
                <input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  className="form-control"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  multiple
                  disabled={isSubmitting || selectedFiles.length >= MAX_FILE_COUNT}
                  onChange={handleFileChange}
                  aria-label="Choose File"
                />
                <div className="form-text">
                  Supported formats: JPG, PNG, WEBP, PDF. Max size: 5 MB per file.
                </div>

                {(attachmentError || errors.attachments) && (
                  <div className="alert alert-danger py-1 px-2 mt-2 mb-0" role="alert">
                    ⚠ {attachmentError || errors.attachments}
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <ul className="list-group mt-2">
                    {selectedFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                        <span className="text-truncate me-2" style={{ fontSize: '0.875rem' }}>
                          {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm text-white border-0 px-2 py-0"
                          style={{ backgroundColor: '#C62828', fontSize: '0.75rem' }}
                          onClick={() => handleRemoveFile(index)}
                          disabled={isSubmitting}
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

          <div className="d-flex justify-content-end mt-4 pt-3 border-top">
            <Link 
              to="/tickets" 
              className={`btn btn-outline-secondary me-3 px-4 ${isSubmitting ? 'disabled' : ''}`}
              tabIndex={isSubmitting ? -1 : undefined}
              onClick={e => { if (isSubmitting) e.preventDefault(); }}
            >
              Cancel
            </Link>
            <Button type="submit" isLoading={isSubmitting} className="px-4">
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
