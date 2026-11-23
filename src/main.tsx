import { Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme } from './lib/theme'
import './styles.css'
import './redesign.css'
applyTheme()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((error) => console.error('PWA registration failed:', error))
  })
}
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('YOGE app error', error, info) }
  render() {
    if (this.state.hasError) return <div className="auth"><div className="setup"><div className="mark">YOGE</div><h1>Something went wrong</h1><p className="err">The Command Centre hit an unexpected error.</p><button className="btn primary block" onClick={() => location.reload()}>Reload</button></div></div>
    return this.props.children
  }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>)
