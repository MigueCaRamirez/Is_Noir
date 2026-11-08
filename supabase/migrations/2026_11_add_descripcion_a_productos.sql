-- =============================================================================
-- IS NOIR · Migración: Añadir columna descripcion a productos
-- Fecha: 2026-11-08
--
-- Agrega una columna opcional de descripcion a la tabla productos para que
-- el administrador pueda escribir detalles de cada pieza.
-- =============================================================================

alter table public.productos
  add column if not exists descripcion text;

comment on column public.productos.descripcion is
  'Descripcion opcional de la pieza (detalles, materiales, cuidados).';

notify pgrst, 'reload schema';
