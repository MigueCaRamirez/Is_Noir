import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Archive,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  Newspaper,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatCOP, formatDate, formatDateTime, resolveProductImage } from '../lib/format'
import {
  deleteProduct,
  fetchAdminProducts,
  getProductErrorMessage,
  setProductDraft,
} from '../services/productService'
import {
  deleteNews,
  fetchAdminNews,
  setNewsPublished,
} from '../services/newsService'
import { fetchSizeGuides } from '../services/sizeGuideService'
import AdminProductForm from './AdminProductForm'
import AdminNewsForm from './AdminNewsForm'
import AdminReservationsPanel from './AdminReservationsPanel'
import AdminSizeGuideForm from './AdminSizeGuideForm'
import AdminTaxonomyManager from './AdminTaxonomyManager'
import Logo, { Butterfly } from './Logo'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Borradores' },
]

const ADMIN_TABS = [
  { id: 'inventario', label: 'Inventario y Productos', icon: Boxes },
  { id: 'noticias', label: 'Gestionar Noticias / Atelier', icon: Newspaper },
  { id: 'reservas', label: 'Pedidos Apartados / En Proceso', icon: Clock3 },
  { id: 'configuracion', label: 'Configuración de Catálogo', icon: SlidersHorizontal },
]

function StatCard({ icon: Icon, label, value, hint, accent = false }) {
  return (
    <div className={`admin-stat ${accent ? 'admin-stat--accent' : ''}`}>
      <span className="admin-stat__icon">
        <Icon size={19} strokeWidth={1.3} />
      </span>
      <span className="admin-stat__label">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

export default function AdminDashboard({ onClose, onCatalogChanged }) {
  const { user, isAdmin, signOut } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(null)
  const [busyIds, setBusyIds] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('Todo')
  const [editor, setEditor] = useState({ open: false, product: null })
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [newsBusyIds, setNewsBusyIds] = useState([])
  const [newsEditor, setNewsEditor] = useState({ open: false, item: null })
  const [sizeGuides, setSizeGuides] = useState(null)
  const [sizeGuideEditor, setSizeGuideEditor] = useState({ open: false, tipo: 'Ropa' })
  const [activeTab, setActiveTab] = useState('inventario')
  const [activeReservations, setActiveReservations] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const notify = useCallback((type, message) => {
    setNotice({ type, message })
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const loadProducts = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchAdminProducts()
      setProducts(data)
    } catch (error) {
      setLoadError(getProductErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const loadNews = useCallback(async () => {
    if (!isAdmin) return
    setNewsLoading(true)
    setNewsError('')
    try {
      const data = await fetchAdminNews()
      setNews(data)
    } catch (error) {
      setNewsError(error.message || 'No pudimos cargar las noticias.')
    } finally {
      setNewsLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadNews()
  }, [loadNews])

  const loadSizeGuides = useCallback(async () => {
    if (!isAdmin) return
    const data = await fetchSizeGuides()
    setSizeGuides(data)
  }, [isAdmin])

  useEffect(() => {
    loadSizeGuides()
  }, [loadSizeGuides])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (
        event.key === 'Escape'
        && !editor.open
        && !newsEditor.open
        && !sizeGuideEditor.open
      ) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, editor.open, newsEditor.open, sizeGuideEditor.open])

  const stats = useMemo(() => {
    const published = products.filter((product) => !product.borrador).length
    const drafts = products.length - published
    const lowStock = products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 3).length
    const soldOut = products.filter((product) => Number(product.stock) === 0).length
    const inventoryValue = products.reduce(
      (total, product) => total + Number(product.precio) * Number(product.stock),
      0,
    )
    return { published, drafts, lowStock, soldOut, inventoryValue }
  }, [products])

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase()
    return products.filter((product) => {
      if (statusFilter === 'published' && product.borrador) return false
      if (statusFilter === 'draft' && !product.borrador) return false
      if (typeFilter !== 'Todo' && product.tipo !== typeFilter) return false
      if (!search) return true
      return [product.nombre, product.subcategoria, product.coleccion, product.tipo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
  }, [products, query, statusFilter, typeFilter])

  const productTypes = useMemo(
    () =>
      [...new Set(products.map((product) => product.tipo).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [products],
  )

  const markBusy = (id, busy) => {
    setBusyIds((current) =>
      busy ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    )
  }

  const handleDraftToggle = async (product) => {
    if (busyIds.includes(product.id)) return
    markBusy(product.id, true)
    try {
      const saved = await setProductDraft(product.id, !product.borrador)
      setProducts((current) => current.map((item) => (item.id === product.id ? saved : item)))
      notify('success', saved.borrador ? 'La pieza volvió a borrador.' : 'La pieza ya está publicada.')
      onCatalogChanged?.()
    } catch (error) {
      notify('error', error.message || 'No se pudo cambiar el estado.')
    } finally {
      markBusy(product.id, false)
    }
  }

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente “${product.nombre}”? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    markBusy(product.id, true)
    try {
      await deleteProduct(product.id)
      setProducts((current) => current.filter((item) => item.id !== product.id))
      notify('success', 'Pieza eliminada del inventario.')
      onCatalogChanged?.()
    } catch (error) {
      notify('error', error.message || 'No se pudo eliminar la pieza.')
    } finally {
      markBusy(product.id, false)
    }
  }

  const openNew = () => setEditor({ open: true, product: null })
  const openEdit = (product) => setEditor({ open: true, product })

  const handleSaved = (saved) => {
    setProducts((current) => {
      const exists = current.some((item) => item.id === saved.id)
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
    })
    setEditor({ open: false, product: null })
    notify('success', saved.borrador ? 'Borrador guardado. Solo tú puedes verlo.' : 'Pieza publicada en la tienda.')
    onCatalogChanged?.()
  }

  const markNewsBusy = (id, busy) => {
    setNewsBusyIds((current) =>
      busy ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    )
  }

  const handleNewsPublished = async (item) => {
    if (newsBusyIds.includes(item.id)) return
    markNewsBusy(item.id, true)
    try {
      const saved = await setNewsPublished(item.id, !item.publicada)
      setNews((current) => current.map((entry) => (entry.id === item.id ? saved : entry)))
      notify('success', saved.publicada ? 'La entrada ya está visible en el Diario del Atelier.' : 'La entrada volvió a borrador.')
    } catch (error) {
      notify('error', error.message || 'No se pudo cambiar el estado de la noticia.')
    } finally {
      markNewsBusy(item.id, false)
    }
  }

  const handleNewsDelete = async (item) => {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente “${item.titulo}”? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    markNewsBusy(item.id, true)
    try {
      await deleteNews(item.id)
      setNews((current) => current.filter((entry) => entry.id !== item.id))
      notify('success', 'Noticia eliminada del diario.')
    } catch (error) {
      notify('error', error.message || 'No se pudo eliminar la noticia.')
    } finally {
      markNewsBusy(item.id, false)
    }
  }

  const openNewNews = () => setNewsEditor({ open: true, item: null })
  const openNewsEdit = (item) => setNewsEditor({ open: true, item })

  const handleNewsSaved = (saved) => {
    setNews((current) => {
      const exists = current.some((entry) => entry.id === saved.id)
      return exists
        ? current.map((entry) => (entry.id === saved.id ? saved : entry))
        : [saved, ...current]
    })
    setNewsEditor({ open: false, item: null })
    notify('success', saved.publicada ? 'Entrada publicada en el Diario del Atelier.' : 'Borrador de noticia guardado.')
  }

  const openSizeGuide = (tipo) => setSizeGuideEditor({ open: true, tipo })

  const handleSizeGuideSaved = (saved) => {
    setSizeGuides((current) => ({
      ...(current ?? {}),
      [saved.tipo]: { ...(current?.[saved.tipo] ?? {}), ...saved },
    }))
    setSizeGuideEditor({ open: false, tipo: 'Ropa' })
    notify('success', `Guía de tallas de ${saved.tipo.toLowerCase()} actualizada.`)
  }

  const refreshAll = () => {
    loadProducts()
    loadNews()
    loadSizeGuides()
  }

  const handleLogout = async () => {
    await signOut()
    onClose?.()
  }

  if (!isAdmin) return null

  return createPortal(
    <div className="admin-shell" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <div className="admin-shell__grain" aria-hidden="true" />
      <header className="admin-header">
        <div className="admin-header__brand">
          <Logo size="sm" tone="light" />
          <span className="admin-header__divider" />
          <div>
            <span className="admin-kicker">Panel de inventario</span>
            <h1 id="admin-title">Atelier privado</h1>
          </div>
        </div>
        <div className="admin-header__actions">
          <div className="admin-bell-wrap" ref={bellRef}>
            <button
              type="button"
              className="admin-icon-button admin-bell"
              onClick={() => setBellOpen((open) => !open)}
              aria-label={`${activeReservations} apartados activos`}
              aria-expanded={bellOpen}
            >
              <Bell size={18} strokeWidth={1.4} />
              {activeReservations > 0 ? (
                <span className="admin-bell__badge">{activeReservations}</span>
              ) : null}
            </button>
            {bellOpen ? (
              <div className="admin-bell-card" role="status">
                <span className="admin-kicker">Tiempo real</span>
                <strong>
                  {activeReservations} apartado{activeReservations === 1 ? '' : 's'} activo
                  {activeReservations === 1 ? '' : 's'}
                </strong>
                <p>El stock de estas piezas está retenido hasta que venza el temporizador.</p>
                <button
                  type="button"
                  className="admin-button admin-button--primary"
                  onClick={() => {
                    setActiveTab('reservas')
                    setBellOpen(false)
                  }}
                >
                  <Clock3 size={14} />
                  Ver apartados
                </button>
              </div>
            ) : null}
          </div>
          <span className="admin-session">
            <ShieldCheck size={14} strokeWidth={1.4} />
            <span>
              <strong>{user?.email}</strong>
              <small>RLS activo</small>
            </span>
          </span>
          <button type="button" className="admin-icon-button" onClick={refreshAll} aria-label="Actualizar inventario y noticias">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="admin-icon-button" onClick={handleLogout} aria-label="Cerrar sesión">
            <LogOut size={18} strokeWidth={1.4} />
          </button>
          <button type="button" className="admin-icon-button admin-icon-button--close" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Secciones del panel">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={1.4} />
              <span>{tab.label}</span>
              {tab.id === 'reservas' && activeReservations > 0 ? (
                <b className="admin-tabs__badge">{activeReservations}</b>
              ) : null}
            </button>
          )
        })}
      </nav>

      <main className="admin-content">
        <div className="admin-tab-panel" hidden={activeTab !== 'inventario'}>
          <section className="admin-intro">
          <div>
            <span className="admin-kicker">Colección viva</span>
            <h2>Tu inventario, <em>en orden.</em></h2>
            <p>Publica, edita y cuida cada pieza. Los borradores quedan fuera de la vitrina.</p>
          </div>
          <button type="button" className="admin-button admin-button--primary admin-button--new" onClick={openNew}>
            <Plus size={17} strokeWidth={1.6} />
            Nueva pieza
          </button>
        </section>

        <section className="admin-stats" aria-label="Resumen de inventario">
          <StatCard icon={Boxes} label="Piezas" value={String(products.length).padStart(2, '0')} hint="en el atelier" />
          <StatCard icon={Eye} label="Publicadas" value={String(stats.published).padStart(2, '0')} hint="visibles en tienda" />
          <StatCard icon={Archive} label="Borradores" value={String(stats.drafts).padStart(2, '0')} hint="solo para el equipo" />
          <StatCard
            icon={CircleDollarSign}
            label="Valor inventario"
            value={formatCOP(stats.inventoryValue)}
            hint={`${stats.lowStock} bajas · ${stats.soldOut} agotadas`}
            accent
          />
        </section>

        <section className="admin-inventory">
          <div className="admin-inventory__head">
            <div>
              <span className="admin-kicker">Inventario</span>
              <h2>Piezas del atelier</h2>
            </div>
            <div className="admin-toolbar">
              <label className="admin-search">
                <Search size={15} strokeWidth={1.4} />
                <input
                  type="search"
                  placeholder="Buscar pieza..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Buscar en inventario"
                />
              </label>
              <label className="admin-select">
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo">
                  <option value="Todo">Todos los tipos</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
              <div className="admin-filter-tabs" role="group" aria-label="Filtrar por estado">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={statusFilter === filter.value ? 'is-active' : ''}
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="admin-state">
              <AlertTriangle size={26} strokeWidth={1.2} />
              <h3>No pudimos cargar el inventario</h3>
              <p>{loadError}</p>
              <button type="button" className="admin-button admin-button--ghost" onClick={loadProducts}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <div className="admin-loading">
              <LoaderCircle size={25} className="animate-spin" />
              <span>Cargando inventario…</span>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="admin-state">
              <Butterfly />
              <h3>No hay piezas para mostrar</h3>
              <p>Crea una nueva pieza o modifica los filtros de búsqueda.</p>
              <button type="button" className="admin-button admin-button--primary" onClick={openNew}>
                <Plus size={15} />
                Nueva pieza
              </button>
            </div>
          ) : (
            <div className="admin-product-table">
              <div className="admin-product-table__head">
                <span>Pieza</span>
                <span>Colección</span>
                <span>Stock</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {visibleProducts.map((product) => {
                const busy = busyIds.includes(product.id)
                const stock = Number(product.stock) || 0
                return (
                  <article className={`admin-product-row ${product.borrador ? 'is-draft' : ''}`} key={product.id}>
                    <div className="admin-product-row__main">
                      <div className="admin-product-row__image">
                        {product.imagen_url ? (
                          <img src={resolveProductImage(product.imagen_url)} alt="" loading="lazy" />
                        ) : (
                          <Package size={19} />
                        )}
                      </div>
                      <div className="admin-product-row__text">
                        <strong>
                          {product.nombre}
                          {product.es_novedad ? (
                            <span className="admin-row-badge">Novedad</span>
                          ) : null}
                        </strong>
                        <span>{product.tipo} · {product.subcategoria || 'Sin categoría'} · {formatCOP(product.precio)}</span>
                        <small>
                          {formatDate(product.created_at)} · {Number(product.solicitudes) || 0} solicitudes · {Number(product.ventas) || 0} vendidas
                        </small>
                      </div>
                    </div>

                    <div className="admin-product-row__collection">
                      <span className={`collection-pill collection-pill--${product.coleccion?.toLowerCase().replace(/\s/g, '-')}`}>
                        {product.coleccion}
                      </span>
                    </div>

                    <div className="admin-stock admin-stock--readonly">
                      <span className={stock === 0 ? 'is-empty' : stock <= 3 ? 'is-low' : ''}>
                        {stock}
                      </span>
                      {stock === 0 ? (
                        <small className="admin-low-badge is-empty">Agotado</small>
                      ) : stock <= 3 ? (
                        <small className="admin-low-badge">Bajo stock</small>
                      ) : null}
                    </div>

                    <div className="admin-product-row__status">
                      <button
                        type="button"
                        className={`status-toggle ${product.borrador ? '' : 'is-published'}`}
                        onClick={() => handleDraftToggle(product)}
                        disabled={busy}
                      >
                        {product.borrador ? <EyeOff size={13} /> : <Eye size={13} />}
                        {product.borrador ? 'Borrador' : 'Publicado'}
                      </button>
                    </div>

                    <div className="admin-product-row__actions">
                      <button type="button" className="admin-icon-button" onClick={() => openEdit(product)} aria-label={`Editar ${product.nombre}`}>
                        <Pencil size={15} strokeWidth={1.4} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-button admin-icon-button--danger"
                        onClick={() => handleDelete(product)}
                        disabled={busy}
                        aria-label={`Eliminar ${product.nombre}`}
                      >
                        <Trash2 size={15} strokeWidth={1.4} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
        </div>

        <div className="admin-tab-panel" hidden={activeTab !== 'reservas'}>
          <AdminReservationsPanel
            onCatalogChanged={() => {
              loadProducts()
              onCatalogChanged?.()
            }}
            notify={notify}
            onActiveCountChange={setActiveReservations}
          />
        </div>

        <div className="admin-tab-panel" hidden={activeTab !== 'configuracion'}>
          <section className="admin-guides" aria-labelledby="admin-guides-title">
          <div className="admin-inventory__head">
            <div>
              <span className="admin-kicker">Medidas de la maison</span>
              <h2 id="admin-guides-title">Guías de tallas</h2>
              <p className="admin-guides__copy">
                La tienda abre esta información desde cada pieza según su categoría.
              </p>
            </div>
          </div>

          <div className="admin-guides__grid">
            {['Ropa', 'Accesorios'].map((tipo) => {
              const guide = sizeGuides?.[tipo]
              return (
                <article className="admin-guide-card" key={tipo}>
                  <div className="admin-guide-card__icon">
                    <Ruler size={20} strokeWidth={1.2} />
                  </div>
                  <div className="admin-guide-card__body">
                    <span className="admin-kicker">{tipo}</span>
                    <h3>{guide?.titulo || `Guía de tallas · ${tipo}`}</h3>
                    <p>
                      {String(guide?.texto ?? '').trim().slice(0, 170)
                        || 'Añade medidas, recomendaciones o una infografía para esta categoría.'}
                      {String(guide?.texto ?? '').length > 170 ? '…' : ''}
                    </p>
                    <small>
                      {guide?.imagen_url ? 'Incluye infografía' : 'Solo texto'}
                      {' · '}
                      Actualizada {guide?.updated_at ? formatDateTime(guide.updated_at) : 'desde el atelier'}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button--ghost"
                    onClick={() => openSizeGuide(tipo)}
                  >
                    <Pencil size={14} />
                    Editar guía
                  </button>
                </article>
              )
            })}
          </div>
        </section>

          <AdminTaxonomyManager
            notify={notify}
            onChanged={() => {
              loadProducts()
              onCatalogChanged?.()
            }}
          />
        </div>

        <div className="admin-tab-panel" hidden={activeTab !== 'noticias'}>
          <section className="admin-news" aria-labelledby="admin-news-title">
          <div className="admin-inventory__head">
            <div>
              <span className="admin-kicker">Noticias · Atelier</span>
              <h2 id="admin-news-title">Diario del Atelier</h2>
              <p className="admin-guides__copy">
                Publica historias con vigencia opcional. Las entradas vencidas se archivan solas.
              </p>
            </div>
            <button type="button" className="admin-button admin-button--primary" onClick={openNewNews}>
              <Plus size={15} />
              Nueva entrada
            </button>
          </div>

          {newsError ? (
            <div className="admin-state">
              <AlertTriangle size={26} strokeWidth={1.2} />
              <h3>No pudimos cargar las noticias</h3>
              <p>{newsError}</p>
              <button type="button" className="admin-button admin-button--ghost" onClick={loadNews}>
                Reintentar
              </button>
            </div>
          ) : newsLoading ? (
            <div className="admin-loading">
              <LoaderCircle size={25} className="animate-spin" />
              <span>Cargando noticias…</span>
            </div>
          ) : news.length === 0 ? (
            <div className="admin-state">
              <Newspaper size={26} strokeWidth={1.2} />
              <h3>El diario está en blanco</h3>
              <p>Crea la primera noticia para contar lo que pasa en el atelier.</p>
              <button type="button" className="admin-button admin-button--primary" onClick={openNewNews}>
                <Plus size={15} />
                Nueva noticia
              </button>
            </div>
          ) : (
            <div className="admin-news-grid">
              {news.map((item) => {
                const busy = newsBusyIds.includes(item.id)
                const expired = Boolean(
                  item.fecha_expiracion
                  && new Date(item.fecha_expiracion).getTime() <= Date.now(),
                )
                return (
                  <article
                    className={`admin-news-card ${item.publicada ? '' : 'is-draft'} ${expired ? 'is-expired' : ''}`}
                    key={item.id}
                  >
                    <div className="admin-news-card__media">
                      {item.imagen_url ? (
                        <img src={resolveProductImage(item.imagen_url)} alt="" loading="lazy" />
                      ) : (
                        <Butterfly />
                      )}
                    </div>
                    <div className="admin-news-card__body">
                      <div className="admin-news-card__meta">
                        <button
                          type="button"
                          className={`status-toggle ${item.publicada && !expired ? 'is-published' : ''}`}
                          onClick={() => handleNewsPublished(item)}
                          disabled={busy}
                        >
                          {item.publicada && expired ? (
                            <Clock3 size={13} />
                          ) : item.publicada ? (
                            <Eye size={13} />
                          ) : (
                            <EyeOff size={13} />
                          )}
                          {item.publicada && expired ? 'Expirada' : item.publicada ? 'Publicada' : 'Borrador'}
                        </button>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <h3>{item.titulo}</h3>
                      <p>{item.resumen}</p>
                      {item.fecha_expiracion ? (
                        <small className="admin-news-card__expiration">
                          <Clock3 size={12} />
                          {expired ? 'Dejó de mostrarse el ' : 'Se ocultará el '}
                          {formatDateTime(item.fecha_expiracion)}
                        </small>
                      ) : (
                        <small className="admin-news-card__expiration">
                          <Clock3 size={12} />
                          Sin fecha de expiración
                        </small>
                      )}
                      <div className="admin-news-card__actions">
                        <button type="button" className="admin-icon-button" onClick={() => openNewsEdit(item)} aria-label={`Editar ${item.titulo}`}>
                          <Pencil size={15} strokeWidth={1.4} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button admin-icon-button--danger"
                          onClick={() => handleNewsDelete(item)}
                          disabled={busy}
                          aria-label={`Eliminar ${item.titulo}`}
                        >
                          <Trash2 size={15} strokeWidth={1.4} />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
        </div>

        <footer className="admin-footer">
          <span><ShieldCheck size={13} /> Acceso protegido por Google OAuth, lista blanca y RLS.</span>
          <span>IS NOIR · {new Date().getFullYear()}</span>
        </footer>
      </main>

      {notice ? (
        <div className={`admin-notice admin-notice--${notice.type} animate-fade-up`} role="status">
          {notice.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notice.message}
        </div>
      ) : null}

      {editor.open ? (
        <AdminProductForm
          key={editor.product?.id ?? 'new'}
          initialProduct={editor.product}
          onSaved={handleSaved}
          onCancel={() => setEditor({ open: false, product: null })}
        />
      ) : null}

      {newsEditor.open ? (
        <AdminNewsForm
          key={newsEditor.item?.id ?? 'new-news'}
          initialNews={newsEditor.item}
          onSaved={handleNewsSaved}
          onCancel={() => setNewsEditor({ open: false, item: null })}
        />
      ) : null}

      {sizeGuideEditor.open ? (
        <AdminSizeGuideForm
          key={sizeGuideEditor.tipo}
          tipo={sizeGuideEditor.tipo}
          guide={sizeGuides?.[sizeGuideEditor.tipo]}
          onSaved={handleSizeGuideSaved}
          onCancel={() => setSizeGuideEditor({ open: false, tipo: 'Ropa' })}
        />
      ) : null}
    </div>,
    document.body,
  )
}
