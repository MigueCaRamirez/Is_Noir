import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import signCloudinary from './api/sign-cloudinary.js'
import deleteCloudinary from './api/delete-cloudinary.js'

const API_HANDLERS = {
  '/api/sign-cloudinary': signCloudinary,
  '/api/delete-cloudinary': deleteCloudinary,
}

function localApiPlugin() {
  const middleware = async (req, res, next) => {
    const path = String(req.url ?? '').split('?')[0]
    const handler = API_HANDLERS[path]
    if (!handler) {
      next()
      return
    }

    try {
      await handler(req, res)
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify({ error: 'No pudimos procesar la solicitud.' }))
    }
  }

  return {
    name: 'isnoir-local-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// El build local usa la raíz. Para GitHub Pages se puede definir
// VITE_BASE_PATH=/Is_Noir/ en el pipeline sin tocar el código.
export default defineConfig(({ mode }) => {
  // Carga también las variables sin prefijo VITE_ (p. ej. el secreto de
  // Cloudinary) para que las funciones de /api funcionen en `npm run dev`.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), localApiPlugin()],
    base: process.env.VITE_BASE_PATH || '/',
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
    },
  }
})
