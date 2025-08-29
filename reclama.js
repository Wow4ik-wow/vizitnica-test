// reclаma.js — финальная версия для работы с GAS (заменить файл целиком)
const GITHUB_JSON_URL =
  "https://raw.githubusercontent.com/Wow4ik-wow/vizitnica/master/reclama.json";

// HTML-блоки
const SIDE_BLOCK_IDS = ["promoLeft", "promoRight"];
const BOTTOM_BLOCK_IDS = ["promoRow1", "promoRow2", "promoRow3", "promoRow4"];
const ALL_BLOCK_IDS = [...SIDE_BLOCK_IDS, ...BOTTOM_BLOCK_IDS];

// Глобальные данные
let GLOBAL = {
  orders: [],
  fallbacks: [],
  schedule: {},
};

// трекинг состояния
let lastDisplayedHourKyiv = null;
let lastJsonReloadDateKyiv = null; // 'YYYY-MM-DD' когда последний раз обновляли JSON в окне 00:00-00:30
let kyivHourCheckerInterval = null;
let kyivJsonReloadCheckerInterval = null;

// --- Утилиты ---
// получаем сейчас по Kyiv как объект {dateKey: 'DD.MM.YYYY', year, month, day, hour, minute, isoDate:'YYYY-MM-DD'}
function getKyivNowParts() {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const day = map.day;
  const month = map.month;
  const year = map.year;
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  return {
    dateKey: `${day}.${month}.${year}`,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour,
    minute,
    isoDate: `${year}-${month}-${day}`,
  };
}

// парсим id из строки расписания "10000012 Описание..."
function extractIdFromScheduleString(s) {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^\s*(\d+)\b/);
  return m ? m[1] : null;
}

// безопасный доступ к полю (если ключи всегда стабильны, это просто удобство)
function field(obj, key) {
  if (!obj) return undefined;
  return obj[key];
}

// парсим поле Города, которое у тебя приходит как строка '["Киев"]'
function parseCitiesField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // если это JSON-строка
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      trimmed.startsWith("{")
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed))
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        // если объект - взять значения
        if (typeof parsed === "object")
          return Object.values(parsed)
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean);
      } catch (e) {
        // не JSON — пробуем разделить по запятым
        return trimmed
          .split(",")
          .map((s) => s.replace(/[\[\]'"`]/g, "").trim())
          .filter(Boolean);
      }
    }
    // обычная запятой-разделённая строка
    return trimmed
      .split(",")
      .map((s) => s.replace(/[\[\]'"`]/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

// сравниваем строки по регистру (нормализуем)
function eqNorm(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// --- Фильтрация по ГЕО (строго по твоему требованию) ---
// userGeo: { region: 'Одесская обл', city: 'Одесса' } — оба поля обязательны для показа заказа.
// Если один из них пуст — считаем, что пользователь вне ГЕО и показываем только заглушки.
function matchesGeoByFilters(order, userGeo) {
  // если пользователь не заполнил оба поля — не показывать ни одного заказа
  if (!userGeo || !userGeo.region || !userGeo.city) return false;

  const target = (
    field(order, "Гео таргет") ||
    field(order, "ГЕО таргет") ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  // Если явно таргет пуст или 'все' — считаем подходящим
  if (
    !target ||
    target === "все" ||
    target === "весь мир" ||
    target === "всей страны" ||
    target.includes("страна") ||
    target.includes("весь")
  ) {
    return true;
  }

  // Таргет по городу
  if (target.includes("город")) {
    const citiesRaw =
      field(order, "Города") ||
      field(order, "Города/села") ||
      field(order, "Города/Села") ||
      "";
    const cities = parseCitiesField(citiesRaw);
    if (cities.length === 0) return false;
    return cities.some((c) => eqNorm(c, userGeo.city));
  }

  // Таргет по области
  if (target.includes("область") || target.includes("обл")) {
    const regionRaw =
      field(order, "Область") ||
      field(order, "ГЕО Область") ||
      field(order, "Гео Область") ||
      "";
    if (!regionRaw) return false;
    return eqNorm(regionRaw, userGeo.region);
  }

  // Другие варианты — по умолчанию считать подходящим (чтобы не терять показ)
  return true;
}

// --- Извлечение id(ов) из расписания для текущего часа (используем Kyiv время) ---
function getScheduledIdsForNow(schedule) {
  if (!schedule) return [];

  const now = getKyivNowParts();
  const dayKey = now.dateKey; // 'DD.MM.YYYY'
  const hour = now.hour; // 0..23

  const daySchedule = schedule[dayKey];
  if (!daySchedule) return [];

  // daySchedule — объект с ключами как "00-01", "02-03" и т.д.
  // находим ключ, диапазон которого содержит текущий час
  let found = null;
  for (const rangeKey of Object.keys(daySchedule)) {
    const m = rangeKey.match(/(\d{1,2})-(\d{1,2})/);
    if (!m) continue;
    let start = Number(m[1]);
    let end = Number(m[2]);
    // корректируем на цикличность (например 23-00)
    let adjHour = hour;
    let adjEnd = end;
    if (end <= start) adjEnd = end + 24;
    if (adjHour < start) adjHour += 24;
    if (adjHour >= start && adjHour < adjEnd) {
      found = daySchedule[rangeKey];
      break;
    }
  }

  if (!found) return [];

  // found — массив строк типа "10000012 Описание..."
  const ids = [];
  if (Array.isArray(found)) {
    for (const v of found) {
      const id = extractIdFromScheduleString(v);
      if (id) ids.push(id);
    }
  }
  return ids;
}

// --- Рендер блока (отдельная карточка) ---
function renderBlockById(blockId, item) {
  const el = document.getElementById(blockId);
  if (!el) return;
  if (!item) {
    el.innerHTML = '<div class="ad-card empty">Рекламный блок</div>';
    el.onclick = null;
    el.style.cursor = "default";
    return;
  }
  const title = field(item, "Название") || field(item, "title") || "";
  const desc = field(item, "Описание") || field(item, "description") || "";
  const imgRaw =
    field(item, "Ссылки на картинки") ||
    field(item, "Ссылка на картинку") ||
    field(item, "image") ||
    "";
  const imgUrl = imgRaw ? convertDriveLink(imgRaw) : "";
  const externalLink =
    field(item, "Ссылка на сайт") ||
    field(item, "link") ||
    field(item, "url") ||
    "";
  const id =
    field(item, "ID заказа") ||
    field(item, "ID") ||
    field(item, "orderId") ||
    "";

  const imgHtml = imgUrl
    ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(
        title
      )}" onerror="this.style.display='none'">`
    : "";

  el.innerHTML = `
    <div class="ad-card">
      ${imgHtml}
      <div class="ad-text">
        <div class="ad-title">${escapeHtml(title)}</div>
        <div class="ad-desc">${escapeHtml(desc)}</div>
      </div>
    </div>
  `;
  if (externalLink) {
    el.onclick = () => window.open(externalLink, "_blank");
    el.style.cursor = "pointer";
  } else if (id) {
    el.onclick = () =>
      window.open(`reclama.html?id=${encodeURIComponent(id)}`, "_blank");
    el.style.cursor = "pointer";
  } else {
    el.onclick = null;
    el.style.cursor = "default";
  }
}

// экранирование для безопасности вывода
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Построение итоговой выборки и отрисовка ---
// userGeo: {region, city}; если пуст — считаем пользователь не указал GEO и показываем только заглушки
function buildAndRenderAll(userGeo) {
  // берем id(ы) из расписания для текущего часа по Kyiv
  const scheduledIds = getScheduledIdsForNow(GLOBAL.schedule); // массив строк id
  // если расписания нет или пусто — покажем заглушки
  if (!scheduledIds || scheduledIds.length === 0) {
    // просто заполнить все 6 блоков заглушками (уникальными если возможно)
    fillAllWithFallbacks();
    return;
  }

  // Найдём все заказы с ID из scheduledIds
  const scheduledSet = new Set(scheduledIds.map(String));
  const matchedOrders = GLOBAL.orders.filter((o) => {
    const oid = String(field(o, "ID заказа") || field(o, "ID") || "");
    return oid && scheduledSet.has(oid);
  });

  // Разделим на боковые и нижние, затем отфильтруем по GEO (строго)
  const sideOrders = matchedOrders
    .filter((o) => {
      const t = (field(o, "Тип блока") || "").toString().toLowerCase();
      return t.includes("бок"); // "боковой"
    })
    .filter((o) => matchesGeoByFilters(o, userGeo));

  const bottomOrders = matchedOrders
    .filter((o) => {
      const t = (field(o, "Тип блока") || "").toString().toLowerCase();
      return t.includes("ниж"); // "нижний"
    })
    .filter((o) => matchesGeoByFilters(o, userGeo));

  // формируем итоговые массивы
  const sidesToShow = []; // length 2
  const bottomsToShow = []; // length 4

  // Сторонам: если 0 — 2 заглушки; если 1 — 1 заказ + 1 заглушка; если 2 — оба заказа.
  if (sideOrders.length === 0) {
    // будут заполнены заглушками ниже
  } else if (sideOrders.length === 1) {
    sidesToShow.push(sideOrders[0]);
  } else {
    // 2 или >2, но по таблице гарантировано <=2
    sidesToShow.push(...sideOrders.slice(0, 2));
  }

  // Низ: просто берём все подходящие (по таблице их <=4)
  if (bottomOrders.length > 0) bottomsToShow.push(...bottomOrders.slice(0, 4));

  // теперь подготовим пул заглушек (уникальные, не повторяем одновременно)
  const fallbackPool = Array.isArray(GLOBAL.fallbacks)
    ? GLOBAL.fallbacks.slice()
    : [];
  shuffleArray(fallbackPool);
  const usedFallbackIds = new Set();

  function takeFallback() {
    while (fallbackPool.length) {
      const cand = fallbackPool.shift();
      const fid = String(field(cand, "ID заказа") || field(cand, "ID") || "");
      if (!fid || !usedFallbackIds.has(fid)) {
        if (fid) usedFallbackIds.add(fid);
        return cand;
      }
    }
    return null;
  }

  // Заполняем боковые слоты (нужно 2)
  while (sidesToShow.length < 2) {
    const fb = takeFallback();
    sidesToShow.push(fb || null);
  }

  // Заполняем нижние слоты (нужно 4)
  while (bottomsToShow.length < 4) {
    const fb = takeFallback();
    bottomsToShow.push(fb || null);
    if (fb === null) break; // если закончились заглушки — выйдем, оставшиеся — null
  }

  // Если всё ещё какие-то слоты null — оставляем пустыми
  for (let i = 0; i < SIDE_BLOCK_IDS.length; i++) {
    renderBlockById(SIDE_BLOCK_IDS[i], sidesToShow[i] || null);
  }
  for (let i = 0; i < BOTTOM_BLOCK_IDS.length; i++) {
    renderBlockById(BOTTOM_BLOCK_IDS[i], bottomsToShow[i] || null);
  }
}

// заполняем все блоки заглушками (когда пользователь не указал GEO или расписание пустой)
function fillAllWithFallbacks() {
  const pool = Array.isArray(GLOBAL.fallbacks) ? GLOBAL.fallbacks.slice() : [];
  shuffleArray(pool);
  // берем по очереди 6 уникальных заглушек
  const chosen = [];
  const used = new Set();
  while (chosen.length < ALL_BLOCK_IDS.length && pool.length) {
    const cand = pool.shift();
    const fid = String(field(cand, "ID заказа") || field(cand, "ID") || "");
    if (!fid || !used.has(fid)) {
      if (fid) used.add(fid);
      chosen.push(cand);
    }
  }
  // заполняем оставшиеся null
  while (chosen.length < ALL_BLOCK_IDS.length) chosen.push(null);
  for (let i = 0; i < ALL_BLOCK_IDS.length; i++) {
    renderBlockById(ALL_BLOCK_IDS[i], chosen[i]);
  }
}

// Fisher-Yates shuffle
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// --- Получение значений фильтрации пользователя (Область и Город) ---
// Попытка найти элементы в DOM — проверяем несколько распространённых селекторов.
// Если элементы найдены — возвращаем {region, city} (строки — возможно пустые).
function findFilterElements() {
  const regionSelectors = ["#filterRegion"];
  const citySelectors = ["#filterCity"];

  let regionEl = null,
    cityEl = null;
  for (const s of regionSelectors) {
    const e = document.querySelector(s);
    if (e) {
      regionEl = e;
      break;
    }
  }
  for (const s of citySelectors) {
    const e = document.querySelector(s);
    if (e) {
      cityEl = e;
      break;
    }
  }
  return { regionEl, cityEl };
}

function getUserFiltersFromPage() {
  const { regionEl, cityEl } = findFilterElements();
  const region = regionEl
    ? (regionEl.value || regionEl.textContent || "").toString().trim()
    : "";
  const city = cityEl
    ? (cityEl.value || cityEl.textContent || "").toString().trim()
    : "";
  return { region, city, _els: { regionEl, cityEl } };
}

// --- Загрузка JSON ---
async function loadJsonFromGitHub(force = false) {
  try {
    const resp = await fetch(GITHUB_JSON_URL + "?_=" + Date.now(), {
      cache: "no-store",
    });
    if (!resp.ok) throw new Error("Fetch error " + resp.status);
    const payload = await resp.json();

    GLOBAL.orders = payload.orders || payload.Заказы || payload.ads || [];
    GLOBAL.fallbacks = payload.fallback || payload.fallbacks || payload.Заглушки || [];
    GLOBAL.schedule = payload.schedule || payload.расписание || payload.calendar || {};

    const uf = getUserFiltersFromPage();
    buildAndRenderAll({ region: uf.region, city: uf.city });

    return true;
  } catch (e) {
    console.error("Ошибка загрузки JSON с GitHub:", e);
    return false;
  }
}


// --- Инициализация и интервалы ---
// Инициализируем: загружаем JSON, ставим слушатели на поля фильтрации, запускаем чекеры
async function initReclama() {
  // начальная загрузка JSON
  await loadJsonFromGitHub();

  // подписываемся на изменения фильтрации пользователя (если элементы найдены)
  const { regionEl, cityEl } = findFilterElements();
  if (regionEl) regionEl.addEventListener("change", onFiltersChanged);
  if (cityEl) cityEl.addEventListener("change", onFiltersChanged);

  // стартуем интервал проверки часа по Kyiv (каждые 20s)
  if (kyivHourCheckerInterval) clearInterval(kyivHourCheckerInterval);
  kyivHourCheckerInterval = setInterval(() => {
    const now = getKyivNowParts();
    if (lastDisplayedHourKyiv === null) {
      lastDisplayedHourKyiv = now.hour;
      // при первом запуске — отрисуем (на случай, если JSON пришёл раньше)
      const u = getUserFiltersFromPage();
      buildAndRenderAll({ region: u.region, city: u.city });
    } else if (now.hour !== lastDisplayedHourKyiv) {
      lastDisplayedHourKyiv = now.hour;
      const u = getUserFiltersFromPage();
      buildAndRenderAll({ region: u.region, city: u.city });
    }
  }, 20 * 1000);

  // интервал для ежедневного обновления JSON в окне 00:00-00:30 Kyiv
  if (kyivJsonReloadCheckerInterval)
    clearInterval(kyivJsonReloadCheckerInterval);
  kyivJsonReloadCheckerInterval = setInterval(async () => {
    const now = getKyivNowParts();
    // ключ для дня, чтобы не перезагружать несколько раз в ту же ночь
    const ym = `${now.year}-${String(now.month).padStart(2, "0")}-${String(
      now.day
    ).padStart(2, "0")}`; // YYYY-MM-DD
    if (now.hour === 0 && now.minute >= 0 && now.minute <= 30) {
      if (lastJsonReloadDateKyiv !== ym) {
        const ok = await loadJsonFromGAS(true);
        if (ok) lastJsonReloadDateKyiv = ym;
      }
    } else {
      // если вышли из окна — дадим возможность следующей ночи
    }
  }, 60 * 1000); // каждую минуту проверяем окно
}

// при изменении фильтров — пересобрать выборку немедленно
function onFiltersChanged() {
  const u = getUserFiltersFromPage();
  buildAndRenderAll({ region: u.region, city: u.city });
}

// --- convertDriveLink (сохранена, простая и надёжная) ---
function convertDriveLink(url) {
  if (!url) return "";
  const s = String(url).trim();
  try {
    // уже прямая картинка?
    if (
      /^https?:\/\//i.test(s) &&
      /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(s)
    )
      return s;
    // layout: https://drive.google.com/uc?id=FILE_ID or /file/d/FILE_ID/view
    let m = s.match(/uc\?id=([-\w]{20,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    m = s.match(/\/d\/([-\w]{20,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    m = s.match(/id=([-\w]{20,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
    // иначе возвращаем как есть
    return s;
  } catch (e) {
    return s;
  }
}

// --- старт при готовности DOM ---
document.addEventListener("DOMContentLoaded", () => {
  initReclama().catch((e) => console.error(e));
});
