# Historial de Cambios

Novedades de cada versión. La aplicación se actualiza de forma automática para que disfrutes de todas las mejoras sin necesidad de reinstalar.

## 1.1.0

### Arsenal VIP: todos los inmortales, arcanas y exclusivos en cualquier héroe, y una ronda de correcciones

**Arsenal VIP** es una pestaña nueva (Ctrl+5). Elige un héroe y luego lo que lleva cada espacio: todas las arcanas, todos los inmortales y cualquier otro cosmético que conozca tu juego instalado, con sus estilos, sus variantes (Golden, Crimson...) y sets completos en un clic. Un filtro muestra los exclusivos que la tienda nunca vendió (cofres, pases de batalla y eventos), como Dragonclaw Hook, Phantom Advent o Planetfall. La lista se lee de tu propio juego, así que lo que Valve añada después aparece sin actualizar. Solo tú ves los aspectos. Requiere desactivar el modo seguro y una cuenta VIP.

- **Más cosméticos gratis**: ahora se ofrecen los packs de cursores y las skins de Roshan, junto a mensajeros, guardianes, HUDs, clima, terrenos, pantallas de carga, locutores y el resto. Faltaban por una confusión de espacios en la tabla de objetos.
- **Catálogo**: se quitaron 41 entradas de relleno cuyos archivos nunca existieron (todas fallaban al instalar) y dos tarjetas de rango duplicadas. Los duplicados exactos del catálogo se muestran una sola vez. Un mod con el mismo nombre que otro de otra categoría ya no se instala en su lugar.
- **Rangos**: los packs de medallas del catálogo vuelven a instalar sus propios archivos (los ocho instalaban la medalla generada). Inmortal a secas ya no recibe un número Top, las estrellas elegidas se integran en la medalla y el personalizador está traducido. El campo MMR se explica como lo que es: un nombre en Mis mods, no un número en el juego.
- **Cuentas**: la contraseña de administrador ya no forma parte de la app y cada inicio de sesión comprueba la contraseña guardada. La cuenta de administrador que creaban las versiones anteriores se elimina en el primer arranque, así que su contraseña antigua ya no abre nada; su dueño se registra de nuevo. Puedes cambiar tu contraseña en el perfil. Premium termina cuando vence su fecha. Un archivo de cuentas dañado se aparta en lugar de borrarse. El perfil ya no promete una sincronización en la nube que no existe.
- **Archivos del juego**: reactivar el modo seguro ya nunca restaura una copia .bak antigua de los archivos de Valve, que podía romper el matchmaking. Una reconstrucción fallida de la tabla de objetos se avisa y se reintenta en vez de darse por hecha. El interruptor de Mods funciona como una sola transacción, los mods instalados con los mods apagados quedan apagados, tu propio pak99 ya no se confunde con Minify y los mods que versiones antiguas dejaron en pak100+ vuelven a espacios que el juego carga.
- **Velocidad**: reconstruir la tabla de objetos con muchos aspectos pasó de unos 30 segundos a menos de uno.
- **Español en todas partes**: se añadieron unos 340 textos que faltaban, las guías se muestran en inglés en vez de ruso y las ventanas de rango, inicio de sesión y pago siguen el idioma elegido.
- **Actualizaciones**: ahora llegan desde el repositorio público Dreftian/Dota2-Mods-Releases, que también publica el código fuente de cada versión. Configuración enlaza allí.

## 1.0.14

### Medallas Inmortal Oficiales de Valve, Persistencia de Mods en el Juego y Perfeccionamiento de Dígitos

Esta versión soluciona el problema por el cual el mod de rango no aparecía en Dota 2 al cerrar el gestor, reemplaza las texturas por las genuinas de Valve extraídas directamente del juego y perfecciona la tipografía de la placa de clasificación:

- **Persistencia de Mods al Salir de la App**: Se eliminó la desactivación automática al cerrar la aplicación. Los mods instalados, rangos personalizados e insignias de héroe ahora permanecen activos de forma permanente en la carpeta del juego como archivos `.vpk`.
- **Texturas Inmortal 100% Auténticas de Valve**: Extraídas directamente de los archivos oficiales `pak01_dir.vpk`: Top 10 (`rank8c`) con alas doradas de fuego y placa oscura, Top 100 (`rank8b`) con alas cobrizas, Top 1000 (`rank8a`) con alas plateadas y medalla de Inmortal General (`rank8`).
- **Centrado y Tipografía Radiance en la Placa**: Los números de clasificación en la placa ahora se dibujan con blanco marfil sólido (#FFF8E7) centrados en Y=212, idénticos a las tablas de clasificación oficiales de Valve.

## 1.0.13

### Medallas Inmortal Oficiales de Valve, Rangos Estrictos de Dígitos, Insignias para Todos los Héroes y Prioridad Rápida

Esta versión reemplaza la medalla azul inactiva por las texturas genuinas de Valve, aplica límites estrictos de dígitos por categoría de Inmortal, extiende el mod de insignias a todos los héroes en la selección y perfil, mejora los números con tipografía Radiance y soluciona colisiones de prioridad entre mods:

- **Eliminación de la Medalla Azul Inactiva**: Las cuentas sin calibrar o inactivas en Dota 2 cargan la medalla azul oficial inactiva (`rank8inactive_psd.vtex_c` y su versión mini). El generador ahora sustituye estas ranuras inactivas junto con `rank0_psd`, asegurando que el perfil muestre la medalla Inmortal auténtica de Valve seleccionada (Top 10 con alas de fuego, Top 100 con alas rojas, Top 1000 con alas plateadas/moradas o Inmortal General).
- **Rangos Estrictos de Dígitos por Nivel de Inmortal**: Validación estricta del número de tabla de clasificación: Top 10 (`rank8c`) acepta únicamente del 1 al 10; Top 100 (`rank8b`) del 11 al 100; Top 1000 (`rank8a`) del 101 al 6000. Para Inmortal General (`rank8`) y medallas normales, el campo de número de puesto permanece oculto.
- **Insignias de Progreso para Todos los Héroes**: Se reemplazan todos los niveles de insignias (del 0 al 5 y vacío) en todas las resoluciones. El 100% de los héroes en la cuadrícula de selección y en la vista de progreso del perfil muestran la insignia y nivel seleccionados (ej. Gran Maestro nivel 30).
- **Tipografía Radiance Oficial en Dígitos de Héroes**: Los números de nivel se renderizan en blanco nítido (#FFFFFF) con sombra suave, perfectamente centrados sobre la gema central de la insignia (`x=128, y=125`), idénticos al Dota Plus oficial y sin marcos toscos.
- **Acción Rápida para Resolver "Anulado por Prioridad"**: Se tradujo la advertencia al español y se añadió el botón y opción de menú «Dar máxima prioridad» («Загружать первым» / «Load first») para mover de inmediato un mod al primer lugar de carga.

## 1.0.12

### Aislamiento de Rango en Perfil Propio, Medallas Inmortal Oficiales, Dígitos Radiance en Insignias y Corrección de Packs

Esta versión aísla la modificación de rango al perfil exclusivo del jugador sin alterar las medallas de rivales ni la tabla de puntuación, restaura las texturas oficiales de Valve para Inmortal, añade dígitos Radiance centrados en las insignias de héroe y soluciona la pérdida de esquemas en packs combinados:

- **Aislamiento de Rango en Perfil Propio**: La modificación de rango ahora se aplica a la ranura específica del perfil (por defecto `rank0` / Sin calibrar) en lugar de reemplazar todos los rangos globalmente. Tu medalla personalizada se muestra únicamente en tu perfil y mini showcase sin alterar a los otros 9 jugadores de la partida ni el modal de medallas de Dota 2.
- **Medallas Inmortal Originales de Valve**: Se reemplazaron texturas no oficiales por las texturas genuinas en alta resolución de Valve, con espadas doradas auténticas, placa original y dígitos de clasificación nítidos con tipografía Radiance oficial.
- **Dígitos Radiance en Insignias de Héroe**: Los niveles de insignias de héroe (1–30) ahora muestran dígitos nítidos en blanco puro (#FFFFFF) con sombra paralela oscura, centrados vertical y horizontalmente mediante decodificación PNG nativa en Node.js y escalado bilineal, idénticos al Dota Plus original.
- **Corrección de Esquemas en Packs de Héroes**: Se solucionó el problema por el cual al combinar mods de héroes o empaquetarlos se perdían las definiciones de esquema en `items_game.txt`. Las arcanas, armas, animaciones y piezas cosméticas ahora se conservan íntegramente al ensamblar, desplegar o desarmar packs.
- **Mejoras en el Personalizador de Rangos**: Se eliminaron todos los bloqueos ficticios de VIP en la interfaz para medallas e insignias, y se añadió la opción de seleccionar el rango base para máximo control estético.

## 1.0.11

### Corrección de Error Fatal de Layout y Arquitectura de Mod Nativo

Esta versión soluciona el error fatal de layout al iniciar Dota 2 con medallas o insignias personalizadas, transformando el rank changer en un mod de texturas 100% nativo y libre de errores:

- **Error Fatal de Layout Solucionado**: Se eliminaron las modificaciones a hojas de estilo Panorama (`mini_showcase.vcss_c`, `dashboard_page_showcase.vcss_c`, etc.) que provocaban el error `FATAL ERROR: Unable to load layout file 'file://{resources}/layout/showcase/mini_showcase.xml'`.
- **Arquitectura de Mod Nativo de Texturas**: Las medallas de rango e insignias de Dota Plus ahora funcionan exclusivamente como reemplazos estéticos de texturas `.vtex_c`, con el mismo contexto y comportamiento que los demás mods cosméticos del gestor.
- **Reemplazo Universal de Medallas**: Sobrescribe limpiamente los casilleros de medallas oficiales (`rank0_psd` a `rank8c_psd`) y mini medallas en `panorama/images/rank_tier_icons/` con la medalla seleccionada (incluyendo los dígitos Radiance sobre la placa Inmortal) sin alterar archivos de diseño global del juego.
- **Estrellas e Insignias de Héroe**: Gestiona las estrellas de rango e insignias de nivel de héroe (Dota Plus) con total estabilidad y compatibilidad con el cliente de Dota 2.

## 1.0.10

### Inyección de Rango en Perfiles Sin Calibrar, Ranuras VPK de 2 Dígitos y Efectos Inmortal EliteFX

Esta versión soluciona la visualización de medallas de rango en cuentas sin calibrar, garantiza ranuras pak de dos dígitos compatibles con el motor de Dota 2 y activa las partículas EliteFX para Inmortal Top 10:

- **Soporte para Cuentas Sin Calibrar (`RankTier0`)**: Se agregaron reglas de estilo exhaustivas en `ui_rank_badge.vcss_c`, `mini_showcase.vcss_c`, `dashboard_page_showcase.vcss_c` y `dashboard_page_profile.vcss_c` con `!important` para `.ViewingSelf` y `DOTAMiniShowcase:not(.ViewingOther)`. Las cuentas sin rango (`RankTier0`) ahora muestran con total fidelidad la medalla personalizada tanto en el encabezado del perfil como en el mini perfil del menú superior sin alterar rivales ni el modal de medallas.
- **Asignación Prioritaria de Ranuras VPK (2 Dígitos)**: Se descubrió que el motor Source 2 (`filesystem_stdio.dll`) comprueba estrictamente nombres de 13 caracteres (`pakNN_dir.vpk`) y lee únicamente dos dígitos (`pak01` a `pak99`). Los archivos `pak100+` son descartados silenciosamente por el juego. Se añadió `ranks` a `PRIORITY_CATEGORIES` para asignarle siempre una ranura prioritaria (`pak02` a `pak09`) que Dota 2 carga al iniciar.
- **Partículas EliteFX de Inmortal**: Se activó `#EliteFX` para las medallas Inmortal Top 10 en el perfil del jugador y en el mini showcase, mostrando el aura dorada y luminosa original.

## 1.0.9

### Tipografía Radiance Original, Aislamiento Total de Ventana de Rangos, Insignias en Vitrina y Fix de Bandeja

Esta versión incorpora la tipografía oficial Valve Radiance para las placas de Inmortal, aísla por completo las medallas del modal de rangos y perfiles ajenos, activa las insignias en las cartas de héroes de la vitrina, traduce los rangos de héroe al español y corrige la minimización a la bandeja de Windows:

- **Tipografía Oficial Valve Radiance**: Se extrajo la fuente auténtica `radiancem_bold.otf` de los archivos de Dota 2 y se generaron glifos antialiased (0–9) para números de 1, 2, 3 y 4 dígitos. Se dibujan con color marfil cálido (`#F4EBD8`), degradado vertical y sombra oscura (`#100C08`), centrados en la placa de bronce sin ningún símbolo `#`.
- **Aislamiento de Modal de Rangos y Jugadores**: Selectores CSS acotados estrictamente a `.ViewingSelf #ProfileContainer #Header .RankBadge #RankTier` y `.ViewingSelf #HeaderNameContainer .RankBadge #RankTier`. Se solucionó el problema donde abrir el menú de «Medallas de rango» sustituía todas las 15 medallas por la textura Inmortal. Los rivales, aliados, marcadores y el modal del juego mantienen sus medallas intactas.
- **Insignias de Héroe en Vitrina**: Añadido el parche `showcase_item.vcss_c` para mostrar `#HeroBadge.NoTier` en las cartas de héroes del perfil con `.ViewingSelf`.
- **Niveles de Héroe en Español y Subetiquetas Claras**: Traducidos los nombres de progresión al español (`Bronce`, `Plata`, `Oro`, `Platino`, `Maestro`, `Gran Maestro`) y sustituidas las etiquetas en inglés bajo cada medalla por su valor en MMR.
- **Minimización a la Bandeja de Windows y Barra de Tareas**: Implementada la carga con `nativeImage.createFromBuffer` para el icono en `app.asar`, asignado el icono a `BrowserWindow` y añadida protección para evitar que la ventana desaparezca sin un icono de bandeja activo.
- **Sitio Web Oficial**: Actualizado el personalizador interactivo del sitio web con medallas originales de Dota 2, tipografía de placa auténtica, insignias de héroe centradas y enlaces a v1.0.9.

## 1.0.8

### Aislamiento Estricto de Rango al Perfil, Dígitos de Placa sin Almohadilla, Insignias de Progreso de Héroe, Corrección de Bandeja del Sistema y Traducción de Presets

Esta versión implementa el aislamiento completo del mod de rango en el perfil personal, limpia el número de clasificación Inmortal retirando el símbolo `#`, actualiza las insignias de progreso de héroe en la vista de equipamiento, corrige el icono de la bandeja de notificaciones en Windows y traduce por completo los Presets al español:

- **Aislamiento Estricto de Rango en Perfil Propio**: Se aplicaron reglas de estilo exclusivas para `.ViewingSelf #HeaderNameContainer` en `dashboard_page_showcase.vcss_c` y `DOTAMiniShowcase:not(.ViewingOther)` en `mini_showcase.vcss_c`. La personalización ya no se filtra a otros jugadores en partidas, marcadores ni en la pestaña Ver, conservando todos los rivales y aliados sus medallas y rangos originales.
- **Dígito de Placa Inmortal Limpio sin `#`**: Se ocultó la capa superpuesta `#RankLeaderboard` en el perfil local, mostrando exclusivamente el número metálico centrado en la placa dorada sin el prefijo `#` (ej. `20` en lugar de `#20`).
- **Insignias de Progreso de Héroes**: Actualizadas las definiciones de estilos y texturas en `hero_badge.vcss_c`, `ui_dota_plus_hero_page_v2.vcss_c` y clases `.PlusHeroBadgeIcon`. El icono de nivel seleccionado (ej. Gran Maestro Lv 30) ahora se muestra en el bloque «Progreso de nivel» y encabezado del héroe.
- **Icono en la Bandeja del Sistema de Windows**: Añadida la ruta `renderer/assets/icon.ico` para empaquetado, asegurando que el icono de Mod Assistant aparezca correctamente en la bandeja de notificación de Windows al minimizar la aplicación.
- **Traducción Total de Presets al Español**: Traducida toda la interfaz de la pestaña Presets, incluidos diálogos de guardado, exportación de archivos `.d2mm` y contadores en español.

## 1.0.6

### Ampliación de Ranuras a más de 90 Mods, Cola de Instalación en Español y Sincronización del Sitio Web

Esta versión amplía la capacidad de instalación de mods más allá del límite de 90, traduce la cola de instalación al español y sincroniza el repositorio oficial del sitio web:

- **Instalación Más Allá de 90 Mods**: Resuelto el error `"No free pakNN slots left"`. El instalador utiliza ranuras prioritarias libres (`pak02` a `pak09`) y se extiende dinámicamente hasta `pak250_dir.vpk`.
- **Cola de Instalación en Español**: Traducidos todos los paneles, botones y resúmenes de instalación por lotes al español.
- **Repositorio Oficial del Sitio Web**: Sincronizado el sitio interactivo con `https://github.com/Dreftian/Dota2-Mods-Website`.

## 1.0.5

### Aislamiento de Perfil, Centrado de Dígitos de Placa, 100 Mods en Free, Bandeja de Sistema y Sitio Web Oficial

Esta versión introduce el aislamiento local de modificaciones de rango, centrado de dígitos en la placa Inmortal sin el símbolo `#`, capacidad de 100 mods para cuentas Free con traducción total al español, opciones de bandeja de sistema en Windows y el nuevo sitio web oficial interactivo:

- **Aislamiento de Perfil Local**: Las modificaciones de medallas e insignias de héroe ahora se aíslan exclusivamente a tu propia tarjeta de perfil y cuadrícula de selección de héroes mediante parches de Panorama CSS (`#ProfileContainer #RankTier`, `hero_grid_new.vcss_c`, `hero_badge.vcss_c`). Los aliados y oponentes en partidas, marcadores y barra superior conservan intactas sus medallas y niveles reales originales.
- **Centrado de Dígitos de Placa Inmortal y Formato Limpio**: Eliminado el prefijo `#` del número de clasificación Inmortal (ej. `30` en lugar de `#30`), centrado con precisión milimétrica horizontal y verticalmente con degradados metálicos dorados nítidos estilo Dota 2.
- **Capacidad de 100 Mods en Free y Espacio Ilimitado en VIP**: El plan Free ahora admite hasta 100 mods simultáneos con avisos inteligentes para combinar paquetes, mientras que los usuarios VIP disfrutan de espacio de mods ilimitado sin restricciones.
- **Traducción Total al Español**: Todos los avisos de ranuras, advertencias de límite, botones de combinación y ajustes del sistema están traducidos al español.
- **Ajustes de Sistema en Windows**: Nuevas opciones en Configuración para iniciar Mod Assistant automáticamente con Windows (`autoStart`) y minimizar en la bandeja del sistema al hacer clic en cerrar (`minimizeToTray`).
- **Sitio Web Oficial Interactivo (`Website/`)**: Creado el sitio web oficial en la carpeta `Website/`, con diseño moderno oscuro temático de Dota 2, personalizador interactivo de rangos e insignias en vivo, comparativa de planes y descarga directa oficial de Dreftian Devs.

## 1.0.4

### Dígitos de Rango Inmortal en Juego, Nivel 30 de Héroes, Nuevos Niveles Free/VIP y Perfiles InsForge

Esta versión soluciona de forma definitiva la visualización de dígitos en las medallas y niveles de héroes dentro del juego, actualiza los planes Free y VIP, restringe enlaces de GitHub al administrador y amplía el registro de InsForge:

- **Dígito de Clasificación Inmortal en Juego (#30)**: Renderizado y estampado dinámico del número de ranking (ej. `#30`) directamente sobre la placa dorada de las texturas de la medalla Inmortal (`rank8_psd.vtex_c` y miniaturas), garantizando su visibilidad en el perfil, barra de grupo, marcador y pantalla de carga sin depender de variables de servidor de Valve.
- **Inyección de Nivel 30 en Insignias de Héroe**: Inyección de texturas y estilos en `ui_rank_badge.vcss_c`, `hero_grid_new.vcss_c` y `hero_badge.vcss_c`, sustituyendo de forma local los niveles reales de tus héroes por el nivel seleccionado (ej. Nivel 30 Gran Maestro) en la cuadrícula de selección y perfiles.
- **Alineación de Niveles Free y VIP**:
  - Medallas: Modo Gratuito desde «Sin calibrar» hasta «Divino» (`rank0` a `rank7`). Estado VIP para «Inmortal» y Top clasificatorio (`rank8` a `rank8c`).
  - Insignias de Héroe: Modo Gratuito desde «Bronze» hasta «Platinum» (`tier0` a `tier3`). Estado VIP para «Master» y «Grandmaster» (`tier4` y `tier5`).
- **Enlaces de GitHub Exclusivos para Administrador**: Todos los enlaces hacia el código fuente y GitHub están completamente ocultos para usuarios estándar, siendo visibles únicamente para la cuenta de administrador (`dreftian@gmail.com`).
- **Perfiles Extendidos y Registro InsForge**: Nuevo formulario de registro con datos personales completos (nombre completo, edad, fecha de nacimiento, dirección de residencia, país y código postal), visualización de fecha de expiración de suscripción y registro seguro de tarjeta y métodos de pago.

## 1.0.3

### Solución Definitiva al Error de VAC y Mods Activos Solo con la App Abierta

Esta versión garantiza la total compatibilidad y seguridad frente al sistema antitrampas de Valve (VAC) e introduce el ciclo de vida seguro de mods:

- **Mods Activos Solo con la App Abierta**: Los mods únicamente funcionan mientras Mod Assistant permanezca abierto en tu equipo. Al cerrar la aplicación (por la X o salir), todos los mods se desactivan automáticamente (`.moff`), dejando Dota 2 en su estado 100% original (vanilla).
- **Reactivación Automática al Abrir**: Al iniciar Mod Assistant, todos tus mods instalados se reactivan de inmediato para que puedas jugar con ellos con la app abierta.
- **Protección Total contra Errores de VAC**: Restauración automática y validación de archivos originales del juego (`gameinfo.gi`, `gameinfo_branchspecific.gi`, `dota.signatures`) con firmas oficiales de Valve, eliminando de raíz el mensaje de error de VAC y limpiando rastros o enlaces de otras herramientas externas.
- **Modo Seguro Activo por Defecto**: Cero modificaciones a los ejecutables o firmas de Valve, operando mediante montajes nativos de carpetas de idioma.

## 1.0.2

### Actualizaciones de GitHub, Dígitos de Rango Inmortal y Catálogo de Locutores

Esta versión optimiza la experiencia de usuario y añade control total sobre las medallas y niveles:

- **Actualizaciones automáticas de GitHub**: La aplicación ahora detecta y descarga actualizaciones directamente desde el repositorio oficial `Dreftian/Dota2-Mods`.
- **Sesión persistente**: Tu inicio de sesión se mantiene guardado en tu equipo. La app no volverá a pedir inicio de sesión en cada apertura a menos que cierres sesión manualmente.
- **Ventana de Novedades en Español**: Ventana de novedades y botones completamente traducidos al español («Novedades», «Entendido»).
- **Dígito de Rango Inmortal Personalizado**: Si seleccionas medalla Inmortal, ahora puedes elegir y escribir el número de clasificación exacto (Top 1, 10, 100, 1000 o el que desees) para lucirlo en tu medalla dentro del juego.
- **Nivel de Insignia de Héroe (Dota Plus)**: Ahora puedes seleccionar el dígito del nivel de héroe (ej. Nivel 30 Gran Maestro o de 1 a 99), visualizándose tanto en la vista previa como en el mod VPK para que todos tus héroes muestren el nivel deseado.
- **Catálogo de Locutores Ampliado**: Gran colección de packs de locutores y mega-kills disponibles para instalar con un solo clic (Gabe Newell, Rick & Morty, Snoop Dogg, GLaDOS, Darkest Dungeon, Stanley Parable y más).

## 1.0.1

### Medallas de Rango Originales de Dota 2, MMR y Personalizador de Niveles de Héroe

El personalizador de rangos ahora incluye recursos gráficos originales en alta definición extraídos directamente de Dota 2:

- Corrección total del error `library.all is not a function` durante la instalación y restablecimiento de rangos.
- Texturas oficiales de medallas de rango de Dota 2 y estrellas doradas (desde Heraldo hasta Inmortal Top 10).
- Insignias oficiales de progresión de niveles de héroe de Dota Plus (desde Bronce hasta Gran Maestro Nivel 30).
- Distintivos visuales de clasificación (FREE, PREMIUM, VIP) al estilo de Dota2Changer.
- Textos y etiquetas de interfaz localizados en español e inglés para medallas, estrellas y atributos de rango.
- Generación de VPK nativa en memoria con despliegue atómico FileTx, eliminando cualquier error de descarga externa.

## 1.0.0

### Bienvenido a Mod Assistant

Mod Assistant ofrece una suite completa de gestión de mods cosméticos para Dota 2 con soporte multi-idioma nativo, autenticación integrada InsForge e instalación instantánea.

- Nueva interfaz de usuario de Mod Assistant con la identidad visual de Dota 2.
- Soporte para español latinoamericano, inglés nativo, ruso, japonés y chino simplificado.
- Autenticación integrada InsForge con control de acceso por roles (Usuario y Administrador).
- Pasarela de pago multicanal con soporte para Stripe y métodos locales.
- Catálogo ampliado con mods exclusivos de la comunidad Dota2Changer.
