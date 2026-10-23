import { supabase } from '../lib/supabaseClient'

function getClient() {
  if (!supabase) {
    throw new Error(
      'La conexión con Supabase no está configurada. Revisa las variables VITE_ del archivo .env.local.',
    )
  }
  return supabase
}

function cleanText(value, maxLength = 2000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeImageUrl(value) {
  const imagenUrl = cleanText(value, 2000).replace(/^\/+/, '')
  if (!imagenUrl) return null
  const isRemoteImage = /^https?:\/\//i.test(imagenUrl)
  const isLocalImage = /^images\/[a-zA-Z0-9._-]+$/.test(imagenUrl)
  if (!isRemoteImage && !isLocalImage) {
    throw new Error('La imagen debe ser una URL pública o una ruta local de images/.')
  }
  return imagenUrl
}

export function sanitizeNews(payload) {
  const titulo = cleanText(payload.titulo, 160)
  const resumen = cleanText(payload.resumen, 320)
  const contenido = cleanText(payload.contenido, 12000)

  if (!titulo) throw new Error('El título de la noticia es obligatorio.')
  if (!contenido) throw new Error('Escribe el contenido de la noticia.')

  return {
    titulo,
    resumen: resumen || contenido.slice(0, 280),
    contenido,
    imagen_url: normalizeImageUrl(payload.imagen_url),
    publicada: Boolean(payload.publicada),
  }
}

export function getNewsErrorMessage(error) {
  if (!error) return 'Ocurrió un error inesperado.'
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403
  ) {
    return 'Tu cuenta no tiene permisos para realizar esta acción.'
  }
  if (error.code === 'PGRST116') return 'No se encontró la noticia solicitada.'
  if (error.code === '23514') return 'Alguno de los datos no cumple las restricciones.'
  return error.message || 'No pudimos completar la operación. Intenta de nuevo.'
}

export async function fetchPublicNews() {
  const client = getClient()
  const { data, error } = await client
    .from('noticias')
    .select('id, created_at, titulo, resumen, contenido, imagen_url')
    .eq('publicada', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(getNewsErrorMessage(error))
  return data ?? []
}

export async function fetchAdminNews() {
  const client = getClient()
  const { data, error } = await client
    .from('noticias')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(getNewsErrorMessage(error))
  return data ?? []
}

export async function createNews(payload) {
  const client = getClient()
  const sanitized = sanitizeNews(payload)
  const { data, error } = await client
    .from('noticias')
    .insert(sanitized)
    .select()
    .single()

  if (error) throw new Error(getNewsErrorMessage(error))
  return data
}

export async function updateNews(id, payload) {
  if (!id) throw new Error('Falta el identificador de la noticia.')
  const client = getClient()
  const sanitized = sanitizeNews(payload)
  const { data, error } = await client
    .from('noticias')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(getNewsErrorMessage(error))
  return data
}

export async function setNewsPublished(id, publicada) {
  const client = getClient()
  const { data, error } = await client
    .from('noticias')
    .update({ publicada: Boolean(publicada) })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(getNewsErrorMessage(error))
  return data
}

export async function deleteNews(id) {
  const client = getClient()
  const { error } = await client.from('noticias').delete().eq('id', id)
  if (error) throw new Error(getNewsErrorMessage(error))
}
