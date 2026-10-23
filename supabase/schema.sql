-- =============================================================================
-- IS NOIR · Esquema de base de datos, RLS, Storage y apartados en tiempo real
-- Proyecto Supabase: yguhpeoaykirhumhzvrm
--
-- Seguridad:
--   * El catálogo público solo ve productos publicados (borrador = false).
--   * Solo administradores autenticados y presentes en admin_emails pueden
--     leer borradores y escribir en el catálogo.
--   * Las reservas no exponen datos personales: el público solo recibe
--     actualizaciones de disponibilidad, nunca el carrito de otra persona.
--   * El correo del administrador se valida además en el frontend
--     (VITE_ADMIN_ALLOWED_EMAILS), pero la base de datos es la autoridad final.
-- =============================================================================

create extension if not exists pgcrypto;

-- ─── Productos ────────────────────────────────────────────────────────────────
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  precio numeric(12, 2) not null,
  stock integer not null default 0,
  coleccion text not null,
  tipo text not null,
  subcategoria text,
  imagen_url text,
  imagenes_urls text[] not null default '{}'::text[],
  borrador boolean not null default true,
  es_novedad boolean not null default false,
  solicitudes integer not null default 0,
  ventas integer not null default 0,
  constraint productos_nombre_largo check (char_length(trim(nombre)) between 1 and 160),
  constraint productos_precio_positivo check (precio >= 0),
  constraint productos_stock_positivo check (stock >= 0),
  constraint productos_solicitudes_positivas check (solicitudes >= 0),
  constraint productos_ventas_positivas check (ventas >= 0),
  constraint productos_imagenes_maximo check (coalesce(array_length(imagenes_urls, 1), 0) <= 5),
  constraint productos_coleccion_valida check (coleccion in ('Old Money', 'Alternativo')),
  constraint productos_tipo_valido check (tipo in ('Ropa', 'Accesorios'))
);

-- Compatibilidad con instalaciones anteriores del esquema.
alter table public.productos
  add column if not exists es_novedad boolean not null default false;
alter table public.productos
  add column if not exists solicitudes integer not null default 0;
alter table public.productos
  add column if not exists ventas integer not null default 0;
alter table public.productos
  add column if not exists imagenes_urls text[] not null default '{}'::text[];

alter table public.productos
  drop constraint if exists productos_solicitudes_positivas;
alter table public.productos
  add constraint productos_solicitudes_positivas check (solicitudes >= 0);
alter table public.productos
  drop constraint if exists productos_ventas_positivas;
alter table public.productos
  add constraint productos_ventas_positivas check (ventas >= 0);
alter table public.productos
  drop constraint if exists productos_imagenes_maximo;
alter table public.productos
  add constraint productos_imagenes_maximo
  check (coalesce(array_length(imagenes_urls, 1), 0) <= 5);

create index if not exists productos_publicos_idx
  on public.productos (created_at desc)
  where borrador = false;

create index if not exists productos_novedades_idx
  on public.productos (es_novedad, created_at desc)
  where borrador = false;

create index if not exists productos_favoritos_idx
  on public.productos (solicitudes desc, ventas desc)
  where borrador = false;

create index if not exists productos_coleccion_idx
  on public.productos (coleccion, tipo);

alter table public.productos enable row level security;
alter table public.productos force row level security;

-- ─── Lista blanca de administradores (verdad de seguridad del backend) ───────
create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_email_minusculas check (email = lower(email))
);

alter table public.admin_emails enable row level security;
alter table public.admin_emails force row level security;

revoke all on table public.admin_emails from anon, authenticated;

-- La lista blanca se administra fuera del repositorio para no publicar correos
-- personales. Después de aplicar este esquema, inserta los correos del equipo
-- desde el SQL Editor de Supabase:
--
--   insert into public.admin_emails (email)
--   values ('correo-del-equipo@gmail.com')
--   on conflict (email) do nothing;
--
-- Mantén esos correos también en VITE_ADMIN_ALLOWED_EMAILS (solo en .env.local
-- o en las variables de Vercel). Nunca los agregues a este archivo versionado.

create or replace function public.is_noir_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_emails a
    where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function public.is_noir_admin() from public;
grant execute on function public.is_noir_admin() to anon, authenticated;

-- ─── Políticas de productos ───────────────────────────────────────────────────
drop policy if exists "productos_select_publicados" on public.productos;
drop policy if exists "productos_select_admin" on public.productos;
drop policy if exists "productos_insert_admin" on public.productos;
drop policy if exists "productos_update_admin" on public.productos;
drop policy if exists "productos_delete_admin" on public.productos;

create policy "productos_select_publicados"
  on public.productos
  for select
  to anon
  using (borrador = false);

create policy "productos_select_admin"
  on public.productos
  for select
  to authenticated
  using (public.is_noir_admin());

create policy "productos_insert_admin"
  on public.productos
  for insert
  to authenticated
  with check (public.is_noir_admin());

create policy "productos_update_admin"
  on public.productos
  for update
  to authenticated
  using (public.is_noir_admin())
  with check (public.is_noir_admin());

create policy "productos_delete_admin"
  on public.productos
  for delete
  to authenticated
  using (public.is_noir_admin());

revoke all on table public.productos from anon, authenticated;
grant select on table public.productos to anon, authenticated;
grant insert, update, delete on table public.productos to authenticated;

-- ─── Catálogo inicial ────────────────────────────────────────────────────────
-- Solo se siembra si la tabla está vacía. Las rutas `images/...` se resuelven
-- contra la base de Vite en el frontend; las imágenes subidas desde el panel
-- se guardan como URLs públicas de Supabase Storage.
do $$
begin
  if not exists (select 1 from public.productos) then
    insert into public.productos
      (nombre, precio, stock, coleccion, tipo, subcategoria, imagen_url, borrador, es_novedad, solicitudes, ventas, created_at)
    values
      ('Vestido Minuit', 219900, 6, 'Alternativo', 'Ropa', 'Vestidos', 'images/product-vestido.jpg', false, true, 18, 7, now() - interval '1 hour'),
      ('Sastre Époque', 389900, 4, 'Old Money', 'Ropa', 'Trajes', 'images/product-sastre.jpg', false, false, 16, 5, now() - interval '2 hours'),
      ('Abrigo Rive', 459900, 3, 'Old Money', 'Ropa', 'Abrigos', 'images/product-abrigo.jpg', false, false, 7, 3, now() - interval '3 hours'),
      ('Blusa Soie', 169900, 8, 'Old Money', 'Ropa', 'Blusas', 'images/product-blusa.jpg', false, false, 11, 8, now() - interval '4 hours'),
      ('Chaqueta Nocturne', 289900, 5, 'Alternativo', 'Ropa', 'Chaquetas', 'images/product-chaqueta.jpg', false, true, 12, 4, now() - interval '5 hours'),
      ('Conjunto Aube', 329900, 4, 'Old Money', 'Ropa', 'Conjuntos', 'images/product-conjunto.jpg', false, false, 6, 2, now() - interval '6 hours'),
      ('Boina Velours', 89900, 12, 'Alternativo', 'Accesorios', 'Sombrerería', 'images/product-boina.jpg', false, false, 24, 11, now() - interval '7 hours'),
      ('Collar Lune', 129900, 7, 'Old Money', 'Accesorios', 'Joyería', 'images/product-collar.jpg', false, true, 9, 6, now() - interval '8 hours');
  end if;
end $$;

-- Datos de demostración para instalaciones anteriores ya sembradas.
do $$
begin
  update public.productos p
     set ventas = v.ventas
    from (values
      ('Vestido Minuit', 7),
      ('Sastre Époque', 5),
      ('Abrigo Rive', 3),
      ('Blusa Soie', 8),
      ('Chaqueta Nocturne', 4),
      ('Conjunto Aube', 2),
      ('Boina Velours', 11),
      ('Collar Lune', 6)
    ) as v(nombre, ventas)
   where p.nombre = v.nombre
     and p.ventas = 0;
end $$;

-- ─── Noticias del atelier ────────────────────────────────────────────────────
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titulo text not null,
  resumen text,
  contenido text not null,
  imagen_url text,
  publicada boolean not null default true,
  fecha_expiracion timestamptz,
  constraint noticias_titulo_largo check (char_length(trim(titulo)) between 1 and 160),
  constraint noticias_contenido_largo check (char_length(trim(contenido)) between 1 and 12000)
);

alter table public.noticias
  add column if not exists fecha_expiracion timestamptz;

create index if not exists noticias_publicadas_idx
  on public.noticias (created_at desc)
  where publicada = true;

create index if not exists noticias_expiracion_idx
  on public.noticias (publicada, fecha_expiracion);

alter table public.noticias enable row level security;
alter table public.noticias force row level security;

drop policy if exists "noticias_select_publicadas" on public.noticias;
drop policy if exists "noticias_select_admin" on public.noticias;
drop policy if exists "noticias_insert_admin" on public.noticias;
drop policy if exists "noticias_update_admin" on public.noticias;
drop policy if exists "noticias_delete_admin" on public.noticias;

create policy "noticias_select_publicadas"
  on public.noticias
  for select
  to anon
  using (
    publicada = true
    and (fecha_expiracion is null or fecha_expiracion > now())
  );

create policy "noticias_select_admin"
  on public.noticias
  for select
  to authenticated
  using (public.is_noir_admin());

create policy "noticias_insert_admin"
  on public.noticias
  for insert
  to authenticated
  with check (public.is_noir_admin());

create policy "noticias_update_admin"
  on public.noticias
  for update
  to authenticated
  using (public.is_noir_admin())
  with check (public.is_noir_admin());

create policy "noticias_delete_admin"
  on public.noticias
  for delete
  to authenticated
  using (public.is_noir_admin());

revoke all on table public.noticias from anon, authenticated;
grant select on table public.noticias to anon, authenticated;
grant insert, update, delete on table public.noticias to authenticated;

-- ─── Guías de tallas editables por categoría ────────────────────────────────
create table if not exists public.guias_tallas (
  tipo text primary key,
  titulo text not null default 'Guía de tallas',
  texto text,
  imagen_url text,
  updated_at timestamptz not null default now(),
  constraint guias_tallas_tipo_valido check (tipo in ('Ropa', 'Accesorios'))
);

insert into public.guias_tallas (tipo, titulo, texto)
values
  (
    'Ropa',
    'Guía de tallas · Ropa',
    E'La guía se mide sobre el cuerpo, no sobre la prenda.\n\nXS · Busto 80–84 cm · Cintura 62–66 cm · Cadera 88–92 cm\nS · Busto 84–88 cm · Cintura 66–70 cm · Cadera 92–96 cm\nM · Busto 88–92 cm · Cintura 70–74 cm · Cadera 96–100 cm\nL · Busto 92–98 cm · Cintura 74–80 cm · Cadera 100–106 cm\nXL · Busto 98–104 cm · Cintura 80–86 cm · Cadera 106–112 cm\n\nSi estás entre dos tallas, elige la mayor para una caída más fluida.'
  ),
  (
    'Accesorios',
    'Guía de tallas · Accesorios',
    E'Nuestros accesorios son de talla única, pensados para adaptarse a distintos cuerpos y estilos.\n\nPara collares y pulseras, revisa las medidas del producto en su descripción. Si necesitas una medida especial, escríbenos por WhatsApp y lo revisamos contigo.'
  )
on conflict (tipo) do nothing;

alter table public.guias_tallas enable row level security;
alter table public.guias_tallas force row level security;

drop policy if exists "guias_tallas_select_publicas" on public.guias_tallas;
drop policy if exists "guias_tallas_admin" on public.guias_tallas;

create policy "guias_tallas_select_publicas"
  on public.guias_tallas
  for select
  to anon, authenticated
  using (true);

create policy "guias_tallas_admin"
  on public.guias_tallas
  for all
  to authenticated
  using (public.is_noir_admin())
  with check (public.is_noir_admin());

revoke all on table public.guias_tallas from anon, authenticated;
grant select on table public.guias_tallas to anon, authenticated;
grant insert, update, delete on table public.guias_tallas to authenticated;

-- ─── Apartados temporales / reservas de inventario ──────────────────────────
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cart_token uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active',
  total numeric(12, 2) not null default 0,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  constraint reservas_estado_valido check (status in ('active', 'completed', 'cancelled', 'expired')),
  constraint reservas_total_positivo check (total >= 0),
  constraint reservas_vigencia_valida check (expires_at > created_at)
);

create table if not exists public.reserva_items (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  nombre text not null,
  precio numeric(12, 2) not null,
  talla text,
  cantidad integer not null,
  imagen_url text,
  created_at timestamptz not null default now(),
  constraint reserva_items_cantidad_positiva check (cantidad > 0),
  constraint reserva_items_precio_positivo check (precio >= 0)
);

create index if not exists reservas_estado_idx
  on public.reservas (status, expires_at desc);

create index if not exists reservas_cart_token_idx
  on public.reservas (cart_token, status);

create index if not exists reservas_created_idx
  on public.reservas (created_at desc);

create unique index if not exists reservas_un_apartado_activo_por_carrito
  on public.reservas (cart_token)
  where status = 'active';

create index if not exists reserva_items_reserva_idx
  on public.reserva_items (reserva_id);

create index if not exists reserva_items_producto_idx
  on public.reserva_items (producto_id);

alter table public.reservas enable row level security;
alter table public.reservas force row level security;

alter table public.reserva_items enable row level security;
alter table public.reserva_items force row level security;

drop policy if exists "reservas_select_admin" on public.reservas;
drop policy if exists "reserva_items_select_admin" on public.reserva_items;

create policy "reservas_select_admin"
  on public.reservas
  for select
  to authenticated
  using (public.is_noir_admin());

create policy "reserva_items_select_admin"
  on public.reserva_items
  for select
  to authenticated
  using (public.is_noir_admin());

revoke all on table public.reservas from anon, authenticated;
revoke all on table public.reserva_items from anon, authenticated;
grant select on table public.reservas to authenticated;
grant select on table public.reserva_items to authenticated;

-- Vista pública con stock real: stock físico menos apartados vigentes.
drop view if exists public.productos_publicos;

create view public.productos_publicos
with (security_invoker = false)
as
select
  p.*,
  coalesce(r.reservado, 0)::integer as stock_reservado,
  greatest(p.stock - coalesce(r.reservado, 0), 0)::integer as stock_disponible
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
  'Vitrina pública de IS NOIR. stock_disponible descuenta los apartados vigentes sin exponer datos de clientes.';

-- ─── Funciones transaccionales de apartados ─────────────────────────────────
create or replace function public.crear_reserva(
  p_cart_token uuid,
  p_items jsonb,
  p_minutes integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva_id uuid;
  v_expires_at timestamptz;
  v_total numeric(12, 2) := 0;
  v_product public.productos%rowtype;
  v_line record;
  v_reserved integer;
  v_available integer;
  v_minutes integer := greatest(5, least(coalesce(p_minutes, 15), 20));
  v_result jsonb;
begin
  if p_cart_token is null then
    raise exception 'No pudimos identificar tu carrito. Recarga la página.';
  end if;

  -- Serializa las reservas del mismo carrito. Sin esto, dos pestañas podrían
  -- reemplazar su apartado al mismo tiempo y duplicar la retención de stock.
  perform pg_advisory_xact_lock(hashtextextended(p_cart_token::text, 0));

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.';
  end if;

  if jsonb_array_length(p_items) > 40 then
    raise exception 'La selección supera el límite permitido.';
  end if;

  -- Valida la estructura antes de tocar inventario.
  perform 1
    from jsonb_array_elements(p_items) as item
   where (item->>'producto_id') is null
      or (item->>'producto_id') !~* '^[0-9a-f-]{36}$';

  if found then
    raise exception 'Una de las piezas de tu selección no es válida.';
  end if;

  -- La reserva anterior del mismo carrito se reemplaza de forma atómica.
  update public.reservas
     set status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   where cart_token = p_cart_token
     and status = 'active';

  -- Bloquea cada producto en orden para evitar sobreventa entre dos clientes.
  for v_line in
    select producto_id, sum(cantidad)::integer as cantidad
      from (
        select
          (item->>'producto_id')::uuid as producto_id,
          greatest(1, least(99, coalesce((item->>'cantidad')::integer, 1))) as cantidad
        from jsonb_array_elements(p_items) as item
      ) parsed
     group by producto_id
     order by producto_id
  loop
    select *
      into v_product
      from public.productos
     where id = v_line.producto_id
     for update;

    if not found or v_product.borrador then
      raise exception 'Una de las piezas de tu selección ya no está disponible.';
    end if;

    select coalesce(sum(ri.cantidad), 0)::integer
      into v_reserved
      from public.reserva_items ri
      join public.reservas re on re.id = ri.reserva_id
     where ri.producto_id = v_line.producto_id
       and re.status = 'active'
       and re.expires_at > now();

    v_available := greatest(0, v_product.stock - v_reserved);

    if v_line.cantidad > v_available then
      raise exception 'No hay stock suficiente para %. Disponible: % unidad(es).',
        v_product.nombre, v_available;
    end if;

    v_total := v_total + (v_product.precio * v_line.cantidad);
  end loop;

  v_expires_at := now() + make_interval(mins => v_minutes);

  insert into public.reservas (cart_token, expires_at, total, status)
  values (p_cart_token, v_expires_at, v_total, 'active')
  returning id into v_reserva_id;

  insert into public.reserva_items (
    reserva_id,
    producto_id,
    nombre,
    precio,
    talla,
    cantidad,
    imagen_url
  )
  select
    v_reserva_id,
    p.id,
    p.nombre,
    p.precio,
    coalesce(nullif(trim(item->>'talla'), ''), 'Única'),
    greatest(1, least(99, coalesce((item->>'cantidad')::integer, 1))),
    coalesce(p.imagen_url, (p.imagenes_urls)[1])
  from jsonb_array_elements(p_items) as item
  join public.productos p on p.id = (item->>'producto_id')::uuid;

  select jsonb_build_object(
    'id', re.id,
    'expires_at', re.expires_at,
    'created_at', re.created_at,
    'total', re.total,
    'status', re.status,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'producto_id', ri.producto_id,
            'nombre', ri.nombre,
            'precio', ri.precio,
            'talla', ri.talla,
            'cantidad', ri.cantidad,
            'imagen_url', ri.imagen_url
          )
          order by ri.created_at
        )
        from public.reserva_items ri
        where ri.reserva_id = re.id
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.reservas re
  where re.id = v_reserva_id;

  return v_result;
end;
$$;

create or replace function public.cancelar_reserva(
  p_reserva_id uuid,
  p_cart_token uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.reservas%rowtype;
  v_admin boolean := public.is_noir_admin();
begin
  select *
    into v_reserva
    from public.reservas
   where id = p_reserva_id
   for update;

  if not found then
    return false;
  end if;

  if not v_admin then
    if p_cart_token is null or v_reserva.cart_token <> p_cart_token then
      raise exception 'No autorizado para modificar este apartado.' using errcode = '42501';
    end if;
  end if;

  if v_reserva.status in ('completed', 'cancelled') then
    return false;
  end if;

  update public.reservas
     set status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   where id = p_reserva_id;

  return true;
end;
$$;

create or replace function public.confirmar_reserva(p_reserva_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.reservas%rowtype;
  v_product public.productos%rowtype;
  v_line record;
begin
  if not public.is_noir_admin() then
    raise exception 'No autorizado para confirmar apartados.' using errcode = '42501';
  end if;

  select *
    into v_reserva
    from public.reservas
   where id = p_reserva_id
   for update;

  if not found then
    raise exception 'El apartado ya no existe.';
  end if;

  if v_reserva.status in ('completed', 'cancelled') then
    raise exception 'Este apartado ya fue cerrado.';
  end if;

  if v_reserva.status = 'expired' or v_reserva.expires_at <= now() then
    update public.reservas
       set status = 'expired',
           updated_at = now()
     where id = p_reserva_id
       and status = 'active';
    raise exception 'Este apartado expiró y el stock ya fue liberado.';
  end if;

  for v_line in
    select producto_id, sum(cantidad)::integer as cantidad
      from public.reserva_items
     where reserva_id = p_reserva_id
       and producto_id is not null
     group by producto_id
     order by producto_id
  loop
    select *
      into v_product
      from public.productos
     where id = v_line.producto_id
     for update;

    if not found then
      raise exception 'Una de las piezas de este apartado ya no existe.';
    end if;

    if v_product.stock < v_line.cantidad then
      raise exception 'No hay stock suficiente para %. Stock actual: %.',
        v_product.nombre, v_product.stock;
    end if;

    update public.productos
       set stock = stock - v_line.cantidad,
           ventas = ventas + v_line.cantidad
     where id = v_line.producto_id;
  end loop;

  update public.reservas
     set status = 'completed',
         confirmed_at = now(),
         updated_at = now()
   where id = p_reserva_id;

  return jsonb_build_object(
    'id', v_reserva.id,
    'status', 'completed',
    'total', v_reserva.total
  );
end;
$$;

create or replace function public.expirar_reservas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.reservas
     set status = 'expired',
         updated_at = now()
   where status = 'active'
     and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.registrar_solicitud(p_producto_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.productos
     set solicitudes = solicitudes + 1
   where id = p_producto_id
     and borrador = false;

  if not found then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.crear_reserva(uuid, jsonb, integer) from public;
revoke all on function public.cancelar_reserva(uuid, uuid) from public;
revoke all on function public.confirmar_reserva(uuid) from public;
revoke all on function public.confirmar_reserva(uuid) from anon;
revoke all on function public.expirar_reservas() from public;
revoke all on function public.registrar_solicitud(uuid) from public;

grant execute on function public.crear_reserva(uuid, jsonb, integer) to anon, authenticated;
grant execute on function public.cancelar_reserva(uuid, uuid) to anon, authenticated;
grant execute on function public.confirmar_reserva(uuid) to authenticated;
grant execute on function public.expirar_reservas() to anon, authenticated;
grant execute on function public.registrar_solicitud(uuid) to anon, authenticated;

-- ─── Realtime de disponibilidad ─────────────────────────────────────────────
-- Un cambio de estado en una reserva toca la fila del producto. Así todos los
-- visitantes reciben el cambio de stock por Realtime sin poder leer reservas.
create or replace function public.touch_reserva_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reservas_touch_updated_at on public.reservas;
create trigger reservas_touch_updated_at
  before update on public.reservas
  for each row execute function public.touch_reserva_updated_at();

create or replace function public.refresh_product_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  if tg_table_name = 'reserva_items' then
    if tg_op = 'DELETE' then
      v_ids := array[old.producto_id];
    else
      v_ids := array[new.producto_id];
    end if;
  elsif tg_table_name = 'reservas' then
    select array_agg(distinct ri.producto_id)
      into v_ids
      from public.reserva_items ri
     where ri.reserva_id = new.id
       and ri.producto_id is not null;
  end if;

  if v_ids is not null and array_length(v_ids, 1) > 0 then
    update public.productos
       set stock = stock
     where id = any(v_ids);
  end if;

  return null;
end;
$$;

drop trigger if exists reserva_items_refresh_availability on public.reserva_items;
create trigger reserva_items_refresh_availability
  after insert or update or delete on public.reserva_items
  for each row execute function public.refresh_product_availability();

drop trigger if exists reservas_refresh_availability on public.reservas;
create trigger reservas_refresh_availability
  after update of status, expires_at on public.reservas
  for each row execute function public.refresh_product_availability();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'productos'
    ) then
      alter publication supabase_realtime add table public.productos;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'reservas'
    ) then
      alter publication supabase_realtime add table public.reservas;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'reserva_items'
    ) then
      alter publication supabase_realtime add table public.reserva_items;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'noticias'
    ) then
      alter publication supabase_realtime add table public.noticias;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'guias_tallas'
    ) then
      alter publication supabase_realtime add table public.guias_tallas;
    end if;
  end if;
end $$;

-- ─── Storage: bucket público de imágenes ─────────────────────────────────────
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'imagenes-productos',
  'imagenes-productos',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "isnoir_storage_lectura_publica" on storage.objects;
drop policy if exists "isnoir_storage_subida_admin" on storage.objects;
drop policy if exists "isnoir_storage_actualizacion_admin" on storage.objects;
drop policy if exists "isnoir_storage_eliminacion_admin" on storage.objects;

create policy "isnoir_storage_lectura_publica"
  on storage.objects
  for select
  to public
  using (bucket_id = 'imagenes-productos');

create policy "isnoir_storage_subida_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'imagenes-productos'
    and public.is_noir_admin()
  );

create policy "isnoir_storage_actualizacion_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'imagenes-productos'
    and public.is_noir_admin()
  )
  with check (
    bucket_id = 'imagenes-productos'
    and public.is_noir_admin()
  );

create policy "isnoir_storage_eliminacion_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'imagenes-productos'
    and public.is_noir_admin()
  );

comment on table public.productos is
  'Catálogo IS NOIR. Lectura pública solo de productos publicados.';
comment on table public.admin_emails is
  'Lista blanca de administradores. Se usa dentro de is_noir_admin(); no es accesible vía API.';
comment on table public.noticias is
  'Diario público del atelier. Solo las noticias publicadas y vigentes son visibles para anon.';
comment on table public.reservas is
  'Apartados temporales de inventario. La lectura está reservada a administradores.';
comment on table public.reserva_items is
  'Detalle inmutable de cada apartado. No se expone al público.';
comment on table public.guias_tallas is
  'Guías de tallas editables por categoría general (Ropa / Accesorios).';

-- Refresca el caché de PostgREST después de aplicar el esquema.
notify pgrst, 'reload schema';
