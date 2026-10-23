import { useRef } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'
import Logo, { Butterfly } from './Logo'
import { STORE_SOCIALS } from '../data/catalogOptions'
import { WHATSAPP_PHONE } from '../services/orderService'

function SocialIcon() {
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
                <SocialIcon />
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
        <button type="button" onClick={onExplore} className="site-footer__top-link">
          Volver a la colección ↑
        </button>
      </div>
    </footer>
  )
}
