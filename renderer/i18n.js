/* Dota 2 Mod Manager — renderer i18n.
 * Russian is the source language. English strings are keyed by the exact Russian text,
 * using {0},{1}... placeholders for interpolated values. A missing key falls back to the
 * Russian source, so a not-yet-translated string stays readable instead of breaking.
 *
 * Usage:
 *   L`Настройки`                          -> tagged template, static text
 *   L`Пак «${name}» сохранён`             -> tagged template with values
 *   tr(CAT_RU[id])                        -> plain lookup for data-driven labels
 */
'use strict';

// current UI language. Seeded synchronously from localStorage so a returning user sees the
// right language with no flash; boot() reconciles it against settings.json (the source of truth).
window.I18N_LANG = (() => {
  try {
    const l = localStorage.getItem('uiLang');
    const allowed = ['es', 'en', 'ru', 'ja', 'zh'];
    return allowed.includes(l) ? l : 'es';
  } catch { return 'es'; }
})();

// locale used for date/number formatting
window.i18nLocale = () => {
  const l = window.I18N_LANG || 'es';
  if (l === 'zh') return 'zh-CN';
  if (l === 'ja') return 'ja-JP';
  if (l === 'es') return 'es-419';
  if (l === 'ru') return 'ru-RU';
  return 'en-US';
};

// English plural forms keyed by the Russian "many" form passed to plural(n, one, few, many)
window.EN_PLURAL = {
  'модов': ['mod', 'mods'],
  'результатов': ['result', 'results'],
  'файлов': ['file', 'files'],
  'слотов': ['slot', 'slots'],
  'файлов опознаны': ['file recognized', 'files recognized'],
  'модов из каталога': ['mod from the catalog', 'mods from the catalog'],
  'своих модов': ['mod of your own', 'mods of your own'],
  'модов не получится передать': ['mod cannot be shared', 'mods cannot be shared'],
  'файлов склеены': ['file merged', 'files merged'],
  'косметик': ['cosmetic', 'cosmetics'],
  'из них — копии уже установленных модов': ['of them is a copy of a mod you already have', 'of them are copies of mods you already have'],
  'вариантов': ['option', 'options'],
  'видов': ['look', 'looks'],
};

const EN = {
  // ---------- category names (CAT_RU) ----------
  'Герои': 'Heroes', 'Эффекты предметов': 'Item effects', 'Предметы героев': 'Hero items',
  'Фоны меню': 'Menu backgrounds', 'Курсоры': 'Cursors', 'Мега-килл': 'Mega-kill', 'Шейдеры': 'Shaders',
  'Курьеры': 'Couriers', 'Ландшафты': 'Terrains', 'Крипы': 'Creeps', 'Деревья': 'Trees', 'Река': 'River',
  'Паки эффектов': 'Effect packs', 'Эмблемы': 'Emblems', 'Денай крипов': 'Creep deny',
  'Музыка': 'Music', 'Звуки героев': 'Hero sounds', 'Звуки': 'Sounds', 'Дальние атаки': 'Ranged attacks',
  'Разное': 'Other', 'Ранги': 'Ranks', 'Иконки предметов': 'Item icons', 'Экраны Versus': 'Versus screens',
  'Анонсеры': 'Announcers', 'Варды': 'Wards', 'Пьедесталы': 'Pedestals',
  'Эффекты героев': 'Hero FX', 'Пинги': 'Pings', 'Паки': 'Packs', 'Оптимизация': 'Optimization',
  'Торментор': 'Tormentor', 'Древние': 'Ancients', 'Рошан': 'Roshan',
  'Башни': 'Towers', 'Шрифты': 'Fonts', 'Сайты': 'Sites', 'Гайды': 'Guides', 'Новости': 'News',
  'Импортированный': 'Imported',

  // ---------- rail sections ----------
  'Мир': 'World', 'Эффекты': 'Effects', 'Интерфейс': 'Interface', 'Звук': 'Audio', 'Прочее': 'Other',

  // ---------- sort labels ----------
  'По умолчанию': 'Default', 'Сначала новые': 'Newest first',
  'По имени А-Я': 'Name A-Z', 'По имени Я-А': 'Name Z-A',

  // ---------- group / link labels ----------
  'Все герои': 'All heroes', 'Все предметы': 'All items', 'Все крипы': 'All creeps',
  'Все башни': 'All towers', 'Все типы': 'All types', 'Все группы': 'All groups',
  'Все категории': 'All categories', 'Все слоты': 'All slots',

  // ---------- tags: what a mod changes, and which slot an item goes in ----------
  // The catalog ships these in English; these are our own words for them. 'Эффекты' and
  // 'Звуки' are already above as category names, with the same English.
  'Иконки': 'Icons', 'Аниме': 'Anime', '18+': '18+',
  'Видео': 'Video', 'Картинка': 'Image', 'Плохое качество': 'Poor quality',
  'Мета': 'Meta', 'Статистика': 'Stats', 'Развлечения': 'Fun', 'Исходный код': 'Source code',
  'Оружие': 'Weapon', 'Наплечники': 'Shoulders', 'Голова': 'Head', 'Руки': 'Arms',
  'Броня': 'Armor', 'Спина': 'Back', 'Ездовое': 'Mount', 'Щит': 'Shield',
  'Тотем': 'Totem', 'Волосы': 'Hair',
  'Избранное': 'Favorites',
  'В избранное': 'Add to favorites',
  'Убрать из избранного': 'Remove from favorites',
  'Здесь пусто — жми на сердечко у мода в каталоге': 'Nothing here yet — tap the heart on a mod in the catalog',
  'Превью': 'Preview', 'Источник': 'Source', 'Автор': 'Author', 'Баг': 'Bug', 'Гайд': 'Guide',

  // ---------- nav / chrome (index.html static) ----------
  'Каталог': 'Catalog', 'Библиотека': 'Library', 'Пресеты': 'Presets',
  'Инструменты': 'Tools', 'Настройки': 'Settings',

  // ---------- safe mode (status bar switch) ----------
  'Безопасно:': 'Safe:',
  'Безопасный режим: моды из патча (эффекты, косметика) скрыты и не работают. Выключи, чтобы их включить — приложение впишет свою папку в файлы игры.':
    'Safe mode: patch-only mods (effects, cosmetics) are hidden and inactive. Turn it off to enable them — the app will register its folder in the game files.',
  // the dialog that asks before the app is let into the game's files (renderer/ui/dialog.js)
  'Выключить безопасный режим': 'Turn safe mode off',
  'Оставить безопасный режим': 'Keep safe mode',
  'Сейчас': 'Now',
  'После': 'After',
  'Безопасный режим': 'Safe mode',
  'Приложение кладёт свои .vpk в папку, которую Dota и так читает. Файлы игры оно не открывает и не меняет.':
    'The app drops its .vpk files into a folder Dota already reads. It leaves the game\'s own files alone.',
  'Приложение начнёт менять файлы игры': 'The app starts changing game files',
  'Оно впишет свою папку с модами в два файла Dota:': 'It writes its mods folder into two of Dota\'s files:',
  '+ строка с папкой модов': '+ a line naming the mods folder',
  '+ подпись изменённого файла': '+ a signature for the file above',
  'Оригиналы приложение сохраняет до первой правки. Вернёшь безопасный режим, и они встанут на место байт в байт, без следов.':
    'The app saves a copy of each before the first edit. Switch safe mode back on and both return byte for byte, with nothing left behind.',
  'Дота стирает эту правку каждым обновлением. Приложение впишет её заново само, пока безопасный режим выключен.':
    'Dota wipes the edit with every update. The app writes it back on its own for as long as safe mode is off.',
  'Взамен заработают моды с эффектами, а в каталоге откроются виды для стандартных предметов: погода, ландшафт, курьеры, варды и ещё десяток слотов. Стандартный предмет начинает выглядеть как любой другой из игры, и видно это только тебе.':
    'In return, mods with effects start working, and the catalog opens looks for the default items every account has: weather, terrain, couriers, wards and a dozen more slots. Your default item is drawn as any other item in the game, and only you see it.',
  'Правку файлов игры в моддинге Dota считают небезопасной. За 8+ лет мы не знаем ни одного бана за это. Гарантий всё равно не даём.':
    'Dota modders count editing game files as unsafe. In 8+ years we know of no ban for it. We still give no guarantees.',
  'Безопасный режим выключен — эффекты и косметика доступны': 'Safe mode off — effects and cosmetics are available',
  'Безопасный режим включён, файлы игры восстановлены. Эффекты и косметика ждут, пока не выключишь его снова.':
    'Safe mode on, game files restored. Effects and cosmetics wait until you turn it off again.',

  // ---------- the beta channel (settings, for the accounts the signed list names) ----------
  'Бета-версии': 'Beta builds',
  'Твой аккаунт в списке тестеров: приложение будет обновляться до сборок, которых ещё нет у остальных. Выйдешь из Discord, и оно вернётся на обычные.':
    'Your account is on the testers list: the app will update to builds nobody else has yet. Sign out of Discord and it goes back to the ordinary ones.',
  'Бета-версии включены': 'Beta builds on',
  'Бета-версии выключены': 'Beta builds off',

  // ---------- item schema: catalog cards, library tag, conflict banners ----------
  'Моды спорят за один предмет': 'Mods disagree about the same item',
  '. В таблицу попадёт правка того мода, что установлен последним — выключи лишний.':
    '. The table takes the change from whichever mod was installed last: turn the other one off.',
  'В gameinfo уже прописан другой патчер': 'gameinfo already lists another patcher',
  '. Два патчера в одном файле уживаются плохо — включай наш только если тем не пользуешься.':
    '. Two patchers in one file get along badly: turn ours on only if you no longer use that one.',
  'Разрешить конфликт': 'Resolve conflict', 'Конфликт разрешён': 'Conflict resolved',
  'Читаем схему игры…': 'Reading the game schema…',
  'Схема игры не прочиталась — проверь путь к Dota 2 в настройках.':
    'Could not read the game schema: check the Dota 2 path in settings.',
  'Поиск…': 'Search…',
  'Ничего не найдено — сбрось фильтры': 'Nothing found — clear the filters',
  'Выбрано: {0}': 'Picked: {0}',
  'Вернули как в игре': 'Back to the game default',
  'На один слот — только один активный вид': 'One slot, one active look at a time',
  'эффекты': 'effects',
  'нужны правки': 'needs the patch',
  'Мод меняет схему предметов: его эффекты и иконки собраны в общую таблицу':
    'This mod changes the item schema: its effects and icons are built into the shared table',
  'Мод меняет схему предметов. Без правок схемы встанет только модель — эффекты и иконки работать не будут.':
    'This mod changes the item schema. Without the patch only the model installs: effects and icons will not work.',
  'перекрыт': 'overruled',
  'Файлов перекрыто: {0} — {1}. Побеждает мод, который загружается раньше; порядок меняется правой кнопкой.':
    'Files overruled: {0} — {1}. The mod that loads earlier supplies them; right-click to change the order.',
  'Косметика': 'Cosmetics',
  'Моды': 'Mods',
  'вид для стандартного предмета': 'a look for a default item',
  'Выбрать всю косметику': 'Select every look',
  'Вернуть все слоты к тому, что даёт игра': 'Put every slot back to what the game gives',
  'Косметика выключена — слоты снова как в игре': 'Cosmetics off — the slots are the game’s own again',
  'Вид подставляется в схему предметов игры — стандартный предмет просто рисуется как выбранный. Файлы модов это не трогает, и видно только тебе.':
    'A look is spliced into the game’s item schema — it touches no mod files, and only you can see it.',
  '…и ещё {0} — уточни запрос': '…and {0} more — narrow the search',
  // cosmetic slot labels
  'Погода': 'Weather', 'Ландшафт': 'Terrain', 'Интерфейс игры': 'Game HUD',
  'Экран загрузки': 'Loading screen', 'Экран противостояния': 'Versus screen',
  'Курьер': 'Courier', 'Крипы Света': 'Radiant creeps',
  'Крипы Тьмы': 'Dire creeps', 'Осадные Света': 'Radiant siege creeps',
  'Осадные Тьмы': 'Dire siege creeps', 'Башни Света': 'Radiant towers',
  'Башни Тьмы': 'Dire towers', 'Комментатор': 'Announcer',
  'Серия убийств': 'Kill streak',
  'Поиск модов…': 'Search mods…', 'Очистить': 'Clear', 'Свернуть': 'Minimize',
  'Развернуть': 'Maximize', 'Закрыть': 'Close', 'Поиск Dota 2…': 'Looking for Dota 2…',
  'Папка модов': 'Mods folder', 'Играть': 'Play',
  'Сменить цвета': 'Change the colours',

  // ---------- install list ----------
  'Список установки': 'Install list',
  'Добавить в список': 'Add to the install list',
  'В списке установки': 'In the install list',
  'Установить всё ({0})': 'Install all ({0})',
  'Найти в списке…': 'Find in the list…',
  '«{0}» уже в списке установки. Поставить сейчас? Из списка он пропадёт.':
    '«{0}» is already in the install list. Install it now? It will leave the list.',
  'Пусто. Жми плюс на карточке мода, чтобы собрать список.':
    'Empty. Press the plus on a mod to start a list.',
  'Список: установлено {0}{1}{2}': 'List: {0} installed{1}{2}',
  ', пропущено {0}': ', {0} skipped',
  'Открыть папку, куда ставятся моды': 'Open the folder the mods are installed into',
  'Включить/выключить все моды сразу (для запуска ванильной игры)':
    'Turn all mods on/off at once (to launch the vanilla game)',
  'Запустить Dota 2 через Steam с твоими параметрами запуска':
    'Launch Dota 2 through Steam with your launch options',
  'Моды:': 'Mods:', 'вкл': 'on', 'выкл': 'off',

  // ---------- panel grips ----------
  'Потяни, чтобы изменить высоту · двойной клик сбрасывает': 'Drag to resize · double-click to reset',
  'Потяни, чтобы изменить ширину · двойной клик сбрасывает': 'Drag to resize · double-click to reset',
  'Свернуть верхнюю панель': 'Fold the top bar',
  'Развернуть верхнюю панель': 'Unfold the top bar',
  'Скрыть нижнюю панель': 'Hide the bottom bar',
  'Показать нижнюю панель': 'Show the bottom bar',
  'Скрыть категории': 'Hide the categories',
  'Показать категории': 'Show the categories',

  // ---------- dialogs / common ----------
  'Удалить': 'Delete', 'Отмена': 'Cancel', 'ОК': 'OK', 'Готово': 'Done',
  'Пауза': 'Pause', 'Громкость': 'Sound', 'На весь экран': 'Fullscreen',
  'мод': 'mod',

  // ---------- launch + master switch (app.js) ----------
  'Сначала укажи путь к Dota 2 в настройках': 'Set the Dota 2 path in Settings first',
  'Запуск Dota 2 без модов…': 'Launching Dota 2 without mods…',
  'Запуск Dota 2 с модами…': 'Launching Dota 2 with mods…',
  'Моды включены': 'Mods enabled',
  'Моды выключены — игра запустится ванильной': 'Mods disabled — the game will launch vanilla',

  // ---------- catalog ----------
  'Загрузка каталога…': 'Loading catalog…',
  'Этот раздел доступен только администратору': 'Only the administrator can open this section',
  'Не удалось загрузить каталог: {0}': 'Could not load the catalog: {0}',
  'Повторить': 'Retry',
  'Недавно добавленные': 'Recently added',
  'Категории': 'Categories',
  'Поиск:': 'Search:',
  'Ничего не найдено': 'Nothing found',
  'Установленные': 'Installed',
  'Смотреть превью': 'Watch preview',
  'Установлен': 'Installed',
  // the first look of a mod has no name of its own in the catalog
  'Обычный': 'Default',
  'Пак': 'Pack',
  'Свой': 'Custom',
  'Ссылка': 'Link',

  // ---------- mod modal ----------
  'Смотреть превью ': 'Watch preview ',
  '· свой пак': '· custom pack',
  'не найден в каталоге': 'not in the catalog',
  ' · установлен': ' · installed',
  'Вернуть': 'Restore', 'Убрать': 'Remove',
  'Название своего пака…': 'Custom pack name…',
  'Сохранить пак': 'Save pack',
  'Удалить пак': 'Delete pack',
  'Установить пак ({0})': 'Install pack ({0})',
  'Установка…': 'Installing…', 'Установить': 'Install',
  'Открыть ссылку': 'Open link',
  'Шрифт ставится в файлы игры (game\\dota\\panorama\\fonts) — параметр запуска не нужен. Оригиналы сохраняются автоматически.':
    'The font is installed into the game files (game\\dota\\panorama\\fonts) — no launch option needed. Originals are backed up automatically.',
  'Введи название пака': 'Enter a pack name',
  'В паке не осталось модов': 'No mods left in the pack',
  'Пак «{0}» сохранён — он появился в категории Паки': 'Pack «{0}» saved — it appears in the Packs category',
  'Удалить пак «{0}»?': 'Delete pack «{0}»?',
  'Удалить «{0}»?': 'Delete «{0}»?',
  '{0} удалён': '{0} removed',

  // ---------- install ----------
  ' (и ещё {0})': ' (and {0} more)',
  '{0} установлен': '{0} installed',
  '{0} установлен — «{1}» выключен: курсор в игре может быть только один':
    '{0} installed — «{1}» switched off: the game can only show one cursor',
  'Пак «{0}»: установлено {1}, пропущено {2}{3}': 'Pack «{0}»: {1} installed, {2} skipped{3}',
  ', ошибок {0}': ', {0} failed',

  // ---------- library: pack rows ----------
  'Выбрать мод в паке': 'Select mod in pack',
  'Включить/выключить мод в паке': 'Enable/disable mod in pack',
  'Удалить из пака': 'Remove from pack',
  'Выбрать пак': 'Select pack',
  'Развернуть состав пака': 'Expand pack contents',
  'Пак · {0} {1}': 'Pack · {0} {1}',
  '{0} из {1} включено': '{0} of {1} enabled',
  'пусто': 'empty',
  'Включить/выключить пак целиком': 'Enable/disable whole pack',
  'Разобрать': 'Split',

  // ---------- library: normal rows ----------
  'Выбрать мод': 'Select mod',
  'всегда активен': 'always on',
  'Включить/выключить': 'Enable/disable',
  'Курсор в игре может быть только один — этот выключит остальные':
    'The game can only show one cursor — this one switches the others off',
  'Курсор заменён — «{0}» выключен': 'Cursor replaced — «{0}» switched off',
  'Курсоры в пак не входят — они лежат не в паках, а в resource\\cursor':
    'Cursors cannot go into a pak — they live in resource\\cursor, not in a pak file',
  'Привязать к каталогу': 'Adopt into the catalog',
  'Привязать': 'Adopt',
  'Экспорт': 'Export',
  'Привязано: {0}': 'Adopted: {0}',

  // ---------- library: empty / search ----------
  'Пока ничего не установлено — загляни в Каталог': 'Nothing installed yet — check the Catalog',
  'Ничего не найдено по запросу': 'Nothing matches your search',
  'Выбери моды': 'Pick mods',
  'Нет отдельных модов для добавления': 'No standalone mods to add',
  'Выбери минимум 2 элемента': 'Pick at least 2 items',
  'Название объединённого пака:': 'Combined pack name:',
  'Название пака:': 'Pack name:',
  'напр. «Анимешный сет»': 'e.g. «Anime set»',
  'Объединить': 'Combine',
  'Пак «{0}»: {1} {2}': 'Pack «{0}»: {1} {2}',
  'Пересечения файлов: {0} (победил тот, что раньше в паке)':
    'File overlaps: {0} (the earlier one in the pack wins)',

  // ---------- library: banners + toolbar ----------
  'Моды выключены': 'Mods are off',
  ' мастер-переключателем внизу справа — игра запустится ванильной. Включи, чтобы менять моды по отдельности.':
    ' with the master switch at the bottom right — the game will launch vanilla. Turn it on to manage mods individually.',
  ' как моды из каталога — привяжи, чтобы получить превью и управлять как обычными.':
    ' as catalog mods — adopt them to get previews and manage them like the rest.',
  'Привязать все': 'Adopt all',
  'Занято': 'Used',
  ' из {0} слотов. Игра не грузит больше ~99 отдельных паков — объедини моды в один, чтобы уместить больше.':
    ' of {0} slots. The game won’t load more than ~99 separate paks — combine mods into one to fit more.',
  'Система': 'System',
  'Запуск вместе с Windows': 'Start with Windows',
  'Запускать Mod Assistant автоматически при включении компьютера.':
    'Launch Mod Assistant automatically when starting the computer.',
  'Сворачивать в трей при закрытии': 'Minimize to tray on close',
  'При нажатии на крестик окно сворачивается в область уведомлений вместо закрытия программы.':
    'Clicking close minimizes the window to the system notification area instead of exiting.',
  'Поиск в библиотеке…': 'Search the library…',
  'Импорт VPK': 'Import VPK',
  'Выбрать всё': 'Select all',
  'Отметь моды галочками — объединить в пак или массово управлять':
    'Tick mods to combine them into a pack or manage in bulk',
  'Включить все': 'Enable all',
  'Выключить все': 'Disable all',
  'Внешние файлы в папке модов': 'External files in the mods folder',
  'Файлы, установленные не через менеджер': 'Files installed outside the manager',

  // ---------- bulk bar ----------
  'выбрано': 'selected',
  'Включить': 'Enable', 'Выключить': 'Disable',
  'Объединить в пак': 'Combine into pack',
  'Вытащить из пака': 'Extract from pack',
  'Сбросить выбор': 'Clear selection',
  'Удалить выбранное ({0})?': 'Delete selected ({0})?',
  'Удалено': 'Removed',
  'Выбери моды для объединения в пак': 'Pick mods to combine into a pack',
  'Далее': 'Next',
  'Вытащено из пака: {0}': 'Extracted from pack: {0}',

  // ---------- library actions (bindLibrary) ----------
  'Убрать «{0}» из пака?': 'Remove «{0}» from the pack?',
  'Пак удалён — в нём не осталось модов': 'Pack removed — it had no mods left',
  'Убрано из пака': 'Removed from the pack',
  'Добавлено в пак: {0}': 'Added to pack: {0}',
  'Разобрать пак «{0}» на отдельные моды? Каждый мод снова займёт свой слот.':
    'Disband pack «{0}» into separate mods? Each mod will take its own slot again.',
  'Разобрано на {0}: {1}': 'Split into {0}: {1}',
  'Разобрано на {0}: {1}{2}': 'Split into {0}: {1}{2}',
  'Удалить пак «{0}» со всеми модами внутри?': 'Delete pack «{0}» with all mods inside?',
  '{0} сохранён одним файлом ({1} MB)': '{0} saved as a single file ({1} MB)',
  'Привязан к каталогу: «{0}»': 'Adopted into the catalog: «{0}»',
  'Разбить «{0}» на отдельные моды по героям? Исходный файл заменится на отдельные, каждый можно будет включать и удалять по отдельности.':
    'Split «{0}» into separate mods by hero? The source file is replaced by separate ones you can toggle and remove individually.',

  // ---------- external files ----------
  'Курсор в игре': 'In-game cursor',
  'шрифт · panorama/fonts': 'font · panorama/fonts',
  'мод из каталога': 'catalog mod',
  'опознан по содержимому': 'recognized by content',
  'внешний файл': 'external file',
  'Привязать к каталогу и управлять как обычным модом': 'Adopt into the catalog and manage like a normal mod',
  'Взять файл в библиотеку — дальше как у обычного мода': 'Take the file into your library — from there it behaves like any mod',
  'Принять': 'Adopt',
  '«{0}» принят из каталога': '«{0}» adopted from the catalog',
  '«{0}» в библиотеке': '«{0}» is in your library',
  'Моды, положенные в папку мимо менеджера. «Принять» берёт файл в библиотеку — с превью, переключателем и всем остальным.':
    'Mods put in the folder without the manager. "Adopt" takes a file into your library — preview, switch and all.',
  'копия': 'copy',
  'копия «{0}»': 'copy of «{0}»',
  'Тот же файл уже стоит как «{0}» — эта копия лишняя': 'The same file is already installed as «{0}» — this copy is redundant',
  'Разбить «{0}» на отдельные моды по героям? Файл заменится на отдельные управляемые моды.':
    'Split «{0}» into separate mods by hero? The file is replaced by separate managed mods.',
  'Удалить файл {0}?': 'Delete file {0}?',

  // ---------- import ----------
  'Импортировано: {0} {1}': 'Imported: {0} {1}',
  '{0} {1} в {2} {3}': '{0} {1} into {2} {3}',
  'Импорт папки': 'Import folder',
  'Импортировать все .vpk из папки — например из распакованного пака Dota 2 Skinchanger':
    'Import every .vpk in a folder — an unpacked Dota 2 Skinchanger pack, for instance',
  'Импортировать можно .vpk файлы, .zip или папку с ними': 'You can import .vpk files, a .zip, or a folder with them',
  'Не удалось прочитать перетащенные файлы': 'Could not read the dropped files',
  'Не удалось прочитать перетащенную папку': 'Could not read the dropped folder',

  // ---------- load order ----------
  'Загружать позже': 'Load later',
  'Файл игры не совпадает с подписью Dota': "A game file does not match Dota's own signature",
  '. Пока так, клиент может не пускать в матчмейкинг — и моды тут ни при чём. Приложение не смогло восстановить оригинал само: проверь целостность файлов Dota 2 через Steam, это чинит за минуту.':
    ". While that is true the client can refuse to matchmake, and mods have nothing to do with it. The app could not restore the original itself: verify Dota 2's files through Steam, it takes a minute.",
  'и': 'and',
  'и ещё {0}': 'and {0} more',
  'Включено': 'Enabled', 'Выключено': 'Disabled',

  // ---------- presets ----------
  '{0} не установлено': '{0} not installed',
  'не установлен': 'not installed',
  'Пресет хранит моды. Виды для стандартных предметов в него не входят: они живут своей жизнью в «Моих модах» и не выключаются вместе с пресетом.':
    'A preset holds mods. Looks for default items are not part of one: they live in My mods on their own and are not switched off along with a preset.',
  'Пресет запоминает, какие моды включены. Применение пресета включает его моды и выключает остальные. Готовым пресетом можно поделиться файлом — перетащи полученный .d2mm сюда.':
    'A preset remembers which mods are on. Applying a preset enables its mods and disables the rest. A finished preset can be shared as a file — drop a .d2mm you received here.',

  // ---------- sharing presets ----------
  'Поделиться': 'Share',
  'Сохранить пресет файлом, чтобы отправить другому': 'Save the preset as a file to send to someone',
  'Открыть .d2mm': 'Open .d2mm',
  'Поделиться пресетом «{0}»': 'Share the preset «{0}»',
  'уедут ссылками, почти не весят': 'travel as references, next to no weight',
  'нет в каталоге, поедут файлом целиком': 'not in the catalog, they travel as whole files',
  'Твой ник (необязательно)': 'Your nickname (optional)',
  'Пара слов о сборке (необязательно)': 'A few words about the build (optional)',
  'Размер файла:': 'File size:',
  'несколько КБ': 'a few KB',
  'МБ': 'MB',
  'Сохранить файл': 'Save file',
  'Пресет сохранён · {0} МБ': 'Preset saved · {0} MB',
  'В пресете нет модов': 'The preset has no mods',
  'получен': 'received',
  '{0} уже стоят': '{0} already installed',
  '{0} скачать из каталога': '{0} to download from the catalog',
  '{0} внутри файла': '{0} inside the file',
  'нечего устанавливать': 'nothing to install',
  'Не найдены ни у тебя, ни в файле:': 'Found neither here nor in the file:',
  'Пресет «{0}» добавлен — нажми «Установить»': 'Preset «{0}» added — press «Install»',
  'Установлено и применено: {0} {1}': 'Installed and applied: {0} {1}',
  'виды из игры: {0}': 'looks from the game: {0}',
  'Не удалось прочитать файл пресета': 'Could not read the preset file',
  'Сюда можно бросить моды (.vpk, .zip, папку) или пресет .d2mm':
    'You can drop mods here (.vpk, .zip, a folder) or a .d2mm preset',
  'Обновить': 'Update',
  'Перезаписать пресет тем, что включено сейчас': 'Overwrite the preset with what is enabled right now',
  'Переименовать': 'Rename',
  'Новое название пресета': 'New preset name',
  'Пресет обновлён: {0} {1}': 'Preset updated: {0} {1}',

  // ---------- preset links ----------
  'Файл': 'File',
  'Сохранить пресет файлом — донесёт и свои моды тоже': 'Save the preset as a file — it carries your own mods too',
  'Скопировать короткую ссылку на пресет': 'Copy a short link to the preset',
  'В пресете только свои моды — ссылка их не донесёт, отправь файлом':
    'The preset holds only your own mods — a link cannot carry them, send the file',
  'Ссылка донесёт {0} из каталога; свои моды ({1}) в неё не влезут — для них нужен файл':
    'A link carries the {0} catalog mods; your own ({1}) will not fit in one — send the file for those',
  'Ссылкой не уедут: {0}{1} — их нет в каталоге. Отправь файлом, чтобы попали.':
    'A link leaves these behind: {0}{1} — they are not in the catalog. Send the file to include them.',
  'В ссылку вошли {0} {1} из каталога. Свои моды ({2}) она не несёт — отправь файлом.':
    'The link carries {0} catalog {1}. Your own mods ({2}) are not in it — send the file for those.',
  'Добавить': 'Add',

  // ---------- account ----------
  'Показывать в Discord, что ты в Mod Manager': 'Show in Discord that you are in Mod Manager',
  'Скопировано': 'Copied',
  'Войти': 'Sign in',
  'Вход нужен, чтобы подписывать свои сборки': 'Signing in puts your name on the builds you share',
  'Выйти': 'Sign out',
  'Выйти из аккаунта': 'Sign out',
  'Выйти из аккаунта «{0}»?': 'Sign out of «{0}»?',
  'Открыл Discord в браузере — подтверди вход там': 'Discord is open in your browser — confirm the sign-in there',
  'Привет, {0}': 'Hi, {0}',
  'Название пресета (напр. «Анимешный», «Минимал»)': 'Preset name (e.g. «Anime», «Minimal»)',
  'Сохранить текущее состояние': 'Save current state',
  'Пресетов пока нет': 'No presets yet',
  'Применить': 'Apply',
  'пусто (всё будет выключено)': 'empty (everything will be turned off)',
  'Введи название пресета': 'Enter a preset name',
  'Пресет «{0}» сохранён': 'Preset «{0}» saved',
  'Пресет применён': 'Preset applied',
  'Пресет применён · доустановлено {0} {1}': 'Preset applied · installed {0} {1} it was missing',
  'Своих модов нет на этом компьютере, из каталога их не вернуть: {0}': 'Your own mods are not on this computer, and the catalog cannot bring them back: {0}',
  'Удалить пресет «{0}»?': 'Delete preset «{0}»?',

  // ---------- tools ----------
  // the one-time offer on first run (renderer/ui/dialog.js, toolchainDialog)
  'Скачать Source 2 Viewer?': 'Download Source 2 Viewer?',
  'Открытая программа (MIT) от ValveResourceFormat, не наша': 'An open-source program (MIT) by ValveResourceFormat, not ours',
  'Дота хранит почти всё в сжатых форматах Source 2. Простую половину приложение читает само, а остальное разбирает эта программа.':
    'Dota keeps almost everything it draws in compiled Source 2 formats. The app reads the easy half itself; this program reads the rest.',
  'Превью твоих модов': 'Pictures of your own mods',
  ' — без неё их не видно вовсе': ' — without it there are none at all',
  'Иконки предметов, которые игра хранит сжатыми': 'The item icons the game stores compressed',
  ' — остальные приложение достаёт из игры само': ' — the app takes the rest out of the game on its own',
  '48 МБ, качается один раз в папку приложения. Удалить можно когда угодно в настройках, ничего сломано не будет.':
    '48 MB, downloaded once into the app\'s own folder. Remove it whenever you like in Settings; nothing breaks.',
  'Не сейчас': 'Not now',
  'Source 2 Viewer установлен — превью модов заработают': 'Source 2 Viewer installed — mod pictures will work now',
  'Не удалось скачать: {0}. Попробовать снова можно в настройках.':
    'Could not download it: {0}. Settings has the retry.',
  'Запустить': 'Run', 'Папка': 'Folder', 'Скачать': 'Download', 'Открыть сайт': 'Open site',
  'Скачивание…': 'Downloading…', '{0} готов': '{0} ready',
  'Открыть': 'Open', 'Исходники': 'Source code', 'Небезопасно': 'Not safe',

  // ---------- help ----------
  'Помощь': 'Help', 'Вики': 'Wiki',

  // ---------- my mods ----------
  'Мои моды': 'My mods',

  // ---------- no game found ----------
  'Dota 2 не найдена': 'Dota 2 not found',
  ' — моды ставить некуда. Проверь, что игра установлена, или укажи её папку вручную.':
    ' — there is nowhere to install mods. Check that the game is installed, or point at its folder yourself.',
  'Искать снова': 'Search again',
  'Указать папку': 'Choose the folder',
  'Dota 2 найдена — можно ставить моды': 'Dota 2 found — you can install mods now',
  'Не нашёл автоматически — укажи папку вручную': 'No luck automatically — point at the folder yourself',

  // ---------- presets: sharing ----------
  'Скопировать': 'Copy',
  'Сохранить файлом…': 'Save as a file…',
  'Обновить по текущему состоянию': 'Update from what is on now',
  'Открывается в менеджере и ставит моды из каталога.': 'Opens in the manager and installs the mods from the catalog.',
  'В пресете только свои моды — ссылка их не донесёт.': 'This preset holds only mods of your own, and a link cannot carry those.',
  'Донесёт {0} из каталога. Свои моды ({1}) в неё не влезут — для них файл.':
    'Carries {0} from the catalog. Mods of your own ({1}) do not fit in a link — use the file for those.',
  'Донесёт и те моды, которых нет в каталоге. Дальше выберешь, что положить внутрь.':
    'Carries the mods the catalog does not have. You pick what goes inside on the next step.',
  'Пресет запоминает, какие моды включены: применил — эти включились, остальные выключились. Готовым можно поделиться ссылкой или файлом, а полученный .d2mm достаточно перетащить сюда.':
    'A preset remembers which mods are on: apply it and those switch on while the rest switch off. Share a finished one as a link or a file, and drop a .d2mm you were sent anywhere in this window.',
  'Поиск среди своих модов…': 'Search your mods…',
  'Моды, положенные в папку мимо менеджера. «Принять» берёт файл к себе — с превью, переключателем и всем остальным.':
    'Mods dropped into the folder without the manager. “Take it” adopts the file — preview, switch and all.',
  'Взять файл к себе — дальше как у обычного мода': 'Adopt the file: from then on it behaves like any other mod',
  '«{0}» принят': '«{0}» adopted',
  'Сайт программы': 'Website',
  'Что внутри': 'What is in it',
  'Перетащи, чтобы изменить порядок загрузки': 'Drag to change the load order',
  'Файл в папке модов': 'The file in your mods folder',
  'Загружать раньше': 'Load earlier',
  'Загружать первым': 'Load first',
  'Мод перемещён на первое место по приоритету загрузки': 'Mod moved to top loading priority',
  'Нажми, чтобы дать максимальный приоритет': 'Click to give top priority',
  'Сохранить одним файлом': 'Save as one file',
  'Распаковать в папку': 'Unpack into a folder',
  '«{0}»: распакован, файлов — {1} ({2} MB)': '“{0}” unpacked: {1} files ({2} MB)',
  'Сохранить курсор архивом': 'Save the cursor as an archive',
  'Разобрать по героям': 'Split by hero',
  'Разбить на отдельные моды по героям': 'Split into one mod per hero',
  'Разобрать на отдельные моды': 'Split into separate mods',
  'Добавить моды в пак': 'Add mods to the pack',
  'Собираю «{0}» в один файл…': 'Building «{0}» into one file…',
  'Курсор ставится в game\\dota\\resource\\cursor — параметр запуска не нужен. Оригиналы сохраняются автоматически. Включать и выключать его можно в «Моих модах», но активным может быть только один курсор: новый выключит предыдущий.':
    'The cursor is installed into game\\dota\\resource\\cursor — no launch option needed. Originals are backed up automatically. You can switch it on and off in My mods, but only one cursor can be active: a new one turns the previous one off.',
  'Этот вид сейчас стоит в слоте «{0}». Убрать — вернуть то, что даёт игра; включить обратно можно в «Моих модах».':
    'This look currently fills the «{0}» slot. Removing it puts back what the game gives; you can switch it on again in My mods.',
  'На один слот — только один вид: этот заменит «{0}». Прошлый выбор останется в «Моих модах» выключенным.':
    'One slot, one active look: this one replaces «{0}». The previous pick stays in My mods, switched off.',

  // ---------- settings ----------
  'В самом Discord для этого включено «Отображать текущую активность как статус».':
    'Discord itself needs “Display current activity as a status message” switched on.',
  'Скачанные архивы, чтобы не качать повторно. Удаление ничего не сломает.':
    'Downloaded archives, kept so nothing is fetched twice. Deleting them breaks nothing.',
  'Путь к игре, список модов и последние записи журнала в одном файле. Пришли его, если что-то не работает.':
    'The game path, the list of mods and the last log entries in one file. Send it when something is wrong.',

  // ---------- library: where the mods went ----------
  'Dota сейчас берёт файлы из папки dota_{0}': 'Dota is reading dota_{0} right now',
  ', а моды ставятся в dota_{0}. Закрой Dota и перезапусти менеджер — он переключит игру сам.':
    ', while mods are installed into dota_{0}. Close Dota and restart the manager: it switches the game over itself.',
  'В папке dota_{0} лежат {1} {2}': 'The dota_{0} folder holds {1} {2}',
  ', которые игра не видит.': ' the game cannot see.',
  // one map archive, so a terrain replaces whatever is already there
  'В папке карт лежит мод Minify. Ландшафт займёт тот же файл и заменит его — Dota читает только один. Продолжить?':
    'There is a Minify map mod in the maps folder. A terrain takes the same file and replaces it, because Dota reads only one. Continue?',
  'В папке карт уже лежит ландшафт, поставленный не через приложение. Он будет заменён — Dota читает только один файл карт. Продолжить?':
    'A terrain installed outside this app is already in the maps folder. It will be replaced, because Dota reads only one map archive. Continue?',
  'Заменить': 'Replace',
  // a launch option that overrules everything the app sets
  'Steam запускает Minify перед Dota': 'Steam runs Minify before Dota',
  ': в параметрах запуска стоит его команда prelaunch. Это его настройка «Run patches upon launch», включённая по умолчанию с версии 1.14rc7 — игра стартует после того, как патч отработает. Если Dota перестала запускаться, выключи эту галочку в настройках Minify.':
    ': its prelaunch command is in the launch options. That is Minify\'s own "Run patches upon launch", on by default since v1.14rc7 — the game starts once the patch has finished. If Dota has stopped starting, turn that checkbox off in Minify\'s settings.',
  'В параметрах запуска Dota стоит -language {0}': 'Dota has -language {0} in its launch options',
  ', поэтому игра читает папку dota_{0} — туда приложение моды и ставит. Уберёшь параметр, и они переедут обратно сами.':
    ', so the game reads dota_{0} and that is where the app installs. Remove the option and they move back on their own.',
  '. Такого языка у Доты нет, папку по нему она не смонтирует, а язык текста он всё равно заберёт. Убери его: Steam → Dota 2 → Свойства → Параметры запуска.':
    '. Dota has no such language, so it will mount no folder for it, and it takes the text language anyway. Remove it: Steam → Dota 2 → Properties → Launch options.',
  '. Пока он там, игра берёт язык из него и монтирует папку dota_{0}, что бы приложение ни настроило. Убери его: Steam → Dota 2 → Свойства → Параметры запуска.':
    '. While it is there the game takes its language from it and mounts dota_{0}, whatever this app sets. Remove it: Steam → Dota 2 → Properties → Launch Options.',
  // living next to Minify: which of the two the game is reading, and how to get both
  'Dota монтирует ровно одну языковую папку.': 'Dota mounts exactly one language folder.',
  'Игра читает моды Minify из dota_{0}': 'The game is reading the Minify mods in dota_{0}',
  ', а наши {0} лежат в dota_{1} и сейчас не грузятся. {2} Какую именно — решает параметр запуска Dota, и сейчас он указывает на папку Minify.':
    ', while our {0} sit in dota_{1} and are not loading. {2} Which one is decided by the Dota launch option, and right now it names the Minify folder.',
  'Игра читает папку dota_{0}, а модов там нет': 'The game is reading dota_{0}, and there are no mods in it',
  '. Наши лежат в dota_{0}, Minify собирает в dota_{1}. {2}':
    '. Ours are in dota_{0} and Minify builds into dota_{1}. {2}',
  '. Игра читает нашу папку dota_{0}, а он собирает в dota_{1} — его моды сейчас не грузятся. {2}':
    '. The game reads our dota_{0} while it builds into dota_{1}, so its mods are not loading. {2}',
  'Рядом установлен Minify': 'Minify is installed alongside',
  '. Он собирает в dota_{0}, а {1} Папку с таким именем игра не читает — его моды сейчас не грузятся, и на наши это не влияет. В свежих версиях Minify это решено переходом на голландский.':
    '. It builds into dota_{0}, and {1} No folder by that name is read, so its mods are not loading and ours are unaffected. Newer Minify releases solved this by moving to Dutch.',
  'Minify рядом, и обе программы работают': 'Minify is here, and both are working',
  ': моды в одной папке dota_{0}, а слоты {1}, куда он пишет, мы не занимаем.':
    ': the mods share dota_{0}, and the slots it writes - {1} - are left to it.',
  'Проверка файлов Steam вернула оригиналы игры': 'Steam’s file check put the game’s own files back',
  ': {0}. Архива для установки уже нет — скачать заново?':
    ': {0}. The archive they were installed from is no longer cached — download it again?',
  'Поставить заново': 'Install again',
  '. Если он ставит моды в ту же папку, файлы будут перекрывать друг друга — ставь моды через что-то одно.':
    '. If it installs into the same folder, their files overwrite each other: install with one of the two, not both.',

  // ---------- notices from the network ----------
  'Подробнее': 'Read more',

  // ---------- pictures out of the game and out of the mods (the Source 2 toolchain) ----------
  'Картинки из игры и модов': 'Pictures from the game and from mods',
  'Инструмент установлен': 'Tool installed',
  'Инструмент не скачан': 'Tool not downloaded',
  'Картинки предметов приложение берёт из самой игры: точные, без интернета и без ожидания. А моду, который приехал без превью, находит картинку в его же файлах. Без инструмента предметы грузятся из вики (медленнее и есть не для всего), а моды остаются с заглушкой. Удалить можно в любой момент.':
    'Item pictures come out of the game itself: exact, offline, no waiting. For a mod that arrived without a preview, the app finds a picture inside the mod\'s own files. Without the tool, items load from a wiki (slower, and it does not cover everything) and mods keep their placeholder. You can delete it at any time.',
  'Скачиваю инструмент — это разово': 'Downloading the tool, once and for all',
  'Готово — картинки теперь берутся из игры': 'Done, pictures now come from the game',
  'Инструмент удалён — картинки снова из вики': 'Tool removed, pictures come from the wiki again',

  // ---------- Dota patched underneath the app ----------
  'Dota обновилась': 'Dota has updated',
  ', моды и настройки вернули на место': ', and your mods and settings are back in place',
  ', менять ничего не пришлось': ', and nothing needed changing',
  '. Можно играть.': '. You are good to play.',
  'Понятно': 'Got it',
  'Dota обновилась, пока игра запущена': 'Dota updated while the game was running',
  '. Моды в этой сессии не работают: файлы игры заняты. Закрой Dota — приложение вернёт всё само.':
    '. Mods are off for this session because the game holds its files open. Close Dota and the app puts everything back on its own.',
  'Я закрыл, повтори': 'I closed it, try again',
  'Dota обновилась, вернуть моды не вышло': 'Dota updated and the mods could not be put back',
  '. Закрой Dota и нажми «Повторить» — почти всегда дело в том, что игра держит файлы.':
    '. Close Dota and press Try again: it is almost always the game holding its files.',
  'Dota всё ещё запущена — закрой её полностью': 'Dota is still running, close it fully',
  'Dota обновилась — вернём моды, как только закроешь игру': 'Dota has updated, the mods go back as soon as you close the game',
  'Dota обновилась, вернуть моды не вышло — загляни в «Мои моды»': 'Dota has updated and the mods could not be put back, see My mods',
  'Dota обновилась — моды на месте': 'Dota has updated, your mods are in place',
  'Свернуть нижнюю панель': 'Hide the bottom bar',
  'Путь к Dota 2': 'Dota 2 path',
  'не найден': 'not found',
  'Найти автоматически': 'Auto-detect',
  'Указать вручную': 'Set manually',
  'Язык': 'Language',
  'Тема': 'Theme', 'Тёмная': 'Dark', 'Светлая': 'Light',
  'Масштаб': 'Scale',
  'Мельче': 'Smaller',
  'Крупнее': 'Bigger',
  'Сбросить': 'Reset',
  'Перенести сюда': 'Move here',
  'Кэш загрузок': 'Download cache',
  'Размер': 'Size',
  'Обновлён': 'Updated',
  'Обновить сейчас': 'Refresh now',
  'О программе': 'About',
  'Версия': 'Version',
  'Dota 2 найдена: {0}': 'Dota 2 found: {0}',
  'Не нашёл автоматически — укажи вручную': 'Not found automatically — set it manually',
  'Путь сохранён': 'Path saved',
  'Перенесено файлов: {0}': 'Moved {0} files',
  'Моды перенесены в dota_{0} — папку, которую монтирует твоя озвучка. Перезапусти игру.':
    'Mods moved into dota_{0}, the folder your audio language mounts. Restart the game.',
  'Скопировано в буфер': 'Copied to clipboard',
  'Кэш очищен': 'Cache cleared',
  // named from the picker itself, so a language added there needs no sentence of its own here
  'Язык переключён: {0}': 'Language switched: {0}',

  // ---------- status bar ----------
  'Dota 2 подключена': 'Dota 2 connected',
  'Dota 2 не найдена — укажи путь в настройках': 'Dota 2 not found — set the path in Settings',

  // ---------- what's new ----------
  'Что нового': 'What\'s new',
  'свободная программа без каких-либо гарантий': 'free software with no warranty of any kind',
  'версия {0}': 'version {0}',
  'Для этой версии заметок нет': 'No notes for this version',

  // ---------- progress + updates ----------
  'Скачивание: {0}': 'Downloading: {0}',
  'Найдено обновление v{0} — скачиваю в фоне…': 'Update v{0} found — downloading in the background…',
  'Вышла версия ': 'Version ',
  'Скачать рядом': 'Download it beside this one',
  'Новая версия лежит рядом: ': 'The new build is beside this one: ',
  '. Закрой это окно и запусти её.': '. Close this window and run it.',
  'Показать файл': 'Show the file',
  'Обновление ': 'Update ',
  ' готово к установке': ' is ready to install',
  'Перезапустить и обновить': 'Restart and update',
  'Позже': 'Later',
  'Обновляю каталог…': 'Refreshing the catalog…',
  'Каталог обновлён': 'Catalog updated',
  'Каталог не обновился, показан последний загруженный': 'Could not update the catalog, showing the last one downloaded',
  'Нет соединения с интернетом': 'No internet connection',
  'Каталог сейчас недоступен': 'The catalog is unavailable right now',
  'Моды, которые уже стоят, работают. Каталог появится, как только связь вернётся.': 'The mods you already have keep working. The catalog will be here as soon as you are back online.',
  'Моды, которые уже стоят, работают. Попробуй ещё раз через минуту.': 'The mods you already have keep working. Try again in a minute.',
  'Часть превью не загрузилась. Проверь интернет — каталог и моды работают': 'Some previews did not load. Check your connection - the catalog and the mods still work',

  // ---------- thanks ----------
  'Спасибо': 'Thanks',
  'Создано командой Dreftian Devs': 'Made by Dreftian Devs',
  'hanta снял видео о менеджере': 'hanta made a video about the manager',

  // ---------- being uninstalled (renderer/uninstall.js) ----------
  'Удалить Dota 2 Mod Manager': 'Remove Dota 2 Mod Manager',
  'Программа будет удалена. Отметь, что забрать вместе с ней.':
    'The program is going. Tick what should go with it.',
  'Вернуть файлы игры как были': 'Put the game files back',
  'Безопасный режим сейчас выключен. gameinfo и подписи вернутся байт в байт, без следов.':
    'Safe mode is off right now. gameinfo and the signatures go back byte for byte, with nothing left behind.',
  'Удалить установленные моды': 'Remove the installed mods',
  '{0} шт., {1} МБ в папке игры. Иначе останутся лежать там, и управлять ими будет нечем.':
    '{0} of them, {1} MB inside the game folder. Left alone they stay there with nothing to manage them.',
  'Модов не установлено.': 'No mods are installed.',
  'Удалить данные приложения': 'Remove the app\'s own data',
  'Настройки, библиотека, кэш картинок и скачанные инструменты — {0} МБ.':
    'Settings, library, picture cache and downloaded tools: {0} MB.',
  'Ничего не отмечено — будет удалена только сама программа.':
    'Nothing ticked: only the program itself will go.',
  'Удаляю…': 'Removing…',
  'Не удалось убрать {0}: {1}': 'Could not remove {0}: {1}',
  'Продолжить': 'Carry on',

  // ---------- diagnostics ----------
  'Диагностика': 'Diagnostics',
  'Экспортировать отчёт': 'Export report',
  'Отчёт сохранён': 'Report saved',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'Арсенал VIP': 'Arsenal VIP',
  'Арсенал VIP: бессмертные и арканы': 'Arsenal VIP: immortals and arcanas',
  'Облики берутся из установленной игры и видны только тебе.': 'The looks come from your installed game, and only you can see them.',
  'Арсенал доступен только VIP': 'The Arsenal is for VIP only',
  'Смотреть можно всё, а надевать облики — с Premium.': 'You can browse everything; equipping looks takes Premium.',
  'Перейти на Premium': 'Upgrade to Premium',
  'Перейти на Premium за $5.00 USD': 'Upgrade to Premium for $5.00 USD',
  'Включён безопасный режим.': 'Safe mode is on.',
  'Пока он включён, игра не читает косметику, и надетое здесь в игре не появится.': 'While it is on, the game does not read cosmetics, and nothing equipped here will show up in the game.',
  'Сначала выключи безопасный режим: без него игра не читает косметику': 'Turn safe mode off first: without that the game does not read cosmetics',
  'Приложение не ответило — попробуй ещё раз': 'The app did not answer — try again',
  'Найти героя…': 'Find a hero…',
  'Только с арканой': 'Only with an arcana',
  'В схеме игры у этого героя нет предметов, которые можно надеть.': 'The game\'s item schema has nothing this hero can wear.',
  'Комплекты': 'Sets',
  'Таких предметов у героя нет — выбери «Все».': 'This hero has none of these — pick «All».',
  'Надеть комплект': 'Equip set',
  'Надеваю…': 'Equipping…',
  'Надеть': 'Equip',
  'Надето': 'Equipped',
  'Надето: {0}': 'Equipped: {0}',
  'Снять': 'Remove',
  'Снимаю…': 'Removing…',
  'Снято — у героя снова стандартный вид': 'Removed — the hero is back to the default look',
  'Комплект «{0}» надет': 'Set «{0}» equipped',
  'Комплект «{0}»: надето {1}, пропущено {2}': 'Set «{0}»: {1} equipped, {2} skipped',
  'Не надето: {0}': 'Not equipped: {0}',
  'Этот вид виден, только пока у героя выбрана персона.': 'This look only shows while the hero has the persona selected.',
  'Предмет этого слота у героев общий: вид сменится и у {0}.': 'Heroes share the item in this slot: the look changes for {0} too.',
  'Вариантов: {0}': 'Variants: {0}',
  'Стилей: {0}': 'Styles: {0}',
  'Вариант': 'Variant',
  'Стиль': 'Style',
  'Стиль {0}': 'Style {0}',
  'Этот вид сейчас на герое. «Снять» вернёт стандартный предмет, а выбор останется в «Моих модах» выключенным.': 'The hero is wearing this look now. Remove brings the default item back; the pick stays in My mods, switched off.',
  'Стандартный предмет героя станет выглядеть как этот. Файлы модов это не трогает, и видно это только тебе.': 'The hero\'s default item will look like this one. Your mod files are not touched, and only you see it.',
  'Арканы и бессмертные': 'Arcanas and immortals',
  'Арканы': 'Arcanas',
  'Бессмертные': 'Immortals',
  'Все': 'All',
  'Аркана': 'Arcana',
  'Бессмертный': 'Immortal',
  'Легендарный': 'Legendary',
  'Мифический': 'Mythical',
  'Редкий': 'Rare',
  'Необычный': 'Uncommon',
  'Обыкновенный': 'Common',
  'Сезонный': 'Seasonal',
  'Древний': 'Ancient',
  'Облик героя': 'Hero look',
  'Персона': 'Persona',
  'Второе оружие': 'Off-hand weapon',
  'Плечи': 'Shoulders',
  'Пояс': 'Belt',
  'Ноги': 'Legs',
  'Шея': 'Neck',
  'Перчатки': 'Gloves',
  'Верховое животное': 'Mount',
  'Эффекты окружения': 'Ambient effects',
  'Призыв': 'Summon',
  'Способность {0}': 'Ability {0}',
  'Ультимейт': 'Ultimate',
  'Голос': 'Voice',
  'Набор курсоров': 'Cursor pack',
  'Создать аккаунт': 'Create account',
  'Почта': 'Email',
  'Пароль': 'Password',
  'Полное имя': 'Full name',
  'Имя и фамилия': 'First and last name',
  'Минимум 6 символов': 'At least 6 characters',
  'Возраст': 'Age',
  'Дата рождения': 'Date of birth',
  'Адрес проживания': 'Home address',
  'Улица, дом, город': 'Street, number, city',
  'Страна': 'Country',
  'Например: Перу, Испания, Мексика': 'e.g. Peru, Spain, Mexico',
  'Почтовый индекс': 'Postal code',
  'Аккаунт хранится только на этом ПК': 'This account is stored on this PC only',
  'Проверяю…': 'Checking…',
  'Не удалось войти': 'Could not sign in',
  'С возвращением, {0}': 'Welcome back, {0}',
  'Создаю аккаунт…': 'Creating account…',
  'Не удалось создать аккаунт': 'Could not create the account',
  'Аккаунт создан. Добро пожаловать, {0}!': 'Account created. Welcome, {0}!',
  'USD / месяц (~S/. 18.50)': 'USD / month (~S/. 18.50)',
  'Полный доступ к эксклюзивным модам': 'Full access to exclusive mods',
  'Арканы, авторские скины Bleach/Kez и полные сеты.': 'Arcanas, custom Bleach/Kez skins and full sets.',
  'Мгновенная загрузка и установка': 'Instant downloads and installs',
  'Без очередей, на выделенных быстрых серверах.': 'No queues, on dedicated high-speed servers.',
  'Значок Premium в профиле': 'Premium badge on your profile',
  'Особая отметка в профиле и расширенные функции.': 'A distinct mark on your profile, and advanced features.',
  'Приоритетная поддержка 24/7': 'Priority support 24/7',
  'Личная помощь от Dreftian Devs.': 'Personal help from Dreftian Devs.',
  'Оплата на 100% защищена 256-битным шифрованием SSL': 'Payment 100% secured with 256-bit SSL encryption',
  'Способ оплаты': 'Payment method',
  'Карта (Stripe)': 'Card (Stripe)',
  'Банк BCP': 'BCP bank',
  'Номер карты': 'Card number',
  'Срок действия': 'Expiry',
  'ММ/ГГ': 'MM/YY',
  'Имя владельца карты': 'Cardholder name',
  'ИМЯ ФАМИЛИЯ': 'FULL NAME',
  'Оплатить $5.00 USD через Stripe': 'Pay $5.00 USD with Stripe',
  'Оплата через Yape или Plin': 'Pay with Yape or Plin',
  '1. Отсканируй код или переведи на привязанный счёт.': '1. Scan the code or transfer to the linked account.',
  '2. Сумма перевода: {0} (или {1})': '2. Amount to transfer: {0} (or {1})',
  '3. Введи номер операции или код перевода:': '3. Enter your operation number or reference:',
  'Номер операции / код перевода': 'Operation code / Reference',
  'Например: {0}': 'e.g. {0}',
  'Подтвердить оплату Yape / Plin': 'Confirm Yape / Plin payment',
  'Оплата балансом Mercado Pago, картой или наличными в пунктах приёма.': 'Pay with your Mercado Pago balance, a card, or cash at authorized outlets.',
  'Сумма:': 'Amount:',
  'Номер платежа Mercado Pago': 'Mercado Pago payment reference',
  'Подтвердить через Mercado Pago': 'Confirm with Mercado Pago',
  'Banco de Crédito del Perú (BCP), счёт в солях': 'Banco de Crédito del Perú (BCP), soles account',
  'Номер счёта BCP:': 'BCP account number:',
  'Межбанковский код (CCI):': 'Interbank code (CCI):',
  'Точная сумма: S/. 18.50 солей. После перевода введи номер операции, и подписка включится сразу.': 'Exact amount: S/. 18.50 soles. After the transfer, enter the operation number and the subscription switches on at once.',
  'Номер операции / чек BCP': 'Operation number / BCP receipt',
  'Подтвердить перевод BCP': 'Confirm BCP transfer',
  'Stripe и официальные платёжные шлюзы · мгновенная активация': 'Stripe and official payment gateways · Instant activation',
  'Скопировано: {0}': 'Copied: {0}',
  'Не удалось оформить подписку': 'Could not process the subscription',
  'Готово! Подписка Premium включена.': 'Done! Your Premium subscription is on.',
  'Обрабатываю через Stripe…': 'Processing with Stripe…',
  'Проверяю операцию…': 'Checking the operation…',
  'Связываюсь с Mercado Pago…': 'Connecting to Mercado Pago…',
  'Проверяю перевод BCP…': 'Checking the BCP transfer…',
  'Бессрочно (админ)': 'Lifetime access (admin)',
  'Закончилась {0}': 'Ended {0}',
  'Администратор (полный доступ)': 'Administrator (full access)',
  'Подписка Premium ($5.00 USD/мес.)': 'Premium subscription ($5.00 USD/month)',
  'Стандартный план (бесплатный)': 'Standard plan (free)',
  'БЕСПЛАТНО': 'FREE',
  'Состояние аккаунта': 'Account status',
  'Локальная учётная запись (только этот ПК)': 'Local account (this PC only)',
  'Уровень аккаунта': 'Account tier',
  'Подписка действует до': 'Subscription ends',
  'Личные данные и адрес': 'Personal details and address',
  'Возраст и дата рождения': 'Age and date of birth',
  'Адрес': 'Address',
  'Страна и индекс': 'Country and postal code',
  'Способ оплаты и счета': 'Payment method and billing',
  'Привязанная карта': 'Card on file',
  'Карта': 'Card',
  'Владелец и срок действия': 'Cardholder and expiry',
  'Способ': 'Method',
  'Нет привязанных карт и способов оплаты': 'No cards or payment methods on file',
  'Сменить пароль': 'Change password',
  'Текущий пароль': 'Current password',
  'Новый пароль': 'New password',
  'Не удалось сменить пароль': 'Could not change the password',
  'Пароль изменён': 'Password changed',
  'Перейди на Mod Assistant Premium': 'Upgrade to Mod Assistant Premium',
  'Эксклюзивные моды, быстрые загрузки и поддержка всего за $5.00 USD/мес.': 'Exclusive mods, fast downloads and support for just $5.00 USD/month.',
  'Оформить сейчас': 'Upgrade now',
  'Без лимита в 100 модов': 'No 100-mod limit',
  'Достигнут лимит в 100 модов для бесплатного тарифа. На Premium этого лимита нет.': 'Reached the 100-mod limit of the Free plan. Premium has no such limit.',
  'Топ 10: число от 1 до 10 на табличке рейтинга.': 'Top 10: a number from 1 to 10 for the leaderboard plate.',
  'Топ 100: число от 11 до 100 на табличке рейтинга.': 'Top 100: a number from 11 to 100 for the leaderboard plate.',
  'Топ 1000: число от 101 до 6000 на табличке рейтинга.': 'Top 1000: a number from 101 to 6000 for the leaderboard plate.',
  'Медаль ранга и значок героя': 'Rank medal and hero badge',
  'Меняет медаль ранга, звёзды и значок героя Dota Plus только у тебя в клиенте: матчи и настоящий рейтинг не затрагиваются.': 'Changes your rank medal, stars and Dota Plus hero badge in your own client only: your matches and real rating are not touched.',
  'Мод ранга установлен в игре': 'Rank mod active in the game',
  'Базовый ранг аккаунта (мод только для твоего профиля)': 'Your account\'s base rank (the mod is for your profile only)',
  'Без калибровки — мой профиль (рекомендуется)': 'Not calibrated — my profile (recommended)',
  'Все медали (глобально)': 'All medals (global)',
  'Заменяет только медаль твоего профиля. Остальные игроки в матче сохранят свои настоящие медали.': 'Replaces only your profile\'s medal. The other players in the match keep their real medals.',
  '1. Выбери медаль ранга': '1. Pick your rank medal',
  'Медаль, которую ты хочешь видеть в своём профиле.': 'The medal you want to see on your profile.',
  'Без калибровки': 'Not calibrated',
  '2. Звёзды ранга': '2. Rank stars',
  'У медалей Титана вместо звёзд место в рейтинге.': 'Immortal medals show a leaderboard place instead of stars.',
  'С этим базовым рангом игра рисует поверх медали твои настоящие звёзды: выбери столько же, сколько у тебя сейчас, или базу «Без калибровки».': 'With this base rank the game draws your real stars over the medal: pick as many as you have now, or the «Not calibrated» base.',
  '3. MMR в названии мода (до 15 000)': '3. MMR in the mod\'s name (up to 15,000)',
  'Игра не показывает MMR, так что в ней это число ничего не меняет: оно попадает только в название мода в библиотеке. Подставляется по медали, но можно вписать любое.': 'The game shows no MMR, so this number changes nothing in it: it only goes into the mod\'s name in your library. It is filled in from the medal, but you can type any number.',
  'Место в рейтинге Титана': 'Immortal leaderboard place',
  '4. Значок уровня героя (Dota Plus Hero Tier)': '4. Hero level badge (Dota Plus Hero Tier)',
  'Значок и уровень, которые ты хочешь видеть на своих героях.': 'The badge and level you want to see on your heroes.',
  'Уровень {0}': 'Level {0}',
  'Число уровня на значке героя (Dota Plus)': 'Level number on the hero badge (Dota Plus)',
  'Уровень, который будет нарисован на значках героев (например, 30 для Грандмастера).': 'The level drawn on the hero badges (for example 30 for Grandmaster).',
  'Значок героя Dota Plus': 'Dota Plus hero badge',
  'Применить и установить ранг': 'Apply and install rank',
  'Вернуть настоящую медаль': 'Restore original medal',
  'Частые вопросы': 'Frequently asked questions',
  'Можно ли поменять медаль ранга в Dota 2?': 'Can the rank medal be changed in Dota 2?',
  'Да. Mod Assistant подменяет текстуры медали у тебя в клиенте. Настоящий ранг и подбор игроков на серверах Valve не меняются.': 'Yes. Mod Assistant replaces the medal textures in your own client. Your real rank and matchmaking on Valve\'s servers do not change.',
  'Это безопасно? Могут ли забанить за смену медали?': 'Is it safe? Can I be banned for changing the medal?',
  'Медаль заменяется пакетом модов (VPK), точно так же как облики героев. В память ничего не внедряется, и сама игра не меняется.': 'The medal is replaced by a mod package (VPK), exactly like hero cosmetics. Nothing is injected into memory and the game itself is not changed.',
  'Увидят ли другие игроки мою медаль или уровень героя?': 'Will other players see my medal or hero level?',
  'Нет. Это видно только на твоём экране: в профиле, таблице счёта и на экране загрузки.': 'No. It only shows on your screen: profile, scoreboard and loading screen.',
  'Как вернуть настоящую медаль?': 'How do I get my real medal back?',
  'Нажми «{0}» или удали мод в библиотеке в любой момент.': 'Press «{0}» or remove the mod from your library at any time.',
  'Ранг и уровень героя установлены': 'Rank and hero level installed',
  'Вернуть настоящий ранг Dota 2?': 'Restore your original Dota 2 rank?',
  'Ранг возвращён к значениям игры': 'Rank restored to the game\'s defaults',
  'Устранить конфликт': 'Resolve conflict',
  'Конфликт устранён': 'Conflict resolved',
  'Эксклюзивы (нет в магазине)': 'Exclusives (not in the store)',
  'Эксклюзив': 'Exclusive',
  'Не продаётся в магазине: сокровищницы, боевые пропуски и события': 'Never sold in the store: treasures, battle passes and events',
  'Образы из Арсенала VIP пропущены (нужен VIP): {0}': 'Arsenal VIP looks skipped (VIP needed): {0}',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'Основано на': 'Based on',
  'Dota 2 Mod Manager от TheFleece. Это изменённая версия, изменения с 20 сентября 2026': 'Dota 2 Mod Manager by TheFleece. This is a modified version, changed since 20 September 2026',
  'изменения': 'changes',

  // Arsenal VIP, catalog, installer, auth and rank fixes (2026-09-23)
  'Не загружается: нет свободного слота pakNN': 'Not loading: no free pakNN slot',
  'Голова и тело': 'Head and body',
  'Костюм': 'Costume',
  'Хвост': 'Tail',
  'Превращение': 'Shapeshift',
  'Не действует без VIP: вид вернётся, когда подписка снова станет активной': 'Not in effect without VIP: the look comes back when the subscription is active again',
  'Сейчас этот вид в игре не действует, но выбор сохранён': 'This look is not in effect in the game right now, but the choice is kept',
  'Все бессмертные, арканы и эксклюзивы каждого героя, со стилями и комплектами.': 'Every immortal, arcana and exclusive of each hero, with styles and sets.',
  'Ставь моды до предела самой игры: 95 паков в папке языка.': 'Install mods up to the game\'s own limit: 95 paks in the language folder.',
  'Отметка Premium рядом с твоим именем.': 'A Premium mark next to your name.',
  'Подписка действует 30 дней с момента оплаты.': 'The subscription lasts 30 days from payment.',
};

function canonKey(strings) {
  let k = strings[0];
  for (let i = 1; i < strings.length; i++) k += '{' + (i - 1) + '}' + strings[i];
  return k;
}

function fillValues(tmpl, values) {
  return tmpl.replace(/\{(\d+)\}/g, (_, i) => (values[+i] != null ? String(values[+i]) : ''));
}

// tagged template (L`...`) or plain call L('...')
function L(strings, ...values) {
  if (typeof strings === 'string') return tr(strings);
  const key = canonKey(strings);
  const lang = window.I18N_LANG || 'es';
  const loc = window.LOCALES || {};

  if (lang === 'es' && loc.ES) {
    const val = loc.ES[key] || loc.ES[EN[key]];
    if (val != null) return fillValues(val, values);
  } else if (lang === 'ja' && loc.JA) {
    const val = loc.JA[key] || loc.JA[EN[key]];
    if (val != null) return fillValues(val, values);
  } else if (lang === 'zh' && loc.ZH) {
    const val = loc.ZH[key] || loc.ZH[EN[key]];
    if (val != null) return fillValues(val, values);
  } else if (lang === 'en') {
    if (EN[key] != null) return fillValues(EN[key], values);
  } else if (lang === 'ru') {
    let out = strings[0];
    for (let i = 0; i < values.length; i++) out += String(values[i]) + strings[i + 1];
    return out;
  }

  if (EN[key] != null) return fillValues(EN[key], values);
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += String(values[i]) + strings[i + 1];
  return out;
}

// plain-string lookup for data-driven labels
function tr(s) {
  if (s == null) return s;
  const lang = window.I18N_LANG || 'es';
  const loc = window.LOCALES || {};
  if (lang === 'es' && loc.ES) return loc.ES[s] || loc.ES[EN[s]] || EN[s] || s;
  if (lang === 'ja' && loc.JA) return loc.JA[s] || loc.JA[EN[s]] || EN[s] || s;
  if (lang === 'zh' && loc.ZH) return loc.ZH[s] || loc.ZH[EN[s]] || EN[s] || s;
  if (lang === 'en') return EN[s] || s;
  return s;
}

window.L = L;
window.tr = tr;
