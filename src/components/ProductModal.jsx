import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import {
  formatCOP,
  getAvailableStock,
  getProductImages,
  getSizeOptions,
  resolveProductImage,
} from '../lib/format'
import { buildSingleProductWhatsAppUrl } from '../services/orderService'
import { registerProductInterest } from '../services/reservationService'
import { fallbackSizeGuide } from '../services/sizeGuideService'
import { Butterfly } from './Logo'

const COLLECTION_COPY = {
  'Old Money': 'Una pieza de líneas serenas y presencia silenciosa, pensada para perdurar.',
  Alternativo: 'Un gesto de actitud contemporánea, para quienes escriben sus propias reglas.',
}

function SizeGuideCard({ guide, onClose }) {
  const paragraphs = String(guide?.texto ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return createPortal(
    <div
      className="modal-backdrop modal-backdrop--high"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="size-guide animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
      >
        <button
          type="button"
          className="modal-close"
          aria-label="Cerrar guía de tallas"
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.4} />
        </button>
        <span className="eyebrow eyebrow--rule">Medidas y proporciones</span>
        <h2 id="size-guide-title">{guide?.titulo || 'Guía de tallas'}</h2>
        {guide?.imagen_url ? (
          <div className="size-guide__image">
            <img src={resolveProductImage(guide.imagen_url)} alt="Guía de tallas IS NOIR" />
          </div>
        ) : null}
        <div className="size-guide__copy">
          {paragraphs.length ? (
            paragraphs.map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
            ))
          ) : (
            <p>Escríbenos por WhatsApp y te ayudamos a elegir la talla ideal.</p>
          )}
        </div>
        <span className="size-guide__note">
          <Ruler size={14} strokeWidth={1.3} />
          Si estás entre dos tallas, el atelier te recomienda la mayor.
        </span>
      </div>
    </div>,
    document.body,
  )
}

export default function ProductModal({ product, onClose, sizeGuide }) {
  const { addItem, openCart } = useCart()
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)

  const sizes = useMemo(() => getSizeOptions(product), [product])
  const images = useMemo(() => getProductImages(product), [product])
  const isSingle = sizes.length === 1
  const stock = getAvailableStock(product)
  const maxQuantity = Math.max(1, stock)
  const currentImage = images[activeImage] || ''
  const guide = sizeGuide || fallbackSizeGuide(product?.tipo || 'Ropa')

  useEffect(() => {
    setSelectedSize('')
    setQuantity(1)
    setActiveImage(0)
    setError('')
    setGuideOpen(false)
  }, [product?.id])

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxQuantity))
  }, [maxQuantity])

  useEffect(() => {
    if (activeImage >= images.length) setActiveImage(0)
  }, [activeImage, images.length])

  useEffect(() => {
    if (!product?.id) return undefined
    registerProductInterest(product.id).catch(() => {})
    return undefined
  }, [product?.id])

  useEffect(() => {
    if (!product) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (guideOpen) {
        setGuideOpen(false)
        return
      }
      onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [product, onClose, guideOpen])

  if (!product) return null

  const handleAdd = () => {
    if (!selectedSize) {
      setError('Selecciona una talla para continuar.')
      return
    }
    if (stock < 1) {
      setError('Esta pieza está agotada en este momento.')
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

  const stepImage = (direction) => {
    if (images.length < 2) return
    setActiveImage((current) => (current + direction + images.length) % images.length)
  }

  return createPortal(
    <>
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
              {currentImage ? (
                <img src={resolveProductImage(currentImage)} alt={product.nombre} />
              ) : (
                <div className="product-modal__placeholder">
                  <Butterfly />
                </div>
              )}
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="product-modal__gallery-arrow product-modal__gallery-arrow--prev"
                    onClick={() => stepImage(-1)}
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="product-modal__gallery-arrow product-modal__gallery-arrow--next"
                    onClick={() => stepImage(1)}
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="product-modal__thumbs" aria-label="Fotos de la pieza">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={activeImage === index ? 'is-active' : ''}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Ver foto ${index + 1} de ${product.nombre}`}
                    aria-pressed={activeImage === index}
                  >
                    <img src={resolveProductImage(image)} alt="" />
                  </button>
                ))}
              </div>
            ) : null}

            <span className="product-modal__collection">{product.coleccion}</span>
            <span className="product-modal__caption">IS NOIR · {product.subcategoria || product.tipo}</span>
          </div>

          <div className="product-modal__content">
            <span className="eyebrow eyebrow--rule">Pieza IS NOIR</span>
            <h2 id="product-modal-title" className="product-modal__title">
              {product.nombre}
            </h2>
            <p className="product-modal__price">{formatCOP(product.precio)}</p>
            <p className="product-modal__description">
              {COLLECTION_COPY[product.coleccion]
                || 'Una pieza elegida del universo IS NOIR, pensada para acompañarte.'}
            </p>

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
              ) : null}
              <button
                type="button"
                className="size-picker__guide"
                onClick={() => setGuideOpen(true)}
              >
                <Ruler size={12} strokeWidth={1.4} />
                Guía de tallas
                <ArrowUpRight size={12} />
              </button>
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
                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  step="1"
                  value={quantity}
                  aria-label="Cantidad de unidades"
                  onChange={(event) => {
                    const next = Math.floor(Number(event.target.value))
                    if (!Number.isFinite(next)) {
                      setQuantity(1)
                      return
                    }
                    setQuantity(Math.min(maxQuantity, Math.max(1, next)))
                  }}
                />
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

            <p className="product-modal__reserve-note">
              Al añadir tu pieza, apartamos el stock durante 15 minutos.
            </p>

            <a
              className="product-modal__whatsapp"
              href={buildSingleProductWhatsAppUrl(product, {
                size: selectedSize,
                quantity,
              })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registerProductInterest(product.id).catch(() => {})}
            >
              Preguntar por esta pieza
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </a>

            <div className="product-modal__benefits">
              <span><Truck size={16} strokeWidth={1.3} /> Envíos exclusivos en Cúcuta</span>
              <span><ShieldCheck size={16} strokeWidth={1.3} /> Compra asistida</span>
              <span><PackageCheck size={16} strokeWidth={1.3} /> Empaque cuidado</span>
            </div>
            <p className="product-modal__secure">
              <Check size={12} strokeWidth={1.6} />
              Confirmación final y entrega se coordinan por WhatsApp en Cúcuta.
            </p>
          </div>
        </div>
      </div>

      {guideOpen ? <SizeGuideCard guide={guide} onClose={() => setGuideOpen(false)} /> : null}
    </>,
    document.body,
  )
}
