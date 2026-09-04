import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequester, type Requester } from '../contexts/RequesterContext';

export const RequesterSelect: React.FC = () => {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  
  const { setRequester, requester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated and visiting root, redirect to tickets
    if (requester) {
      navigate('/tickets');
      return;
    }

    const fetchRequesters = async () => {
      try {
        const response = await fetch('/api/requesters');
        if (!response.ok) {
          throw new Error('Failed to fetch requesters');
        }
        const json = await response.json();
        setRequesters(json.data || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRequesters();
  }, [requester, navigate]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId === '') return;
    
    const selected = requesters.find(r => r.id === selectedId);
    if (selected) {
      setRequester(selected);
      navigate('/tickets');
    }
  };

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <h2 className="text-center mb-4 text-success fw-bold">TokTickIT</h2>
            <h4 className="text-center mb-4 text-muted">Development Login</h4>
            
            {loading && (
              <div className="text-center my-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading requesters...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && (
              <form onSubmit={handleContinue}>
                <div className="mb-4">
                  <label htmlFor="requesterSelect" className="form-label fw-semibold">
                    Select Test Requester <span className="text-danger">*</span>
                  </label>
                  <select
                    id="requesterSelect"
                    className="form-select form-select-lg"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
                    required
                    aria-required="true"
                  >
                    <option value="" disabled>-- Select a requester --</option>
                    {requesters.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.name} ({req.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="d-grid">
                  <button 
                    type="submit" 
                    className="btn text-white btn-lg"
                    style={{ backgroundColor: '#006B3C' }}
                    disabled={selectedId === ''}
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
