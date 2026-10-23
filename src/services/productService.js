import { supabase } from '../lib/supabaseClient'
import { PRODUCT_COLLECTIONS, PRODUCT_TYPES } from '../data/catalogOptions'

function getClient() {
  if (!supabase) {
    throw new Error(
      'La conexión con Supabase no está configurada. Revisa las variables VITE_ del archivo .env.local.',
    )
  }
  return supabase
}

function cleanText(value, maxLength = 160) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeImageUrl(value) {
  const image = cleanText(value, 2000).replace(/^\/+/, '')
  if (!image) return null
  const isRemoteImage = /^https?:\/\//i.test(image)
  const isLocalImage = /^images\/[a-zA-Z0-9._-]+$/.test(image)
  if (!isRemoteImage && !isLocalImage) {
    throw new Error('Cada imagen debe ser una URL pública o una ruta local de images/.')
  }
  return image
}

function normalizeImages(payload) {
  const raw = Array.isArray(payload.imagenes_urls) && payload.imagenes_urls.length
    ? payload.imagenes_urls
    : [payload.imagen_url].filter(Boolean)

  const normalized = raw
    .map((image) => normalizeImageUrl(image))
    .filter(Boolean)
  const unique = [...new Set(normalized)]

  if (unique.length > 5) {
    throw new Error('Puedes guardar hasta 5 imágenes por pieza.')
  }
  return unique
}

export function sanitizeProduct(payload) {
  const precio = Number(payload.precio)
  const stock = Number(payload.stock)
  const images = normalizeImages(payload)

  if (!cleanText(payload.nombre)) {
    throw new Error('El nombre del producto es obligatorio.')
  }
  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error('El precio debe ser un número igual o mayor a cero.')
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error('El stock debe ser un entero igual o mayor a cero.')
  }
  if (!PRODUCT_COLLECTIONS.includes(payload.coleccion)) {
    throw new Error('Selecciona una colección válida.')
  }
  if (!PRODUCT_TYPES.includes(payload.tipo)) {
    throw new Error('Selecciona un tipo de producto válido.')
  }

  return {
    nombre: cleanText(payload.nombre),
    precio: Math.round(precio * 100) / 100,
    stock,
    coleccion: payload.coleccion,
    tipo: payload.tipo,
    subcategoria: cleanText(payload.subcategoria, 80) || null,
    imagen_url: images[0] || null,
    imagenes_urls: images,
    borrador: Boolean(payload.borrador),
    es_novedad: Boolean(payload.es_novedad),
  }
}

export function getProductErrorMessage(error) {
  if (!error) return 'Ocurrió un error inesperado.'
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  ) {
    return 'Tu cuenta no tiene permisos para realizar esta acción.'
  }
  if (error.code === 'PGRST116') return 'No se encontró el producto solicitado.'
  if (error.code === '23514') return 'Alguno de los datos no cumple las restricciones del catálogo.'
  if (error.code === '23505') return 'Ya existe un registro con esos datos.'
  return error.message || 'No pudimos completar la operación. Intenta de nuevo.'
}

export async function fetchPublicProducts() {
  const client = getClient()
  let { data, error } = await client
    .from('productos_publicos')
    .select('*')
    .order('created_at', { ascending: false })

  // Compatibilidad mientras se aplica la migración del esquema.
  if (error && (error.code === '42P01' || /productos_publicos/i.test(error.message ?? ''))) {
    const fallback = await client
      .from('productos')
      .select('*')
      .eq('borrador', false)
      .order('created_at', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(getProductErrorMessage(error))
  return data ?? []
}

export async function fetchAdminProducts() {
  const client = getClient()
  const { data, error } = await client
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(getProductErrorMessage(error))
  return data ?? []
}

export async function createProduct(payload) {
  const client = getClient()
  const sanitized = sanitizeProduct({ ...payload, borrador: Boolean(payload.borrador) })
  const { data, error } = await client
    .from('productos')
    .insert(sanitized)
    .select()
    .single()

  if (error) throw new Error(getProductErrorMessage(error))
  return data
}

export async function updateProduct(id, payload) {
  if (!id) throw new Error('Falta el identificador del producto.')
  const client = getClient()
  const sanitized = sanitizeProduct(payload)
  const { data, error } = await client
    .from('productos')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(getProductErrorMessage(error))
  return data
}

export async function updateProductStock(id, stock) {
  const nextStock = Number(stock)
  if (!id || !Number.isInteger(nextStock) || nextStock < 0) {
    throw new Error('El stock debe ser un entero igual o mayor a cero.')
  }
  const client = getClient()
  const { data, error } = await client
    .from('productos')
    .update({ stock: nextStock })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(getProductErrorMessage(error))
  return data
}

export async function setProductDraft(id, borrador) {
  const client = getClient()
  const { data, error } = await client
    .from('productos')
    .update({ borrador: Boolean(borrador) })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(getProductErrorMessage(error))
  return data
}

export async function deleteProduct(id) {
  const client = getClient()
  const { error } = await client.from('productos').delete().eq('id', id)
  if (error) throw new Error(getProductErrorMessage(error))
}
