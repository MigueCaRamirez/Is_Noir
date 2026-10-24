import { CLOTHING_SIZES, SINGLE_SIZE } from '../data/catalogOptions'

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const IMAGE_FOCUS_VALUES = new Set([
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
])

export function formatCOP(value) {
  const amount = Number(value)
  return copFormatter.format(Number.isFinite(amount) ? amount : 0)
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isSingleSize(product) {
  if (!product) return true
  if (typeof product.talla_unica === 'boolean') return product.talla_unica
  return product.tipo !== 'Ropa'
}

export function getSizeOptions(product) {
  if (!product) return [SINGLE_SIZE]
  if (isSingleSize(product)) return [SINGLE_SIZE]

  const stock = product.tallas_stock
  const keys = stock && typeof stock === 'object' ? Object.keys(stock) : []
  const ordered = CLOTHING_SIZES.filter((size) => keys.includes(size))
  return ordered.length ? ordered : [...CLOTHING_SIZES]
}

export function getSizeStock(product, size) {
  if (!product) return 0
  if (isSingleSize(product) || size === SINGLE_SIZE) return getAvailableStock(product)

  const available = product.tallas_disponibles
  if (available && typeof available === 'object' && Object.hasOwn(available, size)) {
    return Math.max(0, Math.floor(Number(available[size]) || 0))
  }

  const raw = product.tallas_stock?.[size]
  return Math.max(0, Math.floor(Number(raw) || 0))
}

export function getSizeAvailableStock(product, size) {
  return getSizeStock(product, size)
}

export function getImageFocus(product) {
  const focus = String(product?.imagen_enfoque ?? '').trim().toLowerCase()
  return IMAGE_FOCUS_VALUES.has(focus) ? focus : 'center'
}

export function normalizeImageFocus(value) {
  const focus = String(value ?? '').trim().toLowerCase()
  return IMAGE_FOCUS_VALUES.has(focus) ? focus : 'center'
}

export function getSizeSummary(product) {
  if (!product) return ''
  if (isSingleSize(product)) return 'Talla única'
  return getSizeOptions(product)
    .map((size) => `${size}: ${getSizeStock(product, size)}`)
    .join(' · ')
}

export function getProductImages(product) {
  if (!product) return []
  const raw = Array.isArray(product.imagenes_urls) ? product.imagenes_urls : []
  const images = raw
    .map((image) => String(image ?? '').trim())
    .filter(Boolean)

  const primary = String(product.imagen_url ?? '').trim()
  return [...new Set([primary, ...images].filter(Boolean))].slice(0, 5)
}

export function getAvailableStock(product) {
  if (!product) return 0
  const available = product.stock_disponible
  if (available !== null && available !== undefined && Number.isFinite(Number(available))) {
    return Math.max(0, Math.floor(Number(available)))
  }
  return Math.max(0, Math.floor(Number(product.stock) || 0))
}

export function absoluteImageUrl(value) {
  const resolved = resolveProductImage(value)
  if (!resolved) return ''
  if (/^(data:|blob:)/i.test(resolved)) return ''
  try {
    return new URL(resolved, window.location.origin).href
  } catch {
    return resolved
  }
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatCountdown(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function assetUrl(fileName) {
  return `${import.meta.env.BASE_URL}images/${fileName}`
}

/**
 * Acepta tanto URLs absolutas (Supabase Storage, CDN) como rutas locales del
 * catálogo semilla (`images/producto.jpg`) y las resuelve contra la base de Vite.
 */
export function resolveProductImage(value) {
  const source = String(value ?? '').trim()
  if (!source) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(source)) return source

  const fileName = source
    .replace(/^\/+/, '')
    .replace(/^images\//, '')
    .replace(/^\.\//, '')

  return assetUrl(fileName)
}

export function getInitials(name = 'IS') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
