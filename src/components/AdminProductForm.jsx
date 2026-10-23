import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ImagePlus,
  Link2,
  LoaderCircle,
  Lock,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { PRODUCT_COLLECTIONS, PRODUCT_TYPES } from '../data/catalogOptions'
import { getProductImages, resolveProductImage } from '../lib/format'
import { createProduct, updateProduct } from '../services/productService'
import {
  deleteProductImageByUrl,
  uploadProductImage,
  validateProductImage,
} from '../services/storageService'

const DEFAULT_FORM = {
  nombre: '',
  precio: '',
  stock: '0',
  coleccion: 'Old Money',
  tipo: 'Ropa',
  subcategoria: '',
  borrador: false,
  es_novedad: false,
}

const MAX_IMAGES = 5

function normalizeImageInput(value) {
  const image = String(value ?? '').trim().replace(/^\/+/, '')
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  if (/^images\/[a-zA-Z0-9._-]+$/.test(image)) return image
  throw new Error('Usa una URL https:// o una ruta local de images/.')
}

export default function AdminProductForm({ initialProduct = null, onSaved, onCancel }) {
  const isEditing = Boolean(initialProduct?.id)
  const initialImages = useMemo(() => getProductImages(initialProduct), [initialProduct])
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialProduct
      ? {
          nombre: initialProduct.nombre ?? '',
          precio: initialProduct.precio ?? '',
          stock: String(initialProduct.stock ?? 0),
          coleccion: initialProduct.coleccion ?? 'Old Money',
          tipo: initialProduct.tipo ?? 'Ropa',
          subcategoria: initialProduct.subcategoria ?? '',
          borrador: Boolean(initialProduct.borrador),
          es_novedad: Boolean(initialProduct.es_novedad),
        }
      : {}),
  }))
  const [images, setImages] = useState(initialImages)
  const [pendingFiles, setPendingFiles] = useState([])
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pendingRef = useRef([])
  const removedImagesRef = useRef(new Set())

  useEffect(() => {
    pendingRef.current = pendingFiles
  }, [pendingFiles])

  useEffect(() => () => {
    pendingRef.current.forEach((entry) => URL.revokeObjectURL(entry.preview))
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, saving])

  const totalImages = images.length + pendingFiles.length

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
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
    const stock = Number(form.stock)

    if (!form.nombre.trim()) {
      setError('Escribe el nombre de la pieza.')
      return
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError('El precio debe ser un número mayor o igual a cero.')
      return
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('El stock debe ser un número entero mayor o igual a cero.')
      return
    }
    if (totalImages > MAX_IMAGES) {
      setError('Puedes guardar hasta 5 imágenes por pieza.')
      return
    }

    setSaving(true)
    try {
      const uploaded = await Promise.all(
        pendingFiles.map((entry) => uploadProductImage(entry.file)),
      )
      const nextImages = [
        ...images,
        ...uploaded.map((entry) => entry.publicUrl),
      ].slice(0, MAX_IMAGES)

      const payload = {
        nombre: form.nombre,
        precio,
        stock,
        coleccion: form.coleccion,
        tipo: form.tipo,
        subcategoria: form.subcategoria,
        imagenes_urls: nextImages,
        imagen_url: nextImages[0] || null,
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
                  step="100"
                  value={form.precio}
                  onChange={(event) => updateField('precio', event.target.value)}
                  placeholder="189900"
                  required
                />
              </label>

              <label className="admin-field">
                <span>Stock *</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateField('stock', event.target.value)}
                  required
                />
              </label>

              <label className="admin-field">
                <span>Colección *</span>
                <select value={form.coleccion} onChange={(event) => updateField('coleccion', event.target.value)}>
                  {PRODUCT_COLLECTIONS.map((collection) => (
                    <option key={collection} value={collection}>{collection}</option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Tipo *</span>
                <select value={form.tipo} onChange={(event) => updateField('tipo', event.target.value)}>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="admin-field admin-field--wide">
                <span>Subcategoría</span>
                <input
                  type="text"
                  value={form.subcategoria}
                  onChange={(event) => updateField('subcategoria', event.target.value)}
                  placeholder="Vestidos, Joyería, Sombrerería..."
                  maxLength={80}
                />
              </label>

              <div className="admin-field admin-field--wide">
                <span>Fotos de la pieza · máximo 5</span>
                <div className="admin-image-grid">
                  {images.map((image, index) => (
                    <div className="admin-image-card" key={image}>
                      <img src={resolveProductImage(image)} alt={`Foto ${index + 1}`} />
                      {index === 0 ? <span className="admin-image-card__cover">Portada</span> : null}
                      <button
                        type="button"
                        className="admin-image-card__remove"
                        onClick={() => removeExisting(image)}
                        aria-label={`Eliminar foto ${index + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {pendingFiles.map((entry, index) => (
                    <div className="admin-image-card" key={entry.key}>
                      <img src={entry.preview} alt={`Foto nueva ${index + 1}`} />
                      <span className="admin-image-card__cover">Nueva</span>
                      <button
                        type="button"
                        className="admin-image-card__remove"
                        onClick={() => removePending(entry.key)}
                        aria-label={`Eliminar foto nueva ${index + 1}`}
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
                  La primera foto será la portada. Puedes subir varias a la vez y eliminar cada una antes de guardar.
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
              <div className={`admin-upload admin-upload--preview ${totalImages ? 'has-image' : ''}`}>
                {images[0] || pendingFiles[0] ? (
                  <img
                    src={images[0] ? resolveProductImage(images[0]) : pendingFiles[0].preview}
                    alt="Vista previa de la pieza"
                  />
                ) : (
                  <span className="admin-upload__empty">
                    <UploadCloud size={28} strokeWidth={1.2} />
                    <strong>Sin foto todavía</strong>
                    <small>JPG, PNG, WebP o AVIF · máx. 6 MB</small>
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
                Las imágenes se guardan en el bucket público con escritura
                protegida por RLS y se publican por HTTPS.
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
                'Guardar y publicar'
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
