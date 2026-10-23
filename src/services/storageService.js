import { supabase } from '../lib/supabaseClient'

export const PRODUCT_IMAGES_BUCKET = 'imagenes-productos'
const MAX_FILE_SIZE = 6 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export function validateProductImage(file) {
  if (!(file instanceof File)) {
    throw new Error('Selecciona una imagen válida.')
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o AVIF.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La imagen supera el límite de 6 MB.')
  }
}

/**
 * Sube una imagen directamente al bucket público de Supabase Storage.
 * Las políticas RLS de storage.objects exigen un administrador whitelisted.
 */
async function uploadImage(file, folder) {
  validateProductImage(file)
  const client = getClient()
  const extension = EXTENSION_BY_TYPE[file.type] ?? 'jpg'
  const year = new Date().getFullYear()
  const objectPath = `${folder}/${year}/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.statusCode === '403' || uploadError.status === 403) {
      throw new Error('No tienes permisos para subir imágenes.')
    }
    throw new Error(uploadError.message || 'No se pudo subir la imagen.')
  }

  const { data } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath)
  return { publicUrl: data.publicUrl, path: objectPath }
}

export function uploadProductImage(file) {
  return uploadImage(file, 'productos')
}

export function uploadNewsImage(file) {
  return uploadImage(file, 'noticias')
}

export async function deleteProductImageByUrl(publicUrl) {
  if (!publicUrl) return
  const client = getClient()
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) return

  const objectPath = decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split('?')[0])
  if (!objectPath) return

  const { error } = await client.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath])
  if (error) {
    throw new Error(error.message || 'No se pudo eliminar la imagen anterior.')
  }
}
