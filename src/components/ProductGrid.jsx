import { useMemo } from 'react'
import { RotateCcw, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from './ProductCard'
import { Butterfly } from './Logo'
import { getAvailableStock } from '../lib/format'
import { SORT_OPTIONS } from '../data/catalogOptions'

const EMPTY_FILTERS = {
  collection: 'Todas',
  tipo: 'Todo',
  subcategoria: 'Todas',
  sort: 'recent',
  onlyAvailable: false,
}

export default function ProductGrid({
  products = [],
  loading = false,
  error = '',
  errorDetail = '',
  onRetry,
  filters,
  onFiltersChange,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  onSelectProduct,
  taxonomies = null,
}) {
  const activeFilters = { ...EMPTY_FILTERS, ...filters }

  const collections = useMemo(() => {
    const configured = (taxonomies?.coleccion ?? []).map((item) => item.nombre)
    const used = products.map((product) => product.coleccion)
    return [...new Set([...configured, ...used].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [products, taxonomies])

  const types = useMemo(() => {
    const configured = (taxonomies?.tipo ?? []).map((item) => item.nombre)
    const used = products.map((product) => product.tipo)
    return [...new Set([...configured, ...used].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [products, taxonomies])

  const subcategories = useMemo(() => {
    const configured = (taxonomies?.subcategoria ?? []).map((item) => item.nombre)
    const used = products.map((product) => product.subcategoria).filter(Boolean)
    const values = new Set([...configured, ...used].map((value) => String(value).trim()))
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  }, [products, taxonomies])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let result = [...products]

    if (activeFilters.collection !== 'Todas') {
      result = result.filter((product) => product.coleccion === activeFilters.collection)
    }
    if (activeFilters.tipo !== 'Todo') {
      result = result.filter((product) => product.tipo === activeFilters.tipo)
    }
    if (activeFilters.subcategoria !== 'Todas') {
      result = result.filter((product) => product.subcategoria === activeFilters.subcategoria)
    }
    if (activeFilters.onlyAvailable) {
      result = result.filter((product) => getAvailableStock(product) > 0)
    }
    if (query) {
      result = result.filter((product) =>
        [product.nombre, product.coleccion, product.tipo, product.subcategoria]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
    }

    switch (activeFilters.sort) {
      case 'price-asc':
        result.sort((a, b) => Number(a.precio) - Number(b.precio))
        break
      case 'price-desc':
        result.sort((a, b) => Number(b.precio) - Number(a.precio))
        break
      case 'name':
        result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        break
      case 'best-sellers':
        result.sort(
          (a, b) =>
            Number(b.ventas) - Number(a.ventas)
            || Number(b.solicitudes) - Number(a.solicitudes)
            || new Date(b.created_at) - new Date(a.created_at),
        )
        break
      case 'most-requested':
        result.sort(
          (a, b) =>
            Number(b.solicitudes) - Number(a.solicitudes)
            || Number(b.ventas) - Number(a.ventas)
            || new Date(b.created_at) - new Date(a.created_at),
        )
        break
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return result
  }, [products, activeFilters, searchQuery])

  const updateFilter = (key, value) => {
    onFiltersChange?.({ ...activeFilters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange?.(EMPTY_FILTERS)
    onClearSearch?.()
  }

  const hasActiveFilters =
    activeFilters.collection !== 'Todas' ||
    activeFilters.tipo !== 'Todo' ||
    activeFilters.subcategoria !== 'Todas' ||
    activeFilters.onlyAvailable ||
    Boolean(searchQuery.trim())

  return (
    <section id="tienda" className="product-section">
      <div className="container-wide">
        <div className="shop-heading">
          <div>
            <span className="eyebrow eyebrow--rule">Selección del atelier</span>
            <h2 className="section-title">Nuestros favoritos</h2>
          </div>
          <p className="shop-heading__count">
            {loading ? 'Cargando piezas…' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'pieza' : 'piezas'}`}
          </p>
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search">
            <Search size={17} strokeWidth={1.5} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Buscar por nombre, colección o categoría…"
              aria-label="Buscar en la colección"
            />
            {searchQuery ? (
              <button
                type="button"
                className="catalog-search__clear"
                onClick={onClearSearch}
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            ) : null}
          </label>

          <div className="filter-tabs" role="group" aria-label="Filtrar por categoría">
            {['Todo', ...types].map((type) => (
              <button
                key={type}
                type="button"
                className={activeFilters.tipo === type ? 'is-active' : ''}
                onClick={() => updateFilter('tipo', type)}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="filter-controls">
            <span className="filter-controls__label">
              <SlidersHorizontal size={14} strokeWidth={1.4} />
              Afinar
            </span>
            <label className="select-wrap">
              <span className="sr-only">Filtrar por colección</span>
              <select
                value={activeFilters.collection}
                onChange={(event) => updateFilter('collection', event.target.value)}
              >
                <option value="Todas">Todas las colecciones</option>
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-wrap">
              <span className="sr-only">Filtrar por subcategoría</span>
              <select
                value={activeFilters.subcategoria}
                onChange={(event) => updateFilter('subcategoria', event.target.value)}
              >
                <option value="Todas">Todas las categorías</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-wrap">
              <span className="sr-only">Ordenar productos</span>
              <select
                value={activeFilters.sort}
                onChange={(event) => updateFilter('sort', event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="availability-toggle">
              <input
                type="checkbox"
                checked={activeFilters.onlyAvailable}
                onChange={(event) => updateFilter('onlyAvailable', event.target.checked)}
              />
              <span />
              Solo disponibles
            </label>

            {hasActiveFilters ? (
              <button type="button" className="filter-reset" onClick={resetFilters}>
                <RotateCcw size={13} strokeWidth={1.5} />
                Limpiar
              </button>
            ) : null}
          </div>

          {searchQuery.trim() ? (
            <div className="search-active">
              <span>
                Resultados para <strong>“{searchQuery.trim()}”</strong>
              </span>
              <button type="button" onClick={onClearSearch}>
                Quitar búsqueda
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
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
        ) : loading ? (
          <div className="product-grid" aria-label="Cargando productos">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="product-skeleton">
                <div className="product-skeleton__media shimmer" />
                <div className="product-skeleton__line product-skeleton__line--short shimmer" />
                <div className="product-skeleton__line shimmer" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-message">
            <SearchX size={40} strokeWidth={1} />
            <h3>No encontramos esa pieza</h3>
            <p>Prueba otra categoría, colección o término de búsqueda.</p>
            {hasActiveFilters ? (
              <button type="button" className="button-outline" onClick={resetFilters}>
                Ver todas las piezas
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
