import React, { useState, useEffect } from 'react';
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
  const [requestedPriority, setRequestedPriority] = useState<string>('LOW');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!requester) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch('http://localhost:3000/api/categories'),
          fetch('http://localhost:3000/api/related-systems')
        ]);
        
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.data || []);
        }
        if (sysRes.ok) {
          const sysJson = await sysRes.json();
          setSystems(sysJson.data || []);
        }
      } catch (err) {
        console.error('Failed to load master data', err);
      }
    };
    fetchData();
  }, [requester, navigate]);

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
      const payload = {
        requesterId: requester?.id,
        categoryId,
        relatedSystemId: relatedSystemId || undefined,
        requestedPriority,
        summary,
        description
      };

      const response = await fetch('http://localhost:3000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      setSuccessTicketNumber(data.data.ticketNumber);
    } catch (err: any) {
      setApiError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successTicketNumber) {
    return (
      <div className="card shadow-sm border-0 mt-4 text-center p-5">
        <div className="card-body">
          <div className="mb-4 text-success" style={{ fontSize: '4rem' }}>✓</div>
          <h2 className="fw-bold text-black mb-3">Ticket Created Successfully</h2>
          <p className="lead mb-4">
            Your ticket number is <strong className="text-primary">{successTicketNumber}</strong>
          </p>
          <Link to="/tickets" className="btn btn-lg text-white px-4" style={{ backgroundColor: '#006B3C' }}>
            Go to My Tickets
          </Link>
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
                placeholder="Provide detailed information..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                error={errors.description}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4 pt-3 border-top">
            <Link to="/tickets" className="btn btn-outline-secondary me-3 px-4">
              Cancel
            </Link>
            <Button type="submit" isLoading={isSubmitting} className="px-4">
              Submit Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
