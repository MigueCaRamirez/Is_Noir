import { useCallback, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import ProductModal from './components/ProductModal'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import AdminLoginModal, { AccessDeniedDialog } from './components/AdminLoginModal'
import AdminDashboard from './components/AdminDashboard'
import HomePage from './pages/HomePage'
import CollectionPage from './pages/CollectionPage'
import AboutPage from './pages/AboutPage'
import NovedadesPage from './pages/NovedadesPage'
import { useAuth } from './context/AuthContext'
import { useCart } from './context/CartContext'
import { fetchPublicProducts } from './services/productService'
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
}

const PAGE_TITLES = {
  [ROUTES.home]: 'IS NOIR · Boutique · Café · Accessoires',
  [ROUTES.collection]: 'La colección · IS NOIR',
  [ROUTES.about]: 'Sobre nosotros · IS NOIR',
  [ROUTES.novedades]: 'Novedades · IS NOIR',
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

  const page = [ROUTES.collection, ROUTES.about, ROUTES.novedades].includes(route)
    ? route
    : ROUTES.home
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

  const loadProducts = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError('')
    try {
      const data = await fetchPublicProducts()
      setProducts(data)
    } catch (error) {
      setCatalogError(
        error.message || 'No pudimos cargar la colección en este momento.',
      )
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

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
            errorDetail={catalogErrorDetail}
            onRetry={loadProducts}
            onSelectProduct={setSelectedProduct}
            onExplore={() => openCollection()}
          />
        ) : page === ROUTES.collection ? (
          <CollectionPage
            products={products}
            loading={catalogLoading}
            error={publicCatalogError}
            errorDetail={catalogErrorDetail}
            onRetry={loadProducts}
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

      <ProductModal product={selectedProduct} onClose={closeProduct} />
      <CartDrawer />

      {adminLoginOpen ? (
        <AdminLoginModal onClose={() => setAdminLoginOpen(false)} />
      ) : null}

      {adminOpen && isAdmin ? (
        <AdminDashboard
          onClose={() => setAdminOpen(false)}
          onCatalogChanged={loadProducts}
        />
      ) : null}

      <AccessDeniedDialog />
    </div>
  )
}
