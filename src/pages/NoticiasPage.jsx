import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Feather,
  X,
} from 'lucide-react'
import { Butterfly } from '../components/Logo'
import { formatDate, resolveProductImage } from '../lib/format'
import { fetchPublicNews } from '../services/newsService'

function ArticleReader({ article, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const paragraphs = String(article?.contenido ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return createPortal(
    <div
      className="journal-reader-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <article
        className="journal-reader animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-reader-title"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar artículo">
          <X size={20} strokeWidth={1.4} />
        </button>

        {article.imagen_url ? (
          <div className="journal-reader__hero">
            <img src={resolveProductImage(article.imagen_url)} alt="" />
          </div>
        ) : (
          <div className="journal-reader__hero journal-reader__hero--mark" aria-hidden="true">
            <Butterfly />
          </div>
        )}

        <div className="journal-reader__body">
          <div className="journal-reader__meta">
            <span className="eyebrow eyebrow--rule">Diario del Atelier</span>
            <span>
              <CalendarDays size={13} strokeWidth={1.3} />
              {formatDate(article.created_at)}
            </span>
          </div>
          <h1 id="journal-reader-title">{article.titulo}</h1>
          {article.resumen ? <p className="journal-reader__lead">{article.resumen}</p> : null}
          <span className="journal-reader__ornament" aria-hidden="true">
            <i />
            <Feather size={15} strokeWidth={1.2} />
            <i />
          </span>
          <div className="journal-reader__copy">
            {paragraphs.length ? (
              paragraphs.map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
              ))
            ) : (
              <p>{article.contenido}</p>
            )}
          </div>
          <div className="journal-reader__foot">
            <span>IS NOIR · Cúcuta</span>
            <button type="button" className="text-button" onClick={onClose}>
              Volver al diario
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  )
}

function JournalSkeletons() {
  return (
    <div className="journal-skeletons" aria-label="Cargando el diario">
      <span className="journal-skeleton journal-skeleton--hero shimmer" />
      <div>
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index} className="journal-skeleton journal-skeleton--line shimmer" />
        ))}
      </div>
    </div>
  )
}

export default function NoticiasPage({ onNavigate, onExplore }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)

  useEffect(() => {
    let active = true

    async function loadNews() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchPublicNews()
        if (active) setNews(data)
      } catch {
        if (active) {
          setError('El diario del atelier está tomando un respiro. Vuelve pronto.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadNews()
    return () => {
      active = false
    }
  }, [])

  const [featured, ...archive] = news

  return (
    <div className="page page--journal">
      <header className="page-masthead journal-masthead">
        <div className="container-wide page-masthead__inner">
          <div>
            <span className="eyebrow eyebrow--rule">Noticias · Atelier</span>
            <h1 className="page-masthead__title">
              Diario <em>del Atelier</em>
            </h1>
          </div>
          <p className="page-masthead__copy">
            Notas de la maison: procesos, inspiraciones y la vida que ocurre
            alrededor de cada colección.
          </p>
        </div>
        <span className="journal-masthead__ornament" aria-hidden="true">
          <Butterfly />
        </span>
      </header>

      <section className="journal-section">
        <div className="container-wide">
          {loading ? (
            <JournalSkeletons />
          ) : error ? (
            <div className="journal-empty">
              <BookOpen size={30} strokeWidth={1} />
              <h2>El diario está tomando un respiro.</h2>
              <p>{error}</p>
            </div>
          ) : news.length === 0 ? (
            <div className="journal-empty">
              <Feather size={30} strokeWidth={1} />
              <h2>La primera página está en blanco.</h2>
              <p>El atelier está preparando sus próximas historias. Vuelve pronto.</p>
              <button type="button" className="button-outline" onClick={onExplore}>
                Explorar la colección
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <article className="journal-featured">
                <button
                  type="button"
                  className="journal-featured__media"
                  onClick={() => setSelectedArticle(featured)}
                  aria-label={`Leer ${featured.titulo}`}
                >
                  {featured.imagen_url ? (
                    <img src={resolveProductImage(featured.imagen_url)} alt="" />
                  ) : (
                    <span className="journal-featured__placeholder">
                      <Butterfly />
                    </span>
                  )}
                  <span className="journal-featured__edition">Edición actual</span>
                </button>
                <div className="journal-featured__body">
                  <span className="journal-date">
                    <CalendarDays size={13} strokeWidth={1.3} />
                    {formatDate(featured.created_at)}
                  </span>
                  <h2>{featured.titulo}</h2>
                  <p>{featured.resumen}</p>
                  <button
                    type="button"
                    className="text-button text-button--large"
                    onClick={() => setSelectedArticle(featured)}
                  >
                    Leer la historia
                    <ArrowUpRight size={15} strokeWidth={1.4} />
                  </button>
                </div>
              </article>

              {archive.length ? (
                <div className="journal-archive">
                  <div className="journal-archive__head">
                    <span className="eyebrow eyebrow--rule">Archivo del atelier</span>
                    <span>{archive.length} {archive.length === 1 ? 'entrada' : 'entradas'}</span>
                  </div>
                  <div className="journal-archive__list">
                    {archive.map((article) => (
                      <button
                        type="button"
                        className="journal-row"
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                      >
                        <span className="journal-row__date">{formatDate(article.created_at)}</span>
                        <span className="journal-row__body">
                          <strong>{article.titulo}</strong>
                          <span>{article.resumen}</span>
                        </span>
                        <span className="journal-row__arrow">
                          <ArrowUpRight size={17} strokeWidth={1.3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="journal-cta">
        <div className="container-wide journal-cta__inner">
          <div>
            <span className="eyebrow eyebrow--light">Nuevas piezas</span>
            <h2>La colección también tiene algo que contar.</h2>
          </div>
          <div className="journal-cta__actions">
            <button
              type="button"
              className="button-primary button-primary--light"
              onClick={() => onNavigate?.('/novedades')}
            >
              Ver Novedades
              <ArrowRight size={16} />
            </button>
            <button type="button" className="button-outline button-outline--light" onClick={onExplore}>
              Toda la colección
            </button>
          </div>
        </div>
      </section>

      {selectedArticle ? (
        <ArticleReader article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      ) : null}
    </div>
  )
}
