import { useRef } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'
import Logo, { Butterfly } from './Logo'
import { STORE_SOCIALS } from '../data/catalogOptions'
import { WHATSAPP_PHONE } from '../services/orderService'

function SocialIcon({ label }) {
  if (label === 'TikTok') {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Footer({
  onAdminTrigger,
  onNavigate,
  onExplore,
  onOpenCollections,
}) {
  const clicks = useRef(0)
  const clickTimer = useRef(null)

  const handleBrandClick = () => {
    clicks.current += 1
    window.clearTimeout(clickTimer.current)

    if (clicks.current >= 3) {
      clicks.current = 0
      onAdminTrigger?.()
      return
    }

    clickTimer.current = window.setTimeout(() => {
      clicks.current = 0
    }, 1100)
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__ornament" aria-hidden="true">
        <span />
        <Sparkles size={15} strokeWidth={1.2} />
        <span />
      </div>

      <div className="site-footer__main">
        <div className="site-footer__brand-column">
          <button
            type="button"
            className="footer-brand-button"
            onClick={handleBrandClick}
            aria-label="IS NOIR"
          >
            <Logo size="md" tone="light" />
          </button>
          <p>
            Boutique y accesorios. Una curaduría de piezas para habitar lo
            clásico y lo alternativo sin pedir permiso.
          </p>
          <a
            className="footer-whatsapp"
            href={`https://wa.me/${WHATSAPP_PHONE}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={15} strokeWidth={1.4} />
            Escríbenos por WhatsApp
          </a>
        </div>

        <div className="site-footer__column">
          <h3>Explorar</h3>
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.('/')
            }}
          >
            Inicio
          </a>
          <a
            href="/coleccion"
            onClick={(event) => {
              event.preventDefault()
              onExplore?.()
            }}
          >
            Tienda
          </a>
          <a
            href="/novedades"
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.('/novedades')
            }}
          >
            Novedades
          </a>
          <a
            href="/noticias"
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.('/noticias')
            }}
          >
            Diario del Atelier
          </a>
          <a
            href="/#colecciones"
            onClick={(event) => {
              event.preventDefault()
              onOpenCollections?.()
            }}
          >
            Colecciones
          </a>
          <a
            href="/nosotros"
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.('/nosotros')
            }}
          >
            Nosotros
          </a>
        </div>

        <div className="site-footer__column">
          <h3>Atención</h3>
          <span>Envíos exclusivos en Cúcuta</span>
          <span>Pedidos asistidos por WhatsApp</span>
          <span>Cúcuta - Colombia</span>
        </div>

        <div className="site-footer__column site-footer__social-column">
          <h3>Síguenos</h3>
          <div className="footer-socials">
            {STORE_SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                <SocialIcon label={social.label} />
              </a>
            ))}
          </div>
          <p className="footer-script">Plus qu&apos;un style, une vibe ♥</p>
          <span className="footer-butterfly" aria-hidden="true">
            <Butterfly />
          </span>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} IS NOIR. Todos los derechos reservados.</span>
        <span className="site-footer__tagline">Hecho con intención en Colombia</span>
      </div>
    </footer>
  )
}
