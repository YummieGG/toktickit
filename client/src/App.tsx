import { useState, useEffect } from 'react';
import './App.css';

interface Category {
  id: number;
  name: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'Online' | 'Offline' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsCategoriesLoading(true);
        // await new Promise(r => setTimeout(r, 2000)); // test Loading
        const response = await fetch('http://localhost:3000/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategoriesError('Unable to load categories');
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
            <div className="card-body py-5">
              <div className="text-center mb-4">
                <button 
                  className="btn btn-primary" 
                  onClick={checkSystemStatus}
                  disabled={loading}
                >
                  {loading ? 'Checking...' : 'Check System'}
                </button>
              </div>

              {status && (
                <div className={`alert ${status === 'Online' ? 'alert-success' : 'alert-danger'} mb-4`} role="alert">
                  <h5 className="mb-1">System Status: {status}</h5>
                  {errorMessage && <p className="mb-0 mt-2">{errorMessage}</p>}
                </div>
              )}

              <h4 className="mb-3">Supported Request Categories:</h4>
              
              {isCategoriesLoading ? (
                <div className="text-center my-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading categories...</p>
                </div>
              ) : categoriesError ? (
                <div className="alert alert-warning" role="alert">
                  {categoriesError}
                </div>
              ) : (
                <ul className="list-group">
                  {categories.map((category) => (
                    <li key={category.id} className="list-group-item">
                      {category.id}. {category.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
