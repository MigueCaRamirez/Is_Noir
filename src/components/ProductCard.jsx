import { ArrowUpRight } from 'lucide-react'
import { Butterfly } from './Logo'
import { formatCOP, resolveProductImage } from '../lib/format'

export default function ProductCard({ product, onSelect }) {
  const stock = Number(product.stock) || 0
  const lowStock = stock > 0 && stock <= 3
  const soldOut = stock === 0

  return (
    <button
      type="button"
      className={`product-card ${soldOut ? 'is-sold-out' : ''}`}
      onClick={() => onSelect?.(product)}
      aria-label={`Ver ${product.nombre}, ${formatCOP(product.precio)}`}
    >
      <span className="product-card__media">
        <span className="product-card__frame">
          {product.imagen_url ? (
            <img
              src={resolveProductImage(product.imagen_url)}
              alt={product.nombre}
              loading="lazy"
              className="product-card__image"
            />
          ) : (
            <span className="product-card__placeholder">
              <Butterfly />
            </span>
          )}
        </span>
        <span className="product-card__badge-row">
          <span className={`product-badge product-badge--${product.coleccion?.toLowerCase().replace(/\s/g, '-')}`}>
            {product.coleccion}
          </span>
          {product.es_novedad ? <span className="product-badge product-badge--new">Nuevo</span> : null}
          {lowStock ? <span className="product-badge product-badge--stock">Últimas piezas</span> : null}
          {soldOut ? <span className="product-badge product-badge--stock">Agotado</span> : null}
        </span>
        <span className="product-card__quick">
          Elegir talla
          <ArrowUpRight size={15} strokeWidth={1.4} />
        </span>
      </span>
      <span className="product-card__info">
        <span className="product-card__category">
          {product.tipo}
          {product.subcategoria ? ` · ${product.subcategoria}` : ''}
        </span>
        <span className="product-card__name">{product.nombre}</span>
        <span className="product-card__price">{formatCOP(product.precio)}</span>
      </span>
    </button>
  )
}
