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
import { SINGLE_SIZE } from '../data/catalogOptions'
import {
  formatCOP,
  getAvailableStock,
  getImageFocus,
  getProductImages,
  getSizeOptions,
  getSizeStock,
  isSingleSize,
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
  const { addItem, addItems, openCart } = useCart()
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [allocations, setAllocations] = useState({})
  const [activeImage, setActiveImage] = useState(0)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)

  const sizes = useMemo(() => getSizeOptions(product), [product])
  const images = useMemo(() => getProductImages(product), [product])
  const single = isSingleSize(product)
  const stock = getAvailableStock(product)
  const totalSizeStock = useMemo(
    () => sizes.reduce((sum, size) => sum + getSizeStock(product, size), 0),
    [sizes, product],
  )
  const maxQuantity = Math.max(1, single ? stock : totalSizeStock)
  const currentImage = images[activeImage] || ''
  const guide = sizeGuide || fallbackSizeGuide(product?.tipo || 'Ropa')
  const focus = getImageFocus(product)

  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [allocations],
  )

  const buildAllocations = (nextQuantity, preferred = selectedSize, current = allocations) => {
    const next = {}
    let remaining = Math.min(nextQuantity, totalSizeStock)

    for (const size of sizes) {
      const cap = getSizeStock(product, size)
      const take = Math.min(cap, Math.max(0, Number(current?.[size]) || 0), remaining)
      if (take > 0) {
        next[size] = take
        remaining -= take
      }
    }

    const order = [preferred, ...sizes.filter((size) => size !== preferred)].filter(Boolean)
    for (const size of order) {
      if (remaining <= 0) break
      const cap = getSizeStock(product, size) - (next[size] || 0)
      const take = Math.min(Math.max(0, cap), remaining)
      if (take > 0) {
        next[size] = (next[size] || 0) + take
        remaining -= take
      }
    }

    return next
  }

  const changeQuantity = (next) => {
    const clamped = Math.min(maxQuantity, Math.max(1, Math.floor(Number(next) || 1)))
    setQuantity(clamped)
    if (single) return

    if (clamped <= 1) {
      const first =
        sizes.find((size) => (allocations[size] || 0) > 0) ||
        selectedSize ||
        sizes.find((size) => getSizeStock(product, size) > 0) ||
        ''
      setSelectedSize(first)
      setAllocations(first ? { [first]: 1 } : {})
      return
    }

    setAllocations((current) => buildAllocations(clamped, selectedSize, current))
  }

  useEffect(() => {
    setSelectedSize(single ? SINGLE_SIZE : '')
    setQuantity(1)
    setAllocations({})
    setActiveImage(0)
    setError('')
    setGuideOpen(false)
  }, [product?.id, single])

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxQuantity))
  }, [maxQuantity])

  useEffect(() => {
    if (single || quantity <= 1) return
    setAllocations((current) => buildAllocations(quantity, selectedSize, current))
    // Solo se reajusta cuando cambia el inventario visible o la pieza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxQuantity, product?.id])

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

  const chooseSize = (size) => {
    if (getSizeStock(product, size) < 1) return
    setSelectedSize(size)
    setError('')
    if (quantity === 1) setAllocations({ [size]: 1 })
  }

  const adjustAllocation = (size, delta) => {
    setError('')
    setAllocations((current) => {
      const currentQuantity = Number(current[size]) || 0
      const currentTotal = Object.values(current).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      )
      if (delta > 0 && currentTotal >= quantity) return current
      const nextQuantity = Math.max(
        0,
        Math.min(getSizeStock(product, size), currentQuantity + delta),
      )
      if (nextQuantity === currentQuantity) return current
      const next = { ...current }
      if (nextQuantity > 0) next[size] = nextQuantity
      else delete next[size]
      return next
    })
  }

  const handleAdd = () => {
    if (stock < 1) {
      setError('Esta pieza está agotada en este momento.')
      return
    }

    try {
      if (single) {
        addItem(product, SINGLE_SIZE, quantity)
      } else if (quantity === 1) {
        if (!selectedSize) {
          setError('Selecciona una talla para continuar.')
          return
        }
        if (getSizeStock(product, selectedSize) < 1) {
          setError(`La talla ${selectedSize} está agotada.`)
          return
        }
        addItem(product, selectedSize, 1)
      } else {
        if (allocatedTotal !== quantity) {
          setError('Asigna todas las unidades entre las tallas disponibles.')
          return
        }
        addItems(product, allocations)
      }

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

  const whatsappAllocations = single
    ? null
    : quantity === 1
      ? selectedSize
        ? { [selectedSize]: 1 }
        : null
      : allocations

  const addDisabled =
    stock === 0 ||
    (!single && quantity === 1 && !selectedSize) ||
    (!single && quantity > 1 && allocatedTotal !== quantity)

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
                <img
                  src={resolveProductImage(currentImage)}
                  alt={product.nombre}
                  style={{ objectPosition: focus }}
                />
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
                    <img
                      src={resolveProductImage(image)}
                      alt=""
                      style={{ objectPosition: focus }}
                    />
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
                <span className="size-picker__label">
                  {single
                    ? 'Talla única'
                    : quantity === 1
                      ? 'Selecciona tu talla'
                      : 'Distribuye tus unidades por talla'}
                </span>
                <span className={`stock-pill ${stock <= 3 ? 'stock-pill--low' : ''}`}>
                  {stock > 0 ? `${stock} disponibles` : 'Agotado'}
                </span>
              </div>
              {single ? (
                <p className="size-picker__hint">Esta pieza se ofrece en talla única.</p>
              ) : quantity === 1 ? (
                <div className="size-picker__options">
                  {sizes.map((size) => {
                    const sizeStock = getSizeStock(product, size)
                    return (
                      <button
                        key={size}
                        type="button"
                        className={selectedSize === size ? 'is-active' : ''}
                        onClick={() => chooseSize(size)}
                        disabled={sizeStock < 1}
                        aria-pressed={selectedSize === size}
                        aria-label={`Talla ${size}, ${sizeStock} disponibles`}
                      >
                        {size}
                        <small>{sizeStock}</small>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="size-allocation">
                  {sizes.map((size) => {
                    const sizeStock = getSizeStock(product, size)
                    const assigned = Number(allocations[size]) || 0
                    return (
                      <div
                        className={`size-allocation__row ${sizeStock < 1 ? 'is-sold-out' : ''}`}
                        key={size}
                      >
                        <div className="size-allocation__label">
                          <strong>{size}</strong>
                          <span>{sizeStock > 0 ? `${sizeStock} disponibles` : 'Agotada'}</span>
                        </div>
                        <div className="size-allocation__control">
                          <button
                            type="button"
                            onClick={() => adjustAllocation(size, -1)}
                            disabled={assigned <= 0}
                            aria-label={`Restar una unidad de talla ${size}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{assigned}</span>
                          <button
                            type="button"
                            onClick={() => adjustAllocation(size, 1)}
                            disabled={assigned >= sizeStock || allocatedTotal >= quantity}
                            aria-label={`Sumar una unidad de talla ${size}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <p
                    className={`size-allocation__summary ${allocatedTotal === quantity ? 'is-complete' : ''}`}
                  >
                    {allocatedTotal === quantity
                      ? `${quantity} unidad(es) asignadas`
                      : `Asigna ${Math.max(0, quantity - allocatedTotal)} unidad(es) más`}
                  </p>
                </div>
              )}
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
                  onClick={() => changeQuantity(quantity - 1)}
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
                    changeQuantity(Number.isFinite(next) ? next : 1)
                  }}
                />
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity + 1)}
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
                disabled={addDisabled}
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
              Al añadir tu pieza, apartamos el stock durante 15 minutos. Si el
              apartado expira, podrás renovarlo por 10 o 5 minutos.
            </p>

            <a
              className="product-modal__whatsapp"
              href={buildSingleProductWhatsAppUrl(product, {
                size: selectedSize,
                quantity,
                allocations: whatsappAllocations,
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
