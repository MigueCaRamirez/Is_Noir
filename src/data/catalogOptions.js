export const PRODUCT_COLLECTIONS = ['Old Money', 'Alternativo']
export const PRODUCT_TYPES = ['Ropa', 'Accesorios']

export const COLLECTION_OPTIONS = ['Todas', ...PRODUCT_COLLECTIONS]
export const TYPE_OPTIONS = ['Todo', ...PRODUCT_TYPES]

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Alfabético' },
]

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL']
export const SINGLE_SIZE = 'Única'

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
]
