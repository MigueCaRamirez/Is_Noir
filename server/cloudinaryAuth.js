import crypto from 'node:crypto'

const MAX_BODY_BYTES = 1024 * 1024

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body)
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body
    return raw ? JSON.parse(raw) : {}
  }

  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('La solicitud es demasiado grande.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('La solicitud no contiene JSON válido.'))
      }
    })
    req.on('error', reject)
  })
}

function supabaseConfig() {
  const url = String(process.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url || !anonKey) {
    throw new Error('Supabase no está configurado en el servidor.')
  }
  return { url, anonKey }
}

function allowedAdminEmails() {
  return String(process.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Verifica que el bearer token sea una sesión real de Supabase y que el correo
 * pertenezca a la lista blanca. La autoridad final sigue siendo public.admin_emails
 * a través de is_noir_admin(), que se evalúa con el JWT del usuario.
 */
export async function requireAdmin(req) {
  const header = String(req.headers?.authorization ?? '')
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { error: 'Inicia sesión como administrador.', status: 401 }
  }

  const { url, anonKey } = supabaseConfig()
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  }

  let userResponse
  try {
    userResponse = await fetch(`${url}/auth/v1/user`, { headers })
  } catch {
    return { error: 'No pudimos validar tu sesión.', status: 502 }
  }

  if (!userResponse.ok) {
    return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.', status: 401 }
  }

  let user
  try {
    user = await userResponse.json()
  } catch {
    return { error: 'No pudimos validar tu sesión.', status: 502 }
  }

  const email = String(user?.email ?? '').trim().toLowerCase()
  if (!email) {
    return { error: 'Tu cuenta no tiene un correo válido.', status: 401 }
  }

  const allowlist = allowedAdminEmails()
  if (allowlist.length > 0 && !allowlist.includes(email)) {
    return { error: 'Tu cuenta no está autorizada para administrar el atelier.', status: 401 }
  }

  let adminResponse
  try {
    adminResponse = await fetch(`${url}/rest/v1/rpc/is_noir_admin`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    return { error: 'No pudimos comprobar tus permisos.', status: 502 }
  }

  if (!adminResponse.ok) {
    return { error: 'No pudimos comprobar tus permisos.', status: 502 }
  }

  let isAdmin = false
  try {
    isAdmin = Boolean(await adminResponse.json())
  } catch {
    isAdmin = false
  }

  if (!isAdmin) {
    return { error: 'Tu cuenta no está autorizada para administrar el atelier.', status: 401 }
  }

  return { user: { id: user.id, email } }
}

export function cloudinaryConfig() {
  const cloudName = String(process.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim()
  const apiKey = String(process.env.VITE_CLOUDINARY_API_KEY ?? '').trim()
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET ?? '').trim()
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary no está configurado en el servidor.')
  }
  return { cloudName, apiKey, apiSecret }
}

export function cloudinarySignature(params, apiSecret) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex')
}

export function safeFolder(value) {
  const folder = String(value ?? 'is_noir_catalog').trim().replace(/^\/+|\/+$/g, '')
  if (
    !folder ||
    folder.length > 120 ||
    folder.includes('..') ||
    !/^is_noir_catalog(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)
  ) {
    return ''
  }
  return folder
}
