import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCOP, resolveProductImage } from '../lib/format'
import { buildWhatsAppUrl } from '../services/orderService'
import { Butterfly } from './Logo'

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    subtotal,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
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
    document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth' })
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
                {items.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div className="cart-item__image">
                      {item.imagen_url ? (
                        <img src={resolveProductImage(item.imagen_url)} alt={item.nombre} />
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
                ))}
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
              <p className="cart-note">Envío por calcular según tu ciudad. Confirmación personal por WhatsApp.</p>
              <a
                className="button-primary cart-whatsapp"
                href={buildWhatsAppUrl(items)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} strokeWidth={1.5} />
                Finalizar pedido por WhatsApp
              </a>
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
