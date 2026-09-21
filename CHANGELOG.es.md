# Historial de Cambios

Novedades de cada versión. La aplicación se actualiza de forma automática para que disfrutes de todas las mejoras sin necesidad de reinstalar.

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
