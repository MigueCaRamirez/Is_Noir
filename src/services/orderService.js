import { formatCOP, getProductImages, absoluteImageUrl, isSingleSize } from '../lib/format'

const configuredPhone = String(import.meta.env.VITE_WHATSAPP_PHONE ?? '').replace(/\D/g, '')
export const WHATSAPP_PHONE = configuredPhone || '573122597144'

function imageLine(imageUrl, label = '📷 Foto principal') {
  const url = absoluteImageUrl(imageUrl)
  return url ? `${label}: ${url}` : ''
}

function sizeBreakdown(items) {
  const sizes = new Map()
  for (const item of items) {
    const size = String(item.talla ?? '').trim() || 'Única'
    const quantity = Number(item.cantidad) || 1
    sizes.set(size, (sizes.get(size) || 0) + quantity)
  }
  return [...sizes.entries()]
    .map(([size, quantity]) => `${quantity}x Talla ${size}`)
    .join(' · ')
}

function groupCartItems(items) {
  const groups = new Map()
  for (const item of items) {
    const key = String(item.productoId ?? item.nombre ?? '')
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        nombre: item.nombre,
        coleccion: item.coleccion,
        precio: Number(item.precio) || 0,
        image: getProductImages(item)[0] || item.imagen_url,
        items: [],
      })
    }
    groups.get(key).items.push(item)
  }
  return [...groups.values()]
}

export function buildWhatsAppUrl(items = [], { reservation = null } = {}) {
  if (!items.length) {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
      'Hola IS NOIR ✨ Quisiera más información sobre sus piezas.',
    )}`
  }

  const groups = groupCartItems(items)
  const lines = groups.flatMap((group) => {
    const quantity = group.items.reduce(
      (sum, item) => sum + (Number(item.cantidad) || 1),
      0,
    )
    const groupTotal = group.items.reduce(
      (sum, item) => sum + (Number(item.precio) || 0) * (Number(item.cantidad) || 1),
      0,
    )
    const collection = group.coleccion ? ` · Colección ${group.coleccion}` : ''
    const sizes = sizeBreakdown(group.items)

    return [
      `• ${group.nombre}`,
      `  ${quantity} unidad(es)${collection}`,
      sizes ? `  ${sizes}` : '',
      `  Total: ${formatCOP(groupTotal)} COP`,
      imageLine(group.image),
    ].filter(Boolean)
  })

  const total = items.reduce(
    (acc, item) => acc + Number(item.precio) * (Number(item.cantidad) || 1),
    0,
  )

  const reservationLine = reservation?.id
    ? `Apartado: #${String(reservation.id).slice(0, 8).toUpperCase()} · válido hasta ${new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(reservation.expiresAt))}`
    : ''

  const message = [
    'Hola IS NOIR ✨ Quiero confirmar este pedido:',
    '',
    ...lines,
    '',
    `TOTAL: ${formatCOP(total)} COP`,
    reservationLine,
    '',
    'Entregas locales únicamente en la ciudad de Cúcuta. ¿Me ayudan a coordinar, por favor?',
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

export function buildSingleProductWhatsAppUrl(
  product,
  { size = '', quantity = 1, allocations = null } = {},
) {
  if (!product) return buildWhatsAppUrl()

  const images = getProductImages(product)
  const allocationEntries = Object.entries(allocations ?? {})
    .map(([entrySize, entryQuantity]) => [entrySize, Number(entryQuantity) || 0])
    .filter(([, entryQuantity]) => entryQuantity > 0)

  const units = allocationEntries.length
    ? allocationEntries.reduce((sum, [, entryQuantity]) => sum + entryQuantity, 0)
    : Math.max(1, Math.floor(Number(quantity) || 1))

  const sizes = allocationEntries.length
    ? allocationEntries.map(([entrySize, entryQuantity]) => `${entryQuantity}x Talla ${entrySize}`).join(' · ')
    : isSingleSize(product)
      ? 'Talla única'
      : size
        ? `${units}x Talla ${size}`
        : ''

  const total = (Number(product.precio) || 0) * units
  const message = [
    'Hola IS NOIR ✨ Me interesa esta pieza:',
    '',
    `• ${product.nombre} — ${formatCOP(product.precio)} COP`,
    product.coleccion ? `Colección: ${product.coleccion}` : '',
    product.subcategoria ? `Categoría: ${product.subcategoria}` : '',
    sizes,
    `Total: ${formatCOP(total)} COP`,
    imageLine(images[0]),
    '',
    'Entregas locales únicamente en Cúcuta. ¿Sigue disponible?',
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
