# Historial de Cambios

Novedades de cada versión. La aplicación se actualiza de forma automática para que disfrutes de todas las mejoras sin necesidad de reinstalar.

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
