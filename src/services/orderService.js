import { formatCOP } from '../lib/format'

const configuredPhone = String(import.meta.env.VITE_WHATSAPP_PHONE ?? '').replace(/\D/g, '')
export const WHATSAPP_PHONE = configuredPhone || '573122597144'

export function buildWhatsAppUrl(items = []) {
  if (!items.length) {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
      'Hola IS NOIR ✨ Quisiera más información sobre sus piezas.',
    )}`
  }

  const lines = items.map((item) => {
    const size = item.talla ? ` · Talla ${item.talla}` : ''
    const unit = formatCOP(item.precio)
    const quantity = Number(item.cantidad) || 1
    return `• ${item.nombre}${size} · ${quantity} x ${unit} — ${formatCOP(
      Number(item.precio) * quantity,
    )}`
  })

  const total = items.reduce(
    (acc, item) => acc + Number(item.precio) * (Number(item.cantidad) || 1),
    0,
  )

  const message = [
    'Hola IS NOIR ✨ Quiero confirmar este pedido:',
    '',
    ...lines,
    '',
    `TOTAL: ${formatCOP(total)} COP`,
    '',
    '¿Me ayudan con disponibilidad y envío, por favor?',
  ].join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

export function buildSingleProductWhatsAppUrl(product) {
  if (!product) return buildWhatsAppUrl()
  const message = [
    'Hola IS NOIR ✨ Me interesa esta pieza:',
    '',
    `• ${product.nombre} — ${formatCOP(product.precio)} COP`,
    product.coleccion ? `Colección: ${product.coleccion}` : '',
    product.subcategoria ? `Categoría: ${product.subcategoria}` : '',
    '',
    '¿Sigue disponible?',
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
