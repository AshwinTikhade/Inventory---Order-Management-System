import React, { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Attempt to connect to the backend
    fetch('http://localhost:8000/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to connect to backend')
        return res.json()
      })
      .then((data) => {
        setHealth(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      margin: 0
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '2rem', color: '#38bdf8' }}>
          📦 Inventory System
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Skeleton Development Setup
        </p>

        <div style={{
          padding: '1rem',
          borderRadius: '0.5rem',
          background: loading ? 'rgba(234, 179, 8, 0.1)' : error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${loading ? '#eab308' : error ? '#ef4444' : '#22c55e'}`,
          color: loading ? '#fef08a' : error ? '#fca5a5' : '#bbf7d0',
          fontSize: '0.95rem'
        }}>
          {loading && 'Connecting to API Service...'}
          {error && `Error: ${error}`}
          {health && (
            <div>
              <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>API Status: ONLINE</p>
              <span style={{ fontSize: '0.85rem', color: '#86efac' }}>
                Backend healthcheck returned: {JSON.stringify(health)}
              </span>
            </div>
          )}
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#64748b' }}>
          Phase 1: Basic Integration Verified
        </p>
      </div>
    </div>
  )
}

export default App
