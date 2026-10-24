import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ImagePlus,
  LoaderCircle,
  Ruler,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { resolveProductImage } from '../lib/format'
import { updateSizeGuide } from '../services/sizeGuideService'
import {
  deleteProductImageByUrl,
  uploadSizeGuideImage,
  validateProductImage,
} from '../services/storageService'

export default function AdminSizeGuideForm({ tipo, guide, onSaved, onCancel }) {
  const [form, setForm] = useState({
    titulo: guide?.titulo || `Guía de tallas · ${tipo}`,
    texto: guide?.texto || '',
    imagen_url: guide?.imagen_url || '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(guide?.imagen_url || '')
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

  const removeImage = () => {
    setImageFile(null)
    setPreviewUrl('')
    setForm((current) => ({ ...current, imagen_url: '' }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.texto.trim() && !selectedPreview) {
      setError('Escribe la guía o sube una imagen explicativa.')
      return
    }

    setSaving(true)
    try {
      let imagenUrl = form.imagen_url
      if (imageFile) {
        const uploaded = await uploadSizeGuideImage(imageFile)
        imagenUrl = uploaded.publicUrl
      }

      const saved = await updateSizeGuide(tipo, {
        titulo: form.titulo,
        texto: form.texto,
        imagen_url: imagenUrl,
      })

      if (guide?.imagen_url && guide.imagen_url !== saved.imagen_url) {
        deleteProductImageByUrl(guide.imagen_url).catch(() => {})
      }

      onSaved?.(saved)
    } catch (submitError) {
      setError(submitError.message || 'No pudimos guardar la guía de tallas.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="admin-form-backdrop" role="presentation">
      <div
        className="admin-form-shell admin-size-guide-form animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-size-guide-title"
      >
        <header className="admin-form-shell__head">
          <div>
            <span className="admin-kicker">Guía de tallas · {tipo}</span>
            <h2 id="admin-size-guide-title">Medidas de la maison</h2>
          </div>
          <button
            type="button"
            className="admin-icon-button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cerrar formulario"
          >
            <X size={20} strokeWidth={1.4} />
          </button>
        </header>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__grid">
            <div className="admin-form__fields">
              <label className="admin-field admin-field--wide">
                <span>Título visible</span>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(event) => updateField('titulo', event.target.value)}
                  maxLength={160}
                  placeholder={`Guía de tallas · ${tipo}`}
                />
              </label>

              <label className="admin-field admin-field--wide">
                <span>Texto de la guía</span>
                <textarea
                  value={form.texto}
                  onChange={(event) => updateField('texto', event.target.value)}
                  rows={10}
                  maxLength={8000}
                  placeholder={'XS · Busto 80–84 cm · Cintura 62–66 cm\nS · Busto 84–88 cm · Cintura 66–70 cm\n\nAñade una recomendación final.'}
                />
                <small className="admin-field__hint">
                  Cada línea se mostrará tal cual. Deja una línea en blanco para separar bloques.
                </small>
              </label>

              <label className="admin-field admin-field--wide">
                <span>URL de imagen o infografía</span>
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={(event) => updateField('imagen_url', event.target.value)}
                  placeholder="https://... o images/guia-tallas.jpg"
                />
              </label>
            </div>

            <div className="admin-form__visual">
              <span className="admin-field__label">Infografía opcional</span>
              <label className={`admin-upload ${selectedPreview ? 'has-image' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImage}
                />
                {selectedPreview ? (
                  <>
                    <img src={resolveProductImage(selectedPreview)} alt="Vista previa de la guía" />
                    <span className="admin-upload__change">
                      <ImagePlus size={16} />
                      Reemplazar imagen
                    </span>
                  </>
                ) : (
                  <span className="admin-upload__empty">
                    <UploadCloud size={28} strokeWidth={1.2} />
                    <strong>Subir infografía</strong>
                    <small>JPG, PNG, WebP o AVIF · máx. 10 MB</small>
                  </span>
                )}
              </label>

              {selectedPreview ? (
                <button
                  type="button"
                  className="admin-button admin-button--ghost admin-size-guide-form__remove"
                  onClick={removeImage}
                  disabled={saving}
                >
                  <Trash2 size={14} />
                  Eliminar imagen asignada
                </button>
              ) : null}

              <div className="admin-size-guide-form__note">
                <Ruler size={18} strokeWidth={1.3} />
                <span>
                  <strong>Una guía para cada categoría</strong>
                  <small>La tienda mostrará esta información automáticamente en las piezas de {tipo.toLowerCase()}.</small>
                </span>
              </div>

              <div className="admin-form__security">
                <ShieldCheck size={13} strokeWidth={1.4} />
                La imagen se sube a Cloudinary con firma temporal. Solo el equipo puede editar la guía.
              </div>
            </div>
          </div>

          {error ? <p className="admin-error" role="alert">{error}</p> : null}

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
              ) : (
                'Guardar guía'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
