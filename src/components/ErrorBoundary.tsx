import React from 'react'
import { getMonitorEntries } from '../monitoring/runtimeMonitor'

interface State {
  hasError: boolean
  error: string
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message + '\n' + error.stack }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const recentMonitorEntries = getMonitorEntries().slice(-12).reverse()
      return (
        <div style={{
          background: '#1a1a2e', color: '#e94560', padding: 20,
          fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap',
          minHeight: '100vh', overflow: 'auto',
        }}>
          <h3 style={{ color: '#ffd93d' }}>Component Error</h3>
          <p>{this.state.error}</p>
          <h4 style={{ color: '#ffd93d', marginTop: 24 }}>Recent Monitor Events</h4>
          <div style={{ display: 'grid', gap: 10 }}>
            {recentMonitorEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: 10,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ color: '#ffd93d', marginBottom: 4 }}>
                  [{entry.level}] {entry.scope} / {entry.event}
                </div>
                <div style={{ color: '#f0eef6', opacity: 0.75, marginBottom: 6 }}>
                  {entry.timestamp}
                </div>
                <div style={{ color: '#f0eef6' }}>{entry.detail || '(no detail)'}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
