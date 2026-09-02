# Esmeraldas W&S — Tienda en línea

Sitio de comercio electrónico para Esmeraldas W&S: catálogo de 17 piezas artesanales (collares, aretes y sets), carrito de compras y pago en línea con tarjeta a través de **Wompi**.

## Estructura del proyecto

```
PAGINA WEB JOYERIA/
├── Joyeria-Willi/          Fotos originales (sin tocar, no se usan en el sitio)
├── scripts/
│   └── optimize_images.py Script que generó las fotos optimizadas (ya se ejecutó)
└── backend/                 La aplicación (backend + frontend)
    ├── server.js            Servidor Express
    ├── package.json
    ├── .env                 Tus llaves reales (NO subir a internet/git)
    ├── .env.example          Plantilla de variables de entorno
    ├── data/
    │   └── products.json    Catálogo: nombre, precio, descripción, fotos de cada pieza
    ├── routes/               Endpoints de la API (productos, pedidos, webhook de Wompi)
    ├── services/             Lógica de Wompi y de guardado de datos (db.js, store.js)
    └── public/               Todo lo que ve el cliente
        ├── index.html, catalogo.html, producto.html, checkout.html, pedido-confirmado.html
        ├── css/styles.css
        ├── js/               (un archivo .js por función: cart.js, catalogo.js, checkout.js…)
        └── assets/images/    Fotos ya redimensionadas y comprimidas
```

## Cómo correr el sitio

```
cd backend
npm install      (solo la primera vez)
npm start
```

Abre **http://localhost:3000** en el navegador.

## Base de datos (pedidos y stock)

Los pedidos y el stock de cada pieza se guardan en una base de datos **PostgreSQL**, no en un archivo — así no se pierden cada vez que se despliega una actualización del código (el disco del servidor no es permanente).

1. Crea una base gratis en Render: **New +** → **PostgreSQL** → plan **Free**.
2. Copia la **"Internal Database URL"** que te da Render.
3. Pégala en `backend/.env` (o en las variables de entorno de Render, para el sitio en vivo):
   ```
   DATABASE_URL=postgres://...
   ```
4. Al arrancar, el servidor crea las tablas solo (`product_stock`, `orders`) y carga el stock inicial desde `products.json` — no hace falta ningún paso manual más.

Nota: las bases de datos gratis de Render se eliminan a los 90 días si no se pasan a un plan pago (unos pocos dólares al mes). Vale la pena revisarlo antes de esa fecha si la tienda ya está recibiendo pedidos reales.

Sin `DATABASE_URL` configurada, el catálogo se puede seguir viendo (usa el stock que esté escrito en `products.json`), pero **crear o consultar pedidos no funciona** — es obligatoria para el checkout.

## Activar el pago con tarjeta (Wompi)

El sitio funciona completo sin esto (catálogo, carrito, formulario), pero el botón **"Pagar con tarjeta"** no cobrará de verdad hasta que actives Wompi:

1. Crea una cuenta gratis en **https://comercios.wompi.co** (el modo sandbox/pruebas es instantáneo, sin papeleo).
2. En el panel, sección **Desarrolladores**, copia estas 4 llaves.
3. Abre `backend/.env` (si no existe, copia `backend/.env.example` y renómbralo a `.env`) y pégalas:
   ```
   WOMPI_PUBLIC_KEY=pub_test_...
   WOMPI_PRIVATE_KEY=prv_test_...
   WOMPI_INTEGRITY_SECRET=...
   WOMPI_EVENTS_SECRET=...
   ```
4. En el panel de Wompi, configura la URL de webhook (eventos) apuntando a:
   `https://TU-DOMINIO.com/api/webhooks/wompi`
   (mientras el sitio esté solo en tu computador, esa URL no es alcanzable desde internet; se configura cuando publiques el sitio en un servidor real, por ejemplo con un dominio propio).
5. Reinicia el servidor (`npm start`). Cuando Wompi verifique tu negocio, repites el paso 3 con las llaves que empiezan en `pub_prod_` / `prv_prod_` y cambias `WOMPI_API_BASE` a `https://production.wompi.co/v1`.

Mientras Wompi no esté configurado, el cliente puede llenar el formulario y su pedido queda guardado en la base de datos igual; el sitio le muestra un mensaje para completar el pago por WhatsApp.

## Cómo enterarte de un pedido nuevo

Hay dos formas, y se pueden usar las dos a la vez:

1. **Panel de pedidos**: entra a `https://tu-dominio.com/admin.html` y pon la clave que hayas puesto en `ADMIN_PASSWORD` (en `backend/.env` para local, o en las variables de entorno de Render para el sitio en vivo). Ahí ves todos los pedidos con los datos del cliente, y un link directo para escribirle por WhatsApp.
2. **Correo automático**: cada vez que se confirma un pedido (contra entrega, o pago con tarjeta ya aprobado) te llega un correo. Para activarlo:
   1. Crea una cuenta gratis en [resend.com](https://resend.com) y saca una API key.
   2. En `backend/.env` (o en Render), completa `RESEND_API_KEY` y `OWNER_EMAIL` (tu correo).
   3. `NOTIFY_FROM_EMAIL` puede quedar como está (usa el dominio de pruebas de Resend); si más adelante quieres que el correo llegue "desde" tu propio dominio, hay que verificarlo en Resend primero.

Mientras `RESEND_API_KEY`/`OWNER_EMAIL` no estén configurados, el sitio funciona igual, simplemente no manda el correo.

## Cosas que debes personalizar

- **Número de WhatsApp**: busca `573006911778` en los archivos de `backend/public/*.html` y `checkout.js` y cámbialo por tu número real (con indicativo, sin `+` ni espacios).
- **Correo de contacto**: `wsesmeraldas@gmail.com` en los footers.
- **Precios y descripciones**: edita `backend/data/products.json` — es un archivo de texto simple, cada producto tiene `price`, `description`, etc. Los precios que se usaron salieron de la foto "Precios de cada producto.jpeg" asumiendo que el orden de las carpetas (Collar #1, #2…) coincide con el orden de la lista de precios; revísalos y ajústalos si hace falta.
- **Stock**: el campo `stock` de `products.json` solo se usa para "sembrar" el valor inicial la primera vez que arranca el servidor con la base de datos conectada. Después de eso, el stock real vive en la base de datos y baja solo cuando se aprueba un pago — cambiar el número en `products.json` ya no tiene efecto una vez sembrado (para "reponer" una pieza manualmente, hay que actualizarlo directamente en la base de datos).
- **Costo de envío**: se calcula por zona según el departamento del cliente, editando `backend/services/shipping.js` (departamentos y precio de cada zona).

## Ya probado (sin necesitar llaves reales)

Antes de entregarlo se probó todo el flujo con una transacción simulada: crear pedido → confirmar pago → webhook de Wompi con firma válida e inválida → descuento de stock → idempotencia (no descuenta dos veces) → validaciones (carrito vacío, pieza agotada). Los 16 casos pasaron correctamente. El backend también tiene protección básica contra abuso (límite de peticiones al formulario de pedidos) y cabeceras de seguridad HTTP estándar (helmet).

## Cómo funciona el pago (para que sepas qué construimos)

1. El cliente llena el carrito y el formulario en `checkout.html`.
2. El navegador manda esos datos a `POST /api/orders`. El backend **recalcula los precios él mismo** (nunca confía en lo que mande el navegador) y crea un pedido en estado `PENDING`.
3. Si Wompi está configurado, el backend arma una firma de seguridad (`integrity signature`) y el navegador abre el **widget oficial de Wompi** (una ventana emergente de Wompi) donde el cliente escribe los datos de su tarjeta — esos datos nunca pasan por nuestro servidor, van directo a Wompi. Así se evita cualquier riesgo de manejar números de tarjeta nosotros mismos.
4. Cuando el pago termina, dos cosas confirman el resultado: el navegador vuelve a `pedido-confirmado.html`, y Wompi le avisa también al servidor por un **webhook** (`/api/webhooks/wompi`). El webhook es la fuente de verdad real, por si el cliente cierra la ventana antes de tiempo.
5. Si el pago queda **aprobado**, la pieza se marca como vendida (`stock` baja a 0) y desaparece del catálogo como disponible — son piezas únicas.

## Nota sobre las fotos

Las fotos originales en `Joyeria-Willi/` pesaban varios MB cada una (fotos de cámara sin comprimir). El script `scripts/optimize_images.py` generó copias livianas en dos tamaños (grid y detalle) dentro de `backend/public/assets/images/`, que es lo que usa el sitio. Si agregas fotos nuevas de un producto, corre de nuevo ese script (agregando el producto nuevo a la lista `PRODUCTS` dentro del archivo) o pídeme que lo haga.
