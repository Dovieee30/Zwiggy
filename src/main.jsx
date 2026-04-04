import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = '<div style="color:red;font-size:24px;padding:40px">ERROR: No root element found!</div>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch(e) {
    rootEl.innerHTML = `<div style="color:red;font-size:18px;padding:40px;font-family:monospace">RENDER ERROR: ${e.message}<br><br>${e.stack}</div>`
  }
}
