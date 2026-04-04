import React from 'react'
import ReactDOM from 'react-dom/client'

const root = document.getElementById('root')
console.log('ROOT ELEMENT:', root)

ReactDOM.createRoot(root).render(
  React.createElement('div', { style: { padding: 40, color: 'red', fontSize: 24 } }, 'REACT IS WORKING')
)
