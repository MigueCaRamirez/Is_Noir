import { ArrowRight, Newspaper, Sparkles } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Butterfly } from '../components/Logo'

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <div className="novedades-heading">
      <div>
        <span className="eyebrow eyebrow--rule">{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {copy ? <p>{copy}</p> : null}
    </div>
  )
}

function ProductSkeletons() {
  return (
    <div className="product-grid" aria-label="Cargando novedades">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="product-skeleton">
          <div className="product-skeleton__media shimmer" />
          <div className="product-skeleton__line product-skeleton__line--short shimmer" />
          <div className="product-skeleton__line shimmer" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ title, copy }) {
  return (
    <div className="novedades-empty">
      <Sparkles size={24} strokeWidth={1.1} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

export default function NovedadesPage({
  products = [],
  loading = false,
  error = '',
  onRetry,
  onSelectProduct,
  onExplore,
  onOpenNews,
}) {
  const latest = products
    .filter((product) => product.es_novedad)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)
  const latestFallback = latest.length ? latest : products.slice(0, 4)

  const mostRequested = [...products]
    .filter((product) => Number(product.solicitudes) > 0)
    .sort(
      (a, b) =>
        Number(b.solicitudes) - Number(a.solicitudes)
        || Number(b.ventas) - Number(a.ventas),
    )
    .slice(0, 4)

  const bestSellers = [...products]
    .filter((product) => Number(product.ventas) > 0)
    .sort(
      (a, b) =>
        Number(b.ventas) - Number(a.ventas)
        || Number(b.solicitudes) - Number(a.solicitudes),
    )
    .slice(0, 4)

  return (
    <div className="page page--novedades">
      <header className="page-masthead novedades-masthead">
        <div className="container-wide page-masthead__inner">
          <div>
            <span className="eyebrow eyebrow--rule">Novedades</span>
            <h1 className="page-masthead__title">
              Lo último <em>del atelier</em>
            </h1>
          </div>
          <p className="page-masthead__copy">
            Recién llegados y piezas que el atelier elige destacar. Cada semana,
            una nueva forma de habitar IS NOIR.
          </p>
        </div>
      </header>

      {loading ? (
        <section className="novedades-section">
          <div className="container-wide">
            <SectionHeading
              eyebrow="Recién llegado"
              title="Lo más nuevo"
              copy="Cargando las últimas piezas del atelier."
            />
            <ProductSkeletons />
          </div>
        </section>
      ) : error ? (
        <section className="novedades-section">
          <div className="container-wide">
            <div className="catalog-message">
              <Butterfly className="catalog-message__butterfly" />
              <h3>El atelier está tomando un respiro</h3>
              <p>{error}</p>
              {onRetry ? (
                <button type="button" className="button-outline" onClick={onRetry}>
                  Reintentar
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="novedades-section">
            <div className="container-wide">
              <SectionHeading
                eyebrow="Recién llegado"
                title="Lo más nuevo"
                copy="Una selección marcada por el atelier para que descubras lo que acaba de entrar en la colección."
              />
              {latestFallback.length ? (
                <div className="product-grid">
                  {latestFallback.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={onSelectProduct}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Las novedades están en camino."
                  copy="Muy pronto verás aquí las primeras piezas de esta temporada."
                />
              )}
            </div>
          </section>

          <section className="novedades-section novedades-section--soft">
            <div className="container-wide">
              <SectionHeading
                eyebrow="Las favoritas"
                title="Lo más solicitado"
                copy="La lista se escribe sola: cada vez que una pieza se abre o se consulta, su historia suma."
              />
              {mostRequested.length ? (
                <div className="product-grid">
                  {mostRequested.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={onSelectProduct}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Las favoritas aún se están escribiendo."
                  copy="Cuando una pieza se vuelva imprescindible, la verás aquí."
                />
              )}
            </div>
          </section>

          <section className="novedades-section novedades-section--bestsellers">
            <div className="container-wide">
              <SectionHeading
                eyebrow="Ya encontraron su lugar"
                title="Lo más vendido"
                copy="Piezas confirmadas por el atelier. El orden se actualiza automáticamente con cada venta."
              />
              {bestSellers.length ? (
                <div className="product-grid">
                  {bestSellers.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={onSelectProduct}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Las primeras ventas están por llegar."
                  copy="En cuanto una pieza encuentre su casa, aparecerá en esta selección."
                />
              )}
            </div>
          </section>
        </>
      )}

      <section className="novedades-journal" aria-labelledby="novedades-journal-title">
        <div className="container-wide novedades-journal__inner">
          <div>
            <span className="eyebrow eyebrow--light eyebrow--rule">El diario del atelier</span>
            <h2 id="novedades-journal-title" className="section-title">
              Historias <em>de la maison</em>
            </h2>
            <p>
              Procesos, inspiraciones y pequeños rituales. La colección también
              se cuenta en palabras.
            </p>
          </div>
          <div className="novedades-journal__actions">
            <Newspaper size={38} strokeWidth={0.9} />
            <button type="button" className="button-primary button-primary--light" onClick={onOpenNews}>
              Leer el Diario del Atelier
              <ArrowRight size={16} strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </section>

      <section className="about-cta novedades-cta">
        <div className="container-wide">
          <span className="eyebrow">Sigue explorando</span>
          <h2>La colección completa te espera.</h2>
          <button type="button" className="button-primary" onClick={onExplore}>
            Ver toda la colección
            <ArrowRight size={16} strokeWidth={1.4} />
          </button>
        </div>
      </section>
    </div>
  )
}
