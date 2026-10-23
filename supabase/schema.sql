-- =============================================================================
-- IS NOIR · Esquema de base de datos, RLS y Storage
-- Ejecutar en el proyecto Supabase: yguhpeoaykirhumhzvrm
--
-- Seguridad:
--   * El catálogo público solo ve productos publicados (borrador = false).
--   * Solo administradores autenticados y presentes en admin_emails pueden
--     leer borradores y escribir en el catálogo.
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
  borrador boolean not null default true,
  es_novedad boolean not null default false,
  solicitudes integer not null default 0,
  constraint productos_nombre_largo check (char_length(trim(nombre)) between 1 and 160),
  constraint productos_precio_positivo check (precio >= 0),
  constraint productos_stock_positivo check (stock >= 0),
  constraint productos_solicitudes_positivas check (solicitudes >= 0),
  constraint productos_coleccion_valida check (coleccion in ('Old Money', 'Alternativo')),
  constraint productos_tipo_valido check (tipo in ('Ropa', 'Accesorios'))
);

-- Compatibilidad con instalaciones anteriores del esquema.
alter table public.productos
  add column if not exists es_novedad boolean not null default false;
alter table public.productos
  add column if not exists solicitudes integer not null default 0;
alter table public.productos
  drop constraint if exists productos_solicitudes_positivas;
alter table public.productos
  add constraint productos_solicitudes_positivas check (solicitudes >= 0);

create index if not exists productos_publicos_idx
  on public.productos (created_at desc)
  where borrador = false;

create index if not exists productos_novedades_idx
  on public.productos (es_novedad, solicitudes desc)
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

insert into public.admin_emails (email)
values
  ('isnoir2006@gmail.com'),
  ('greatmiguel012@gmail.com')
on conflict (email) do nothing;

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
      (nombre, precio, stock, coleccion, tipo, subcategoria, imagen_url, borrador, es_novedad, solicitudes, created_at)
    values
      ('Vestido Minuit', 219900, 6, 'Alternativo', 'Ropa', 'Vestidos', 'images/product-vestido.jpg', false, true, 18, now() - interval '1 hour'),
      ('Sastre Époque', 389900, 4, 'Old Money', 'Ropa', 'Trajes', 'images/product-sastre.jpg', false, false, 16, now() - interval '2 hours'),
      ('Abrigo Rive', 459900, 3, 'Old Money', 'Ropa', 'Abrigos', 'images/product-abrigo.jpg', false, false, 7, now() - interval '3 hours'),
      ('Blusa Soie', 169900, 8, 'Old Money', 'Ropa', 'Blusas', 'images/product-blusa.jpg', false, false, 11, now() - interval '4 hours'),
      ('Chaqueta Nocturne', 289900, 5, 'Alternativo', 'Ropa', 'Chaquetas', 'images/product-chaqueta.jpg', false, true, 12, now() - interval '5 hours'),
      ('Conjunto Aube', 329900, 4, 'Old Money', 'Ropa', 'Conjuntos', 'images/product-conjunto.jpg', false, false, 6, now() - interval '6 hours'),
      ('Boina Velours', 89900, 12, 'Alternativo', 'Accesorios', 'Sombrerería', 'images/product-boina.jpg', false, false, 24, now() - interval '7 hours'),
      ('Collar Lune', 129900, 7, 'Old Money', 'Accesorios', 'Joyería', 'images/product-collar.jpg', false, true, 9, now() - interval '8 hours');
  end if;
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
  constraint noticias_titulo_largo check (char_length(trim(titulo)) between 1 and 160),
  constraint noticias_contenido_largo check (char_length(trim(contenido)) between 1 and 12000)
);

create index if not exists noticias_publicadas_idx
  on public.noticias (created_at desc)
  where publicada = true;

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
  using (publicada = true);

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
  'Diario público del atelier. Solo las noticias publicadas son visibles para anon.';
