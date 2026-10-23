# IS NOIR

Boutique editorial de ropa y accesorios con catálogo administrable, pedidos asistidos por WhatsApp y un diario de novedades. Construida con React + Vite y Supabase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completa las variables `VITE_` en `.env.local`. Ese archivo está ignorado por Git y nunca debe subirse al repositorio.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compilación de producción en `dist/`.
- `npm run preview` — vista previa de la compilación.
- `npm run db:apply` — aplica `supabase/schema.sql` al proyecto configurado.
- `npm run security:secrets` — comprueba que no haya secretos privados en archivos versionables.

## Rutas

- `/` — inicio y colecciones.
- `/coleccion` — catálogo completo, filtros y búsqueda.
- `/nosotros` — historia y valores de la marca.
- `/novedades` — piezas marcadas por el administrador, lo más solicitado y noticias del atelier.

La navegación usa la History API. En un alojamiento estático hace falta una regla de fallback hacia `index.html` para las rutas internas.

## Administración

El acceso está oculto detrás de `Ctrl + Shift + A` y de los disparadores discretos del sitio. La autenticación se realiza con Google OAuth y el correo debe estar en la lista blanca configurada en Supabase (`admin_emails`) y en `VITE_ADMIN_ALLOWED_EMAILS`.

Desde el panel se puede:

- Crear, editar, publicar y eliminar piezas.
- Ajustar stock y marcar novedades.
- Registrar solicitudes o ventas para ordenar “Lo más solicitado”.
- Crear, editar, publicar y eliminar noticias del diario.

La seguridad real vive en Supabase mediante RLS. El frontend no reemplaza esas políticas.

## Base de datos

El esquema completo está en `supabase/schema.sql`: tablas, restricciones, políticas RLS, lista blanca de administradores, bucket de imágenes y catálogo inicial. Aplícalo desde el SQL Editor de Supabase o con `npm run db:apply` usando las credenciales de administración fuera del repositorio.
