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
import { getProductImages, getSizeAvailableStock, isSingleSize } from '../lib/format'
import {
  cancelReservation,
  createReservation,
  expireReservations,
  fetchReservationStatus,
  FINAL_RESERVATION_MINUTES,
  getCartToken,
  INITIAL_RESERVATION_MINUTES,
  RENEWAL_RESERVATION_MINUTES,
} from '../services/reservationService'

const CartContext = createContext(null)
const STORAGE_KEY = 'isnoir-cart-v1'
const RESERVATION_STORAGE_KEY = 'isnoir-reservation-v1'
const RESERVED_UNTIL_KEY = 'isnoir-reserved-until-v1'
const ATTEMPTS_KEY = 'isnoir-reservation-attempts-v1'
const MAX_NEW_RESERVATIONS = 3

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
          talla: String(item.talla || SINGLE_SIZE),
          stock,
          cantidad: Math.min(quantity, Math.max(1, stock)),
        }
      })
  } catch {
    return []
  }
}

function readAttempts() {
  try {
    const value = Number(window.localStorage.getItem(ATTEMPTS_KEY))
    return Number.isInteger(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function writeAttempts(value) {
  try {
    if (value > 0) {
      window.localStorage.setItem(ATTEMPTS_KEY, String(value))
    } else {
      window.localStorage.removeItem(ATTEMPTS_KEY)
    }
  } catch {
    // El contador se mantiene en memoria si el storage está restringido.
  }
}

function resetAttempts() {
  writeAttempts(0)
}

function minutesForAttempt(attempts) {
  if (attempts <= 0) return INITIAL_RESERVATION_MINUTES
  if (attempts === 1) return RENEWAL_RESERVATION_MINUTES
  return FINAL_RESERVATION_MINUTES
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
  syncing: false,
}

function readStoredReservation(cartToken) {
  try {
    const raw = window.localStorage.getItem(RESERVATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.id || parsed.cartToken !== cartToken) return null

    const expiresAt = parsed.expiresAt || window.localStorage.getItem(RESERVED_UNTIL_KEY)
    if (!expiresAt) return null

    const secondsLeft = remainingSeconds(expiresAt)
    const storedStatus = String(parsed.status || 'active')
    const status =
      storedStatus === 'active' && secondsLeft <= 0 ? 'expired' : storedStatus

    return {
      id: parsed.id,
      status,
      expiresAt,
      secondsLeft: status === 'active' ? secondsLeft : 0,
      total: Number(parsed.total) || 0,
      error: '',
      syncing: false,
    }
  } catch {
    return null
  }
}

function persistReservation(reservation, cartToken) {
  try {
    if (!reservation?.id) {
      window.localStorage.removeItem(RESERVATION_STORAGE_KEY)
      window.localStorage.removeItem(RESERVED_UNTIL_KEY)
      return
    }

    const persistedStatus = reservation.status === 'syncing' ? 'active' : reservation.status
    window.localStorage.setItem(
      RESERVATION_STORAGE_KEY,
      JSON.stringify({
        id: reservation.id,
        status: persistedStatus,
        expiresAt: reservation.expiresAt,
        total: reservation.total,
        cartToken,
      }),
    )

    if (persistedStatus === 'active' && reservation.expiresAt) {
      window.localStorage.setItem(RESERVED_UNTIL_KEY, reservation.expiresAt)
    } else {
      window.localStorage.removeItem(RESERVED_UNTIL_KEY)
    }
  } catch {
    // El contador se reanuda desde el servidor aunque storage esté restringido.
  }
}

export function CartProvider({ children }) {
  const cartTokenRef = useRef('')
  if (!cartTokenRef.current) cartTokenRef.current = getCartToken()

  const [items, setItems] = useState(readStoredCart)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [reservation, setReservation] = useState(() =>
    readStoredReservation(cartTokenRef.current) ?? EMPTY_RESERVATION,
  )
  const [syncNonce, setSyncNonce] = useState(0)
  const reservationRef = useRef(reservation)
  const itemsRef = useRef(items)
  const storedReservationRef = useRef(reservation)
  const skipInitialSyncRef = useRef(
    Boolean(reservation.id && reservation.status !== 'active'),
  )
  const requestSequence = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    reservationRef.current = reservation
    persistReservation(reservation, cartTokenRef.current)
  }, [reservation])

  useEffect(() => {
    if (storedReservationRef.current?.id && readAttempts() < 1) {
      writeAttempts(1)
    }
  }, [])

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
      skipInitialSyncRef.current = false
      setReservation(EMPTY_RESERVATION)
      resetAttempts()
      if (previous.id && previous.status === 'active') {
        cancelReservation(previous.id, cartTokenRef.current)
          .then(notifyAvailabilityChange)
          .catch(() => {})
      }
      return undefined
    }

    if (skipInitialSyncRef.current) {
      skipInitialSyncRef.current = false
      return undefined
    }

    const previous = reservationRef.current
    const previousActive =
      Boolean(previous.id) &&
      previous.status === 'active' &&
      remainingSeconds(previous.expiresAt) > 0

    if (!previousActive && readAttempts() >= MAX_NEW_RESERVATIONS) {
      setReservation({
        ...EMPTY_RESERVATION,
        status: 'limit',
        error:
          'Alcanzaste el límite de apartados de esta sesión. Escríbenos por WhatsApp para completar tu compra.',
      })
      return undefined
    }

    setReservation((current) =>
      previousActive
        ? { ...current, syncing: true, error: '' }
        : { ...current, status: 'syncing', syncing: true, error: '' },
    )

    const timer = window.setTimeout(async () => {
      const attemptsBefore = readAttempts()
      try {
        const data = await createReservation(
          cartTokenRef.current,
          items,
          previousActive ? undefined : minutesForAttempt(attemptsBefore),
        )
        if (cancelled || requestSequence.current !== sequence) {
          if (data?.id && !itemsRef.current.length) {
            cancelReservation(data.id, cartTokenRef.current).catch(() => {})
          }
          return
        }

        const isNewReservation = Boolean(data.is_new) || data.id !== previous.id
        if (isNewReservation) {
          writeAttempts(Math.max(1, attemptsBefore + 1))
        }

        setReservation({
          id: data.id,
          status: 'active',
          expiresAt: data.expires_at,
          secondsLeft: remainingSeconds(data.expires_at),
          total: Number(data.total) || 0,
          error: '',
          syncing: false,
        })
        notifyAvailabilityChange()
      } catch (error) {
        if (cancelled || requestSequence.current !== sequence) return

        if (previousActive) {
          // No liberamos el apartado anterior: el carrito conserva las piezas
          // que ya estaban protegidas y solo mostramos el aviso de la nueva.
          setReservation((current) =>
            current.id === previous.id
              ? {
                  ...current,
                  status: 'active',
                  syncing: false,
                  error: error.message || 'No pudimos ampliar el apartado.',
                }
              : { ...EMPTY_RESERVATION, status: 'error', error: error.message },
          )
        } else {
          setReservation({
            ...EMPTY_RESERVATION,
            status: 'error',
            error: error.message || 'No pudimos apartar tus piezas en este momento.',
          })
        }
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
            ? { ...current, status: 'expired', secondsLeft: 0, syncing: false }
            : current,
        )
        expireReservations().then(notifyAvailabilityChange).catch(() => {})
      }
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [reservation.id, reservation.status, reservation.expiresAt])

  useEffect(() => {
    if (reservation.status !== 'active' || !reservation.id) return undefined

    const reservationId = reservation.id
    let stopped = false

    const checkStatus = async () => {
      if (stopped) return
      const data = await fetchReservationStatus(reservationId, cartTokenRef.current)
      if (stopped || !data) return

      if (data.status === 'cancelled') {
        setReservation((current) =>
          current.id === reservationId
            ? {
                ...current,
                status: 'released',
                secondsLeft: 0,
                syncing: false,
                error: '',
              }
            : current,
        )
        notifyAvailabilityChange()
        return
      }

      if (data.status === 'completed') {
        setReservation((current) =>
          current.id === reservationId
            ? {
                ...current,
                status: 'completed',
                secondsLeft: 0,
                syncing: false,
                error: '',
              }
            : current,
        )
        notifyAvailabilityChange()
        return
      }

      if (data.status === 'expired') {
        setReservation((current) =>
          current.id === reservationId
            ? {
                ...current,
                status: 'expired',
                secondsLeft: 0,
                syncing: false,
              }
            : current,
        )
        notifyAvailabilityChange()
        return
      }

      if (data.status === 'active' && data.expires_at) {
        const seconds = remainingSeconds(data.expires_at)
        setReservation((current) => {
          if (current.id !== reservationId || current.status !== 'active') return current
          if (seconds <= 0) return { ...current, status: 'expired', secondsLeft: 0 }
          return {
            ...current,
            expiresAt: data.expires_at,
            secondsLeft: seconds,
            syncing: false,
          }
        })
      }
    }

    checkStatus()
    const timer = window.setInterval(checkStatus, 5000)
    const onAvailability = () => checkStatus()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus()
    }

    window.addEventListener('isnoir:availability-changed', onAvailability)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopped = true
      window.clearInterval(timer)
      window.removeEventListener('isnoir:availability-changed', onAvailability)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reservation.id, reservation.status])

  const addItems = useCallback(
    (product, allocations = {}) => {
      if (!product?.id) throw new Error('Producto inválido.')

      const entries = Object.entries(allocations)
        .map(([size, quantity]) => [String(size || SINGLE_SIZE), Number(quantity) || 0])
        .filter(([, quantity]) => quantity > 0)

      if (!entries.length) {
        throw new Error('Selecciona al menos una talla y una unidad.')
      }

      const normalizedEntries = isSingleSize(product)
        ? [[SINGLE_SIZE, entries.reduce((sum, [, quantity]) => sum + quantity, 0)]]
        : entries

      const next = [...items]

      for (const [size, requestedQuantity] of normalizedEntries) {
        const quantity = Math.max(1, Math.floor(Number(requestedQuantity) || 1))
        const available = getSizeAvailableStock(product, size)
        const lineId = `${product.id}::${size}`
        const existingIndex = next.findIndex((item) => item.id === lineId)
        const existing = existingIndex >= 0 ? next[existingIndex] : null
        const maxForLine = available + (existing?.cantidad ?? 0)

        if (maxForLine < 1) {
          throw new Error(`Esta pieza no tiene stock disponible en talla ${size}.`)
        }
        if (quantity > maxForLine) {
          throw new Error(
            `Solo quedan ${maxForLine} unidad(es) disponibles en talla ${size}.`,
          )
        }

        if (existing) {
          next[existingIndex] = {
            ...existing,
            cantidad: existing.cantidad + quantity,
            stock: maxForLine,
            stock_disponible: available,
          }
        } else {
          const images = getProductImages(product)
          next.push({
            id: lineId,
            productoId: product.id,
            nombre: product.nombre,
            precio: Number(product.precio),
            imagen_url: images[0] || product.imagen_url || null,
            imagenes_urls: images,
            coleccion: product.coleccion,
            tipo: product.tipo,
            talla: size,
            cantidad: quantity,
            stock: maxForLine,
            stock_disponible: available,
          })
        }
      }

      setItems(next)
    },
    [items],
  )

  const addItem = useCallback(
    (product, talla = SINGLE_SIZE, cantidad = 1) => {
      const size = talla || SINGLE_SIZE
      addItems(product, { [size]: Math.max(1, Math.floor(Number(cantidad) || 1)) })
    },
    [addItems],
  )

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

  const clearCart = useCallback(() => {
    resetAttempts()
    setItems([])
  }, [])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const renewReservation = useCallback(() => {
    setSyncNonce((current) => current + 1)
  }, [])

  const releaseReservation = useCallback(async () => {
    const current = reservationRef.current
    if (!current.id) {
      setReservation(EMPTY_RESERVATION)
      return
    }

    try {
      await cancelReservation(current.id, cartTokenRef.current)
      setReservation((entry) =>
        entry.id === current.id
          ? {
              ...entry,
              status: 'released',
              secondsLeft: 0,
              syncing: false,
              error: '',
            }
          : entry,
      )
      notifyAvailabilityChange()
    } catch (error) {
      setReservation((entry) =>
        entry.id === current.id
          ? { ...entry, error: error.message || 'No pudimos liberar el apartado.' }
          : entry,
      )
      throw error
    }
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
      addItems,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      reservation,
      renewReservation,
      releaseReservation,
      cartToken: cartTokenRef.current,
      isReserved: reservation.status === 'active',
    }),
    [
      items,
      isCartOpen,
      subtotal,
      itemCount,
      addItem,
      addItems,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
      reservation,
      renewReservation,
      releaseReservation,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.')
  return context
}
