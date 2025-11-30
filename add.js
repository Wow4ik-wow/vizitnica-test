// === КОНФИГУРАЦИЯ ===
const spreadsheetId = "1vKErM8FIGNM5if0zpsaCWutsQgscqrPo2bUWJACTcf0";
const sheetsURL = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&tq=`;
const formUrl =
  "https://script.google.com/macros/s/AKfycbw6FAWTC1ux2M3H6H8tuoZvmVEpYEfWcpihd0C0Huh-U_ErgajS6WfKOIugafn1yFTzVg/exec";

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentUser = null;

// СРАЗУ загружаем пользователя из localStorage
try {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
} catch (e) {
  console.warn("Ошибка загрузки пользователя:", e);
}
const selectedValues = {
  selectedTownsContainer: [],
  selectedKindsContainer: [],
};

// === БАЗА ТЕЛЕФОНОВ ДЛЯ ПРОВЕРКИ ДУБЛЕЙ ===
let phoneDatabase = null;
let lastDataUpdate = null;
const DATA_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

// === ОСПОРЕННЫЕ ТЕЛЕФОНЫ ===
let disputedPhones = [];

// ОТЛАДКА - ДОБАВЬ ЭТОТ КОД ПОСЛЕ ОБЪЯВЛЕНИЯ currentUser
console.log("=== ДЕБАГ ФОРМЫ ===");
console.log("currentUser:", currentUser);
console.log("localStorage user:", localStorage.getItem("user"));

if (currentUser) {
  console.log("currentUser.id:", currentUser.id);
  console.log("currentUser.name:", currentUser.name);
  console.log("currentUser.role:", currentUser.role);
} else {
  console.log("currentUser is NULL!");
}

// === ОСНОВНЫЕ ФУНКЦИИ ===

// Инициализация при загрузке
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadPhoneDatabase(); // Загружаем базу телефонов для проверки дублей
  setupAllEventListeners();
  loadInitialData();
});

// Проверка авторизации
async function checkAuth() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);

      // ДОБАВЛЯЕМ: Получаем ID пользователя с сервера
      if (currentUser && currentUser.email && !currentUser.id) {
        const userId = await getUserIdFromServer(currentUser.email);
        if (userId) {
          currentUser.id = userId;
          currentUser.uid = userId;
          localStorage.setItem("user", JSON.stringify(currentUser));
        }
      }
    } catch (e) {
      localStorage.removeItem("user");
    }
  }

  if (!currentUser || currentUser.role !== "admin") {
    showMessage("Доступ запрещён. Требуются права администратора.", "error");
    setTimeout(() => (window.location.href = "index.html"), 3000);
    return;
  }

  if (typeof Telegram !== "undefined" && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
}

// ДОБАВИТЬ ЭТУ ФУНКЦИЮ В add.js
async function getUserIdFromServer(email) {
  try {
    const response = await fetch(
      `https://script.google.com/macros/s/AKfycbzpraBNAzlF_oqYIDLYVjczKdY6Ui32qJNwY37HGSj6vtPs9pXseJYqG3oLAr28iZ0c/exec?getUserByEmail=${encodeURIComponent(
        email
      )}`
    );
    const data = await response.json();
    return data.success ? data.uid : null;
  } catch (e) {
    console.error("Ошибка при получении ID пользователя:", e);
    return null;
  }
}

// Настройка всех обработчиков событий
function setupAllEventListeners() {
  // Навигация
  document.getElementById("backToMain").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Область - взаимоисключение
  const regionSelect = document.getElementById("regionSelect");
  const regionCustom = document.getElementById("regionCustom");
  regionCustom.addEventListener("input", () => {
    regionSelect.value = "";
    clearTownSelection();
  });
  regionSelect.addEventListener("change", () => {
    regionCustom.value = "";
    loadTownsByRegion(regionSelect.value);
  });

  // Ограничения длины полей с уведомлениями
  setupFieldLengthLimit("regionCustom", 50, "Область-великан!");
  setupFieldLengthLimit("townCustom", 50, "Город-гигант!");
  setupFieldLengthLimit("cityDistrict", 50, "Район-исполин!");
  setupFieldLengthLimit(
    "kindCustom",
    75,
    "Слишком много деятелей в деятельности!"
  );
  setupFieldLengthLimit("nameInput", 50, "Ничего себе у вас имя длинное!");
  setupFieldLengthLimit(
    "companyInput",
    75,
    "Ваша компания слишком разрослась!"
  );
  setupFieldLengthLimit("addressInput", 100, "Это вам не роман писать!");

  // Города и виды деятельности
  document
    .getElementById("townSelect")
    .addEventListener("change", handleTownSelect);
  document
    .getElementById("kindSelect")
    .addEventListener("change", handleKindSelect);
  setupMultiInput("townCustom", "selectedTownsContainer", 10);
  setupMultiInput("kindCustom", "selectedKindsContainer", 10);

  // Профиль деятельности
  document
    .getElementById("profileSelect")
    .addEventListener("change", async function () {
      await loadKindsByProfile(this.value);
    });

  // Счётчики символов
  document
    .getElementById("descShort")
    .addEventListener("input", updateCharCounters);
  document
    .getElementById("descLong")
    .addEventListener("input", updateLongCharCounter);

  // Телефоны
  setupPhoneHandlers();

  // Ссылки
  setupLinksHandlers();

  // Форма
  document
    .getElementById("serviceForm")
    .addEventListener("submit", handleSubmit);
  document.getElementById("resetBtn").addEventListener("click", handleReset);

  // Отслеживание прогресса
  document
    .querySelectorAll(
      "#serviceForm input, #serviceForm select, #serviceForm textarea"
    )
    .forEach((element) => {
      element.addEventListener("input", updateProgress);
      element.addEventListener("change", updateProgress);
    });
}

// Загрузка начальных данных
function loadInitialData() {
  loadRegionList();
  loadProfileList();
  updateProgress();
  updateCharCounters();
}

// === РАБОТА С GOOGLE SHEETS ===

// Загрузка данных из таблицы
async function fetchSheetData(sheet) {
  try {
    const query = `SELECT *`;
    const url = `${sheetsURL}${query}&sheet=${sheet}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    return json.table.rows.map((row) =>
      row.c.map((cell) => (cell ? cell.v : ""))
    );
  } catch (error) {
    console.error(`Ошибка загрузки данных из ${sheet}:`, error);
    showMessage(
      "Ошибка загрузки данных. Проверьте подключение к интернету.",
      "error"
    );
    return [];
  }
}

// Загрузка списка областей
async function loadRegionList() {
  try {
    const rows = await fetchSheetData("Населённые пункты");
    const dataRows = rows.slice(1); // пропускаем заголовки
    const all = dataRows
      .map((r) => (r[1] || "").split(","))
      .flat()
      .map(cleanText)
      .filter(Boolean);
    const list = countAndSort(all);
    const select = document.getElementById("regionSelect");

    list.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  } catch (error) {
    showMessage("Ошибка загрузки списка областей", "error");
  }
}

// Загрузка городов по области
async function loadTownsByRegion(region) {
  if (!region) {
    document.getElementById("townSelect").disabled = true;
    return;
  }

  try {
    const rows = await fetchSheetData("Населённые пункты");
    const towns = rows
      .filter((row) => {
        const areas = (row[1] || "").split(",").map((s) => cleanText(s));
        return areas.includes(region);
      })
      .map((r) => (r[0] || "").split(","))
      .flat()
      .map(cleanText)
      .filter(Boolean);

    const uniqueTowns = [...new Set(towns)].sort();
    const select = document.getElementById("townSelect");
    select.innerHTML = '<option value="">-- Выберите город --</option>';

    uniqueTowns.forEach((town) => {
      const opt = document.createElement("option");
      opt.value = town;
      opt.textContent = town;
      select.appendChild(opt);
    });

    select.disabled = false;
  } catch (error) {
    showMessage("Ошибка загрузки списка городов", "error");
  }
}

// Загрузка профилей деятельности
async function loadProfileList() {
  try {
    const rows = await fetchSheetData("Разделы");
    const select = document.getElementById("profileSelect");

    rows.slice(7).forEach((r) => {
      const val = cleanText(r[2]);
      if (val) {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
    });
  } catch (error) {
    showMessage("Ошибка загрузки списка профилей", "error");
  }
}

// Загрузка видов деятельности по профилю
async function loadKindsByProfile(profile) {
  if (!profile) {
    document.getElementById("kindSelect").disabled = true;
    return;
  }

  try {
    const rows = await fetchSheetData("Категории");
    const kinds = rows
      .filter((r) => cleanText(r[0]) === profile)
      .map((r) => cleanText(r[1]))
      .filter(Boolean);

    const uniqueKinds = [...new Set(kinds)];
    const select = document.getElementById("kindSelect");
    select.innerHTML = '<option value="">-- Выберите вид --</option>';

    uniqueKinds.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });

    select.disabled = false;
    selectedValues.selectedKindsContainer = [];
    document.getElementById("selectedKindsContainer").innerHTML = "";
  } catch (error) {
    showMessage("Ошибка загрузки видов деятельности", "error");
  }
}

// === ФУНКЦИИ ДЛЯ ПРОВЕРКИ ТЕЛЕФОНОВ ===

// Загрузка базы телефонов из data.json
async function loadPhoneDatabase() {
  try {
    console.log("Загружаем базу телефонов...");
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);

    const allCards = await response.json();
    phoneDatabase = buildPhoneMap(allCards);
    lastDataUpdate = Date.now();
    console.log("База телефонов загружена успешно");
  } catch (error) {
    console.warn("Не удалось загрузить базу телефонов:", error);
    phoneDatabase = null;
  }
}

// Построение карты телефонов для быстрой проверки
function buildPhoneMap(cards) {
  const phoneMap = {};

  cards.forEach((card) => {
    const profile = card["Профиль деятельности"];
    const author = card["Автор"] || "Неизвестно";
    const phones = (card["Телефоны"] || "")
      .split(",")
      .map((phone) => phone.trim())
      .filter((phone) => phone);

    phones.forEach((phone) => {
      // Нормализуем номер телефона
      const normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length >= 10) {
        if (!phoneMap[normalizedPhone]) {
          phoneMap[normalizedPhone] = [];
        }
        phoneMap[normalizedPhone].push({
          profile,
          author,
          cardInfo: card,
        });
      }
    });
  });

  return phoneMap;
}

// Проверка телефона на конфликты
function checkPhoneConflict(phone, currentProfile) {
  if (!phoneDatabase || !currentProfile) return null;

  const normalizedPhone = phone.replace(/\D/g, "");
  const conflicts = phoneDatabase[normalizedPhone];

  if (!conflicts) return null;

  // Ищем конфликты в том же профиле
  const profileConflicts = conflicts.filter(
    (conflict) => conflict.profile === currentProfile
  );

  if (profileConflicts.length === 0) return null;

  return {
    phone: normalizedPhone,
    conflicts: profileConflicts,
  };
}

// Показ уведомления о конфликте с чужим номером
function showPhoneConflictNotification(conflictData) {
  const conflict = conflictData.conflicts[0];
  const card = conflict.cardInfo;

  const companyName = card["Компания"] || card["Имя"] || "Не указано";
  const description = card["Описание (до 75 симв)"] || "Нет описания";
  const shortDescription =
    description.length > 30
      ? description.substring(0, 30) + "..."
      : description;

  const message = `
        Этот номер уже используется другим пользователем!
        
        Визитка: ${companyName}
        Описание: ${shortDescription}
        ID: ${card["ID"] || "Не указан"}
        
        Хотите оспорить эту визитку?
    `;

  if (confirm(message)) {
    // ЗАПОМИНАЕМ оспоренный телефон
    disputedPhones.push(conflictData.phone);
    return "dispute";
  } else {
    return "cancel";
  }
}

// Показ уведомления о своем повторе
function showOwnPhoneConflictNotification(conflictData) {
  const conflict = conflictData.conflicts[0];
  const card = conflict.cardInfo;

  const companyName = card["Компания"] || card["Имя"] || "Не указано";

  const message = `
        Вы уже делали визитку с этим номером!
        
        Визитка: ${companyName}
        ID: ${card["ID"] || "Не указан"}
        
        Хотите отредактировать её?
    `;

  if (confirm(message)) {
    return "edit";
  } else {
    return "cancel";
  }
}

// === ОБРАБОТКА ФОРМЫ ===

// Обработчик выбора города
function handleTownSelect(e) {
  const val = e.target.value;
  if (!val) return;

  const containerId = "selectedTownsContainer";

  if (selectedValues[containerId].includes(val)) {
    selectedValues[containerId] = selectedValues[containerId].filter(
      (v) => v !== val
    );
  } else {
    if (selectedValues[containerId].length >= 10) {
      showMessage("Нельзя выбрать более 10 населённых пунктов", "warning");
      e.target.value = "";
      return;
    }
    selectedValues[containerId].push(val);
  }

  updateSelectedTownsUI();
  e.target.value = "";
  updateProgress();
}

// Обработчик выбора вида деятельности
function handleKindSelect(e) {
  const val = e.target.value;
  if (!val) return;

  const containerId = "selectedKindsContainer";

  if (selectedValues[containerId].includes(val)) {
    e.target.value = "";
    return;
  }

  if (selectedValues[containerId].length >= 10) {
    showMessage("Нельзя выбрать более 10 видов деятельности", "warning");
    e.target.value = "";
    return;
  }

  addSelectedValue(val, containerId, 10);
  e.target.value = "";
  updateProgress();
}

// Настройка множественного ввода
function setupMultiInput(inputId, containerId, limit) {
  const input = document.getElementById(inputId);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = cleanText(e.target.value);
      if (!val) return;

      if (selectedValues[containerId].includes(val)) {
        showMessage("Это значение уже добавлено", "warning");
        return;
      }

      if (selectedValues[containerId].length >= limit) {
        showMessage(`Нельзя выбрать более ${limit} значений`, "warning");
        return;
      }

      addSelectedValue(val, containerId, limit);
      e.target.value = "";
      updateProgress();
    }
  });

  input.addEventListener("blur", (e) => {
    const val = cleanText(e.target.value);
    if (
      val &&
      !selectedValues[containerId].includes(val) &&
      selectedValues[containerId].length < limit
    ) {
      addSelectedValue(val, containerId, limit);
      e.target.value = "";
      updateProgress();
    }
  });
}

// Настройка телефонов
function setupPhoneHandlers() {
  const input = document.getElementById("phoneInput");
  const btn = document.getElementById("addPhoneBtn");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhoneNumber();
    }
  });

  btn.addEventListener("click", addPhoneNumber);

  input.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value && !value.startsWith("380")) {
      value = "380" + value;
    }
    if (value.length > 12) {
      value = value.slice(0, 12);
    }
    e.target.value = value;
  });
}

// Настройка ссылок
function setupLinksHandlers() {
  document.querySelectorAll(".link-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const type = checkbox.dataset.type;
      const container = document.getElementById("linksInputsContainer");
      const existing = container.querySelector(`[data-type="${type}"]`);

      if (checkbox.checked && !existing) {
        const inputGroup = document.createElement("div");
        inputGroup.className = "link-input-group";
        inputGroup.dataset.type = type;

        const label = document.createElement("label");
        label.textContent = getLinkTypeLabel(type) + ":";
        label.className = "link-input-label";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = getLinkPlaceholder(type);
        input.className = "form-input";
        input.dataset.type = type;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "×";
        removeBtn.className = "link-remove-btn";
        removeBtn.addEventListener("click", () => {
          checkbox.checked = false;
          inputGroup.remove();
        });

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        inputGroup.appendChild(removeBtn);
        container.appendChild(inputGroup);
      } else if (existing) {
        existing.remove();
      }
    });
  });
}

// === УТИЛИТЫ ===

// Очистка текста
function cleanText(str) {
  return String(str || "")
    .replace(/[«»„“"'`]/g, "")
    .trim();
}

// Сортировка по частоте
function countAndSort(arr) {
  const map = {};
  arr.forEach((v) => (map[v] = (map[v] || 0) + 1));
  return Object.keys(map).sort((a, b) => map[b] - map[a]);
}

// Добавление выбранного значения
function addSelectedValue(val, containerId, limit) {
  if (selectedValues[containerId].includes(val)) return;

  selectedValues[containerId].push(val);
  const container = document.getElementById(containerId);

  const span = document.createElement("span");
  span.textContent = val;
  span.className = "selected-item";
  span.title = "Клик для удаления";

  span.addEventListener("click", () => {
    span.remove();
    selectedValues[containerId] = selectedValues[containerId].filter(
      (v) => v !== val
    );
    updateProgress();
  });

  container.appendChild(span);
}

// Очистка выбора городов
function clearTownSelection() {
  selectedValues.selectedTownsContainer = [];
  document.getElementById("selectedTownsContainer").innerHTML = "";
  document.getElementById("townSelect").innerHTML =
    '<option value="">-- Выберите город --</option>';
  document.getElementById("townSelect").disabled = true;
  document.getElementById("townCustom").value = "";
  updateProgress();
}

// Обновление UI выбранных городов
function updateSelectedTownsUI() {
  const container = document.getElementById("selectedTownsContainer");
  container.innerHTML = "";

  selectedValues.selectedTownsContainer.forEach((val) => {
    const span = document.createElement("span");
    span.textContent = val;
    span.className = "selected-item";
    span.title = "Клик для удаления";

    span.addEventListener("click", () => {
      selectedValues.selectedTownsContainer =
        selectedValues.selectedTownsContainer.filter((v) => v !== val);
      updateSelectedTownsUI();
      updateProgress();
    });

    container.appendChild(span);
  });
}

// Добавление телефона
function addPhoneNumber() {
  // ОТЛАДКА - ДОБАВЬ В НАЧАЛО ФУНКЦИИ
  console.log("=== ДЕБАГ addPhoneNumber ===");
  console.log("currentUser:", currentUser);
  console.log("currentUser.id:", currentUser?.id);
  console.log("phoneDatabase:", phoneDatabase);
  const debugProfile = document.getElementById("profileSelect").value;
  console.log("currentProfile:", debugProfile);

  const input = document.getElementById("phoneInput");
  const container = document.getElementById("phonesContainer");
  const val = input.value.trim();

  console.log("Введённый телефон:", val);
  // КОНЕЦ ОТЛАДКИ

  if (!/^380\d{9}$/.test(val)) {
    showMessage("Неверный формат телефона. Пример: 380671112233", "error");
    return;
  }

  const existingPhones = Array.from(
    container.querySelectorAll(".phone-item")
  ).map((el) => el.textContent.replace(" ×", ""));

  if (existingPhones.includes(val)) {
    showMessage("Этот номер уже добавлен", "warning");
    input.value = "";
    return;
  }

  if (existingPhones.length >= 10) {
    showMessage("Можно добавить не более 10 номеров", "warning");
    return;
  }

  // НОВАЯ ПРОВЕРКА: Проверяем конфликты телефонов
  const currentProfile = document.getElementById("profileSelect").value;
  if (phoneDatabase && currentProfile) {
    // Показываем предупреждение если профиль не выбран
    if (!currentProfile) {
      showMessage("Сначала выберите профиль деятельности!", "warning");
      return;
    }
    const conflictData = checkPhoneConflict(val, currentProfile);

    if (conflictData) {
      const conflict = conflictData.conflicts[0];

      // Случай А: Свой повтор
      if (conflict.author === currentUser.id) {
        const userChoice = showOwnPhoneConflictNotification(conflictData);
        if (userChoice === "cancel") {
          input.value = "";
          return; // Не добавляем номер
        }
        // Если 'edit' - пока просто добавляем номер (редактирование сделаем позже)
      }
      // Случай Б: Повтор админа
      else if (conflict.author === "АДМИН") {
        // Просто добавляем номер, ничего не показываем пользователю
        // Пометку для админа добавим при отправке формы
      }
      // Случай В: Чужой номер
      else {
        const userChoice = showPhoneConflictNotification(conflictData);
        if (userChoice === "cancel") {
          input.value = "";
          return; // Не добавляем номер
        }
        // Если 'dispute' - добавляем номер с пометкой для оспаривания
      }
    }
  }

  const div = document.createElement("div");
  div.textContent = val;
  div.className = "phone-item";
  div.title = "Клик для удаления";

  div.addEventListener("click", () => {
    div.remove();
    updateProgress();
  });

  container.appendChild(div);
  input.value = "";
  updateProgress();
}

// Получение метки для типа ссылки
function getLinkTypeLabel(type) {
  const labels = {
    site: "Сайт",
    email: "Email",
    instagram: "Instagram",
    telegram: "Telegram",
    viber: "Viber",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    other: "Другая ссылка",
  };
  return labels[type] || type;
}

// Получение плейсхолдера для ссылки
function getLinkPlaceholder(type) {
  const placeholders = {
    site: "https://example.com",
    email: "email@example.com",
    instagram: "@username или https://instagram.com/username",
    telegram: "@username или https://t.me/username",
    viber: "viber://add?number=380XXXXXXXXX",
    facebook: "https://facebook.com/username",
    whatsapp: "https://wa.me/380XXXXXXXXX",
    other: "Введите ссылку",
  };
  return placeholders[type] || "Введите значение";
}

// Форматирование текста в строки
function formatTextToLines(text, maxLines = 5, charsPerLine = 25) {
  if (!text) return "";

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (let word of words) {
    if (word.length > charsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      for (let i = 0; i < word.length; i += charsPerLine) {
        if (lines.length >= maxLines) break;
        const part = word.substring(i, i + charsPerLine);
        if (part) lines.push(part);
      }
      continue;
    }

    const potentialLine = currentLine ? currentLine + " " + word : word;
    if (potentialLine.length <= charsPerLine) {
      currentLine = potentialLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

// === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ===

// Обновление прогресс-бара
function updateProgress() {
  const totalFields = 8;
  let filledFields = 0;

  if (
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value
  )
    filledFields++;
  if (
    selectedValues.selectedTownsContainer.length > 0 ||
    document.getElementById("townCustom").value
  )
    filledFields++;
  if (document.getElementById("profileSelect").value) filledFields++;
  if (
    selectedValues.selectedKindsContainer.length > 0 ||
    document.getElementById("kindCustom").value
  )
    filledFields++;
  if (
    document.getElementById("nameInput").value ||
    document.getElementById("companyInput").value
  )
    filledFields++;
  if (document.getElementById("descShort").value) filledFields++;
  if (document.getElementById("descLong").value) filledFields++;
  if (document.querySelectorAll(".phone-item").length > 0) filledFields++;

  const progress = (filledFields / totalFields) * 100;
  document.getElementById("progressFill").style.width = `${progress}%`;
  document.getElementById("progressPercent").textContent = `${Math.round(
    progress
  )}%`;
}

// ====== Обновление счётчиков символов ======
function updateCharCounters() {
  const descShort = document.getElementById("descShort");
  const shortCounter = document.getElementById("descShortCounter");
  const maxLines = 5;
  const charsPerLine = 25;
  const maxTotal = maxLines * charsPerLine; // 125

  const text = descShort.value;
  const lines = text.split("\n");

  // Сохраняем позицию курсора
  const cursorPos = descShort.selectionStart;

  let newText = text;
  let needsUpdate = false;

  // Функция для обратного переноса
  function performBackwardWrap(currentLines) {
    const updatedLines = [...currentLines];
    let changed = false;

    // Проверяем с последней строки к первой
    for (let i = updatedLines.length - 1; i > 0; i--) {
      const currentLine = updatedLines[i];
      const prevLine = updatedLines[i - 1];

      // Если предыдущая строка имеет место и текущая строка может поместиться
      const spaceLeft = charsPerLine - prevLine.length;
      if (spaceLeft > 0 && currentLine.length > 0) {
        // Проверяем, может ли первое слово текущей строки поместиться в предыдущей
        const wordsInCurrent = currentLine.split(" ");
        if (wordsInCurrent.length > 0) {
          const firstWord = wordsInCurrent[0];
          const neededSpace =
            prevLine.length === 0
              ? firstWord.length
              : spaceLeft >= firstWord.length + 1;

          if (neededSpace) {
            // Переносим слово обратно на предыдущую строку
            updatedLines[i - 1] =
              prevLine + (prevLine.length > 0 ? " " : "") + firstWord;
            updatedLines[i] = wordsInCurrent.slice(1).join(" ");

            // Если текущая строка стала пустой, удаляем ее
            if (updatedLines[i].length === 0) {
              updatedLines.splice(i, 1);
            }

            changed = true;
            // Начинаем проверку заново после изменения
            return { lines: updatedLines, changed: true };
          }
        }
      }
    }

    return { lines: updatedLines, changed: false };
  }

  // Функция для прямого переноса
  function performForwardWrap(currentLines) {
    const updatedLines = [...currentLines];
    let changed = false;

    // Обрабатываем каждую строку (кроме последней)
    for (let i = 0; i < Math.min(updatedLines.length, maxLines - 1); i++) {
      if (updatedLines[i].length > charsPerLine) {
        const line = updatedLines[i];
        // Находим последний пробел до 25 символов
        const lastSpaceIndex = line.lastIndexOf(" ", charsPerLine);

        if (lastSpaceIndex > 0) {
          // Переносим часть после пробела на следующую строку
          updatedLines[i] = line.substring(0, lastSpaceIndex);
          if (i + 1 < updatedLines.length) {
            updatedLines[i + 1] =
              line.substring(lastSpaceIndex + 1) +
              (updatedLines[i + 1] ? " " + updatedLines[i + 1] : "");
          } else if (updatedLines.length < maxLines) {
            updatedLines.push(line.substring(lastSpaceIndex + 1));
          }
        } else {
          // Если пробела нет, просто обрезаем
          updatedLines[i] = line.substring(0, charsPerLine);
        }
        changed = true;
        break; // После одного изменения начинаем заново
      }
    }

    return { lines: updatedLines, changed: changed };
  }

  let currentLines = lines;
  let iterationChanged = true;

  // Выполняем итерации пока есть изменения
  while (iterationChanged) {
    iterationChanged = false;

    // Сначала обратный перенос
    const backwardResult = performBackwardWrap(currentLines);
    if (backwardResult.changed) {
      currentLines = backwardResult.lines;
      iterationChanged = true;
      needsUpdate = true;
      continue;
    }

    // Затем прямой перенос
    const forwardResult = performForwardWrap(currentLines);
    if (forwardResult.changed) {
      currentLines = forwardResult.lines;
      iterationChanged = true;
      needsUpdate = true;
      continue;
    }
  }

  // Для последней строки просто обрезаем если превышен лимит
  if (
    currentLines.length === maxLines &&
    currentLines[maxLines - 1].length > charsPerLine
  ) {
    currentLines[maxLines - 1] = currentLines[maxLines - 1].substring(
      0,
      charsPerLine
    );
    needsUpdate = true;
  }

  // Обрезаем общее количество строк
  if (currentLines.length > maxLines) {
    currentLines.length = maxLines;
    needsUpdate = true;
  }

  if (needsUpdate) {
    newText = currentLines.join("\n");
    descShort.value = newText;

    // Восстанавливаем позицию курсора
    const newCursorPos = Math.min(cursorPos, newText.length);
    descShort.setSelectionRange(newCursorPos, newCursorPos);
  }

  // === НОВАЯ ЛОГИКА СЧЁТЧИКА ===
  const cursorPosition = descShort.selectionStart;
  const allLines = descShort.value.split("\n");

  // Определяем текущую строку с курсором
  let currentLineIndex = 0;
  let positionInCurrentLine = cursorPosition;

  for (let i = 0; i < allLines.length; i++) {
    if (positionInCurrentLine <= allLines[i].length) {
      currentLineIndex = i;
      break;
    }
    positionInCurrentLine -= allLines[i].length + 1; // +1 для \n
  }

  // Вычисляем остаток символов по новой логике
  let remainingChars = maxTotal;

  // Вычитаем по 25 символов за каждую предыдущую строку
  for (let i = 0; i < currentLineIndex; i++) {
    remainingChars -= 25;
  }

  // Вычитаем фактические символы в текущей строке
  remainingChars -= allLines[currentLineIndex].length;

  // Ограничиваем снизу нулем
  remainingChars = Math.max(0, remainingChars);

  // Обновляем счётчик
  shortCounter.textContent = `${remainingChars} символов осталось`;

  if (remainingChars === 0) {
    shortCounter.style.color = "#e74c3c";
    descShort.dataset.maxReached = "true";
  } else if (remainingChars <= 25) {
    shortCounter.style.color = "#f39c12";
    descShort.dataset.maxReached = "false";
  } else {
    shortCounter.style.color = "#27ae60";
    descShort.dataset.maxReached = "false";
  }
}

// ====== Слушатели ======
const descShortEl = document.getElementById("descShort");
if (descShortEl) {
  // Блокируем ввод только на 5й строке при 25 символах
  descShortEl.addEventListener("beforeinput", function (e) {
    const text = this.value;
    const lines = text.split("\n");
    const cursorPos = this.selectionStart;

    // Определяем текущую строку и позицию в ней
    let currentLine = 0;
    let posInLine = cursorPos;
    for (let i = 0; i < lines.length; i++) {
      if (posInLine <= lines[i].length) {
        currentLine = i;
        break;
      }
      posInLine -= lines[i].length + 1; // +1 для \n
    }

    // БЛОКИРУЕМ Enter полностью
    if (e.inputType === "insertLineBreak") {
      e.preventDefault();
      return;
    }

    // Если это 5-я строка и достигнут лимит в 25 символов - блокируем ввод
    if (
      currentLine === 4 &&
      posInLine >= 25 &&
      e.inputType.startsWith("insert")
    ) {
      e.preventDefault();
      return;
    }

    // Если общий лимит 125 символов достигнут - блокируем ввод
    const currentTotalChars = text.replace(/\n/g, "").length;
    if (currentTotalChars >= 125 && e.inputType.startsWith("insert")) {
      e.preventDefault();
      return;
    }
  });

  descShortEl.addEventListener("input", function () {
    updateCharCounters();
  });

  descShortEl.addEventListener("click", function () {
    updateCharCounters(); // Обновляем при клике (смене позиции курсора)
  });

  descShortEl.addEventListener("keyup", function () {
    updateCharCounters(); // Обновляем при перемещении курсора клавишами
  });

  descShortEl.addEventListener("paste", function (e) {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    const selStart = this.selectionStart;
    const selEnd = this.selectionEnd;
    const before = this.value.slice(0, selStart);
    const after = this.value.slice(selEnd);

    this.value = before + paste + after;
    const newPos = before.length + paste.length;
    this.setSelectionRange(newPos, newPos);
    updateCharCounters();
  });

  // Инициализация при загрузке
  updateCharCounters();
}

// === ОТПРАВКА ФОРМЫ ===

// Обработка отправки формы
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Отправка...";
  submitBtn.disabled = true;

  try {
    const payload = prepareFormData();
    await submitToSheet(payload);
  } catch (error) {
    console.error("Ошибка отправки:", error);
    showMessage("Ошибка при отправке формы", "error");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Валидация формы
function validateForm() {
  const errors = [];

  const region =
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value;
  if (!region) errors.push("Укажите область");

  const selectedTowns = selectedValues.selectedTownsContainer
    .concat(document.getElementById("townCustom").value.trim())
    .filter(Boolean);
  if (selectedTowns.length === 0)
    errors.push("Укажите хотя бы один населённый пункт");
  else if (selectedTowns.length > 10)
    errors.push("Нельзя указать более 10 населённых пунктов");

  const profile = document.getElementById("profileSelect").value;
  if (!profile) errors.push("Выберите профиль деятельности");

  const kinds = selectedValues.selectedKindsContainer
    .concat(document.getElementById("kindCustom").value.trim())
    .filter(Boolean);
  if (kinds.length === 0) errors.push("Укажите хотя бы один вид деятельности");
  else if (kinds.length > 10)
    errors.push("Нельзя указать более 10 видов деятельности");

  const name = document.getElementById("nameInput").value.trim();
  const company = document.getElementById("companyInput").value.trim();
  if (!name && !company) errors.push("Укажите имя или название компании");

  const descShort = document.getElementById("descShort").value.trim();
  const descLong = document.getElementById("descLong").value.trim();
  if (!descShort) errors.push("Заполните краткое описание");
  if (!descLong) errors.push("Заполните полное описание");
  if (descShort.length > 125)
    errors.push("Краткое описание не должно превышать 125 символов");

  const phones = document.querySelectorAll(".phone-item");
  if (phones.length === 0) errors.push("Добавьте хотя бы один телефон");

  if (errors.length > 0) {
    showMessage("Исправьте ошибки:<br>" + errors.join("<br>"), "error");
    return false;
  }

  return true;
}

// Подготовка данных для отправки
function prepareFormData() {
  // ОТЛАДКА - ДОБАВЬ В НАЧАЛО
  console.log("=== ДЕБАГ prepareFormData ===");
  console.log("currentUser:", currentUser);
  console.log("Все поля currentUser:", Object.keys(currentUser || {}));

  const now = new Date();
  const date =
    now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU");

  const region =
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value;
  const selectedTowns = selectedValues.selectedTownsContainer
    .concat(document.getElementById("townCustom").value.trim())
    .filter(Boolean);
  const kinds = selectedValues.selectedKindsContainer
    .concat(document.getElementById("kindCustom").value.trim())
    .filter(Boolean);

  const links = {};
  document.querySelectorAll("#linksInputsContainer input").forEach((input) => {
    if (input.value.trim()) {
      links[input.dataset.type] = input.value.trim();
    }
  });

  // НОВЫЙ КОД: Определяем пометки для админа
let adminNotes = "";
const currentProfile = document.getElementById("profileSelect").value;
const phones = Array.from(document.querySelectorAll(".phone-item"))
    .map(el => el.textContent.replace(" ×", ""));

// ОТЛАДКА
console.log("=== ДЕБАГ пометок админу ===");
console.log("disputedPhones:", disputedPhones);
console.log("phones в форме:", phones);

// Проверяем оспоренные телефоны (ПРОСТАЯ ПРОВЕРКА)
if (disputedPhones.length > 0) {
    adminNotes = `Оспаривание: ${disputedPhones.join(', ')}`;
    console.log("Будет записано в adminNotes:", adminNotes);
} else {
    console.log("disputedPhones пустой!");
}

  // Дополнительно проверяем конфликты для админа
  if (phoneDatabase && currentProfile && currentUser.role === "admin") {
    const conflictNotes = [];

    phones.forEach((phone) => {
      const conflictData = checkPhoneConflict(phone, currentProfile);
      if (conflictData) {
        const conflict = conflictData.conflicts[0];

        if (conflict.author === "АДМИН") {
          conflictNotes.push(`Повтор админа: ${phone}`);
        }
      }
    });

    if (conflictNotes.length > 0) {
      adminNotes = adminNotes
        ? adminNotes + "; " + conflictNotes.join("; ")
        : conflictNotes.join("; ");
    }
  }

  return {
    "Дата добавления": date,
    Область: region,
    "Населённый пункт": selectedTowns.join(", "),
    "Район города": document.getElementById("cityDistrict").value.trim(),
    "Профиль деятельности": document.getElementById("profileSelect").value,
    "Вид деятельности": kinds.join(", "),
    Имя: document.getElementById("nameInput").value.trim(),
    Компания: document.getElementById("companyInput").value.trim(),
    "Описание (до 125 симв)": formatTextToLines(
      document.getElementById("descShort").value.trim()
    ).replace(/\n\s*\n/g, "\n"),
    "Описание (до 1000 симв)": document.getElementById("descLong").value.trim(),
    Адрес: document.getElementById("addressInput").value.trim(),
    Телефоны: phones.join(", "),
    Ссылки: Object.keys(links).length > 0 ? JSON.stringify(links) : "",
    Геолокация: document.getElementById("geoLocation").value.trim(),
    Статус: "черновик",
    Добавил: currentUser ? currentUser.name : "Неизвестный пользователь",
    "Пометки админу": adminNotes, // НОВОЕ ПОЛЕ
    Автор: currentUser
      ? `${currentUser.name} (${currentUser.id || currentUser.uid || "без_ID"})`
      : "Неизвестно",
  };
}

// Отправка данных на сервер
async function submitToSheet(data) {
  try {
    const formData = new FormData();
    Object.keys(data).forEach((key) => formData.append(key, data[key]));

    const response = await fetch(formUrl, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      showMessage("Услуга успешно добавлена!", "success");
      setTimeout(() => (window.location.href = "index.html"), 2000);
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Ошибка отправки:", error);
    throw error;
  }
}

// Сброс формы
function handleReset() {
  if (confirm("Вы уверены, что хотите сбросить все данные формы?")) {
    selectedValues.selectedTownsContainer = [];
    selectedValues.selectedKindsContainer = [];
    document.getElementById("selectedTownsContainer").innerHTML = "";
    document.getElementById("selectedKindsContainer").innerHTML = "";
    document.getElementById("phonesContainer").innerHTML = "";
    document.getElementById("linksInputsContainer").innerHTML = "";
    document
      .querySelectorAll(".link-checkbox")
      .forEach((cb) => (cb.checked = false));
    updateProgress();
    updateCharCounters();
    showMessage("Форма очищена", "success");
  }
}

// Показ сообщений
function showMessage(text, type = "info") {
  const box = document.getElementById("messageBox");
  box.innerHTML = text;
  box.className = `message-box visible ${type}`;

  setTimeout(() => {
    box.classList.remove("visible");
    setTimeout(() => (box.className = "message-box hidden"), 400);
  }, 5000);
}

// === ОБНОВЛЕНИЕ СЧЁТЧИКА ДЛЯ ПОЛНОГО ОПИСАНИЯ ===
function updateLongCharCounter() {
  const descLong = document.getElementById("descLong");
  const longCounter = document.getElementById("descLongCounter");
  const maxChars = 1000;
  const currentChars = descLong.value.length;
  const remaining = maxChars - currentChars;

  longCounter.textContent = `${remaining} символов осталось`;

  if (remaining === 0) {
    longCounter.style.color = "#e74c3c";
  } else if (remaining <= 100) {
    longCounter.style.color = "#f39c12";
  } else {
    longCounter.style.color = "#27ae60";
  }
}

// Защита от потери данных
window.addEventListener("beforeunload", (e) => {
  const isFormDirty =
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value ||
    selectedValues.selectedTownsContainer.length > 0;

  if (isFormDirty) {
    e.preventDefault();
    e.returnValue =
      "У вас есть несохранённые изменения. Вы уверены, что хотите уйти?";
  }
});

// Функция ограничения длины полей с уведомлениями
function setupFieldLengthLimit(fieldId, maxLength, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.addEventListener("input", function () {
    if (this.value.length >= maxLength) {
      this.value = this.value.substring(0, maxLength);
      showMessage(message, "warning");
    }
  });

  field.addEventListener("beforeinput", function (e) {
    if (this.value.length >= maxLength && e.inputType.startsWith("insert")) {
      e.preventDefault();
      showMessage(message, "warning");
    }
  });
}
