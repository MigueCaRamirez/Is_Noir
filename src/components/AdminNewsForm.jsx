import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Eye,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'
import { resolveProductImage } from '../lib/format'
import { createNews, updateNews } from '../services/newsService'
import { uploadNewsImage, validateProductImage } from '../services/storageService'

const DEFAULT_FORM = {
  titulo: '',
  resumen: '',
  contenido: '',
  imagen_url: '',
  publicada: true,
}

export default function AdminNewsForm({ initialNews = null, onSaved, onCancel }) {
  const isEditing = Boolean(initialNews?.id)
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialNews
      ? {
          titulo: initialNews.titulo ?? '',
          resumen: initialNews.resumen ?? '',
          contenido: initialNews.contenido ?? '',
          imagen_url: initialNews.imagen_url ?? '',
          publicada: Boolean(initialNews.publicada),
        }
      : {}),
  }))
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialNews?.imagen_url ?? '')
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

    if (!form.titulo.trim()) {
      setError('Escribe el título de la noticia.')
      return
    }
    if (!form.contenido.trim()) {
      setError('Escribe el contenido de la noticia.')
      return
    }

    setSaving(true)
    try {
      let imagenUrl = form.imagen_url
      if (imageFile) {
        const uploaded = await uploadNewsImage(imageFile)
        imagenUrl = uploaded.publicUrl
      }

      const payload = {
        titulo: form.titulo,
        resumen: form.resumen,
        contenido: form.contenido,
        imagen_url: imagenUrl,
        publicada: form.publicada,
      }

      const saved = isEditing
        ? await updateNews(initialNews.id, payload)
        : await createNews(payload)

      onSaved?.(saved)
    } catch (submitError) {
      setError(submitError.message || 'No se pudo guardar la noticia.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="admin-form-backdrop" role="presentation">
      <div
        className="admin-form-shell admin-news-form animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-news-form-title"
      >
        <header className="admin-form-shell__head">
          <div>
            <span className="admin-kicker">
              {isEditing ? 'Editar noticia' : 'Nueva noticia'}
            </span>
            <h2 id="admin-news-form-title">
              {isEditing ? initialNews.titulo : 'Publicar en el diario'}
            </h2>
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
                <span>Título *</span>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(event) => updateField('titulo', event.target.value)}
                  placeholder="Ej. Una nueva temporada en IS NOIR"
                  maxLength={160}
                  required
                />
              </label>

              <label className="admin-field admin-field--wide">
                <span>Resumen</span>
                <textarea
                  value={form.resumen}
                  onChange={(event) => updateField('resumen', event.target.value)}
                  placeholder="Una entrada breve que invite a leer la noticia."
                  maxLength={320}
                  rows={2}
                />
              </label>

              <label className="admin-field admin-field--wide">
                <span>Contenido *</span>
                <textarea
                  value={form.contenido}
                  onChange={(event) => updateField('contenido', event.target.value)}
                  placeholder="Escribe aquí la historia completa..."
                  maxLength={12000}
                  rows={8}
                  required
                />
              </label>

              <label className="admin-field admin-field--wide">
                <span>URL de imagen (se completa al subir un archivo)</span>
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={(event) => updateField('imagen_url', event.target.value)}
                  placeholder="https://... o images/editorial.jpg"
                />
              </label>
            </div>

            <div className="admin-form__visual">
              <span className="admin-field__label">Imagen de la noticia</span>
              <label className={`admin-upload ${selectedPreview ? 'has-image' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImage}
                />
                {selectedPreview ? (
                  <>
                    <img src={resolveProductImage(selectedPreview)} alt="Vista previa de la noticia" />
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
                  checked={form.publicada}
                  onChange={(event) => updateField('publicada', event.target.checked)}
                />
                <span>
                  <strong>{form.publicada ? 'Noticia publicada' : 'Guardar como borrador'}</strong>
                  <small>
                    {form.publicada
                      ? 'Visible en la página de Novedades.'
                      : 'Solo el equipo puede verla.'}
                  </small>
                </span>
                {form.publicada ? <Eye size={15} strokeWidth={1.4} /> : <EyeOff size={15} strokeWidth={1.4} />}
              </label>

              <div className="admin-form__security">
                <ShieldCheck size={13} strokeWidth={1.4} />
                La imagen se guarda en el bucket público con escritura protegida por RLS.
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
              ) : form.publicada ? (
                isEditing ? 'Guardar noticia' : 'Publicar noticia'
              ) : (
                'Guardar borrador'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
