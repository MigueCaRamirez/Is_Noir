import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { SINGLE_SIZE } from '../data/catalogOptions'

const CartContext = createContext(null)
const STORAGE_KEY = 'isnoir-cart-v1'

function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.productoId === 'string' &&
        Number.isFinite(Number(item.precio)) &&
        Number.isFinite(Number(item.cantidad)),
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // El carrito funciona en memoria si el storage está restringido.
    }
  }, [items])

  const addItem = useCallback((product, talla = SINGLE_SIZE, cantidad = 1) => {
    if (!product?.id) throw new Error('Producto inválido.')
    const requestedQuantity = Math.max(1, Math.floor(Number(cantidad) || 1))
    const maxStock = Math.max(0, Math.floor(Number(product.stock) || 0))
    if (maxStock < 1) throw new Error('Esta pieza no tiene stock disponible.')

    const size = talla || SINGLE_SIZE
    const lineId = `${product.id}::${size}`

    setItems((current) => {
      const existing = current.find((item) => item.id === lineId)
      const nextQuantity = Math.min(
        maxStock,
        (existing?.cantidad ?? 0) + requestedQuantity,
      )

      if (existing) {
        return current.map((item) =>
          item.id === lineId ? { ...item, cantidad: nextQuantity, stock: maxStock } : item,
        )
      }

      return [
        ...current,
        {
          id: lineId,
          productoId: product.id,
          nombre: product.nombre,
          precio: Number(product.precio),
          imagen_url: product.imagen_url,
          coleccion: product.coleccion,
          tipo: product.tipo,
          talla: size,
          cantidad: nextQuantity,
          stock: maxStock,
        },
      ]
    })
  }, [])

  const updateQuantity = useCallback((lineId, quantity) => {
    const nextQuantity = Math.floor(Number(quantity) || 0)
    setItems((current) => {
      if (nextQuantity <= 0) return current.filter((item) => item.id !== lineId)
      return current.map((item) => {
        if (item.id !== lineId) return item
        const max = Math.max(1, Number(item.stock) || 1)
        return { ...item, cantidad: Math.min(nextQuantity, max) }
      })
    })
  }, [])

  const removeItem = useCallback((lineId) => {
    setItems((current) => current.filter((item) => item.id !== lineId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.precio) * Number(item.cantidad),
        0,
      ),
    [items],
  )

  const itemCount = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.cantidad), 0),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      isCartOpen,
      subtotal,
      itemCount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    }),
    [
      items,
      isCartOpen,
      subtotal,
      itemCount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.')
  return context
}
