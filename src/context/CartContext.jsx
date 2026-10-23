import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SINGLE_SIZE } from '../data/catalogOptions'
import { getAvailableStock, getProductImages } from '../lib/format'
import {
  cancelReservation,
  createReservation,
  expireReservations,
  getCartToken,
} from '../services/reservationService'

const CartContext = createContext(null)
const STORAGE_KEY = 'isnoir-cart-v1'

function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.productoId === 'string' &&
          Number.isFinite(Number(item.precio)) &&
          Number.isFinite(Number(item.cantidad)),
      )
      .map((item) => {
        const stock = Number.isFinite(Number(item.stock))
          ? Math.max(0, Math.floor(Number(item.stock)))
          : 1
        const quantity = Math.max(1, Math.floor(Number(item.cantidad) || 1))
        return {
          ...item,
          stock,
          cantidad: Math.min(quantity, Math.max(1, stock)),
        }
      })
  } catch {
    return []
  }
}

function notifyAvailabilityChange() {
  window.dispatchEvent(new Event('isnoir:availability-changed'))
}

function remainingSeconds(expiresAt) {
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

const EMPTY_RESERVATION = {
  id: null,
  status: 'idle',
  expiresAt: null,
  secondsLeft: 0,
  total: 0,
  error: '',
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [reservation, setReservation] = useState(EMPTY_RESERVATION)
  const [syncNonce, setSyncNonce] = useState(0)
  const cartTokenRef = useRef(getCartToken())
  const reservationRef = useRef(reservation)
  const requestSequence = useRef(0)

  useEffect(() => {
    reservationRef.current = reservation
  }, [reservation])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // El carrito funciona en memoria si el storage está restringido.
    }
  }, [items])

  const itemsSignature = useMemo(
    () =>
      items
        .map((item) => `${item.productoId}:${item.talla}:${item.cantidad}`)
        .sort()
        .join('|'),
    [items],
  )

  useEffect(() => {
    const sequence = requestSequence.current + 1
    requestSequence.current = sequence
    let cancelled = false

    if (!items.length) {
      const previous = reservationRef.current
      setReservation(EMPTY_RESERVATION)
      if (previous.id && previous.status === 'active') {
        cancelReservation(previous.id, cartTokenRef.current)
          .then(notifyAvailabilityChange)
          .catch(() => {})
      }
      return undefined
    }

    const previous = reservationRef.current
    setReservation((current) => ({
      ...current,
      status: 'syncing',
      error: '',
    }))

    const timer = window.setTimeout(async () => {
      try {
        const data = await createReservation(cartTokenRef.current, items)
        if (cancelled || requestSequence.current !== sequence) {
          // Si la selección cambió mientras respondía el servidor, liberamos
          // el apartado que ya no representa el carrito actual.
          cancelReservation(data.id, cartTokenRef.current).catch(() => {})
          return
        }

        setReservation({
          id: data.id,
          status: 'active',
          expiresAt: data.expires_at,
          secondsLeft: remainingSeconds(data.expires_at),
          total: Number(data.total) || 0,
          error: '',
        })
        notifyAvailabilityChange()
      } catch (error) {
        if (cancelled || requestSequence.current !== sequence) return

        if (previous.id && previous.status === 'active') {
          cancelReservation(previous.id, cartTokenRef.current).catch(() => {})
        }

        setReservation({
          ...EMPTY_RESERVATION,
          status: 'error',
          error: error.message || 'No pudimos apartar tus piezas en este momento.',
        })
        notifyAvailabilityChange()
      }
    }, 420)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `items` se lee dentro del efecto; la firma evita sincronizaciones
    // innecesarias cuando cambia una referencia sin cambiar la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature, syncNonce])

  useEffect(() => {
    if (reservation.status !== 'active' || !reservation.id || !reservation.expiresAt) {
      return undefined
    }

    const reservationId = reservation.id
    let expired = false

    const tick = () => {
      const seconds = remainingSeconds(reservation.expiresAt)
      setReservation((current) => {
        if (current.id !== reservationId || current.status !== 'active') return current
        return { ...current, secondsLeft: seconds }
      })

      if (seconds === 0 && !expired) {
        expired = true
        setReservation((current) =>
          current.id === reservationId
            ? { ...current, status: 'expired', secondsLeft: 0 }
            : current,
        )
        cancelReservation(reservationId, cartTokenRef.current).catch(() => {})
        expireReservations().then(notifyAvailabilityChange).catch(() => {})
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [reservation.id, reservation.status, reservation.expiresAt])

  const addItem = useCallback((product, talla = SINGLE_SIZE, cantidad = 1) => {
    if (!product?.id) throw new Error('Producto inválido.')

    const requestedQuantity = Math.max(1, Math.floor(Number(cantidad) || 1))
    const available = getAvailableStock(product)
    const size = talla || SINGLE_SIZE
    const lineId = `${product.id}::${size}`

    if (available < 1 && !items.some((item) => item.id === lineId)) {
      throw new Error('Esta pieza no tiene stock disponible en este momento.')
    }

    setItems((current) => {
      const existing = current.find((item) => item.id === lineId)
      const maxForLine = Math.max(1, available + (existing?.cantidad ?? 0))
      const nextQuantity = Math.min(
        maxForLine,
        (existing?.cantidad ?? 0) + requestedQuantity,
      )

      if (existing) {
        return current.map((item) =>
          item.id === lineId
            ? {
                ...item,
                cantidad: nextQuantity,
                stock: maxForLine,
                stock_disponible: available,
              }
            : item,
        )
      }

      const images = getProductImages(product)
      return [
        ...current,
        {
          id: lineId,
          productoId: product.id,
          nombre: product.nombre,
          precio: Number(product.precio),
          imagen_url: images[0] || product.imagen_url || null,
          imagenes_urls: images,
          coleccion: product.coleccion,
          tipo: product.tipo,
          talla: size,
          cantidad: nextQuantity,
          stock: maxForLine,
          stock_disponible: available,
        },
      ]
    })
  }, [items])

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
  const renewReservation = useCallback(() => {
    setSyncNonce((current) => current + 1)
  }, [])

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
      reservation,
      renewReservation,
      cartToken: cartTokenRef.current,
      isReserved: reservation.status === 'active',
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
      reservation,
      renewReservation,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.')
  return context
}
