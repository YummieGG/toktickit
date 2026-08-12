import { useState } from 'react';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'Online' | 'Offline' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkSystemStatus = async () => {
    setLoading(true);
    setStatus(null);
    setErrorMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        throw new Error('Server returned an error');
      }
      
      const data = await response.json();
      if (data.status === 'ok') {
        setStatus('Online');
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      setStatus('Offline');
      setErrorMessage('Unable to connect to TokTickIT API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h1 className="h4 mb-0">TokTickIT IT Service Desk</h1>
            </div>
            <div className="card-body text-center py-5">
              <h2 className="mb-4">Welcome to TokTickIT</h2>
              <p className="lead text-muted mb-4">
                Project foundation (React + Vite + Bootstrap) is successfully set up!
              </p>
              
              <button 
                className="btn btn-primary mb-3" 
                onClick={checkSystemStatus}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check System'}
              </button>

              {status && (
                <div className={`alert ${status === 'Online' ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
                  <h5 className="mb-1">System Status: {status}</h5>
                  {errorMessage && <p className="mb-0 mt-2">{errorMessage}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
