import { useCallback, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import ProductModal from './components/ProductModal'
import Footer from './components/Footer'
import FloatingLinks from './components/FloatingLinks'
import CartDrawer from './components/CartDrawer'
import AdminLoginModal, { AccessDeniedDialog } from './components/AdminLoginModal'
import AdminDashboard from './components/AdminDashboard'
import HomePage from './pages/HomePage'
import CollectionPage from './pages/CollectionPage'
import AboutPage from './pages/AboutPage'
import NovedadesPage from './pages/NovedadesPage'
import NoticiasPage from './pages/NoticiasPage'
import { useAuth } from './context/AuthContext'
import { useCart } from './context/CartContext'
import { supabase } from './lib/supabaseClient'
import { fetchPublicProducts } from './services/productService'
import { fetchSizeGuides } from './services/sizeGuideService'
import { COLLECTION_THEMES } from './data/catalogOptions'

const EMPTY_FILTERS = {
  collection: 'Todas',
  tipo: 'Todo',
  subcategoria: 'Todas',
  sort: 'recent',
  onlyAvailable: false,
}

const ROUTES = {
  home: '/',
  collection: '/coleccion',
  about: '/nosotros',
  novedades: '/novedades',
  news: '/noticias',
}

const PAGE_TITLES = {
  [ROUTES.home]: 'IS NOIR · Boutique · Accessoires',
  [ROUTES.collection]: 'La colección · IS NOIR',
  [ROUTES.about]: 'Sobre nosotros · IS NOIR',
  [ROUTES.novedades]: 'Novedades · IS NOIR',
  [ROUTES.news]: 'Diario del Atelier · IS NOIR',
}

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

function resolveRoute(pathname = '/') {
  let path = pathname.replace(/\/+$/, '') || '/'

  if (BASE_PATH) {
    if (path === BASE_PATH) path = '/'
    else if (path.startsWith(`${BASE_PATH}/`)) path = path.slice(BASE_PATH.length)
  }

  return path || '/'
}

function browserPath(path) {
  return `${BASE_PATH}${path === '/' ? '/' : path}` || '/'
}

export default function App() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { itemCount, openCart } = useCart()

  const [route, setRoute] = useState(() => resolveRoute(window.location.pathname))
  const [products, setProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adminLoginOpen, setAdminLoginOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [sizeGuides, setSizeGuides] = useState(null)

  const page = [ROUTES.collection, ROUTES.about, ROUTES.novedades, ROUTES.news].includes(route)
    ? route
    : ROUTES.home
  const activeProduct = selectedProduct
    ? products.find((product) => product.id === selectedProduct.id) || selectedProduct
    : null
  const theme =
    page === ROUTES.collection
      ? COLLECTION_THEMES[filters.collection] || 'split'
      : 'split'
  const publicCatalogError = catalogError
    ? 'No pudimos cargar la colección en este momento. Intenta de nuevo en unos minutos.'
    : ''
  const catalogErrorDetail = isAdmin ? catalogError : ''

  const navigate = useCallback((path, { section } = {}) => {
    const nextPath = path.replace(/\/+$/, '') || '/'
    const target = browserPath(nextPath)
    const current = window.location.pathname.replace(/\/+$/, '') || '/'

    if (current !== target) {
      window.history.pushState({}, '', target)
    }

    setRoute(nextPath)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (section) {
          document
            .getElementById(section)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }

        window.scrollTo({
          top: 0,
          behavior: current === target ? 'smooth' : 'auto',
        })
      })
    })
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRoute(window.location.pathname))
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.title = PAGE_TITLES[page] || PAGE_TITLES[ROUTES.home]
  }, [page])

  const loadProducts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setCatalogLoading(true)
    try {
      const data = await fetchPublicProducts()
      setProducts(data)
      setCatalogError('')
    } catch (error) {
      if (!silent) {
        setCatalogError(
          error.message || 'No pudimos cargar la colección en este momento.',
        )
      }
    } finally {
      if (!silent) setCatalogLoading(false)
    }
  }, [])

  const loadSizeGuides = useCallback(async () => {
    try {
      const data = await fetchSizeGuides()
      setSizeGuides(data)
    } catch {
      // Las guías locales de respaldo siguen disponibles en el modal.
    }
  }, [])

  useEffect(() => {
    loadProducts()
    loadSizeGuides()
  }, [loadProducts, loadSizeGuides])

  useEffect(() => {
    if (!supabase) return undefined

    let reloadTimer = null
    let guidesTimer = null
    const scheduleProducts = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => loadProducts({ silent: true }), 280)
    }
    const scheduleGuides = () => {
      window.clearTimeout(guidesTimer)
      guidesTimer = window.setTimeout(() => loadSizeGuides(), 280)
    }

    const channel = supabase
      .channel('isnoir-public-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        scheduleProducts,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guias_tallas' },
        scheduleGuides,
      )
      .subscribe()

    const onAvailabilityChange = () => scheduleProducts()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadProducts({ silent: true })
    }
    const pollTimer = window.setInterval(() => {
      loadProducts({ silent: true })
    }, 60000)

    window.addEventListener('isnoir:availability-changed', onAvailabilityChange)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(reloadTimer)
      window.clearTimeout(guidesTimer)
      window.clearInterval(pollTimer)
      window.removeEventListener('isnoir:availability-changed', onAvailabilityChange)
      document.removeEventListener('visibilitychange', onVisibility)
      supabase.removeChannel(channel)
    }
  }, [loadProducts, loadSizeGuides])

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'alternativo'
    root.dataset.theme = theme
    root.style.colorScheme = isDark ? 'dark' : 'light'
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        isDark ? '#171717' : theme === 'oldmoney' ? '#ede7dd' : '#f7f3ec',
      )
  }, [theme])

  useEffect(() => {
    if (isAdmin && sessionStorage.getItem('isnoir-admin-intent') === '1') {
      sessionStorage.removeItem('isnoir-admin-intent')
      setAdminLoginOpen(false)
      setAdminOpen(true)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!authLoading && !isAdmin) setAdminOpen(false)
  }, [authLoading, isAdmin])

  const openAdmin = useCallback(() => {
    if (isAdmin) {
      setAdminOpen(true)
      return
    }
    setAdminLoginOpen(true)
  }, [isAdmin])

  useEffect(() => {
    const onKeyDown = (event) => {
      const isAdminShortcut =
        event.ctrlKey &&
        event.shiftKey &&
        String(event.key).toLowerCase() === 'a'
      if (!isAdminShortcut) return
      event.preventDefault()
      openAdmin()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openAdmin])

  const openCollection = useCallback(
    (nextFilters = {}, options = {}) => {
      setFilters({ ...EMPTY_FILTERS, ...nextFilters })
      if (!options.keepSearch) setSearchQuery('')
      navigate(ROUTES.collection, { section: options.section })
    },
    [navigate],
  )

  const selectCollection = useCallback(
    (collection) => {
      openCollection({ collection: collection || 'Todas' })
    },
    [openCollection],
  )

  const selectCategory = useCallback(
    (tipo) => {
      if (tipo === 'Novedades') {
        navigate(ROUTES.novedades)
        return
      }
      openCollection({ tipo })
    },
    [navigate, openCollection],
  )

  const openCollections = useCallback(() => {
    navigate(ROUTES.home, { section: 'colecciones' })
  }, [navigate])

  const closeProduct = useCallback(() => setSelectedProduct(null), [])

  return (
    <div className="app-shell">
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>

      <Navbar
        currentPath={page}
        activeCollection={filters.collection}
        onNavigate={navigate}
        onOpenCollection={openCollection}
        onOpenCart={openCart}
        onOpenAdmin={openAdmin}
        onOpenCollections={openCollections}
        cartCount={itemCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main id="contenido">
        {page === ROUTES.about ? (
          <AboutPage onExplore={() => openCollection()} />
        ) : page === ROUTES.novedades ? (
          <NovedadesPage
            products={products}
            loading={catalogLoading}
            error={publicCatalogError}
            onRetry={() => loadProducts()}
            onSelectProduct={setSelectedProduct}
            onExplore={() => openCollection()}
            onOpenNews={() => navigate(ROUTES.news)}
          />
        ) : page === ROUTES.news ? (
          <NoticiasPage
            onNavigate={navigate}
            onExplore={() => openCollection()}
          />
        ) : page === ROUTES.collection ? (
          <CollectionPage
            products={products}
            loading={catalogLoading}
            error={publicCatalogError}
            errorDetail={catalogErrorDetail}
            onRetry={() => loadProducts()}
            filters={filters}
            onFiltersChange={setFilters}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onSelectProduct={setSelectedProduct}
          />
        ) : (
          <HomePage
            onExplore={selectCollection}
            onSelectCategory={selectCategory}
          />
        )}
      </main>

      <Footer
        onAdminTrigger={openAdmin}
        onNavigate={navigate}
        onExplore={() => openCollection()}
        onOpenCollections={openCollections}
      />

      <FloatingLinks />

      <ProductModal
        key={activeProduct?.id ?? 'closed'}
        product={activeProduct}
        sizeGuide={sizeGuides?.[activeProduct?.tipo]}
        onClose={closeProduct}
      />
      <CartDrawer onGoToShop={() => openCollection({}, { section: 'tienda' })} />

      {adminLoginOpen ? (
        <AdminLoginModal onClose={() => setAdminLoginOpen(false)} />
      ) : null}

      {adminOpen && isAdmin ? (
        <AdminDashboard
          onClose={() => setAdminOpen(false)}
          onCatalogChanged={() => loadProducts({ silent: true })}
        />
      ) : null}

      <AccessDeniedDialog />
    </div>
  )
}
