// Minimal i18n for the main process (main.js, installer.js, vpk.js).
// Russian is the source language; English strings are keyed by the exact Russian text
// (with {0},{1}... placeholders for interpolated values). A missing key falls back to
// the Russian source, so the app never shows an empty/undefined string.

let currentLang = 'en';

function setLang(lang) {
  currentLang = (lang === 'ru' || lang === 'es') ? lang : 'en';
}

function getLang() {
  return currentLang;
}

// English dictionary. Key = canonical Russian string with {n} placeholders.
const EN = {
  // ---- errors / dialogs (main.js) ----
  'Выбери папку game внутри dota 2 beta': 'Pick the "game" folder inside "dota 2 beta"',
  'В этой папке не найдена Dota 2 (нет подпапки dota)': 'No Dota 2 here (there is no "dota" subfolder)',
  'Уже установлено': 'Already installed',
  'Мод не найден': 'Mod not found',
  'Сохранить мод одним .vpk файлом': 'Save the mod as a single .vpk file',
  'Куда распаковать мод': 'Where to unpack the mod',
  'VPK мод': 'VPK mod',
  'Сохранить курсор архивом': 'Save the cursor set as an archive',
  'Архив курсора': 'Cursor archive',
  'Выбери .vpk файлы модов или .zip с ними': 'Pick mod .vpk files, or a .zip holding them',
  'Моды (.vpk, .zip)': 'Mods (.vpk, .zip)',
  'Выбери папку с модами': 'Pick a folder with mods',
  // the two counted passes of an import, shown on the progress bar
  'Копирование модов': 'Copying mods',
  'Разбор модов': 'Reading mods',
  'Нет _dir.vpk для разбора': 'No _dir.vpk to split',
  'В файле меньше двух героев — разбирать нечего': 'Fewer than two heroes in the file — nothing to split',
  'Совпадение с каталогом не найдено': 'No catalog match found',
  'Файл не найден в папке модов': 'That file is not in the mods folder',
  'Мод': 'Mod',
  'У мода нет слота pakNN': 'This mod has no pakNN slot',
  'Папка курсора не найдена': 'Cursor folder not found',
  'Файлы курсора не сохранены — переустанови мод': 'This cursor’s files were not kept — reinstall the mod',
  'Выбери минимум 2 мода (или пак и мод / два пака)': 'Pick at least 2 mods (or a pack and a mod / two packs)',
  'Пак ({0})': 'Pack ({0})',
  'Пак не найден': 'Pack not found',
  'Нет совместимых модов для добавления': 'No compatible mods to add',
  'Мод в паке не найден': 'Mod not found in the pack',
  'Пресет не найден': 'Preset not found',
  'Сохранить пресет для друга': 'Save the preset to share',
  'Пресет Mod Manager': 'Mod Manager preset',
  'Выбери файл пресета (.d2mm)': 'Pick a preset file (.d2mm)',
  'сборка пресета': 'building preset',
  'В пресете нет модов': 'The preset has no mods',
  'Введи название пресета': 'Enter a preset name',
  'В пресете только свои моды — ссылка их не донесёт, отправь файлом':
    'The preset holds only your own mods — a link cannot carry them, send the file',
  'нет в каталоге': 'not in the catalog',
  'нет в каталоге и нечего вложить': 'not in the catalog and there is nothing to embed',
  'файл участника пака не найден': 'the pack member file is missing',
  'отправитель не вложил файл': 'the sender left the file out',
  'файл пресета недоступен': 'the preset file is gone',
  'нет в файле': 'not in the file',
  'В пресете есть свои моды — ссылкой не поделиться, только файлом':
    'This preset has mods of your own — share it as a file, a link cannot carry them',

  // ---- preset-link.js ----
  'Это не похоже на ссылку на пресет': 'That does not look like a preset link',
  'Ссылка слишком длинная': 'The link is too long',
  'Ссылка повреждена': 'The link is damaged',

  // ---- discord-auth.js ----
  'Вход через Discord пока не настроен в этой сборке': 'Discord sign-in is not configured in this build yet',
  'Ответ Discord не совпал с запросом': "Discord's answer did not match the request",
  'Discord не выдал токен': 'Discord returned no token',
  'Вход занял слишком много времени': 'Sign-in took too long',
  'Порт {0} занят — закрой другой вход и попробуй снова': 'Port {0} is busy — close the other sign-in and try again',
  'Discord не отдал профиль (HTTP {0})': 'Discord did not return the profile (HTTP {0})',
  'exe не найден в папке инструмента': 'No .exe found in the tool folder',
  'Инструмент не найден': 'Tool not found',
  'Это не портативная сборка': 'This is not a portable build',
  'Обновления нет': 'There is no update',
  'Файл не найден': 'File not found',
  'По сохранённому пути нет файлов Dota 2 — укажи папку игры заново в настройках': 'The saved path holds no Dota 2 files — set the game folder again in Settings',
  'В этой папке нет файлов Dota 2 — нужна папка game внутри dota 2 beta': 'No Dota 2 files in this folder — pick the game folder inside dota 2 beta',
  'Сохранить отчёт для поддержки': 'Save the support report',
  'Отчёт диагностики': 'Diagnostics report',

  // ---- installer.js ----
  'Путь к Dota 2 не задан': 'Dota 2 path is not set',
  // ---- item schema / search-path patch ----
  'Закрой Dota 2 перед изменением файлов игры': 'Close Dota 2 before changing game files',
  'Не найден {0}': '{0} not found',
  'items_game.txt не найден в pak01 игры': 'items_game.txt is not in the game\'s pak01',
  'items_game: незакрытая кавычка': 'items_game: unterminated quote',
  'items_game: не найдено открытие блока': 'items_game: no opening brace',
  'items_game: незакрытый блок': 'items_game: unterminated block',
  'items_game: лишняя закрывающая скобка': 'items_game: stray closing brace',
  'items_game: секция items не найдена': 'items_game: no "items" section',
  'items_game: предмет {0} не найден': 'items_game: item {0} not found',
  'items_game: у предмета {0} нет блока visuals': 'items_game: item {0} has no visuals block',
  'items_game: подозрительно мало предметов ({0})': 'items_game: suspiciously few items ({0})',
  'items_game: предметов меньше, чем в игре ({0} < {1})': 'items_game: fewer items than the game has ({0} < {1})',
  'gameinfo.gi: блок SearchPaths не найден': 'gameinfo.gi: no SearchPaths block',
  'gameinfo.gi: блок SearchPaths не закрыт': 'gameinfo.gi: SearchPaths block is not closed',
  'gameinfo.gi: не найдены строки Game/Mod dota': 'gameinfo.gi: no "Game dota" / "Mod dota" lines',
  'gameinfo_branchspecific.gi: блок FileSystem не найден': 'gameinfo_branchspecific.gi: no FileSystem block',
  'gameinfo_branchspecific.gi: блок FileSystem не закрыт': 'gameinfo_branchspecific.gi: FileSystem block is not closed',
  'Сначала закрой Dota 2 — она держит файлы озвучки открытыми':
    'Close Dota 2 first: it holds the voice files open',
  'HTTP {0} — не удалось скачать {1}': 'HTTP {0} — could not download {1}',
  'Не удалось скачать {0}: {1}': 'Could not download {0}: {1}',
  '{0}: скачанный файл не совпадает с тем, что опубликовал автор мода. Попробуй позже': '{0}: what downloaded is not what the mod\'s author published. Try again later',
  'Эта возможность временно отключена': 'This is switched off for now',
  'перекачиваю повреждённый файл': 'the cached file was damaged, downloading again',
  'установка': 'installing',
  '{0}: в архиве не найдено assets/custom': '{0}: no assets/custom found in the archive',
  '{0}: в архиве не найдена папка cursor': '{0}: no cursor folder found in the archive',
  'Неизвестный root: {0}': 'Unknown root: {0}',
  'У этого мода нет _dir.vpk — объединять нечего': 'This mod has no _dir.vpk — nothing to merge',
  'У этого мода нет _dir.vpk — распаковывать нечего': 'This mod has no _dir.vpk — nothing to unpack',
  'не .vpk файл': 'not a .vpk file',
  'нет {0}_dir.vpk рядом с data-частями': 'no {0}_dir.vpk next to the data parts',
  'в папке нет ни .vpk, ни файлов игры': 'this folder holds neither a .vpk nor any game files',
  'Папка слишком большая, чтобы собрать её в один VPK': 'This folder is too big to pack into one VPK',
  'В папке нет файлов': 'There are no files in this folder',
  'в архиве нет .vpk файлов': 'no .vpk files in this archive',
  'Курсор': 'Cursor',

  'Пустой VPK': 'Empty VPK',
  'Не удалось сформировать VPK рангов: отсутствуют файлы ресурсов': 'Could not build rank VPK: resource files are missing',

  // ---- safe-zip.js (a foreign archive turned down) ----
  'архив': 'archive',
  '{0}: архив слишком большой': '{0}: the archive is too large',
  '{0}: архив повреждён или не докачан': '{0}: the archive is damaged or did not finish downloading',
  '{0}: файл {1} в архиве повреждён': '{0}: {1} inside the archive is damaged',
  '{0}: в архиве слишком много файлов': '{0}: too many files in the archive',
  '{0}: файл в архиве слишком большой': '{0}: a file inside the archive is too large',
  '{0}: архив распакуется в слишком большой объём': '{0}: the archive would unpack to too much data',
  '{0}: архив сжат подозрительно плотно': '{0}: the archive is compressed suspiciously tight',
  'Недопустимый путь в архиве: {0}': 'Bad path inside the archive: {0}',

  // ---- preset-share.js (.d2mm validation) ----
  'preset.json повреждён': 'preset.json is damaged',
  'Это не файл пресета Mod Manager': 'This is not a Mod Manager preset file',
  'Файл собран более новой версией приложения': 'The file was made by a newer version of the app',
  'Слишком много модов в пресете': 'Too many mods in the preset',
  'Файл не открывается как пресет': 'The file cannot be opened as a preset',
  'Недопустимое имя файла в архиве': 'Bad file name inside the archive',
  'файла нет в архиве': 'the file is not in the archive',
  'Пресет': 'Preset',

  // ---- discord-presence.js (status text friends see) ----
  'Смотрит каталог модов': 'Browsing the mod catalog',
  'В своей библиотеке': 'In their mod library',
  'Собирает пресет': 'Putting a preset together',
  'В инструментах': 'In the tools',
  'Читает гайды': 'Reading the guides',
  'В настройках': 'In the settings',
  '{0} модов включено': '{0} mods enabled',
  'Ещё без модов': 'No mods yet',
  'Моды выключены': 'Mods turned off',
  'Скачать Mod Assistant': 'Get Mod Assistant',

  // ---- vpk.js (parse errors + content labels) ----
  'VPK: незакрытая строка в дереве': 'VPK: unterminated string in the tree',
  'VPK: неверная сигнатура': 'VPK: bad signature',
  'VPK: повреждённое дерево': 'VPK: damaged tree',
  // slot labels
  'голова': 'head', 'оружие': 'weapon', 'оружие (2)': 'weapon (2)', 'щит': 'shield', 'броня': 'armor',
  'плечи': 'shoulders', 'пояс': 'belt', 'руки': 'arms', 'спина': 'back', 'крылья': 'wings', 'хвост': 'tail',
  'ноги': 'legs', 'ездовое': 'mount', 'эффекты': 'effects', 'разное': 'misc', 'модель': 'model',
  'перекраска': 'recolor',
  // kind labels (short)
  'варды': 'wards', 'курьер': 'courier', 'интерфейс': 'UI', 'звуки': 'sounds', 'террейн': 'terrain',
  // kind names (title-case)
  'Варды': 'Wards', 'Курьер': 'Courier', 'Интерфейс меню': 'Menu UI', 'Звуки': 'Sounds', 'Ландшафт': 'Terrain',
  'Сборка · {0} героев': 'Bundle · {0} heroes',
  'Открыть Mod Assistant': 'Open Mod Assistant',
  'Выход': 'Exit',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'Арсенал доступен только VIP': 'The Arsenal is for VIP members only',
  'Сначала выключи безопасный режим: без него игра не читает косметику': 'Turn safe mode off first: while it is on, the game does not read cosmetics',
  'Героя {0} нет в таблице предметов игры': 'Hero {0} is not in the game\'s item table',
  'У героя {0} нет слота {1}': '{0} has no {1} slot',
  'Предмет {0} не надевается на {1} в слот {2}': '{0} does not go on {1} in the {2} slot',
  'У предмета {0} нет стиля {1}': '{0} has no style {1}',
  'Набор {0} не найден у героя {1}': 'Set {0} was not found for {1}',
  'В наборе {0} нет ничего, что можно надеть на этого героя': 'Nothing in {0} can be put on this hero',
  'items_game: {0} не является предметом героя по умолчанию': 'items_game: {0} is not a hero\'s default item',
  'Таблицу предметов собрать не удалось, выбор отменён: {0}': 'The item table could not be rebuilt, so the choice was undone: {0}',
  'Мод переключён, но таблицу предметов собрать не удалось ({0}). Приложение попробует снова перед следующим запуском игры': 'The mod was switched, but the item table could not be rebuilt ({0}). The app will try again before the game next starts',
  'Мод удалён, но таблицу предметов собрать не удалось ({0}). Приложение попробует снова перед следующим запуском игры': 'The mod was removed, but the item table could not be rebuilt ({0}). The app will try again before the game next starts',
  'Таблицу предметов собрать не удалось ({0}). Приложение попробует снова перед следующим запуском игры': 'The item table could not be rebuilt ({0}). The app will try again before the game next starts',
  'Введи почту и пароль': 'Enter your email and password',
  'Аккаунт не найден': 'Account not found',
  'Неверный пароль': 'Wrong password',
  'Введи настоящий адрес почты': 'Enter a valid email address',
  'Пароль должен быть не короче 6 символов': 'The password needs at least 6 characters',
  'Аккаунт с этой почтой уже есть': 'An account with this email already exists',
  'Сначала войди в аккаунт': 'Sign in first',
  'Текущий пароль не подходит': 'The current password is wrong',
  'Новый пароль совпадает с текущим': 'The new password is the same as the current one',
  'Не удалось прочитать аккаунты: {0}': 'Could not read the accounts: {0}',
  'Не удалось сохранить аккаунты: {0}': 'Could not save the accounts: {0}',
  'Не удалось запомнить вход: {0}': 'Could not remember the sign-in: {0}',
  'Файл аккаунтов повреждён, а отложить его не вышло, поэтому он не перезаписывается: {0}': 'The accounts file is damaged and could not be set aside, so it is left untouched: {0}',
  'Свободных слотов pakNN не осталось (02-99 заняты)': 'No free pakNN slots left (02-99 are taken)',
  'Моды не переключены: файл {0} занят — закрой Dota 2 и попробуй снова': 'Mods were not switched: {0} is in use — close Dota 2 and try again',
  'Моды не переключены: {0}': 'Mods were not switched: {0}',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'Выбор не удалось сохранить: {0}': 'The choice could not be saved: {0}',
};

// Spanish, keyed by the Russian source string like EN and in EN's order. It used to be keyed by
// the English, and an entry went dead whenever the English was reworded: 'Mod not found in pack'
// sat here waiting for an English that had become 'Mod not found in the pack'.
// tools/check-i18n.js fails when an EN key has no ES twin.
const ES = {
  // ---- errors / dialogs (main.js) ----
  'Выбери папку game внутри dota 2 beta': 'Elige la carpeta "game" dentro de "dota 2 beta"',
  'В этой папке не найдена Dota 2 (нет подпапки dota)': 'No se encontró Dota 2 aquí (no existe la subcarpeta "dota")',
  'Уже установлено': 'Ya está instalado', 'Мод не найден': 'Mod no encontrado',
  'Сохранить мод одним .vpk файлом': 'Guardar el mod como un único archivo .vpk',
  'Куда распаковать мод': 'Dónde descomprimir el mod',
  'VPK мод': 'Mod VPK',
  'Сохранить курсор архивом': 'Guardar el cursor como archivo comprimido',
  'Архив курсора': 'Archivo de cursor',
  'Выбери .vpk файлы модов или .zip с ними': 'Elige archivos .vpk de mods o un .zip con ellos',
  'Моды (.vpk, .zip)': 'Mods (.vpk, .zip)',
  'Выбери папку с модами': 'Elige una carpeta con mods',
  'Копирование модов': 'Copiando mods', 'Разбор модов': 'Leyendo mods',
  'Нет _dir.vpk для разбора': 'No hay _dir.vpk para separar',
  'В файле меньше двух героев — разбирать нечего': 'Menos de dos héroes en el archivo — nada que separar',
  'Совпадение с каталогом не найдено': 'No se encontró coincidencia con el catálogo',
  'Файл не найден в папке модов': 'Ese archivo no está en la carpeta de mods',
  'Мод': 'Mod',
  'У мода нет слота pakNN': 'Este mod no tiene espacio pakNN asignado',
  'Папка курсора не найдена': 'Carpeta de cursor no encontrada',
  'Файлы курсора не сохранены — переустанови мод': 'Los archivos de este cursor no se guardaron — reinstala el mod',
  'Выбери минимум 2 мода (или пак и мод / два пака)': 'Elige al menos 2 mods (o un pack y un mod / dos packs)',
  'Пак ({0})': 'Pack ({0})', 'Пак не найден': 'Pack no encontrado',
  'Нет совместимых модов для добавления': 'No hay mods compatibles para añadir',
  'Мод в паке не найден': 'Mod no encontrado en el pack',
  'Пресет не найден': 'Preset no encontrado',
  'Сохранить пресет для друга': 'Guardar el preset para compartirlo',
  'Пресет Mod Manager': 'Preset de Mod Manager',
  'Выбери файл пресета (.d2mm)': 'Elige un archivo de preset (.d2mm)',
  'сборка пресета': 'armando el preset',
  'В пресете нет модов': 'El preset no contiene mods',
  'Введи название пресета': 'Escribe un nombre para el preset',
  'В пресете только свои моды — ссылка их не донесёт, отправь файлом': 'El preset contiene solo mods propios — un enlace no puede llevarlos, envía el archivo',
  'нет в каталоге': 'no está en el catálogo',
  'нет в каталоге и нечего вложить': 'no está en el catálogo y no hay nada que incluir',
  'файл участника пака не найден': 'falta el archivo de un mod del pack',
  'отправитель не вложил файл': 'quien lo envió no incluyó el archivo',
  'файл пресета недоступен': 'el archivo del preset ya no está',
  'нет в файле': 'no está en el archivo',
  'В пресете есть свои моды — ссылкой не поделиться, только файлом': 'Este preset tiene mods propios — compártelo como archivo, un enlace no puede llevarlos',

  // ---- preset-link.js ----
  'Это не похоже на ссылку на пресет': 'Eso no parece un enlace de preset',
  'Ссылка слишком длинная': 'El enlace es demasiado largo',
  'Ссылка повреждена': 'El enlace está dañado',

  // ---- discord-auth.js ----
  'Вход через Discord пока не настроен в этой сборке': 'El inicio de sesión con Discord aún no está configurado en esta versión',
  'Ответ Discord не совпал с запросом': 'La respuesta de Discord no coincide con la solicitud',
  'Discord не выдал токен': 'Discord no devolvió ningún token',
  'Вход занял слишком много времени': 'El inicio de sesión tardó demasiado',
  'Порт {0} занят — закрой другой вход и попробуй снова': 'El puerto {0} está ocupado — cierra el otro inicio de sesión e inténtalo de nuevo',
  'Discord не отдал профиль (HTTP {0})': 'Discord no devolvió el perfil (HTTP {0})',
  'exe не найден в папке инструмента': 'No se encontró ningún .exe en la carpeta de la herramienta',
  'Инструмент не найден': 'Herramienta no encontrada',
  'Это не портативная сборка': 'Esta no es una versión portátil',
  'Обновления нет': 'No hay ninguna actualización',
  'Файл не найден': 'Archivo no encontrado',
  'По сохранённому пути нет файлов Dota 2 — укажи папку игры заново в настройках': 'En la ruta guardada no hay archivos de Dota 2 — vuelve a indicar la carpeta del juego en Configuración',
  'В этой папке нет файлов Dota 2 — нужна папка game внутри dota 2 beta': 'En esta carpeta no hay archivos de Dota 2 — elige la carpeta game dentro de dota 2 beta',
  'Сохранить отчёт для поддержки': 'Guardar el informe para soporte',
  'Отчёт диагностики': 'Informe de diagnóstico',

  // ---- installer.js ----
  'Путь к Dota 2 не задан': 'La ruta de Dota 2 no está configurada',

  // ---- item schema / search-path patch ----
  'Закрой Dota 2 перед изменением файлов игры': 'Cierra Dota 2 antes de modificar los archivos del juego',
  'Не найден {0}': 'No se encontró {0}',
  'items_game.txt не найден в pak01 игры': 'items_game.txt no está en el pak01 del juego',
  'items_game: незакрытая кавычка': 'items_game: comilla sin cerrar',
  'items_game: не найдено открытие блока': 'items_game: falta la llave de apertura',
  'items_game: незакрытый блок': 'items_game: bloque sin cerrar',
  'items_game: лишняя закрывающая скобка': 'items_game: llave de cierre de más',
  'items_game: секция items не найдена': 'items_game: falta la sección "items"',
  'items_game: предмет {0} не найден': 'items_game: no se encontró el objeto {0}',
  'items_game: у предмета {0} нет блока visuals': 'items_game: el objeto {0} no tiene bloque visuals',
  'items_game: подозрительно мало предметов ({0})': 'items_game: sospechosamente pocos objetos ({0})',
  'items_game: предметов меньше, чем в игре ({0} < {1})': 'items_game: menos objetos de los que tiene el juego ({0} < {1})',
  'gameinfo.gi: блок SearchPaths не найден': 'gameinfo.gi: falta el bloque SearchPaths',
  'gameinfo.gi: блок SearchPaths не закрыт': 'gameinfo.gi: el bloque SearchPaths no está cerrado',
  'gameinfo.gi: не найдены строки Game/Mod dota': 'gameinfo.gi: faltan las líneas "Game dota" / "Mod dota"',
  'gameinfo_branchspecific.gi: блок FileSystem не найден': 'gameinfo_branchspecific.gi: falta el bloque FileSystem',
  'gameinfo_branchspecific.gi: блок FileSystem не закрыт': 'gameinfo_branchspecific.gi: el bloque FileSystem no está cerrado',
  'Сначала закрой Dota 2 — она держит файлы озвучки открытыми': 'Cierra Dota 2 primero: mantiene abiertos los archivos de voz',
  'HTTP {0} — не удалось скачать {1}': 'HTTP {0} — no se pudo descargar {1}',
  'Не удалось скачать {0}: {1}': 'No se pudo descargar {0}: {1}',
  '{0}: скачанный файл не совпадает с тем, что опубликовал автор мода. Попробуй позже': '{0}: lo descargado no es lo que publicó el autor del mod. Inténtalo más tarde',
  'Эта возможность временно отключена': 'Esta función está desactivada por ahora',
  'перекачиваю повреждённый файл': 'el archivo en caché estaba dañado, descargándolo de nuevo',
  'Свободных слотов pakNN не осталось (10-99 заняты)': 'No quedan espacios pakNN libres (02-99 están ocupados)',
  'установка': 'instalando',
  '{0}: в архиве не найдено assets/custom': '{0}: no se encontró assets/custom en el archivo comprimido',
  '{0}: в архиве не найдена папка cursor': '{0}: no se encontró la carpeta cursor en el archivo comprimido',
  'Неизвестный root: {0}': 'root desconocido: {0}',
  'У этого мода нет _dir.vpk — объединять нечего': 'Este mod no tiene _dir.vpk — no hay nada que combinar',
  'У этого мода нет _dir.vpk — распаковывать нечего': 'Este mod no tiene _dir.vpk — no hay nada que descomprimir',
  'не .vpk файл': 'no es un archivo .vpk',
  'нет {0}_dir.vpk рядом с data-частями': 'falta {0}_dir.vpk junto a las partes de datos',
  'в папке нет ни .vpk, ни файлов игры': 'esta carpeta no contiene ni un .vpk ni archivos del juego',
  'Папка слишком большая, чтобы собрать её в один VPK': 'La carpeta es demasiado grande para juntarla en un solo VPK',
  'В папке нет файлов': 'No hay archivos en esta carpeta',
  'в архиве нет .vpk файлов': 'no hay archivos .vpk en este archivo comprimido',
  'Курсор': 'Cursor', 'Пустой VPK': 'VPK vacío',
  'Не удалось сформировать VPK рангов: отсутствуют файлы ресурсов': 'No se pudo generar el VPK de rangos: faltan archivos de recursos',

  // ---- safe-zip.js (a foreign archive turned down) ----
  'архив': 'archivo comprimido',
  '{0}: архив слишком большой': '{0}: el archivo comprimido es demasiado grande',
  '{0}: архив повреждён или не докачан': '{0}: el archivo comprimido está dañado o no terminó de descargarse',
  '{0}: файл {1} в архиве повреждён': '{0}: {1} dentro del archivo comprimido está dañado',
  '{0}: в архиве слишком много файлов': '{0}: demasiados archivos en el archivo comprimido',
  '{0}: файл в архиве слишком большой': '{0}: un archivo dentro del archivo comprimido es demasiado grande',
  '{0}: архив распакуется в слишком большой объём': '{0}: el archivo comprimido ocuparía demasiado al descomprimirse',
  '{0}: архив сжат подозрительно плотно': '{0}: el archivo comprimido está comprimido de forma sospechosa',
  'Недопустимый путь в архиве: {0}': 'Ruta no válida dentro del archivo comprimido: {0}',

  // ---- preset-share.js (.d2mm validation) ----
  'preset.json повреждён': 'preset.json está dañado',
  'Это не файл пресета Mod Manager': 'Este no es un archivo de preset de Mod Manager',
  'Файл собран более новой версией приложения': 'El archivo se creó con una versión más reciente de la app',
  'Слишком много модов в пресете': 'Demasiados mods en el preset',
  'Файл не открывается как пресет': 'El archivo no se puede abrir como preset',
  'Недопустимое имя файла в архиве': 'Nombre de archivo no válido dentro del archivo comprimido',
  'файла нет в архиве': 'el archivo no está en el archivo comprimido',
  'Пресет': 'Preset',

  // ---- discord-presence.js (status text friends see) ----
  'Смотрит каталог модов': 'Explorando el catálogo de mods',
  'В своей библиотеке': 'En su biblioteca de mods',
  'Собирает пресет': 'Armando un preset', 'В инструментах': 'En las herramientas',
  'Читает гайды': 'Leyendo las guías', 'В настройках': 'En la configuración',
  '{0} модов включено': '{0} mods activados', 'Ещё без модов': 'Todavía sin mods',
  'Моды выключены': 'Mods desactivados',
  'Скачать Mod Assistant': 'Descargar Mod Assistant',

  // ---- vpk.js (parse errors + content labels) ----
  'VPK: незакрытая строка в дереве': 'VPK: cadena sin cerrar en el árbol',
  'VPK: неверная сигнатура': 'VPK: firma incorrecta',
  'VPK: повреждённое дерево': 'VPK: árbol dañado',
  'голова': 'cabeza', 'оружие': 'arma', 'оружие (2)': 'arma (2)', 'щит': 'escudo', 'броня': 'armadura',
  'плечи': 'hombros', 'пояс': 'cinturón', 'руки': 'brazos', 'спина': 'espalda', 'крылья': 'alas',
  'хвост': 'cola', 'ноги': 'piernas', 'ездовое': 'montura', 'эффекты': 'efectos', 'разное': 'varios',
  'модель': 'modelo', 'перекраска': 'recoloreado', 'варды': 'guardianes', 'курьер': 'mensajero',
  'интерфейс': 'interfaz', 'звуки': 'sonidos', 'террейн': 'terreno', 'Варды': 'Guardianes',
  'Курьер': 'Mensajero', 'Интерфейс меню': 'Interfaz del menú', 'Звуки': 'Sonidos', 'Ландшафт': 'Terreno',
  'Сборка · {0} героев': 'Conjunto · {0} héroes',
  'Открыть Mod Assistant': 'Abrir Mod Assistant',
  'Выход': 'Salir',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'The Arsenal is for VIP members only': 'El Arsenal es solo para miembros VIP',
  'Turn safe mode off first: while it is on, the game does not read cosmetics': 'Primero desactiva el modo seguro: mientras esté activo, el juego no lee los cosméticos',
  'Hero {0} is not in the game\'s item table': 'El héroe {0} no está en la tabla de objetos del juego',
  '{0} has no {1} slot': '{0} no tiene la casilla {1}',
  '{0} does not go on {1} in the {2} slot': '{0} no se puede equipar a {1} en la casilla {2}',
  '{0} has no style {1}': '{0} no tiene el estilo {1}',
  'Set {0} was not found for {1}': 'No se encontró el conjunto {0} para {1}',
  'Nothing in {0} can be put on this hero': 'Nada de {0} se puede equipar a este héroe',
  'items_game: {0} is not a hero\'s default item': 'items_game: {0} no es un objeto predeterminado de un héroe',
  'The item table could not be rebuilt, so the choice was undone: {0}': 'No se pudo reconstruir la tabla de objetos, así que se deshizo la elección: {0}',
  'The mod was switched, but the item table could not be rebuilt ({0}). The app will try again before the game next starts': 'El mod se cambió, pero no se pudo reconstruir la tabla de objetos ({0}). La app lo intentará de nuevo antes del próximo inicio del juego',
  'The mod was removed, but the item table could not be rebuilt ({0}). The app will try again before the game next starts': 'El mod se eliminó, pero no se pudo reconstruir la tabla de objetos ({0}). La app lo intentará de nuevo antes del próximo inicio del juego',
  'The item table could not be rebuilt ({0}). The app will try again before the game next starts': 'No se pudo reconstruir la tabla de objetos ({0}). La app lo intentará de nuevo antes del próximo inicio del juego',
  'Enter your email and password': 'Email y contraseña requeridos',
  'Account not found': 'Usuario no encontrado',
  'Wrong password': 'Contraseña incorrecta',
  'Enter a valid email address': 'Ingresa un correo electrónico válido',
  'The password needs at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'An account with this email already exists': 'Ya existe una cuenta con este correo',
  'Sign in first': 'Primero inicia sesión',
  'The current password is wrong': 'La contraseña actual es incorrecta',
  'The new password is the same as the current one': 'La nueva contraseña es igual a la actual',
  'Could not read the accounts: {0}': 'No se pudieron leer las cuentas: {0}',
  'Could not save the accounts: {0}': 'No se pudieron guardar las cuentas: {0}',
  'Could not remember the sign-in: {0}': 'No se pudo recordar el inicio de sesión: {0}',
  'The accounts file is damaged and could not be set aside, so it is left untouched: {0}': 'El archivo de cuentas está dañado y no se pudo apartar, así que no se sobrescribe: {0}',
  'No free pakNN slots left (02-99 are taken)': 'No quedan espacios pakNN libres (02-99 están ocupados)',
  'Mods were not switched: {0} is in use — close Dota 2 and try again': 'No se pudieron cambiar los mods: {0} está en uso — cierra Dota 2 e intenta de nuevo',
  'Mods were not switched: {0}': 'No se pudieron cambiar los mods: {0}',
  'Close Dota 2 before changing game files': 'Cierra Dota 2 antes de modificar los archivos del juego',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'The choice could not be saved: {0}': 'No se pudo guardar la elección: {0}',
};

function fill(tmpl, values) {
  return tmpl.replace(/\{(\d+)\}/g, (_, i) => (values[+i] != null ? String(values[+i]) : ''));
}

// t('Мод не найден') or t('HTTP {0} — не удалось скачать {1}', status, name)
function t(ru, ...values) {
  let tmpl;
  if (currentLang === 'es') {
    // an English key is still honoured, so a Spanish line added the old way is not lost
    const en = EN[ru];
    tmpl = ES[ru] || (en && ES[en]) || en || ru;
  } else if (currentLang === 'en') {
    tmpl = EN[ru] || ru;
  } else {
    tmpl = ru;
  }
  return values.length ? fill(tmpl, values) : tmpl;
}

module.exports = { setLang, getLang, t };
