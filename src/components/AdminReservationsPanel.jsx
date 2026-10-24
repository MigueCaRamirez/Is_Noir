import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  TimerReset,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import {
  formatCOP,
  formatCountdown,
  formatDateTime,
  resolveProductImage,
} from '../lib/format'
import {
  cancelReservationAsAdmin,
  confirmReservationAsSold,
  expireReservations,
  fetchAdminReservations,
} from '../services/reservationService'

function ReservationCard({ reservation, now, busy, onConfirm, onCancel }) {
  const expiresAt = new Date(reservation.expires_at).getTime()
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const expired = reservation.status === 'expired' || remaining <= 0
  const nearlyExpired = !expired && remaining <= 120
  const items = reservation.items ?? []
  const quantity = items.reduce((total, item) => total + Number(item.cantidad), 0)

  return (
    <article className={`admin-reservation ${expired ? 'is-expired' : ''}`}>
      <header className="admin-reservation__head">
        <div>
          <span className={`admin-reservation__status ${expired ? 'is-expired' : nearlyExpired ? 'is-soon' : ''}`}>
            {expired ? 'Expirado' : nearlyExpired ? 'Por vencer' : 'Activo'}
          </span>
          <strong>#{String(reservation.id).slice(0, 8).toUpperCase()}</strong>
          <small>{formatDateTime(reservation.created_at)}</small>
        </div>
        <div className="admin-reservation__timer">
          <Clock3 size={15} strokeWidth={1.3} />
          <span>{expired ? '00:00' : formatCountdown(remaining)}</span>
        </div>
      </header>

      <div className="admin-reservation__items">
        {items.map((item) => (
          <div className="admin-reservation__item" key={item.id}>
            <div className="admin-reservation__image">
              {item.imagen_url ? (
                <img src={resolveProductImage(item.imagen_url)} alt="" />
              ) : (
                <ShoppingBag size={16} />
              )}
            </div>
            <div>
              <strong>{item.nombre}</strong>
              <span>
                Talla {item.talla || 'Única'} · {item.cantidad} × {formatCOP(item.precio)}
              </span>
            </div>
            <b>{formatCOP(Number(item.precio) * Number(item.cantidad))}</b>
          </div>
        ))}
      </div>

      <footer className="admin-reservation__foot">
        <div>
          <span>{quantity} {quantity === 1 ? 'pieza' : 'piezas'} apartadas</span>
          <strong>{formatCOP(reservation.total)}</strong>
        </div>
        <div className="admin-reservation__actions">
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => onConfirm(reservation)}
            disabled={busy || expired}
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            Marcar como Vendido
          </button>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={() => onCancel(reservation)}
            disabled={busy}
          >
            <X size={14} />
            Cancelar / Liberar Stock
          </button>
        </div>
      </footer>
    </article>
  )
}

export default function AdminReservationsPanel({ onCatalogChanged, notify, onActiveCountChange }) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState([])
  const [now, setNow] = useState(Date.now())
  const knownIdsRef = useRef(new Set())
  const loadedOnceRef = useRef(false)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      await expireReservations().catch(() => 0)
      const data = await fetchAdminReservations()

      if (loadedOnceRef.current) {
        const newActive = data.find(
          (reservation) =>
            reservation.status === 'active'
            && !knownIdsRef.current.has(reservation.id),
        )
        if (newActive) {
          notify?.('success', 'Nuevo apartado en curso. Revisa el temporizador.')
        }
      }

      knownIdsRef.current = new Set(data.map((reservation) => reservation.id))
      loadedOnceRef.current = true
      setReservations(data)
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'No pudimos cargar los apartados en este momento.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      load({ silent: true })
    }, 30000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!supabase) return undefined
    let reloadTimer = null
    const scheduleReload = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => load({ silent: true }), 350)
    }

    const channel = supabase
      .channel('isnoir-admin-reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        scheduleReload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reserva_items' },
        scheduleReload,
      )
      .subscribe()

    return () => {
      window.clearTimeout(reloadTimer)
      supabase.removeChannel(channel)
    }
  }, [load])

  const activeCount = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          reservation.status === 'active'
          && new Date(reservation.expires_at).getTime() > now,
      ).length,
    [reservations, now],
  )

  useEffect(() => {
    onActiveCountChange?.(activeCount)
  }, [activeCount, onActiveCountChange])

  const markBusy = (id, busy) => {
    setBusyIds((current) =>
      busy ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    )
  }

  const handleConfirm = async (reservation) => {
    if (busyIds.includes(reservation.id)) return
    const confirmed = window.confirm(
      `¿Marcar el apartado #${String(reservation.id).slice(0, 8).toUpperCase()} como vendido y descontar ${reservation.items?.reduce((sum, item) => sum + Number(item.cantidad), 0) || 0} pieza(s) del stock?`,
    )
    if (!confirmed) return

    markBusy(reservation.id, true)
    try {
      await confirmReservationAsSold(reservation.id)
      setReservations((current) => current.filter((item) => item.id !== reservation.id))
      notify?.('success', 'Venta confirmada. El stock fue descontado definitivamente.')
      onCatalogChanged?.()
      load({ silent: true })
    } catch (confirmError) {
      notify?.('error', confirmError.message)
    } finally {
      markBusy(reservation.id, false)
    }
  }

  const handleCancel = async (reservation) => {
    if (busyIds.includes(reservation.id)) return
    const confirmed = window.confirm(
      `¿Cancelar el apartado #${String(reservation.id).slice(0, 8).toUpperCase()} y devolver el stock a la tienda?`,
    )
    if (!confirmed) return

    markBusy(reservation.id, true)
    try {
      await cancelReservationAsAdmin(reservation.id)
      setReservations((current) => current.filter((item) => item.id !== reservation.id))
      notify?.('success', 'Apartado cancelado. El stock volvió a estar disponible.')
      onCatalogChanged?.()
      load({ silent: true })
    } catch (cancelError) {
      notify?.('error', cancelError.message)
    } finally {
      markBusy(reservation.id, false)
    }
  }

  return (
    <section className="admin-reservations" aria-labelledby="admin-reservations-title">
      <div className="admin-inventory__head">
        <div>
          <span className="admin-kicker">Tiempo real</span>
          <h2 id="admin-reservations-title">Pedidos en Proceso / Apartados</h2>
          <p className="admin-reservations__copy">
            Reservas temporales de 15 minutos. Confirma la venta o libera el stock manualmente.
          </p>
        </div>
        <div className="admin-reservations__tools">
          <span className="admin-reservations__live">
            <i />
            {activeCount} activo{activeCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error ? (
        <div className="admin-state">
          <AlertTriangle size={26} strokeWidth={1.2} />
          <h3>No pudimos cargar los apartados</h3>
          <p>{error}</p>
          <button type="button" className="admin-button admin-button--ghost" onClick={() => load()}>
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="admin-loading">
          <LoaderCircle size={25} className="animate-spin" />
          <span>Cargando apartados…</span>
        </div>
      ) : reservations.length === 0 ? (
        <div className="admin-state admin-state--compact">
          <TimerReset size={28} strokeWidth={1.1} />
          <h3>No hay apartados en proceso</h3>
          <p>Cuando una clienta reserve piezas, aparecerán aquí con su temporizador en vivo.</p>
        </div>
      ) : (
        <div className="admin-reservations__grid">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              now={now}
              busy={busyIds.includes(reservation.id)}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </section>
  )
}
