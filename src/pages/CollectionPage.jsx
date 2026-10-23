import ProductGrid from '../components/ProductGrid'

export default function CollectionPage({
  products,
  loading,
  error,
  errorDetail,
  onRetry,
  filters,
  onFiltersChange,
  searchQuery,
  onClearSearch,
  onSelectProduct,
}) {
  const collectionName = filters.collection === 'Todas' ? 'todas las piezas' : filters.collection

  return (
    <div className="page page--collection">
      <header className="page-masthead">
        <div className="container-wide page-masthead__inner">
          <div>
            <span className="eyebrow eyebrow--rule">La colección</span>
            <h1 className="page-masthead__title">
              Piezas con <em>historia</em>
            </h1>
          </div>
          <p className="page-masthead__copy">
            Una selección de ropa y accesorios para habitar lo clásico y lo
            alternativo. Explora {collectionName} y elige la pieza que hable por ti.
          </p>
        </div>
      </header>

      <ProductGrid
        products={products}
        loading={loading}
        error={error}
        errorDetail={errorDetail}
        onRetry={onRetry}
        filters={filters}
        onFiltersChange={onFiltersChange}
        searchQuery={searchQuery}
        onClearSearch={onClearSearch}
        onSelectProduct={onSelectProduct}
      />
    </div>
  )
}
