import { formatCOP, getProductImages, absoluteImageUrl } from '../lib/format'

const configuredPhone = String(import.meta.env.VITE_WHATSAPP_PHONE ?? '').replace(/\D/g, '')
export const WHATSAPP_PHONE = configuredPhone || '573122597144'

function imageLine(imageUrl, label = '📷 Ver foto') {
  const url = absoluteImageUrl(imageUrl)
  return url ? `${label}: ${url}` : ''
}

export function buildWhatsAppUrl(items = [], { reservation = null } = {}) {
  if (!items.length) {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
      'Hola IS NOIR ✨ Quisiera más información sobre sus piezas.',
    )}`
  }

  const lines = items.flatMap((item) => {
    const quantity = Number(item.cantidad) || 1
    const collection = item.coleccion ? ` · Colección ${item.coleccion}` : ''
    const size = item.talla ? ` · Talla ${item.talla}` : ''
    const unit = formatCOP(item.precio)
    const image = imageLine(getProductImages(item)[0] || item.imagen_url)

    return [
      `• ${item.nombre}`,
      `  ${quantity} x ${unit}${size}${collection} — ${formatCOP(Number(item.precio) * quantity)}`,
      image,
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

export function buildSingleProductWhatsAppUrl(product, { size = '', quantity = 1 } = {}) {
  if (!product) return buildWhatsAppUrl()

  const images = getProductImages(product)
  const units = Math.max(1, Math.floor(Number(quantity) || 1))
  const message = [
    'Hola IS NOIR ✨ Me interesa esta pieza:',
    '',
    `• ${product.nombre} — ${formatCOP(product.precio)} COP`,
    product.coleccion ? `Colección: ${product.coleccion}` : '',
    product.subcategoria ? `Categoría: ${product.subcategoria}` : '',
    size ? `Talla: ${size}` : product.tipo === 'Ropa' ? 'Tallas disponibles: XS, S, M, L, XL' : 'Talla única',
    units > 1 ? `Cantidad: ${units}` : '',
    imageLine(images[0]),
    '',
    'Entregas locales únicamente en Cúcuta. ¿Sigue disponible?',
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
