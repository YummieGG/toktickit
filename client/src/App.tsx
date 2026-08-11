import './App.css'

function App() {
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
              <p className="lead text-muted">
                Project foundation (React + Vite + Bootstrap) is successfully set up!
              </p>
              {/* Note: In Issue 2, we will add the [Check System] button here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
