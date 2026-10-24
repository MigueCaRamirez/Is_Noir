import {
  cloudinaryConfig,
  cloudinarySignature,
  readJsonBody,
  requireAdmin,
  sendJson,
} from '../server/cloudinaryAuth.js'

function safePublicId(value) {
  const publicId = String(value ?? '').trim()
  if (
    !publicId ||
    publicId.length > 220 ||
    publicId.includes('..') ||
    !/^is_noir_catalog\/[a-zA-Z0-9/_-]+$/.test(publicId)
  ) {
    return ''
  }
  return publicId
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido.' })
    return
  }

  const auth = await requireAdmin(req)
  if (auth.error) {
    sendJson(res, auth.status, { error: auth.error })
    return
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Solicitud inválida.' })
    return
  }

  const publicId = safePublicId(body?.publicId)
  if (!publicId) {
    sendJson(res, 400, { error: 'La imagen no es válida.' })
    return
  }

  try {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = cloudinarySignature({ public_id: publicId, timestamp }, apiSecret)
    const form = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    })

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
      { method: 'POST', body: form },
    )

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok || !['ok', 'not found'].includes(payload?.result)) {
      sendJson(res, 502, { error: 'Cloudinary no pudo eliminar la imagen.' })
      return
    }

    sendJson(res, 200, { result: payload.result })
  } catch {
    sendJson(res, 500, { error: 'Cloudinary no está configurado en el servidor.' })
  }
}
