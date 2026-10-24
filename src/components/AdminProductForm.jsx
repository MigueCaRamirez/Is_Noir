import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ImagePlus,
  Link2,
  LoaderCircle,
  Lock,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { CLOTHING_SIZES, IMAGE_FOCUS_OPTIONS } from '../data/catalogOptions'
import { getProductImages, normalizeImageFocus, resolveProductImage } from '../lib/format'
import { createProduct, updateProduct } from '../services/productService'
import { emptyTaxonomies, fetchTaxonomies } from '../services/taxonomyService'
import {
  deleteProductImageByUrl,
  uploadProductImage,
  validateProductImage,
} from '../services/storageService'

const MAX_IMAGES = 5

const DEFAULT_FORM = {
  nombre: '',
  precio: '',
  stock: '0',
  coleccion: 'Old Money',
  tipo: 'Ropa',
  subcategoria: '',
  borrador: false,
  es_novedad: false,
  talla_unica: false,
  imagen_enfoque: 'center',
}

function normalizeImageInput(value) {
  const image = String(value ?? '').trim().replace(/^\/+/, '')
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  if (/^images\/[a-zA-Z0-9._-]+$/.test(image)) return image
  throw new Error('Usa una URL https:// o una ruta local de images/.')
}

function normalizeSizeMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result = {}
  for (const size of CLOTHING_SIZES) {
    const quantity = Math.max(0, Math.floor(Number(raw[size]) || 0))
    if (quantity > 0) result[size] = quantity
  }
  return result
}

function distributeStock(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0))
  if (!total) return {}
  const base = Math.floor(total / CLOTHING_SIZES.length)
  const remainder = total % CLOTHING_SIZES.length
  const result = {}
  CLOTHING_SIZES.forEach((size, index) => {
    const quantity = base + (index < remainder ? 1 : 0)
    if (quantity > 0) result[size] = quantity
  })
  return result
}

function sizeTotal(sizeMap) {
  return Object.values(sizeMap).reduce((sum, value) => sum + (Number(value) || 0), 0)
}

export default function AdminProductForm({ initialProduct = null, onSaved, onCancel }) {
  const isEditing = Boolean(initialProduct?.id)
  const initialImages = useMemo(() => getProductImages(initialProduct), [initialProduct])
  const initialSingle = initialProduct
    ? typeof initialProduct.talla_unica === 'boolean'
      ? initialProduct.talla_unica
      : initialProduct.tipo !== 'Ropa'
    : false
  const initialStock = Math.max(0, Math.floor(Number(initialProduct?.stock) || 0))
  const initialSizes = useMemo(() => {
    if (initialSingle) return {}
    const stored = normalizeSizeMap(initialProduct?.tallas_stock)
    return Object.keys(stored).length ? stored : distributeStock(initialStock)
  }, [initialProduct, initialSingle, initialStock])

  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialProduct
      ? {
          nombre: initialProduct.nombre ?? '',
          precio: initialProduct.precio ?? '',
          stock: String(initialStock),
          coleccion: initialProduct.coleccion ?? 'Old Money',
          tipo: initialProduct.tipo ?? 'Ropa',
          subcategoria: initialProduct.subcategoria ?? '',
          borrador: Boolean(initialProduct.borrador),
          es_novedad: Boolean(initialProduct.es_novedad),
          talla_unica: initialSingle,
          imagen_enfoque: normalizeImageFocus(initialProduct.imagen_enfoque),
        }
      : {}),
  }))
  const [tallasStock, setTallasStock] = useState(initialSizes)
  const [images, setImages] = useState(initialImages)
  const [coverKey, setCoverKey] = useState(initialImages[0] || '')
  const [pendingFiles, setPendingFiles] = useState([])
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [taxonomies, setTaxonomies] = useState(emptyTaxonomies)
  const [taxonomyError, setTaxonomyError] = useState('')
  const pendingRef = useRef([])
  const removedImagesRef = useRef(new Set())

  useEffect(() => {
    pendingRef.current = pendingFiles
  }, [pendingFiles])

  useEffect(() => () => {
    pendingRef.current.forEach((entry) => URL.revokeObjectURL(entry.preview))
  }, [])

  useEffect(() => {
    let active = true
    fetchTaxonomies()
      .then((data) => {
        if (active) {
          setTaxonomies(data)
          setTaxonomyError('')
        }
      })
      .catch(() => {
        if (active) {
          setTaxonomyError(
            'No pudimos cargar la configuración del catálogo. Puedes conservar los valores actuales.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, saving])

  const allImageEntries = useMemo(
    () => [
      ...images.map((url) => ({
        key: url,
        preview: resolveProductImage(url),
        existing: true,
        url,
      })),
      ...pendingFiles.map((entry) => ({
        key: entry.key,
        preview: entry.preview,
        existing: false,
        entry,
      })),
    ],
    [images, pendingFiles],
  )

  const totalImages = allImageEntries.length
  const coverEntry =
    allImageEntries.find((entry) => entry.key === coverKey) || allImageEntries[0] || null

  useEffect(() => {
    if (!allImageEntries.length) {
      if (coverKey) setCoverKey('')
      return
    }
    if (!allImageEntries.some((entry) => entry.key === coverKey)) {
      setCoverKey(allImageEntries[0].key)
    }
  }, [allImageEntries, coverKey])

  const computedStock = useMemo(
    () =>
      form.talla_unica
        ? Math.max(0, Math.floor(Number(form.stock) || 0))
        : sizeTotal(tallasStock),
    [form.talla_unica, form.stock, tallasStock],
  )

  const collectionOptions = useMemo(() => {
    const configured = (taxonomies.coleccion ?? []).map((item) => item.nombre)
    const options = [...new Set([...configured, form.coleccion].filter(Boolean))]
    return options.length ? options : ['Old Money', 'Alternativo']
  }, [taxonomies.coleccion, form.coleccion])

  const typeOptions = useMemo(() => {
    const configured = (taxonomies.tipo ?? []).map((item) => item.nombre)
    const options = [...new Set([...configured, form.tipo].filter(Boolean))]
    return options.length ? options : ['Ropa', 'Accesorios']
  }, [taxonomies.tipo, form.tipo])

  const subcategoryOptions = useMemo(() => {
    const configured = (taxonomies.subcategoria ?? []).map((item) => item.nombre)
    return [...new Set([...configured, form.subcategoria].filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    )
  }, [taxonomies.subcategoria, form.subcategoria])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const handleTypeChange = (tipo) => {
    setError('')
    if (tipo === 'Accesorios') {
      setForm((current) => ({
        ...current,
        tipo,
        talla_unica: true,
        stock: String(computedStock),
      }))
      setTallasStock({})
      return
    }

    if (form.talla_unica) {
      const total = computedStock
      setForm((current) => ({ ...current, tipo, talla_unica: false }))
      setTallasStock(distributeStock(total))
      return
    }

    setForm((current) => ({ ...current, tipo }))
  }

  const handleSingleToggle = (checked) => {
    setError('')
    if (checked) {
      setForm((current) => ({
        ...current,
        talla_unica: true,
        stock: String(computedStock),
      }))
      setTallasStock({})
      return
    }

    const total = computedStock
    setForm((current) => ({ ...current, talla_unica: false }))
    setTallasStock(distributeStock(total))
  }

  const handleSizeChange = (size, value) => {
    const quantity =
      value === '' ? 0 : Math.max(0, Math.floor(Number(value) || 0))
    setTallasStock((current) => {
      const next = { ...current }
      if (quantity > 0) next[size] = quantity
      else delete next[size]
      return next
    })
    setError('')
  }

  const handleFiles = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    const remaining = MAX_IMAGES - totalImages
    if (remaining <= 0) {
      setError('Ya tienes 5 imágenes. Elimina una antes de añadir otra.')
      return
    }

    const accepted = []
    for (const file of files.slice(0, remaining)) {
      try {
        validateProductImage(file)
        accepted.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          preview: URL.createObjectURL(file),
        })
      } catch (imageError) {
        setError(imageError.message)
      }
    }

    if (files.length > remaining) {
      setError('Puedes guardar hasta 5 imágenes por pieza.')
    }

    if (accepted.length) setPendingFiles((current) => [...current, ...accepted])
  }

  const removePending = (key) => {
    setPendingFiles((current) => {
      const target = current.find((entry) => entry.key === key)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((entry) => entry.key !== key)
    })
    setError('')
  }

  const removeExisting = (url) => {
    setImages((current) => current.filter((image) => image !== url))
    removedImagesRef.current.add(url)
    setError('')
  }

  const addImageUrl = () => {
    if (totalImages >= MAX_IMAGES) {
      setError('Puedes guardar hasta 5 imágenes por pieza.')
      return
    }
    try {
      const image = normalizeImageInput(imageUrlDraft)
      if (!image) return
      if (images.includes(image)) {
        setError('Esa imagen ya está en la selección.')
        return
      }
      setImages((current) => [...current, image])
      if (!coverKey) setCoverKey(image)
      removedImagesRef.current.delete(image)
      setImageUrlDraft('')
      setError('')
    } catch (urlError) {
      setError(urlError.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const precio = Number(form.precio)

    if (!form.nombre.trim()) {
      setError('Escribe el nombre de la pieza.')
      return
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError('El precio debe ser un número mayor o igual a cero.')
      return
    }
    if (totalImages === 0) {
      setError('Agrega al menos una imagen para publicar la pieza.')
      return
    }
    if (totalImages > MAX_IMAGES) {
      setError('Puedes guardar hasta 5 imágenes por pieza.')
      return
    }
    if (form.talla_unica && (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)) {
      setError('El stock debe ser un entero mayor o igual a cero.')
      return
    }

    setSaving(true)
    try {
      const uploaded = await Promise.all(
        pendingFiles.map(async (entry) => ({
          key: entry.key,
          ...(await uploadProductImage(entry.file)),
        })),
      )
      const uploadedByKey = new Map(uploaded.map((entry) => [entry.key, entry.publicUrl]))

      const coverUrl = coverEntry
        ? coverEntry.existing
          ? coverEntry.url
          : uploadedByKey.get(coverEntry.key)
        : null
      const restExisting = images.filter((image) => image !== coverUrl)
      const restPending = pendingFiles
        .filter((entry) => entry.key !== coverEntry?.key)
        .map((entry) => uploadedByKey.get(entry.key))
        .filter(Boolean)

      const nextImages = [
        ...new Set([coverUrl, ...restExisting, ...restPending].filter(Boolean)),
      ].slice(0, MAX_IMAGES)

      if (!nextImages.length) {
        throw new Error('Agrega al menos una imagen para publicar la pieza.')
      }

      const payload = {
        nombre: form.nombre,
        precio,
        stock: computedStock,
        coleccion: form.coleccion,
        tipo: form.tipo,
        subcategoria: form.subcategoria,
        imagenes_urls: nextImages,
        imagen_url: nextImages[0],
        imagen_enfoque: form.imagen_enfoque,
        talla_unica: form.talla_unica,
        tallas_stock: form.talla_unica ? {} : tallasStock,
        borrador: form.borrador,
        es_novedad: form.es_novedad,
      }

      const saved = isEditing
        ? await updateProduct(initialProduct.id, payload)
        : await createProduct(payload)

      for (const removedUrl of removedImagesRef.current) {
        if (!nextImages.includes(removedUrl)) {
          deleteProductImageByUrl(removedUrl).catch(() => {})
        }
      }

      onSaved?.(saved)
    } catch (submitError) {
      setError(submitError.message || 'No se pudo guardar la pieza.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="admin-form-backdrop" role="presentation">
      <div className="admin-form-shell animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="admin-form-title">
        <header className="admin-form-shell__head">
          <div>
            <span className="admin-kicker">{isEditing ? 'Editar pieza' : 'Nueva pieza'}</span>
            <h2 id="admin-form-title">{isEditing ? initialProduct.nombre : 'Añadir al inventario'}</h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onCancel} disabled={saving} aria-label="Cerrar formulario">
            <X size={20} strokeWidth={1.4} />
          </button>
        </header>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__grid">
            <div className="admin-form__fields">
              <label className="admin-field admin-field--wide">
                <span>Nombre de la pieza *</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(event) => updateField('nombre', event.target.value)}
                  placeholder="Ej. Vestido Minuit"
                  maxLength={160}
                  required
                />
              </label>

              <label className="admin-field">
                <span>Precio (COP) *</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.precio}
                  onChange={(event) => updateField('precio', event.target.value)}
                  placeholder="12999"
                  required
                />
              </label>

              <label className="admin-field">
                <span>Colección *</span>
                <select value={form.coleccion} onChange={(event) => updateField('coleccion', event.target.value)}>
                  {collectionOptions.map((collection) => (
                    <option key={collection} value={collection}>{collection}</option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Tipo *</span>
                <select value={form.tipo} onChange={(event) => handleTypeChange(event.target.value)}>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="admin-field admin-field--wide">
                <span>Subcategoría</span>
                <select
                  value={form.subcategoria}
                  onChange={(event) => updateField('subcategoria', event.target.value)}
                >
                  <option value="">Sin subcategoría</option>
                  {subcategoryOptions.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
                <small className="admin-field__hint">
                  {taxonomyError
                    || 'Las colecciones, tipos y subcategorías se administran en Configuración de Catálogo.'}
                </small>
              </label>

              <div className="admin-field admin-field--wide admin-sizes-field">
                <span>Tallas e inventario *</span>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={form.talla_unica}
                    onChange={(event) => handleSingleToggle(event.target.checked)}
                  />
                  <span>
                    <strong>Talla única</strong>
                    <small>Para accesorios o piezas sin variantes de talla.</small>
                  </span>
                </label>

                {form.talla_unica ? (
                  <label className="admin-field admin-field--stock">
                    <span>Stock total *</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(event) => updateField('stock', event.target.value)}
                      required
                    />
                  </label>
                ) : (
                  <>
                    <div className="admin-size-grid">
                      {CLOTHING_SIZES.map((size) => (
                        <label className="admin-size-field" key={size}>
                          <span>{size}</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={tallasStock[size] ?? ''}
                            onChange={(event) => handleSizeChange(size, event.target.value)}
                            placeholder="0"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="admin-size-total">
                      <span>Stock total asignado</span>
                      <strong className={computedStock === 0 ? 'is-empty' : computedStock <= 3 ? 'is-low' : ''}>
                        {computedStock}
                      </strong>
                    </div>
                    <small className="admin-field__hint">
                      La suma de las tallas debe ser igual al stock total. Se calcula automáticamente.
                    </small>
                  </>
                )}
              </div>

              <div className="admin-field admin-field--wide">
                <span>Encuadre de la portada</span>
                <select
                  value={form.imagen_enfoque}
                  onChange={(event) => updateField('imagen_enfoque', event.target.value)}
                >
                  {IMAGE_FOCUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small className="admin-field__hint">
                  Ajusta qué parte de la imagen se ve primero en la tienda. La foto se recorta con “cover”.
                </small>
              </div>

              <div className="admin-field admin-field--wide">
                <span>Fotos de la pieza · máximo 5</span>
                <div className="admin-image-grid">
                  {allImageEntries.map((entry, index) => (
                    <div
                      className={`admin-image-card ${coverEntry?.key === entry.key ? 'is-cover' : ''}`}
                      key={entry.key}
                    >
                      <img
                        src={entry.preview}
                        alt={`Foto ${index + 1}`}
                        style={{ objectPosition: form.imagen_enfoque }}
                      />
                      {coverEntry?.key === entry.key ? (
                        <span className="admin-image-card__cover">Portada</span>
                      ) : (
                        <button
                          type="button"
                          className="admin-image-card__cover-button"
                          onClick={() => setCoverKey(entry.key)}
                        >
                          <Check size={11} />
                          Hacer portada
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-image-card__remove"
                        onClick={() =>
                          entry.existing
                            ? removeExisting(entry.url)
                            : removePending(entry.key)
                        }
                        aria-label={`Eliminar foto ${index + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {totalImages < MAX_IMAGES ? (
                    <label className="admin-image-add">
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleFiles}
                      />
                      <ImagePlus size={22} strokeWidth={1.2} />
                      <strong>Añadir fotos</strong>
                      <small>{totalImages}/5</small>
                    </label>
                  ) : null}
                </div>
                <small className="admin-field__hint">
                  La imagen marcada como portada se verá primero. Puedes elegir otra antes de guardar.
                </small>
              </div>

              <div className="admin-image-url admin-field--wide">
                <label className="admin-field">
                  <span>Añadir imagen por URL</span>
                  <input
                    type="text"
                    value={imageUrlDraft}
                    onChange={(event) => {
                      setImageUrlDraft(event.target.value)
                      setError('')
                    }}
                    placeholder="https://... o images/producto.jpg"
                  />
                </label>
                <button type="button" className="admin-button admin-button--ghost" onClick={addImageUrl}>
                  <Link2 size={14} />
                  Añadir
                </button>
              </div>
            </div>

            <div className="admin-form__visual">
              <span className="admin-field__label">Vista previa de portada</span>
              <div className={`admin-upload admin-upload--preview ${coverEntry ? 'has-image' : ''}`}>
                {coverEntry ? (
                  <img
                    src={coverEntry.preview}
                    alt="Vista previa de la pieza"
                    style={{ objectPosition: form.imagen_enfoque }}
                  />
                ) : (
                  <span className="admin-upload__empty">
                    <UploadCloud size={28} strokeWidth={1.2} />
                    <strong>Sin foto todavía</strong>
                    <small>JPG, PNG, WebP o AVIF · máx. 10 MB</small>
                  </span>
                )}
              </div>

              <div className="admin-form__metrics">
                <span><strong>{String(initialProduct?.solicitudes ?? 0)}</strong> solicitudes</span>
                <span><strong>{String(initialProduct?.ventas ?? 0)}</strong> vendidas</span>
              </div>
              <small className="admin-field__hint">
                Solicitudes y ventas se calculan automáticamente con la actividad de la tienda y los apartados confirmados.
              </small>

              <label className="admin-draft-toggle">
                <input
                  type="checkbox"
                  checked={form.borrador}
                  onChange={(event) => updateField('borrador', event.target.checked)}
                />
                <span>
                  <strong>Guardar como borrador</strong>
                  <small>No será visible en la tienda pública.</small>
                </span>
                <Lock size={15} strokeWidth={1.4} />
              </label>

              <label className="admin-draft-toggle admin-draft-toggle--highlight">
                <input
                  type="checkbox"
                  checked={form.es_novedad}
                  onChange={(event) => updateField('es_novedad', event.target.checked)}
                />
                <span>
                  <strong>Destacar en Novedades</strong>
                  <small>Aparecerá en la sección “Lo más nuevo”.</small>
                </span>
                <Sparkles size={15} strokeWidth={1.4} />
              </label>

              <div className="admin-form__security">
                <Lock size={13} strokeWidth={1.4} />
                Las imágenes se suben a Cloudinary con una firma temporal generada
                por Vercel. El secreto nunca llega al navegador.
              </div>
            </div>
          </div>

          {error ? (
            <p className="admin-error" role="alert">{error}</p>
          ) : null}

          <footer className="admin-form__actions">
            <button type="button" className="admin-button admin-button--ghost" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="admin-button admin-button--primary" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Guardando…
                </>
              ) : form.borrador ? (
                'Guardar borrador'
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Publicar pieza'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
