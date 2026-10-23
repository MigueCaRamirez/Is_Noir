#!/usr/bin/env node
/**
 * Aplica supabase/schema.sql mediante la Management API de Supabase.
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN = "..."
 *   $env:SUPABASE_PROJECT_REF = "tu-ref"
 *   npm run db:apply
 *
 * El token NO se escribe en el proyecto, no se registra en logs y no se
 * incluye en package.json ni en archivos de configuración.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF

if (!token || !projectRef) {
  console.error(
    'Faltan variables de entorno. Define SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF antes de ejecutar.',
  )
  process.exit(1)
}

const schemaPath = path.join(root, 'supabase', 'schema.sql')
const schema = await readFile(schemaPath, 'utf8')

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: schema, read_only: false }),
  },
)

if (!response.ok) {
  const detail = await response.text()
  console.error(`No se pudo aplicar el esquema (HTTP ${response.status}).`)
  console.error(detail.slice(0, 2000))
  process.exit(1)
}

console.log('Esquema aplicado correctamente: tablas, RLS, lista blanca y Storage.')
