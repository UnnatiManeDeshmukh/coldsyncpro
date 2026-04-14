import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
          <div className="text-center px-6 max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-white/50 text-sm mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="px-6 py-3 rounded-xl text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
