import { supabase } from '../lib/supabaseClient'

const CART_TOKEN_KEY = 'isnoir-cart-token-v1'
const RESERVATION_MINUTES = 15

function getClient() {
  if (!supabase) {
    throw new Error('La conexión con la tienda no está disponible.')
  }
  return supabase
}

function publicReservationError(error) {
  const message = String(error?.message ?? '')

  if (/no hay stock suficiente/i.test(message)) {
    return message
  }
  if (/carrito est[áa] vac[íi]o/i.test(message)) {
    return 'Tu selección está vacía.'
  }
  if (/ya no est[áa] disponible/i.test(message)) {
    return 'Una de las piezas de tu selección ya no está disponible.'
  }
  if (/identificar tu carrito|no es v[áa]lida/i.test(message)) {
    return 'No pudimos identificar tu selección. Recarga la página e inténtalo de nuevo.'
  }
  if (/l[íi]mite permitido/i.test(message)) {
    return 'La selección supera el límite permitido.'
  }

  return 'No pudimos apartar tus piezas en este momento. Inténtalo de nuevo.'
}

export function getCartToken() {
  try {
    const existing = window.localStorage.getItem(CART_TOKEN_KEY)
    if (
      existing &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)
    ) {
      return existing
    }

    const token = window.crypto?.randomUUID?.()
      ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = (Math.random() * 16) | 0
        const value = char === 'x' ? random : (random & 0x3) | 0x8
        return value.toString(16)
      })

    window.localStorage.setItem(CART_TOKEN_KEY, token)
    return token
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0
      const value = char === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    })
  }
}

function toReservationItems(items = []) {
  return items
    .filter((item) => item?.productoId && Number(item.cantidad) > 0)
    .map((item) => ({
      producto_id: item.productoId,
      cantidad: Math.max(1, Math.floor(Number(item.cantidad) || 1)),
      talla: item.talla || 'Única',
    }))
}

export async function createReservation(cartToken, items, minutes = RESERVATION_MINUTES) {
  const client = getClient()
  const payload = toReservationItems(items)

  if (!payload.length) throw new Error('Tu selección está vacía.')

  let response
  try {
    response = await client.rpc('crear_reserva', {
      p_cart_token: cartToken,
      p_items: payload,
      p_minutes: minutes,
    })
  } catch {
    throw new Error('No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.')
  }

  const { data, error } = response
  if (error) throw new Error(publicReservationError(error))
  if (!data?.id) {
    throw new Error('No pudimos apartar tus piezas en este momento. Inténtalo de nuevo.')
  }
  return data
}

export async function cancelReservation(reservationId, cartToken) {
  if (!reservationId) return false
  const client = getClient()
  const { data, error } = await client.rpc('cancelar_reserva', {
    p_reserva_id: reservationId,
    p_cart_token: cartToken,
  })

  if (error) throw new Error(publicReservationError(error))
  return Boolean(data)
}

export async function expireReservations() {
  const client = getClient()
  const { data, error } = await client.rpc('expirar_reservas')
  if (error) throw new Error(publicReservationError(error))
  return Number(data) || 0
}

export async function registerProductInterest(productId) {
  if (!productId) return false
  const client = getClient()
  const { data, error } = await client.rpc('registrar_solicitud', {
    p_producto_id: productId,
  })

  if (error) return false
  return Boolean(data)
}

export async function registerCartInterest(items = []) {
  const uniqueIds = [...new Set(items.map((item) => item.productoId).filter(Boolean))]
  await Promise.allSettled(uniqueIds.map((id) => registerProductInterest(id)))
}

export async function fetchAdminReservations() {
  const client = getClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await client
    .from('reservas')
    .select(
      'id, cart_token, created_at, expires_at, status, total, confirmed_at, cancelled_at, items:reserva_items(id, producto_id, nombre, precio, talla, cantidad, imagen_url)',
    )
    .in('status', ['active', 'expired'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('No pudimos cargar los apartados en este momento.')
  }

  return data ?? []
}

export async function confirmReservationAsSold(reservationId) {
  if (!reservationId) throw new Error('Falta el identificador del apartado.')
  const client = getClient()
  const { data, error } = await client.rpc('confirmar_reserva', {
    p_reserva_id: reservationId,
  })

  if (error) {
    const message = String(error.message ?? '')
    if (/stock suficiente/i.test(message)) {
      throw new Error(message)
    }
    if (/expir[oó]|expirado/i.test(message)) {
      throw new Error('Este apartado expiró y el stock ya fue liberado.')
    }
    throw new Error('No pudimos marcar el apartado como vendido. Inténtalo de nuevo.')
  }

  return data
}

export async function cancelReservationAsAdmin(reservationId) {
  if (!reservationId) throw new Error('Falta el identificador del apartado.')
  const client = getClient()
  const { data, error } = await client.rpc('cancelar_reserva', {
    p_reserva_id: reservationId,
    p_cart_token: null,
  })

  if (error) {
    throw new Error('No pudimos liberar el stock del apartado. Inténtalo de nuevo.')
  }

  return Boolean(data)
}
