#!/usr/bin/env node
/**
 * Guardia de secretos para CI y ejecución local.
 * Falla si encuentra credenciales privadas fuera de los archivos ignorados.
 */
import { execFileSync } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', 'public'])
const IGNORED_FILES = new Set(['.env.local', '.env', '.env.example', 'package-lock.json'])
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.html',
  '.css',
  '.sql',
  '.yml',
  '.yaml',
  '.txt',
  '.env',
  '.example',
])

const PATTERNS = [
  { label: 'token de Supabase', regex: /sbp_[A-Za-z0-9]{20,}/ },
  { label: 'service role JWT', regex: new RegExp(['cm9sZSI6', 'InNlcnZpY2Vf', 'cm9sZSI'].join('')) },
  { label: 'JWT de Supabase hardcodeado', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/ },
  { label: 'cadena de conexión PostgreSQL', regex: /postgres(?:ql)?:\/\/[^\s'"`]+:[^\s'"`]+@/i },
]

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, files)
      continue
    }
    if (IGNORED_FILES.has(entry.name)) continue
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name)) && !entry.name.startsWith('.env')) continue
    files.push(fullPath)
  }
  return files
}

async function ensureSensitiveFileIgnored() {
  try {
    const tracked = execFileSync('git', ['ls-files', '--', '.env.local', '.env'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (tracked) {
      console.error(`ERROR: un archivo de entorno está rastreado por Git: ${tracked}`)
      process.exitCode = 1
    }
  } catch {
    // Sin repositorio Git todavía: la comprobación se repetirá en CI.
  }
}

await ensureSensitiveFileIgnored()
const files = await walk(root)
const findings = []

for (const file of files) {
  let info
  try {
    info = await stat(file)
  } catch {
    continue
  }
  if (!info.isFile() || info.size > 1_500_000) continue

  const content = await readFile(file, 'utf8').catch(() => '')
  for (const { label, regex } of PATTERNS) {
    if (regex.test(content)) {
      findings.push(`${path.relative(root, file)} → ${label}`)
    }
  }
}

if (findings.length) {
  console.error('ERROR: se detectaron posibles secretos fuera de .env.local:')
  for (const finding of findings) console.error(` - ${finding}`)
  process.exit(1)
}

console.log('OK: no se detectaron secretos privados en archivos versionables.')
