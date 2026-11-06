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
createRoot(document.getElementById('root')!).render(<App />)
