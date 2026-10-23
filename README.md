# IS NOIR

Boutique editorial de ropa y accesorios en Cúcuta, con catálogo administrable, pedidos asistidos por WhatsApp y un diario del atelier. Construida con React + Vite y Supabase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completa las variables `VITE_` en `.env.local`. Ese archivo está ignorado por Git y nunca debe subirse al repositorio. El frontend usa únicamente la anon key pública; la `service_role`, `DATABASE_URL` y los tokens de administración se mantienen fuera del proyecto.

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
- `/novedades` — piezas nuevas, más solicitadas y más vendidas.
- `/noticias` — Diario del Atelier, con lector editorial y archivo de entradas vigentes.

La navegación usa la History API. `vercel.json` reescribe las rutas internas hacia `index.html` para que funcionen al recargar o compartir enlaces.

## Administración

El acceso está oculto en los disparadores discretos del sitio. La autenticación se realiza con Google OAuth y el correo debe estar en la lista blanca de Supabase (`admin_emails`) y en `VITE_ADMIN_ALLOWED_EMAILS`.

La lista blanca no se versiona. Después de aplicar el esquema, inserta los correos del equipo desde el SQL Editor:

```sql
insert into public.admin_emails (email)
values ('correo-del-equipo@gmail.com')
on conflict (email) do nothing;
```

Desde el panel se puede:

- Crear, editar, publicar y eliminar piezas con hasta cinco imágenes.
- Ajustar stock y marcar novedades.
- Confirmar apartados como vendidos o liberar su stock.
- Editar las guías de tallas de Ropa y Accesorios.
- Crear, editar, publicar, archivar o eliminar entradas del Diario del Atelier, con fecha de expiración opcional.

Los contadores de solicitudes y ventas se actualizan automáticamente: las solicitudes al abrir una pieza o consultar por WhatsApp, y las ventas al confirmar un apartado. No hay controles manuales de posicionamiento.

## Base de datos

El esquema completo está en `supabase/schema.sql`: tablas, restricciones, políticas RLS, bucket de imágenes, guías de tallas, apartados temporales y catálogo inicial. Aplícalo desde el SQL Editor de Supabase o con `npm run db:apply` usando las credenciales de administración fuera del repositorio.

Los apartados duran 15 minutos y descuentan disponibilidad en tiempo real. La vista `productos_publicos` calcula el stock disponible sin exponer datos de clientes. La seguridad real vive en Supabase mediante RLS; el frontend no reemplaza esas políticas.
