import { useEffect, useState } from 'react'
import { ArrowRight, Newspaper, Sparkles } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { Butterfly } from '../components/Logo'
import { formatDate, resolveProductImage } from '../lib/format'
import { fetchPublicNews } from '../services/newsService'

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

export default function NovedadesPage({
  products = [],
  loading = false,
  error = '',
  errorDetail = '',
  onRetry,
  onSelectProduct,
  onExplore,
}) {
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [expandedNews, setExpandedNews] = useState(() => new Set())

  useEffect(() => {
    let active = true

    async function loadNews() {
      setNewsLoading(true)
      setNewsError('')
      try {
        const data = await fetchPublicNews()
        if (active) setNews(data)
      } catch {
        if (active) {
          setNewsError('El diario del atelier está tomando un respiro. Vuelve pronto.')
        }
      } finally {
        if (active) setNewsLoading(false)
      }
    }

    loadNews()
    return () => {
      active = false
    }
  }, [])

  const latest = products
    .filter((product) => product.es_novedad)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)
  const latestFallback = latest.length ? latest : products.slice(0, 4)
  const mostRequested = [...products]
    .filter((product) => Number(product.solicitudes) > 0)
    .sort((a, b) => Number(b.solicitudes) - Number(a.solicitudes))
    .slice(0, 4)

  const toggleNews = (id) => {
    setExpandedNews((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
            Recién llegados, piezas que se están volviendo favoritas y las
            historias que se escriben dentro de IS NOIR.
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
              {errorDetail ? (
                <p className="catalog-message__technical">
                  Detalle técnico (solo administrador): {errorDetail}
                </p>
              ) : null}
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
                <div className="novedades-empty">
                  <Sparkles size={24} strokeWidth={1.1} />
                  <h3>Las novedades están en camino.</h3>
                  <p>Muy pronto verás aquí las primeras piezas de esta temporada.</p>
                </div>
              )}
            </div>
          </section>

          <section className="novedades-section novedades-section--soft">
            <div className="container-wide">
              <SectionHeading
                eyebrow="Las favoritas"
                title="Lo más solicitado"
                copy="Las piezas que más han pedido y que ya son parte del imaginario IS NOIR."
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
                <div className="novedades-empty">
                  <Sparkles size={24} strokeWidth={1.1} />
                  <h3>Las favoritas aún se están escribiendo.</h3>
                  <p>Cuando una pieza se vuelva imprescindible, la verás aquí.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section className="novedades-news" aria-labelledby="novedades-news-title">
        <div className="container-wide">
          <div className="novedades-news__head">
            <div>
              <span className="eyebrow eyebrow--light eyebrow--rule">El diario del atelier</span>
              <h2 id="novedades-news-title" className="section-title">
                Noticias <em>IS NOIR</em>
              </h2>
            </div>
            <Newspaper className="novedades-news__mark" size={48} strokeWidth={0.9} />
          </div>

          {newsLoading ? (
            <div className="novedades-news__state">
              <span className="shimmer novedades-news__loading" />
              <span className="shimmer novedades-news__loading novedades-news__loading--short" />
            </div>
          ) : newsError ? (
            <div className="novedades-news__state">
              <p>{newsError}</p>
            </div>
          ) : news.length ? (
            <div className="novedades-news__grid">
              {news.map((item) => {
                const isOpen = expandedNews.has(item.id)
                return (
                  <article
                    key={item.id}
                    className={`news-card ${isOpen ? 'is-open' : ''}`}
                  >
                    {item.imagen_url ? (
                      <div className="news-card__media">
                        <img
                          src={resolveProductImage(item.imagen_url)}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="news-card__media news-card__media--mark" aria-hidden="true">
                        <Butterfly />
                      </div>
                    )}
                    <div className="news-card__body">
                      <span className="news-card__date">{formatDate(item.created_at)}</span>
                      <h3>{item.titulo}</h3>
                      <p className="news-card__summary">{item.resumen}</p>
                      <p className="news-card__content">{item.contenido}</p>
                      {item.contenido?.length > item.resumen?.length ? (
                        <button
                          type="button"
                          className="text-button"
                          aria-expanded={isOpen}
                          onClick={() => toggleNews(item.id)}
                        >
                          {isOpen ? 'Leer menos' : 'Leer noticia'}
                          <ArrowRight
                            size={14}
                            strokeWidth={1.4}
                            className={isOpen ? 'is-rotated' : ''}
                          />
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="novedades-news__state">
              <Sparkles size={22} strokeWidth={1.1} />
              <h3>El diario abre pronto.</h3>
              <p>El atelier está preparando sus próximas historias.</p>
            </div>
          )}
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
