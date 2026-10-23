import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Clock3,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import {
  formatCountdown,
  formatCOP,
  getProductImages,
  resolveProductImage,
} from '../lib/format'
import { buildWhatsAppUrl } from '../services/orderService'
import { registerCartInterest } from '../services/reservationService'
import { Butterfly } from './Logo'

function reservationTime(expiresAt) {
  if (!expiresAt) return ''
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(expiresAt))
}

export default function CartDrawer({ onGoToShop }) {
  const {
    items,
    isCartOpen,
    closeCart,
    subtotal,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    reservation,
    renewReservation,
  } = useCart()

  useEffect(() => {
    if (!isCartOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isCartOpen, closeCart])

  if (!isCartOpen) return null

  const goToShop = () => {
    closeCart()
    if (onGoToShop) {
      onGoToShop()
      return
    }
    document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth' })
  }

  const trackInterest = () => {
    registerCartInterest(items).catch(() => {})
  }

  const activeReservation = reservation.status === 'active'
    ? { id: reservation.id, expiresAt: reservation.expiresAt }
    : null
  const whatsappUrl = buildWhatsAppUrl(items, { reservation: activeReservation })
  const canReserveAgain = ['expired', 'error'].includes(reservation.status)

  const refreshReservation = () => {
    renewReservation()
  }

  return createPortal(
    <div
      className="drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCart()
      }}
    >
      <aside
        className="cart-drawer animate-drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        <header className="cart-drawer__header">
          <div>
            <span className="eyebrow">Tu selección</span>
            <h2 id="cart-title">Carrito <sup>{String(itemCount).padStart(2, '0')}</sup></h2>
          </div>
          <button type="button" className="nav-icon" onClick={closeCart} aria-label="Cerrar carrito">
            <X size={21} strokeWidth={1.4} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <Butterfly className="cart-empty__butterfly" />
            <ShoppingBag size={34} strokeWidth={1} />
            <h3>Aún no has elegido tu pieza</h3>
            <p>Tu selección personal merece un lugar aquí.</p>
            <button type="button" className="button-outline" onClick={goToShop}>
              Explorar la tienda
              <ArrowRight size={15} strokeWidth={1.4} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer__body">
              <div className="cart-drawer__items">
                {items.map((item) => {
                  const image = getProductImages(item)[0] || item.imagen_url
                  return (
                    <article className="cart-item" key={item.id}>
                      <div className="cart-item__image">
                        {image ? (
                          <img src={resolveProductImage(image)} alt={item.nombre} />
                        ) : (
                          <Butterfly />
                        )}
                      </div>
                      <div className="cart-item__body">
                        <span className="cart-item__collection">{item.coleccion}</span>
                        <h3>{item.nombre}</h3>
                        <p>
                          Talla {item.talla}
                          {item.tipo ? ` · ${item.tipo}` : ''}
                        </p>
                        <div className="cart-item__footer">
                          <div className="quantity-control quantity-control--sm">
                            <button
                              type="button"
                              aria-label="Restar una unidad"
                              onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span>{item.cantidad}</span>
                            <button
                              type="button"
                              aria-label="Sumar una unidad"
                              disabled={item.cantidad >= item.stock}
                              onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <strong>{formatCOP(Number(item.precio) * item.cantidad)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cart-item__remove"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Eliminar ${item.nombre} del carrito`}
                      >
                        <Trash2 size={14} strokeWidth={1.4} />
                      </button>
                    </article>
                  )
                })}
              </div>
              <button type="button" className="cart-clear" onClick={clearCart}>
                Vaciar carrito
              </button>
            </div>

            <footer className="cart-drawer__footer">
              <div className="cart-total">
                <span>Total estimado</span>
                <strong>{formatCOP(subtotal)}</strong>
              </div>

              <div className={`cart-reservation cart-reservation--${reservation.status}`} role="status">
                {reservation.status === 'active' ? (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      Stock apartado
                    </span>
                    <strong>{formatCountdown(reservation.secondsLeft)}</strong>
                    <small>Vence a las {reservationTime(reservation.expiresAt)}</small>
                  </>
                ) : reservation.status === 'syncing' ? (
                  <>
                    <span className="cart-reservation__label">
                      <RefreshCw size={13} strokeWidth={1.4} className="animate-spin" />
                      Reservando tus piezas…
                    </span>
                    <small>Estamos asegurando el stock disponible.</small>
                  </>
                ) : reservation.status === 'expired' ? (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      El apartado expiró
                    </span>
                    <small>El stock volvió a la tienda. Renueva para continuar.</small>
                  </>
                ) : reservation.status === 'error' ? (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      No pudimos apartar el stock
                    </span>
                    <small>{reservation.error}</small>
                  </>
                ) : (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      Apartado temporal
                    </span>
                    <small>Las piezas se reservan por 15 minutos.</small>
                  </>
                )}
                {canReserveAgain ? (
                  <button type="button" className="cart-reservation__retry" onClick={refreshReservation}>
                    Reintentar apartado
                  </button>
                ) : null}
              </div>

              <p className="cart-note">
                Entregas locales únicamente en la ciudad de Cúcuta. Confirmación personal por WhatsApp.
              </p>

              {activeReservation ? (
                <a
                  className="button-primary cart-whatsapp"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackInterest}
                >
                  <MessageCircle size={18} strokeWidth={1.5} />
                  Finalizar pedido por WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className="button-primary cart-whatsapp"
                  onClick={refreshReservation}
                  disabled={reservation.status === 'syncing'}
                >
                  <RefreshCw
                    size={17}
                    strokeWidth={1.5}
                    className={reservation.status === 'syncing' ? 'animate-spin' : ''}
                  />
                  {reservation.status === 'syncing' ? 'Reservando stock…' : 'Renovar apartado'}
                </button>
              )}

              {!activeReservation ? (
                <a
                  className="cart-whatsapp-fallback"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackInterest}
                >
                  Continuar por WhatsApp sin apartado
                </a>
              ) : null}

              <button type="button" className="cart-continue" onClick={goToShop}>
                Seguir explorando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  )
}
