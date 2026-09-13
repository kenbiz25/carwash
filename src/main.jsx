import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { IconContext } from '@/lib/icons'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // "duotone" gives every icon in the app a distinct two-tone premium look
  // automatically from whatever text color it already has (see src/lib/icons.js) -
  // no per-callsite changes needed. Change the weight here to switch every
  // icon at once if this doesn't land well visually.
  <IconContext.Provider value={{ weight: 'duotone' }}>
    <App />
  </IconContext.Provider>
)
