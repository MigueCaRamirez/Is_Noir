import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowUpRight,
  Check,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCOP, getSizeOptions, resolveProductImage } from '../lib/format'
import { buildSingleProductWhatsAppUrl } from '../services/orderService'
import { Butterfly } from './Logo'

const COLLECTION_COPY = {
  'Old Money': 'Una pieza de líneas serenas y presencia silenciosa, pensada para perdurar.',
  Alternativo: 'Un gesto de actitud contemporánea, para quienes escriben sus propias reglas.',
}

export default function ProductModal({ product, onClose }) {
  const { addItem, openCart } = useCart()
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')

  const sizes = useMemo(() => getSizeOptions(product), [product])
  const isSingle = sizes.length === 1 && sizes[0] === 'Única'
  const stock = Math.max(0, Number(product?.stock) || 0)
  const maxQuantity = Math.min(stock, 10)

  useEffect(() => {
    if (!product) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [product, onClose])

  if (!product) return null

  const handleAdd = () => {
    if (!selectedSize) {
      setError('Selecciona una talla para continuar.')
      return
    }
    try {
      addItem(product, selectedSize, quantity)
      setError('')
      onClose?.()
      openCart()
    } catch (addError) {
      setError(addError.message)
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className="product-modal animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button type="button" className="modal-close" aria-label="Cerrar producto" onClick={onClose}>
          <X size={20} strokeWidth={1.4} />
        </button>

        <div className="product-modal__visual">
          <div className="product-modal__arch">
            {product.imagen_url ? (
              <img src={resolveProductImage(product.imagen_url)} alt={product.nombre} />
            ) : (
              <div className="product-modal__placeholder">
                <Butterfly />
              </div>
            )}
          </div>
          <span className="product-modal__collection">{product.coleccion}</span>
          <span className="product-modal__caption">IS NOIR · {product.subcategoria || product.tipo}</span>
        </div>

        <div className="product-modal__content">
          <span className="eyebrow eyebrow--rule">Pieza IS NOIR</span>
          <h2 id="product-modal-title" className="product-modal__title">
            {product.nombre}
          </h2>
          <p className="product-modal__price">{formatCOP(product.precio)}</p>
          <p className="product-modal__description">{COLLECTION_COPY[product.coleccion] || 'Una pieza elegida del universo IS NOIR, pensada para acompañarte.'}</p>

          <div className="product-modal__meta">
            <span>{product.tipo}</span>
            <i />
            <span>{product.subcategoria || 'Selección especial'}</span>
          </div>

          <div className="size-picker">
            <div className="size-picker__head">
              <span className="size-picker__label">Selecciona tu talla</span>
              <span className={`stock-pill ${stock <= 3 ? 'stock-pill--low' : ''}`}>
                {stock > 0 ? `${stock} disponibles` : 'Agotado'}
              </span>
            </div>
            <div className="size-picker__options">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={selectedSize === size ? 'is-active' : ''}
                  onClick={() => {
                    setSelectedSize(size)
                    setError('')
                  }}
                  aria-pressed={selectedSize === size}
                >
                  {size}
                </button>
              ))}
            </div>
            {isSingle ? (
              <p className="size-picker__hint">Esta pieza se ofrece en talla única.</p>
            ) : (
              <button type="button" className="size-picker__guide">
                Guía de tallas
                <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          <div className="product-modal__buy">
            <div className="quantity-control" aria-label="Cantidad">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Restar una unidad"
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Sumar una unidad"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              type="button"
              className="button-primary product-modal__add"
              onClick={handleAdd}
              disabled={stock === 0}
            >
              <ShoppingBag size={17} strokeWidth={1.5} />
              {stock === 0 ? 'Agotado' : 'Añadir al carrito'}
            </button>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <a
            className="product-modal__whatsapp"
            href={buildSingleProductWhatsAppUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preguntar por esta pieza
            <ArrowUpRight size={14} strokeWidth={1.5} />
          </a>

          <div className="product-modal__benefits">
            <span><Truck size={16} strokeWidth={1.3} /> Envíos a toda Colombia</span>
            <span><ShieldCheck size={16} strokeWidth={1.3} /> Compra asistida</span>
            <span><PackageCheck size={16} strokeWidth={1.3} /> Empaque cuidado</span>
          </div>
          <p className="product-modal__secure">
            <Check size={12} strokeWidth={1.6} />
            Confirmación final y envío se coordinan por WhatsApp.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
