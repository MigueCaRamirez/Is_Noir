import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImagePlus, LoaderCircle, Lock, Sparkles, UploadCloud, X } from 'lucide-react'
import { PRODUCT_COLLECTIONS, PRODUCT_TYPES } from '../data/catalogOptions'
import { resolveProductImage } from '../lib/format'
import { createProduct, updateProduct } from '../services/productService'
import { uploadProductImage, validateProductImage } from '../services/storageService'

const DEFAULT_FORM = {
  nombre: '',
  precio: '',
  stock: '0',
  coleccion: 'Old Money',
  tipo: 'Ropa',
  subcategoria: '',
  imagen_url: '',
  borrador: false,
  es_novedad: false,
  solicitudes: '0',
}

export default function AdminProductForm({ initialProduct = null, onSaved, onCancel }) {
  const isEditing = Boolean(initialProduct?.id)
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
          imagen_url: initialProduct.imagen_url ?? '',
          borrador: Boolean(initialProduct.borrador),
          es_novedad: Boolean(initialProduct.es_novedad),
          solicitudes: String(initialProduct.solicitudes ?? 0),
        }
      : {}),
  }))
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialProduct?.imagen_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedPreview = useMemo(() => {
    if (!imageFile) return form.imagen_url || ''
    return previewUrl
  }, [imageFile, previewUrl, form.imagen_url])

  useEffect(() => {
    if (!imageFile) return undefined
    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, saving])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const handleImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateProductImage(file)
      setImageFile(file)
      setError('')
    } catch (imageError) {
      event.target.value = ''
      setError(imageError.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const precio = Number(form.precio)
    const stock = Number(form.stock)
    const solicitudes = Number(form.solicitudes)

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
    if (!Number.isInteger(solicitudes) || solicitudes < 0) {
      setError('Las solicitudes deben ser un número entero mayor o igual a cero.')
      return
    }

    setSaving(true)
    try {
      let imagenUrl = form.imagen_url
      if (imageFile) {
        const uploaded = await uploadProductImage(imageFile)
        imagenUrl = uploaded.publicUrl
      }

      const payload = {
        nombre: form.nombre,
        precio,
        stock,
        coleccion: form.coleccion,
        tipo: form.tipo,
        subcategoria: form.subcategoria,
        imagen_url: imagenUrl,
        borrador: form.borrador,
        es_novedad: form.es_novedad,
        solicitudes,
      }

      const saved = isEditing
        ? await updateProduct(initialProduct.id, payload)
        : await createProduct(payload)

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
                <span>Solicitudes / ventas</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.solicitudes}
                  onChange={(event) => updateField('solicitudes', event.target.value)}
                />
                <small>Se usa para ordenar lo más solicitado en Novedades.</small>
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

              <label className="admin-field admin-field--wide">
                <span>URL de imagen (se completa al subir un archivo)</span>
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={(event) => updateField('imagen_url', event.target.value)}
                  placeholder="https://... o images/producto.jpg"
                />
              </label>
            </div>

            <div className="admin-form__visual">
              <span className="admin-field__label">Imagen de producto</span>
              <label className={`admin-upload ${selectedPreview ? 'has-image' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImage}
                />
                {selectedPreview ? (
                  <>
                    <img src={resolveProductImage(selectedPreview)} alt="Vista previa del producto" />
                    <span className="admin-upload__change">
                      <ImagePlus size={16} />
                      Reemplazar imagen
                    </span>
                  </>
                ) : (
                  <span className="admin-upload__empty">
                    <UploadCloud size={28} strokeWidth={1.2} />
                    <strong>Subir imagen</strong>
                    <small>JPG, PNG, WebP o AVIF · máx. 6 MB</small>
                  </span>
                )}
              </label>

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
