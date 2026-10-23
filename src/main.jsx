import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import './index.css'
import './styles/base.css'
import './styles/storefront.css'
import './styles/overlays.css'
import './styles/admin.css'
import './styles/pages.css'
import './styles/responsive.css'
import './styles/features.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
