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
    releaseReservation,
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

  const refreshReservation = () => {
    renewReservation()
  }

  const cancelReservation = async () => {
    try {
      await releaseReservation()
    } catch {
      // El mensaje se muestra dentro de la tarjeta del apartado.
    }
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
                    <small>
                      {reservation.syncing
                        ? 'Actualizando el apartado…'
                        : `Vence a las ${reservationTime(reservation.expiresAt)}`}
                    </small>
                    {reservation.error ? <small>{reservation.error}</small> : null}
                    <button
                      type="button"
                      className="cart-reservation__release"
                      onClick={cancelReservation}
                    >
                      Liberar apartado y conservar piezas
                    </button>
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
                ) : reservation.status === 'released' ? (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      El atelier liberó el apartado
                    </span>
                    <small>Las piezas siguen en tu carrito. Puedes volver a apartarlas.</small>
                  </>
                ) : reservation.status === 'completed' ? (
                  <>
                    <span className="cart-reservation__label">
                      <ShoppingBag size={13} strokeWidth={1.4} />
                      Venta confirmada
                    </span>
                    <small>El atelier ya procesó este pedido. Gracias por elegir IS NOIR.</small>
                  </>
                ) : reservation.status === 'limit' ? (
                  <>
                    <span className="cart-reservation__label">
                      <Clock3 size={13} strokeWidth={1.4} />
                      Límite de apartados alcanzado
                    </span>
                    <small>{reservation.error}</small>
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
              ) : reservation.status === 'limit' ? (
                <button type="button" className="button-primary cart-whatsapp" disabled>
                  <Clock3 size={17} strokeWidth={1.5} />
                  Límite de apartados alcanzado
                </button>
              ) : reservation.status === 'completed' ? (
                <button type="button" className="button-primary cart-whatsapp" disabled>
                  <ShoppingBag size={17} strokeWidth={1.5} />
                  Pedido confirmado
                </button>
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

              {!activeReservation && reservation.status !== 'completed' ? (
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
