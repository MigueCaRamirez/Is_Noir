import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Butterfly } from './Logo'
import {
  formatCOP,
  getAvailableStock,
  getProductImages,
  resolveProductImage,
} from '../lib/format'

export default function ProductCard({ product, onSelect }) {
  const [activeImage, setActiveImage] = useState(0)
  const images = getProductImages(product)
  const currentImage = images[activeImage] || ''
  const stock = getAvailableStock(product)
  const lowStock = stock > 0 && stock <= 3
  const soldOut = stock === 0

  useEffect(() => {
    setActiveImage(0)
  }, [product.id])

  useEffect(() => {
    if (activeImage >= images.length) setActiveImage(0)
  }, [activeImage, images.length])

  const selectProduct = () => onSelect?.(product)

  return (
    <article className={`product-card ${soldOut ? 'is-sold-out' : ''}`}>
      <div className={`product-card__media ${images.length > 1 ? 'has-gallery' : ''}`}>
        <button
          type="button"
          className="product-card__frame"
          onClick={selectProduct}
          aria-label={`Ver ${product.nombre}, ${formatCOP(product.precio)}`}
        >
          {currentImage ? (
            <img
              src={resolveProductImage(currentImage)}
              alt={product.nombre}
              loading="lazy"
              className="product-card__image"
            />
          ) : (
            <span className="product-card__placeholder">
              <Butterfly />
            </span>
          )}
        </button>
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
        {images.length > 1 ? (
          <div className="product-card__thumbs" aria-label={`Fotos de ${product.nombre}`}>
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={activeImage === index ? 'is-active' : ''}
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveImage(index)
                }}
                aria-label={`Ver foto ${index + 1} de ${product.nombre}`}
                aria-pressed={activeImage === index}
              >
                <img src={resolveProductImage(image)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="product-card__info"
        onClick={selectProduct}
        aria-label={`Ver detalles de ${product.nombre}`}
      >
        <span className="product-card__category">
          {product.tipo}
          {product.subcategoria ? ` · ${product.subcategoria}` : ''}
        </span>
        <span className="product-card__name">{product.nombre}</span>
        <span className="product-card__price">{formatCOP(product.precio)}</span>
      </button>
    </article>
  )
}
