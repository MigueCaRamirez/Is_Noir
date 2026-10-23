import { ArrowRight } from 'lucide-react'
import Logo, { Butterfly, Sparkle } from './Logo'
import { assetUrl } from '../lib/format'

export default function HeroSplit({ onExplore }) {
  return (
    <section id="inicio" className="hero" aria-label="Dos estilos, un mismo universo">
      <article className="hero-panel hero-panel--alt">
        <img
          src={assetUrl('hero-alternativo.jpg')}
          alt="Mujer con estilo alternativo en un entorno urbano oscuro"
          className="hero-panel__image"
          fetchPriority="high"
        />
        <div className="hero-panel__veil" />
        <div className="hero-panel__frame" aria-hidden="true" />
        <div className="hero-panel__content hero-panel__content--left">
          <span className="hero-eyebrow">
            <span />
            Estilo
          </span>
          <h1 className="hero-title">
            Alternativo
          </h1>
          <p className="hero-script">Actitud en cada detalle</p>
          <button type="button" className="hero-button hero-button--outline" onClick={() => onExplore?.('Alternativo')}>
            Ver colección
            <ArrowRight size={16} strokeWidth={1.4} />
          </button>
        </div>
        <Butterfly className="hero-butterfly hero-butterfly--left" />
      </article>

      <article className="hero-panel hero-panel--old">
        <img
          src={assetUrl('hero-old-money.jpg')}
          alt="Mujer elegante disfrutando un café en una terraza clásica"
          className="hero-panel__image"
          fetchPriority="high"
        />
        <div className="hero-panel__veil" />
        <div className="hero-panel__frame" aria-hidden="true" />
        <div className="hero-panel__content hero-panel__content--right">
          <span className="hero-eyebrow">
            <span />
            Estilo
          </span>
          <h2 className="hero-title">
            Old Money
          </h2>
          <p className="hero-script">Elegancia que perdura</p>
          <button type="button" className="hero-button hero-button--solid" onClick={() => onExplore?.('Old Money')}>
            Ver colección
            <ArrowRight size={16} strokeWidth={1.4} />
          </button>
        </div>
        <Butterfly className="hero-butterfly hero-butterfly--right" />
      </article>

      <div className="hero-logo animate-fade-in" aria-hidden="true">
        <span className="hero-logo__orbit hero-logo__orbit--outer" />
        <span className="hero-logo__orbit hero-logo__orbit--inner" />
        <Sparkle className="hero-logo__sparkle hero-logo__sparkle--top" />
        <Sparkle className="hero-logo__sparkle hero-logo__sparkle--bottom" />
        <Logo size="hero" tone="light" />
        <span className="hero-logo__note">Plus qu&apos;un style, une vibe ♥</span>
      </div>

      <div className="hero-side-note" aria-hidden="true">
        <span>EST. 2006</span>
        <i />
        <span>COLOMBIA</span>
      </div>
    </section>
  )
}
