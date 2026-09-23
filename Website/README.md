# Mod Assistant — sitio web

Página de presentación de **Mod Assistant**, el gestor de mods y cosméticos para Dota 2 de
Dreftian Devs. Publicada en <https://dota2-mods.vercel.app/>.

Es un sitio estático: HTML, CSS y JavaScript sin framework, sin dependencias y sin paso de
compilación. Lo que hay en este repositorio es exactamente lo que se sirve.

## Estructura

```
index.html        Toda la página. El texto en español es la fuente.
styles.css        Estilos (tema oscuro, sin preprocesador).
script.js         Cambio de idioma ES/EN, menú móvil, demo de medalla,
                  versión más reciente desde GitHub y aviso para quien no usa Windows.
assets/
  logo.svg              Logotipo propio de Mod Assistant (favicon y cabecera).
  apple-touch-icon.png  Icono 180x180 generado a partir de logo.svg.
  og-image.png          Imagen para redes sociales (1200x630).
  screens/              Capturas reales de la app (WebP).
  ranks/, herotier/     Medallas e insignias de Dota 2 usadas en la demo (propiedad de Valve).
favicon.ico       Generado a partir de logo.svg (16, 32 y 48 px).
robots.txt        Permite todo y enlaza el sitemap.
sitemap.xml       Una sola URL: la portada.
vercel.json       Solo cabeceras HTTP (caché de /assets y cabeceras de seguridad).
```

## Despliegue

Vercel despliega la rama `main` tal cual, sin comando de build ni directorio de salida:

- **Framework preset:** Other
- **Build command:** vacío
- **Output directory:** la raíz del repositorio

Cada push a `main` publica el sitio; cada pull request recibe una URL de vista previa. Vercel
funciona igual si el repositorio es privado.

`vercel.json` guarda en caché los archivos de `/assets` durante 30 días. Si cambias una imagen,
**cámbiale también el nombre** (por ejemplo `catalog-1360-v2.webp`) y actualiza la referencia en
`index.html`; si no, algunos visitantes seguirán viendo la anterior hasta que caduque la caché.

## Adónde apuntan las descargas

Todas las descargas apuntan al repositorio público de versiones y **siempre a la última**:

| Enlace | URL |
|---|---|
| Instalador | `https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest/download/Dota2-Mod-Setup.exe` |
| Portable | `https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest/download/Dota2.Mod.exe` |
| Notas de la versión y código fuente | `https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest` |

Para que funcionen:

1. `Dreftian/Dota2-Mods-Releases` tiene que ser **público** y tener al menos una versión publicada
   (no un borrador ni una *pre-release*: `latest` las ignora).
2. Cada versión tiene que adjuntar archivos con estos nombres exactos: `Dota2-Mod-Setup.exe` y
   `Dota2.Mod.exe`. Si cambia el nombre de un archivo, el enlace deja de funcionar.
3. Cada versión tiene que adjuntar el código fuente de esa versión (lo exige la GPL; el sitio lo
   promete en el pie de página y en las preguntas frecuentes).

No escribas números de versión en la página. `script.js` consulta
`https://api.github.com/repos/Dreftian/Dota2-Mods-Releases/releases/latest` y, si responde,
muestra "Última: vX.Y.Z (fecha)" junto a las notas de la versión. Si no hay conexión, si GitHub
limita las peticiones o si todavía no existe ninguna versión, no muestra nada y los enlaces
siguen funcionando. La respuesta se guarda en `sessionStorage` para no repetir la consulta.

## Cómo editar

### Textos

- El español está escrito directamente en `index.html`.
- Cada texto traducible lleva un atributo `data-i18n="clave"`. La traducción inglesa está en el
  objeto `EN` al principio de `script.js`, con la misma clave y el mismo HTML interno (negritas,
  enlaces).
- Los atributos (`aria-label`, `alt`) se traducen con `data-i18n-attr="atributo:clave"`.
- Los textos que genera el propio script (demo, menú, versión) están en el objeto `UI` de
  `script.js`, en los dos idiomas.
- Si añades un `data-i18n` nuevo, añade su clave a `EN`. Si falta, en inglés se queda el texto
  en español.

El idioma se elige así: `?lang=es` o `?lang=en` en la URL; si no, el que el visitante eligió antes
con el botón ES/EN; si no, inglés cuando el navegador no pide español. Los buscadores siempre
reciben el español, que es lo que declara `lang="es"`.

### Lo que la página no debe prometer

Estas frases estuvieron en versiones anteriores y eran falsas. No vuelvas a ponerlas:

- "100% seguro contra VAC", "indetectable", "inmune". La página explica cómo funciona y avisa del
  riesgo con las mismas palabras que la app.
- "Mods ilimitados". El juego carga como máximo 95 archivos pak por carpeta de idioma en cualquier
  plan; Premium solo quita el límite de 100 mods.
- Que la medalla o el MMR cambian algo en el juego. Es solo una imagen en tu pantalla.
- Que el Arsenal pone la arcana de un héroe en otro. Cada héroe viste sus propios ítems
  (`src/hero-items.js` en la app): "las arcanas e inmortales de cada héroe", no "cualquier arcana
  en cualquier héroe".
- "Dota 2 Mod Manager" como nombre o descripción de esta app. Es el nombre del proyecto original y
  su aviso NOTICE no lo cede; solo aparece al acreditarlo.
- Ventajas de Premium que la app no tiene (soporte prioritario, servidores rápidos, etc.).
  Premium es exactamente: sin límite de 100 mods y equipar en el Arsenal VIP.
- Insignias de "oficial", "más popular" o estados falsos. Si hace falta prueba social, usa cifras
  reales del catálogo o de descargas de GitHub.

### Imágenes

- `assets/logo.svg` es original. **No uses el logotipo de Dota 2** como marca del sitio.
- Las capturas de `assets/screens/` se hacen con la app contra el entorno de pruebas, nunca contra
  una instalación real de Dota. Desde el repositorio de la app:

  ```bash
  npm run sandbox:seed
  MM_QUIET=1 MM_SHOT=catalog.png \
    MM_EVAL="document.querySelectorAll('.modal-overlay,.confirm-overlay').forEach(e => e.remove())" \
    npm run start:sandbox
  ```

  `MM_EVAL` se ejecuta justo antes de la captura; aquí quita las ventanas de bienvenida para que
  se vea la pantalla. `MM_VIEW=arsenal` (u otra vista) cambia de pantalla antes de capturar.
  La app sigue abierta después: ciérrala a mano. Conviértelas a WebP y pon siempre `width` y
  `height` en la etiqueta `<img>`.
- Las medallas e insignias de `ranks/` y `herotier/` pertenecen a Valve; el pie de página lo
  indica.

### Antes de publicar

Abre `index.html` directamente en el navegador (no hace falta servidor) y comprueba:

- Que cada enlace `#ancla` tiene su destino y que no hay `id` repetidos.
- Que todas las descargas usan `/releases/latest/`.
- Que no hay scroll horizontal a 375 px de ancho.
- Que `?lang=en` muestra toda la página en inglés.
- Que el menú móvil se abre, se cierra con Escape y cierra al pulsar un enlace.
- La vista previa en redes: <https://www.opengraph.xyz/> con la URL de producción.

## Privacidad del sitio

Sin cookies, sin analíticas y sin scripts de terceros. Solo se hacen dos peticiones externas:
las fuentes de Google Fonts y la consulta de la última versión a la API pública de GitHub.

## Licencia y avisos

- **Mod Assistant** (la aplicación) es software libre bajo GPL-3.0-or-later. Es una versión
  modificada por Dreftian Devs de [Dota 2 Mod Manager](https://github.com/TheFleece/dota2-mod-manager)
  (Copyright © 2026 TheFleece). Sus condiciones adicionales (sección 7) piden mantener ese crédito
  en cualquier página desde la que se descargue el programa, así que el pie de página lo muestra:
  no lo quites.
- El catálogo de mods que usa la app proviene de [h6rd](https://github.com/h6rd/Dota2PornFxWeb) y
  de los autores acreditados en cada mod.
- Este repositorio no incluye un archivo `LICENSE` propio para el código del sitio. Añade uno si
  quieres que ese código tenga una licencia explícita.
- Mod Assistant no está afiliado ni respaldado por Valve Corporation. Dota 2 y Dota Plus son marcas
  de Valve Corporation; las imágenes de medallas e insignias pertenecen a Valve.
