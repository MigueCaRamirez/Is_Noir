import {
  cloudinaryConfig,
  cloudinarySignature,
  readJsonBody,
  requireAdmin,
  safeFolder,
  sendJson,
} from '../server/cloudinaryAuth.js'

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

  const folder = safeFolder(body?.folder)
  if (!folder) {
    sendJson(res, 400, { error: 'La carpeta de destino no es válida.' })
    return
  }

  try {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = cloudinarySignature({ folder, timestamp }, apiSecret)

    sendJson(res, 200, {
      timestamp,
      signature,
      folder,
      cloudName,
      apiKey,
    })
  } catch {
    sendJson(res, 500, { error: 'Cloudinary no está configurado en el servidor.' })
  }
}
