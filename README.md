# IS NOIR

Boutique editorial de ropa y accesorios en Cúcuta, con catálogo administrable, pedidos asistidos por WhatsApp y un diario del atelier. Construida con React + Vite, Supabase y Vercel.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completa las variables `VITE_` en `.env.local`. Ese archivo está ignorado por Git y nunca debe subirse al repositorio. El frontend usa únicamente la anon key pública; la `service_role`, `DATABASE_URL` y los tokens de administración se mantienen fuera del proyecto.

## Variables de entorno requeridas

| Variable | Descripción | ¿Cliente? |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `VITE_WHATSAPP_PHONE` | Teléfono en formato internacional (ej. `573122597144`) | ✅ |
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary | ✅ |
| `VITE_CLOUDINARY_API_KEY` | API Key de Cloudinary | ✅ |
| `VITE_ADMIN_ALLOWED_EMAILS` | Correos admin separados por coma (lista blanca frontend) | ✅ |
| `CLOUDINARY_API_SECRET` | **Solo servidor** — firma de subidas a Cloudinary | ❌ |

> `CLOUDINARY_API_SECRET` **nunca** lleva prefijo `VITE_`. Se usa exclusivamente en la función Serverless `/api/sign-cloudinary`.

## Scripts

- `npm run dev` — servidor de desarrollo con middleware local para `/api/sign-cloudinary` y `/api/delete-cloudinary`.
- `npm run build` — compilación de producción en `dist/`.
- `npm run preview` — vista previa de la compilación.
- `npm run db:apply` — aplica `supabase/schema.sql` al proyecto configurado (requiere `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`).
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

**Panel reorganizado en 4 pestañas:**

1. **Inventario y Productos** — lista, crear/editar, stock por talla, portada explícita, hasta 5 imágenes.
2. **Gestionar Noticias / Atelier** — CRUD de entradas con fecha de expiración opcional.
3. **Pedidos Apartados / En Proceso** — lista en tiempo real, confirmar venta, liberar stock, campana de notificaciones.
4. **Configuración de Catálogo** — gestión dinámica de Colecciones, Tipos y Subcategorías (crear/editar/eliminar).

**Funciones clave del panel:**
- Stock por talla (`tallas_stock` JSONB) con validación: suma de tallas = stock total.
- Modo "Talla Única" para accesorios/prendas sin variantes.
- Foco de imagen (`imagen_enfoque`) para recorte `object-fit: cover`.
- Guías de tallas por categoría (Ropa/Accesorios) con texto e imagen Cloudinary; botón para eliminar imagen asignada.
- Badge "Pocas unidades" en tabla de inventario (≤ 3).
- Campana con badge en tiempo real de apartados activos y acceso directo a la pestaña de pedidos.
- Subida de imágenes firmada vía Cloudinary (límite 10 MB, carpeta `is_noir_catalog`).

Los contadores de solicitudes y ventas se actualizan automáticamente: solicitudes al abrir pieza o consultar por WhatsApp; ventas al confirmar apartado.

## Base de datos

El esquema completo está en `supabase/schema.sql`: tablas, restricciones, políticas RLS, funciones de apartados, vista `productos_publicos`, taxonomías, catálogo inicial y seed de taxonomías. Aplícalo desde el SQL Editor de Supabase o con `npm run db:apply`.

**Apartados temporales refinados:**
- 15 minutos iniciales; **no se reinicia** al agregar productos.
- 1 apartado activo por carrito; renovaciones de 10 y 5 minutos (máx. 3 intentos).
- Persistencia en `localStorage` (`isnoir-reserved-until-v1`); contador reanuda al segundo exacto tras recarga.
- Admin libera → stock vuelve inmediato; cliente cancela → reserva libre, carrito conservado.
- Realtime en `reservas` y `reserva_items` actualiza `productos_publicos` sin exponer datos de clientes.

## Cloudinary (Subidas firmadas)

1. Frontend pide firma a `/api/sign-cloudinary` (valida sesión admin + `admin_emails`).
2. Serverless genera `timestamp` + `signature` con `CLOUDINARY_API_SECRET`.
3. Frontend sube directo a `https://api.cloudinary.com/v1_1/<cloud>/image/upload` con `file`, `api_key`, `timestamp`, `signature`, `folder: 'is_noir_catalog'`.
4. Carpeta validada en servidor (`is_noir_catalog/*`).
5. Borrado vía `/api/delete-cloudinary` con `public_id` validado.

## Despliegue en Vercel

1. Conecta el repositorio; rama `develop` para preview, `main` para producción.
2. Configura **Environment Variables** en Vercel (Project Settings → Environment Variables):
   - Todas las `VITE_*` + `CLOUDINARY_API_SECRET` (solo Serverless).
3. `vercel.json` ya incluye rewrites para SPA y rutas `/api/*` a Serverless Functions.
4. Push a `origin/develop` → Preview deploy; merge a `main` → Production.
