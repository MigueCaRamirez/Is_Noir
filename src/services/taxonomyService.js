import { supabase } from '../lib/supabaseClient'

export const TAXONOMY_CATEGORIES = [
  { value: 'coleccion', label: 'Colecciones' },
  { value: 'tipo', label: 'Tipos' },
  { value: 'subcategoria', label: 'Subcategorías' },
]

const VALID_CATEGORIES = new Set(TAXONOMY_CATEGORIES.map((item) => item.value))

function getClient() {
  if (!supabase) {
    throw new Error('La conexión con la tienda no está disponible.')
  }
  return supabase
}

function cleanName(value) {
  return String(value ?? '').trim().slice(0, 80)
}

export function emptyTaxonomies() {
  return { coleccion: [], tipo: [], subcategoria: [] }
}

export function groupTaxonomies(rows = []) {
  const grouped = emptyTaxonomies()
  for (const row of rows) {
    if (!VALID_CATEGORIES.has(row?.categoria)) continue
    const name = cleanName(row.nombre)
    if (!name) continue
    grouped[row.categoria].push({ ...row, nombre: name })
  }
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
  return grouped
}

export async function fetchTaxonomies() {
  const client = getClient()
  const { data, error } = await client
    .from('taxonomias')
    .select('id, categoria, nombre, created_at')
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw error
  return groupTaxonomies(data ?? [])
}

export async function createTaxonomy(categoria, nombre) {
  if (!VALID_CATEGORIES.has(categoria)) {
    throw new Error('Selecciona una categoría válida.')
  }
  const clean = cleanName(nombre)
  if (!clean) {
    throw new Error('Escribe un nombre para la taxonomía.')
  }

  const client = getClient()
  const { data, error } = await client
    .from('taxonomias')
    .insert({ categoria, nombre: clean })
    .select('id, categoria, nombre, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un elemento con ese nombre en esta categoría.')
    }
    throw error
  }
  return data
}

export async function updateTaxonomy(taxonomy, nombre) {
  if (!taxonomy?.id) {
    throw new Error('No pudimos identificar el elemento a editar.')
  }
  const clean = cleanName(nombre)
  if (!clean) {
    throw new Error('Escribe un nombre para la taxonomía.')
  }
  if (clean === taxonomy.nombre) return taxonomy

  const client = getClient()
  const field =
    taxonomy.categoria === 'coleccion'
      ? 'coleccion'
      : taxonomy.categoria === 'tipo'
        ? 'tipo'
        : 'subcategoria'

  const { data, error } = await client
    .from('taxonomias')
    .update({ nombre: clean })
    .eq('id', taxonomy.id)
    .select('id, categoria, nombre, created_at')
    .single()

  if (error) throw error

  // Mantiene alineados los productos existentes para que el renombre no rompa
  // el catálogo ni los filtros de la tienda.
  const { error: productsError } = await client
    .from('productos')
    .update({ [field]: clean })
    .eq(field, taxonomy.nombre)

  if (productsError) throw productsError
  return data
}

export async function deleteTaxonomy(taxonomy) {
  if (!taxonomy?.id) {
    throw new Error('No pudimos identificar el elemento a eliminar.')
  }

  const client = getClient()
  const field =
    taxonomy.categoria === 'coleccion'
      ? 'coleccion'
      : taxonomy.categoria === 'tipo'
        ? 'tipo'
        : 'subcategoria'

  const { count, error: countError } = await client
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .ilike(field, taxonomy.nombre)

  if (countError) throw countError

  if (Number(count) > 0) {
    throw new Error(
      `No puedes eliminar “${taxonomy.nombre}” porque ${count} producto(s) la usan. Reasígnalos primero.`,
    )
  }

  const { error } = await client.from('taxonomias').delete().eq('id', taxonomy.id)
  if (error) throw error
}

export function getTaxonomyErrorMessage(error) {
  const message = String(error?.message ?? '')
  if (/duplicate|unique|23505/i.test(message)) {
    return 'Ya existe un elemento con ese nombre en esta categoría.'
  }
  if (/row-level security|permission|not authorized|42501/i.test(message)) {
    return 'No tienes permisos para modificar el catálogo.'
  }
  return message || 'No pudimos guardar la configuración del catálogo.'
}
