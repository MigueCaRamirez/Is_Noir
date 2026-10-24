import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Menu,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'
import Logo, { Sparkle } from './Logo'

const NAV_LINKS = [
  { label: 'Inicio', path: '/' },
  { label: 'Tienda', path: '/coleccion', shop: true },
  { label: 'Novedades', path: '/novedades' },
  { label: 'Atelier', path: '/noticias' },
  { label: 'Nosotros', path: '/nosotros' },
]

export default function Navbar({
  currentPath = '/',
  activeCollection = 'Todas',
  onNavigate,
  onOpenCollection,
  onOpenCart,
  onOpenAdmin,
  onOpenCollections,
  cartCount = 0,
  collections = ['Old Money', 'Alternativo'],
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const collectionRef = useRef(null)

  const collectionChoices = [
    { label: 'Todas las piezas', value: 'Todas' },
    ...collections.map((collection) => ({ label: collection, value: collection })),
  ]

  useEffect(() => {
    if (!menuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (collectionRef.current && !collectionRef.current.contains(event.target)) {
        setCollectionOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  const chooseCollection = (value) => {
    onOpenCollection?.({ collection: value })
    setCollectionOpen(false)
    setMenuOpen(false)
  }

  const goToLink = (event, link) => {
    event.preventDefault()
    setMenuOpen(false)
    setCollectionOpen(false)

    if (link.shop) {
      onOpenCollection?.({})
      return
    }

    onNavigate?.(link.path)
  }

  const openCollections = () => {
    setMenuOpen(false)
    onOpenCollections?.()
  }

  const accountAction = () => {
    setMenuOpen(false)
    onOpenAdmin?.()
  }

  return (
    <>
      <div className="announcement-bar">
        <div className="announcement-bar__inner">
          <span className="announcement-bar__edition">
            <Sparkle className="h-2.5 w-2.5" />
            BOUTIQUE · ATELIER · ACCESSOIRES
            <Sparkle className="h-2.5 w-2.5" />
          </span>
          <span className="announcement-bar__script">Plus qu&apos;un style, une vibe ♥</span>
        </div>
      </div>

      <header className="site-header">
        <div className="site-header__inner">
          <nav className="nav-desktop" aria-label="Navegación principal">
            <button
              type="button"
              className="nav-icon nav-menu-button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.path}
                className={`nav-link ${currentPath === link.path ? 'is-active' : ''}`}
                aria-current={currentPath === link.path ? 'page' : undefined}
                onClick={(event) => goToLink(event, link)}
              >
                {link.label}
              </a>
            ))}
            <div className="nav-collection" ref={collectionRef}>
              <button
                type="button"
                className="nav-link nav-collection__trigger"
                aria-expanded={collectionOpen}
                onClick={() => setCollectionOpen((open) => !open)}
              >
                Colección
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={collectionOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                />
              </button>
              {collectionOpen ? (
                <div className="collection-dropdown animate-scale-in">
                  <p className="collection-dropdown__title">Selecciona tu estilo</p>
                  {collectionChoices.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      className={`collection-dropdown__item ${
                        activeCollection === choice.value ? 'is-active' : ''
                      }`}
                      onClick={() => chooseCollection(choice.value)}
                    >
                      <span>{choice.label}</span>
                      <span className="collection-dropdown__dot" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <a
            href="/"
            className="site-header__logo"
            aria-label="IS NOIR, ir al inicio"
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.('/')
            }}
          >
            <Logo size="sm" />
          </a>

          <div className="header-actions">
            <button
              type="button"
              className="nav-icon nav-icon--account"
              aria-label="Acceso administración"
              onClick={accountAction}
            >
              <UserRound size={19} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="nav-icon nav-icon--bag"
              aria-label={`Abrir carrito, ${cartCount} artículos`}
              onClick={onOpenCart}
            >
              <ShoppingBag size={20} strokeWidth={1.45} />
              <span className="cart-badge">{cartCount}</span>
            </button>
            <button
              type="button"
              className="nav-icon nav-icon--mobile"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="mobile-menu__head">
            <Logo size="sm" />
            <button type="button" className="nav-icon" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
              <X size={22} strokeWidth={1.4} />
            </button>
          </div>
          <nav className="mobile-menu__links" aria-label="Navegación móvil">
            {NAV_LINKS.map((link, index) => (
              <a
                key={link.label}
                href={link.path}
                className={currentPath === link.path ? 'is-active' : ''}
                aria-current={currentPath === link.path ? 'page' : undefined}
                onClick={(event) => goToLink(event, link)}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span>0{index + 1}</span>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mobile-menu__collections">
            <p className="eyebrow">Selecciona tu estilo</p>
            {collectionChoices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={activeCollection === choice.value ? 'is-active' : ''}
                onClick={() => chooseCollection(choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <div className="mobile-menu__foot">
            <button type="button" onClick={accountAction} className="link-underline">
              Acceso administración
            </button>
            <button type="button" onClick={openCollections} className="link-underline">
              Nuestras colecciones
            </button>
          </div>
          <p className="mobile-menu__script">Plus qu&apos;un style, une vibe ♥</p>
        </div>
      ) : null}
    </>
  )
}
