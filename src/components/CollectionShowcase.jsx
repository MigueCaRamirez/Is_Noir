import { Plus } from 'lucide-react'
import { Butterfly, Sparkle } from './Logo'
import { CATEGORY_SHOWCASE } from '../data/catalogOptions'
import { assetUrl } from '../lib/format'

export default function CollectionShowcase({ onSelectCategory }) {
  return (
    <section id="colecciones" className="collections-section">
      <div className="container-wide">
        <div className="section-heading section-heading--center">
          <span className="eyebrow eyebrow--rule">El universo IS NOIR</span>
          <h2 className="section-title">Nuestras colecciones</h2>
          <p className="section-subtitle">
            Piezas escogidas para vestir cada versión de ti.
          </p>
        </div>

        <div className="arch-grid">
          {CATEGORY_SHOWCASE.map((category, index) => {
            const comingSoon = Boolean(category.comingSoon)

            return (
              <button
                key={category.label}
                type="button"
                className={`arch-card ${category.image ? '' : 'arch-card--butterfly'} ${comingSoon ? 'is-coming-soon' : ''}`}
                onClick={() => {
                  if (!comingSoon) onSelectCategory?.(category.tipo)
                }}
                disabled={comingSoon}
                aria-disabled={comingSoon || undefined}
                aria-label={comingSoon ? `${category.label}, próximamente` : undefined}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="arch-card__frame">
                  <span className="arch-card__media">
                    {category.image ? (
                      <img
                        src={assetUrl(category.image)}
                        alt=""
                        loading="lazy"
                        className="arch-card__image"
                      />
                    ) : (
                      <span className="arch-card__night">
                        <span className="arch-card__glow" />
                        <Butterfly className="arch-card__butterfly" />
                        <Sparkle className="arch-card__sparkle" />
                      </span>
                    )}
                    {comingSoon ? <span className="arch-card__soon">Próximamente</span> : null}
                    <span className="arch-card__shine" />
                  </span>
                </span>
                <span className="arch-card__foot">
                  <span>
                    <span className="arch-card__label">{category.label}</span>
                    <span className="arch-card__caption">{category.caption}</span>
                  </span>
                  {!comingSoon ? (
                    <span className="arch-card__plus" aria-hidden="true">
                      <Plus size={13} strokeWidth={1.5} />
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
