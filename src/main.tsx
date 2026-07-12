import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ShareView from './components/ShareView.tsx'
import { injectLocalFontFaces } from './lib/fonts.ts'

injectLocalFontFaces()

// A #s=… fragment (from a label's QR code) opens the read-only tracklist
// viewer instead of the editor. The choice is made at load time, so re-resolve
// hash-only navigation (e.g. pasting a share URL over the open editor).
const shared = window.location.hash.startsWith('#s=') ? window.location.hash.slice(3) : null
window.addEventListener('hashchange', () => window.location.reload())

createRoot(document.getElementById('root')!).render(
  <StrictMode>{shared ? <ShareView encoded={shared} /> : <App />}</StrictMode>,
)
