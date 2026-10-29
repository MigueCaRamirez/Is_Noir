export const PRODUCT_COLLECTIONS = ['Old Money', 'Alternativo']
export const PRODUCT_TYPES = ['Ropa', 'Accesorios']

export const COLLECTION_OPTIONS = ['Todas', ...PRODUCT_COLLECTIONS]
export const TYPE_OPTIONS = ['Todo', ...PRODUCT_TYPES]

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'best-sellers', label: 'Más vendidos' },
  { value: 'most-requested', label: 'Más solicitados' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Alfabético' },
]

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL']
export const SINGLE_SIZE = 'Única'

export const IMAGE_FOCUS_OPTIONS = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Arriba' },
  { value: 'bottom', label: 'Abajo' },
  { value: 'left', label: 'Izquierda' },
  { value: 'right', label: 'Derecha' },
  { value: 'top left', label: 'Arriba izquierda' },
  { value: 'top right', label: 'Arriba derecha' },
  { value: 'bottom left', label: 'Abajo izquierda' },
  { value: 'bottom right', label: 'Abajo derecha' },
]

export const CATEGORY_SHOWCASE = [
  {
    label: 'Ropa',
    tipo: 'Ropa',
    image: 'category-ropa.jpg',
    caption: 'Siluetas con carácter',
  },
  {
    label: 'Accesorios',
    tipo: 'Accesorios',
    image: 'category-accesorios.jpg',
    caption: 'El detalle lo cambia todo',
  },
  {
    label: 'Café',
    tipo: 'Café',
    image: 'category-cafe.jpg',
    caption: 'Un ritual sin prisa',
    comingSoon: true,
  },
  {
    label: 'Novedades',
    tipo: 'Novedades',
    image: null,
    caption: 'Recién llegado al atelier',
  },
]

export const COLLECTION_THEMES = {
  'Old Money': 'oldmoney',
  Alternativo: 'alternativo',
}

export const STORE_SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/isnoir_2006?utm_source=ig_web_button_share_sheet&obrf=ZDNlZDc0MzIxNw==',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@is.noir4?is_from_webapp=1&sender_device=pc',
  },
]
