# Kit de marca — Rodrigo Ulloa, Kinesiólogo Deportivo

Vectorizado a partir de un JPG 2576×2576. Isotipo redibujado con geometría limpia (polígonos + círculo);
wordmark trazado desde el raster (curvas Bézier, no es la fuente original).

## Colores
- Verde marca: #2AD636 (medido del JPG; confirmar con el diseñador)
- Fondo oscuro: #0E0F0E
- Texto sobre oscuro: #FFFFFF

## Carpetas
- svg/  — isotipo (verde, blanco, negro, cuadrado), logo vertical y horizontal (versión fondo oscuro y claro), favicon, app-icon, maskable, og-image
- png/  — exportaciones a alta resolución (logos 2000px, isotipos 1024px, favicons 16–256)
- web/  — listo para copiar a /public: favicon.ico, favicon.svg, PNGs, site.webmanifest, head-snippet.html

## Uso en la app
- Login / splash: logo-vertical-oscuro.svg
- Navbar / header: logo-horizontal-(oscuro|claro).svg
- Sidebar colapsado, avatar, loaders: isotipo.svg
- No usar el isotipo verde por debajo de ~24px sin fondo: en 16px el hueco interno se pierde; para eso existe favicon.svg con fondo.
