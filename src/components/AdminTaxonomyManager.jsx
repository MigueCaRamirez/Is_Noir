import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import {
  TAXONOMY_CATEGORIES,
  createTaxonomy,
  deleteTaxonomy,
  emptyTaxonomies,
  fetchTaxonomies,
  getTaxonomyErrorMessage,
  updateTaxonomy,
} from '../services/taxonomyService'

export default function AdminTaxonomyManager({ notify, onChanged }) {
  const [groups, setGroups] = useState(emptyTaxonomies)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({ coleccion: '', tipo: '', subcategoria: '' })
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTaxonomies()
      setGroups(data)
      setError('')
    } catch (loadError) {
      setError(getTaxonomyErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(
    () =>
      TAXONOMY_CATEGORIES.reduce((acc, category) => {
        acc[category.value] = groups[category.value]?.length ?? 0
        return acc
      }, {}),
    [groups],
  )

  const handleCreate = async (categoria) => {
    const nombre = drafts[categoria]?.trim()
    if (!nombre || busy) return
    setBusy(`create:${categoria}`)
    try {
      const created = await createTaxonomy(categoria, nombre)
      setGroups((current) => ({
        ...current,
        [categoria]: [...current[categoria], created].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      }))
      setDrafts((current) => ({ ...current, [categoria]: '' }))
      notify?.('success', `“${created.nombre}” agregada a ${categoria}.`)
      onChanged?.()
    } catch (createError) {
      notify?.('error', getTaxonomyErrorMessage(createError))
    } finally {
      setBusy('')
    }
  }

  const handleRename = async (taxonomy) => {
    if (busy) return
    const nextName = window.prompt(`Nuevo nombre para “${taxonomy.nombre}”:`, taxonomy.nombre)
    if (nextName === null) return
    if (!nextName.trim() || nextName.trim() === taxonomy.nombre) return

    setBusy(`rename:${taxonomy.id}`)
    try {
      const saved = await updateTaxonomy(taxonomy, nextName)
      setGroups((current) => ({
        ...current,
        [taxonomy.categoria]: current[taxonomy.categoria]
          .map((item) => (item.id === taxonomy.id ? saved : item))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      }))
      notify?.('success', `“${taxonomy.nombre}” ahora se llama “${saved.nombre}”.`)
      onChanged?.()
    } catch (renameError) {
      notify?.('error', getTaxonomyErrorMessage(renameError))
    } finally {
      setBusy('')
    }
  }

  const handleDelete = async (taxonomy) => {
    if (busy) return
    const confirmed = window.confirm(
      `¿Eliminar “${taxonomy.nombre}” de ${taxonomy.categoria}? Solo se puede si ningún producto la usa.`,
    )
    if (!confirmed) return

    setBusy(`delete:${taxonomy.id}`)
    try {
      await deleteTaxonomy(taxonomy)
      setGroups((current) => ({
        ...current,
        [taxonomy.categoria]: current[taxonomy.categoria].filter(
          (item) => item.id !== taxonomy.id,
        ),
      }))
      notify?.('success', `“${taxonomy.nombre}” eliminada de la configuración.`)
      onChanged?.()
    } catch (deleteError) {
      notify?.('error', getTaxonomyErrorMessage(deleteError))
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="admin-taxonomies" aria-labelledby="admin-taxonomies-title">
      <div className="admin-inventory__head">
        <div>
          <span className="admin-kicker">Configuración de catálogo</span>
          <h2 id="admin-taxonomies-title">Colecciones, tipos y subcategorías</h2>
          <p className="admin-guides__copy">
            Estos valores alimentan los filtros de la tienda y el formulario de producto.
          </p>
        </div>
      </div>

      {error ? (
        <div className="admin-state admin-state--compact">
          <Tag size={24} strokeWidth={1.2} />
          <h3>No pudimos cargar la configuración</h3>
          <p>{error}</p>
          <button type="button" className="admin-button admin-button--ghost" onClick={load}>
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="admin-loading">
          <LoaderCircle size={24} className="animate-spin" />
          <span>Cargando configuración…</span>
        </div>
      ) : (
        <div className="admin-taxonomy-grid">
          {TAXONOMY_CATEGORIES.map((category) => (
            <article className="admin-taxonomy-card" key={category.value}>
              <header>
                <div>
                  <span className="admin-kicker">{category.label}</span>
                  <strong>{String(totals[category.value] ?? 0).padStart(2, '0')}</strong>
                </div>
                <Tag size={17} strokeWidth={1.3} />
              </header>

              <div className="admin-taxonomy-list">
                {(groups[category.value] ?? []).map((item) => (
                  <span className="admin-taxonomy-chip" key={item.id}>
                    {item.nombre}
                    <button
                      type="button"
                      onClick={() => handleRename(item)}
                      disabled={Boolean(busy)}
                      aria-label={`Editar ${item.nombre}`}
                    >
                      {busy === `rename:${item.id}` ? (
                        <LoaderCircle size={11} className="animate-spin" />
                      ) : (
                        <Pencil size={11} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={Boolean(busy)}
                      aria-label={`Eliminar ${item.nombre}`}
                    >
                      {busy === `delete:${item.id}` ? (
                        <LoaderCircle size={11} className="animate-spin" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  </span>
                ))}
                {(groups[category.value] ?? []).length === 0 ? (
                  <span className="admin-taxonomy-empty">Aún no hay valores.</span>
                ) : null}
              </div>

              <form
                className="admin-taxonomy-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleCreate(category.value)
                }}
              >
                <input
                  type="text"
                  value={drafts[category.value]}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [category.value]: event.target.value,
                    }))
                  }
                  maxLength={80}
                  placeholder={`Nueva ${category.label.toLowerCase().replace(/s$/, '')}…`}
                  aria-label={`Agregar a ${category.label}`}
                />
                <button
                  type="submit"
                  className="admin-icon-button"
                  disabled={Boolean(busy) || !drafts[category.value].trim()}
                  aria-label={`Agregar a ${category.label}`}
                >
                  {busy === `create:${category.value}` ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
