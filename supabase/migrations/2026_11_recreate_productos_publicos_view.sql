-- =============================================================================
-- IS NOIR · Migración: Recrear vista productos_publicos para incluir descripcion
-- Fecha: 2026-11-08
--
-- La vista productos_publicos se creo antes de agregar la columna descripcion
-- a la tabla productos, por lo que no la incluye. Se vuelve a crear para que
-- expanda p.* con todas las columnas actuales, incluida descripcion.
-- =============================================================================

drop view if exists public.productos_publicos;

create view public.productos_publicos
with (security_invoker = false)
as
select
  p.*,
  coalesce(r.reservado, 0)::integer as stock_reservado,
  greatest(p.stock - coalesce(r.reservado, 0), 0)::integer as stock_disponible,
  case
    when p.talla_unica then '{}'::jsonb
    else coalesce((
      select jsonb_object_agg(
        s.key,
        greatest(s.value::integer - coalesce(rs.reservado, 0), 0)
      )
      from jsonb_each_text(p.tallas_stock) s
      left join (
        select ri.talla, sum(ri.cantidad)::integer as reservado
          from public.reserva_items ri
          join public.reservas re on re.id = ri.reserva_id
         where ri.producto_id = p.id
           and re.status = 'active'
           and re.expires_at > now()
           and ri.talla is not null
          group by ri.talla
      ) rs on rs.talla = s.key
    ), '{}'::jsonb)
  end as tallas_disponibles
from public.productos p
left join (
  select ri.producto_id, sum(ri.cantidad)::integer as reservado
    from public.reserva_items ri
    join public.reservas re on re.id = ri.reserva_id
   where re.status = 'active'
     and re.expires_at > now()
     and ri.producto_id is not null
   group by ri.producto_id
) r on r.producto_id = p.id
where p.borrador = false;

revoke all on public.productos_publicos from anon, authenticated;
grant select on public.productos_publicos to anon, authenticated;

comment on view public.productos_publicos is
  'Vitrina pública de IS NOIR. stock_disponible descuenta los apartados vigentes sin exponer datos de clientes. Incluye descripcion.';

notify pgrst, 'reload schema';
