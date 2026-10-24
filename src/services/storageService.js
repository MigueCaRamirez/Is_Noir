import { supabase } from '../lib/supabaseClient'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const CLOUDINARY_ROOT_FOLDER = 'is_noir_catalog'

function cloudinaryConfig() {
  const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim()
  const apiKey = String(import.meta.env.VITE_CLOUDINARY_API_KEY ?? '').trim()
  if (!cloudName || !apiKey) {
    throw new Error('Cloudinary no está configurado. Revisa las variables VITE_ del archivo .env.local.')
  }
  return { cloudName, apiKey }
}

export function validateProductImage(file) {
  if (!(file instanceof File)) {
    throw new Error('Selecciona una imagen válida.')
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o AVIF.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La imagen supera el límite de 10 MB.')
  }
}

async function getAccessToken() {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }
  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session?.access_token) {
    throw new Error('Tu sesión de administrador expiró. Vuelve a iniciar sesión.')
  }
  return data.session.access_token
}

async function requestSignature(folder) {
  const token = await getAccessToken()
  const response = await fetch('/api/sign-cloudinary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ folder }),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Tu cuenta no tiene permisos para subir imágenes.')
    }
    throw new Error(payload?.error || 'No pudimos firmar la subida de la imagen.')
  }

  if (!payload?.timestamp || !payload?.signature || !payload?.folder) {
    throw new Error('La firma de Cloudinary llegó incompleta. Inténtalo de nuevo.')
  }
  return payload
}

/**
 * Sube la imagen directamente a Cloudinary. El secreto nunca viaja al navegador:
 * /api/sign-cloudinary valida la sesión del administrador y devuelve la firma.
 */
async function uploadImage(file, subfolder) {
  validateProductImage(file)
  const { cloudName, apiKey } = cloudinaryConfig()
  const folder = `${CLOUDINARY_ROOT_FOLDER}/${subfolder}`
  const signature = await requestSignature(folder)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(signature.timestamp))
  formData.append('signature', signature.signature)
  formData.append('folder', signature.folder || folder)

  let response
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: formData },
    )
  } catch {
    throw new Error('No pudimos conectar con Cloudinary. Revisa tu conexión e inténtalo de nuevo.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message || 'Cloudinary no pudo subir la imagen.')
  }

  return {
    publicUrl: payload.secure_url,
    path: payload.public_id,
  }
}

export function uploadProductImage(file) {
  return uploadImage(file, 'productos')
}

export function uploadNewsImage(file) {
  return uploadImage(file, 'noticias')
}

export function uploadSizeGuideImage(file) {
  return uploadImage(file, 'guias-tallas')
}

function cloudinaryPublicId(publicUrl) {
  const value = String(publicUrl ?? '').trim()
  const marker = '/image/upload/'
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return ''

  let path = decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0])
  path = path.replace(/^v\d+\//, '')
  return path.replace(/\.[a-zA-Z0-9]+$/, '')
}

/**
 * Elimina un asset de Cloudinary. Solo se usa para imágenes que ya viven en
 * Cloudinary; las rutas locales del catálogo semilla se ignoran.
 */
export async function deleteProductImageByUrl(publicUrl) {
  const publicId = cloudinaryPublicId(publicUrl)
  if (!publicId || !publicId.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)) return

  const token = await getAccessToken()
  const response = await fetch('/api/delete-cloudinary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicId }),
  })

  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new Error(payload?.error || 'No pudimos eliminar la imagen anterior.')
  }
}
