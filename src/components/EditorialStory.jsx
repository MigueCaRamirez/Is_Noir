import { ArrowRight } from 'lucide-react'
import { Sparkle } from './Logo'
import { assetUrl } from '../lib/format'

export function StoryBand({ onExplore }) {
  return (
    <section id="nosotros" className="story-band" aria-label="La historia detrás de IS NOIR">
      <img
        src={assetUrl('editorial-mujer.jpg')}
        alt="Mujer elegante en una terraza de café"
        loading="lazy"
        className="story-band__image"
      />
      <div className="story-band__overlay" />
      <Sparkle className="story-band__sparkle story-band__sparkle--one" />
      <Sparkle className="story-band__sparkle story-band__sparkle--two" />
      <div className="story-band__content">
        <span className="eyebrow eyebrow--light">El atelier</span>
        <h2>
          Cada prenda
          <br />
          <em>cuenta una historia</em>
        </h2>
        <p>
          Creemos en elegir menos y sentir más. En una compra que no se
          olvida y en detalles que hablan por ti.
        </p>
        <button type="button" className="text-button text-button--light" onClick={onExplore}>
          Explorar la colección
          <ArrowRight size={16} strokeWidth={1.4} />
        </button>
      </div>
    </section>
  )
}
