import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowRight, LockKeyhole, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo, { Butterfly } from './Logo'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.6-4.13H3.06v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.52H3.06A10 10 0 0 0 2 12c0 1.6.38 3.12 1.06 4.48l3.34-2.62Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.52l3.34 2.62c.78-2.37 2.99-4.16 5.6-4.16Z" />
    </svg>
  )
}

export default function AdminLoginModal({ onClose }) {
  const { signInWithGoogle, authError, signingIn, clearAuthError } = useAuth()
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !signingIn) onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, signingIn])

  const handleGoogle = async () => {
    setLocalError('')
    clearAuthError()
    try {
      await signInWithGoogle()
    } catch (error) {
      setLocalError(error.message || 'No se pudo iniciar sesión.')
    }
  }

  const visibleError = localError || authError

  return createPortal(
    <div
      className="modal-backdrop admin-login-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !signingIn) onClose?.()
      }}
    >
      <div className="admin-login animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose} disabled={signingIn}>
          <X size={19} strokeWidth={1.4} />
        </button>
        <Butterfly className="admin-login__butterfly" />
        <Logo size="sm" />
        <span className="admin-login__eyebrow">
          <LockKeyhole size={12} strokeWidth={1.5} />
          Atelier privado
        </span>
        <h2 id="admin-login-title">Acceso administración</h2>
        <p>
          Inicia sesión con una cuenta autorizada de Google para gestionar
          inventario, borradores e imágenes.
        </p>

        <button type="button" className="google-button" onClick={handleGoogle} disabled={signingIn}>
          <GoogleIcon />
          <span>{signingIn ? 'Conectando con Google…' : 'Continuar con Google'}</span>
          {!signingIn ? <ArrowRight size={16} strokeWidth={1.4} /> : <span className="button-spinner" />}
        </button>

        {visibleError ? (
          <p className="form-error form-error--boxed" role="alert">
            {visibleError}
          </p>
        ) : null}

        <p className="admin-login__security">
          <ShieldCheck size={14} strokeWidth={1.4} />
          Las cuentas no autorizadas se desconectan automáticamente.
        </p>
        <span className="admin-login__script">Plus qu&apos;un style, une vibe ♥</span>
      </div>
    </div>,
    document.body,
  )
}

export function AccessDeniedDialog() {
  const { deniedEmail, clearDenied } = useAuth()

  useEffect(() => {
    if (!deniedEmail) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') clearDenied()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deniedEmail, clearDenied])

  if (!deniedEmail) return null

  return createPortal(
    <div className="modal-backdrop modal-backdrop--high" role="presentation">
      <div className="access-denied animate-scale-in" role="alertdialog" aria-modal="true" aria-labelledby="access-denied-title">
        <span className="access-denied__icon">
          <AlertTriangle size={24} strokeWidth={1.4} />
        </span>
        <span className="eyebrow">Acceso restringido</span>
        <h2 id="access-denied-title">Esta cuenta no tiene permisos de administración</h2>
        <p>
          La sesión de <strong>{deniedEmail}</strong> fue cerrada automáticamente.
          Ingresa con una cuenta autorizada del equipo IS NOIR.
        </p>
        <button type="button" className="button-primary" onClick={clearDenied} autoFocus>
          Entendido
        </button>
        <span className="access-denied__note">Protección de datos y sesión activa.</span>
      </div>
    </div>,
    document.body,
  )
}
