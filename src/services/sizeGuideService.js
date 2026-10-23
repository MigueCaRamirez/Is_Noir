import { supabase } from '../lib/supabaseClient'

const FALLBACK_GUIDES = {
  Ropa: {
    tipo: 'Ropa',
    titulo: 'Guía de tallas · Ropa',
    texto:
      'La guía se mide sobre el cuerpo, no sobre la prenda.\n\nXS · Busto 80–84 cm · Cintura 62–66 cm · Cadera 88–92 cm\nS · Busto 84–88 cm · Cintura 66–70 cm · Cadera 92–96 cm\nM · Busto 88–92 cm · Cintura 70–74 cm · Cadera 96–100 cm\nL · Busto 92–98 cm · Cintura 74–80 cm · Cadera 100–106 cm\nXL · Busto 98–104 cm · Cintura 80–86 cm · Cadera 106–112 cm\n\nSi estás entre dos tallas, elige la mayor para una caída más fluida.',
    imagen_url: null,
  },
  Accesorios: {
    tipo: 'Accesorios',
    titulo: 'Guía de tallas · Accesorios',
    texto:
      'Nuestros accesorios son de talla única, pensados para adaptarse a distintos cuerpos y estilos.\n\nPara collares y pulseras, revisa las medidas del producto en su descripción. Si necesitas una medida especial, escríbenos por WhatsApp y lo revisamos contigo.',
    imagen_url: null,
  },
}

function getClient() {
  if (!supabase) {
    throw new Error('La conexión con la tienda no está disponible.')
  }
  return supabase
}

export function fallbackSizeGuide(tipo) {
  return FALLBACK_GUIDES[tipo] || FALLBACK_GUIDES.Ropa
}

export function buildSizeGuideMap(rows = []) {
  const map = {
    Ropa: fallbackSizeGuide('Ropa'),
    Accesorios: fallbackSizeGuide('Accesorios'),
  }
  for (const row of rows) {
    if (row?.tipo) map[row.tipo] = { ...map[row.tipo], ...row }
  }
  return map
}

export async function fetchSizeGuides() {
  const client = getClient()
  const { data, error } = await client.from('guias_tallas').select('*')
  if (error) return buildSizeGuideMap([])
  return buildSizeGuideMap(data ?? [])
}

export async function updateSizeGuide(tipo, payload) {
  if (!['Ropa', 'Accesorios'].includes(tipo)) {
    throw new Error('Categoría de guía no válida.')
  }

  const client = getClient()
  const clean = {
    titulo: String(payload.titulo ?? '').trim().slice(0, 160) || `Guía de tallas · ${tipo}`,
    texto: String(payload.texto ?? '').trim().slice(0, 8000) || null,
    imagen_url: String(payload.imagen_url ?? '').trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('guias_tallas')
    .upsert({ tipo, ...clean }, { onConflict: 'tipo' })
    .select()
    .single()

  if (error) {
    throw new Error('No pudimos guardar la guía de tallas. Inténtalo de nuevo.')
  }

  return data
}
