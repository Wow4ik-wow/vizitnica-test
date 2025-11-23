// === КОНФИГУРАЦИЯ ===
const spreadsheetId = "1vKErM8FIGNM5if0zpsaCWutsQgscqrPo2bUWJACTcf0";
const sheetsURL = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&tq=`;
const formUrl =
  "https://script.google.com/macros/s/AKfycbw6FAWTC1ux2M3H6H8tuoZvmVEpYEfWcpihd0C0Huh-U_ErgajS6WfKOIugafn1yFTzVg/exec";

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentUser = null;
const selectedValues = {
  selectedTownsContainer: [],
  selectedKindsContainer: [],
};

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  setupEventListeners();
  loadInitialData();
});

async function initializeApp() {
  // Проверка авторизации
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateRoleInfo();
    } catch (e) {
      console.error("Ошибка загрузки пользователя:", e);
      localStorage.removeItem("user");
    }
  }

  // Проверка прав доступа
  if (!currentUser || currentUser.role !== "admin") {
    showMessage("Доступ запрещён. Требуются права администратора.", "error");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 3000);
    return;
  }

  // Инициализация Telegram Web App
  if (typeof Telegram !== "undefined" && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
}

function setupEventListeners() {
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

  // Города
  document
    .getElementById("townSelect")
    .addEventListener("change", handleTownSelect);
  setupMultiInput("townCustom", "selectedTownsContainer", 10);

  // Виды деятельности
  document
    .getElementById("kindSelect")
    .addEventListener("change", handleKindSelect);
  setupMultiInput("kindCustom", "selectedKindsContainer", 10);

  // Счётчики символов
  document
    .getElementById("descShort")
    .addEventListener("input", updateSmartCharCounter);
  document
    .getElementById("descShort")
    .addEventListener("keydown", function (e) {
      // Блокируем Enter если достигнут лимит строк
      setTimeout(updateSmartCharCounter, 0);
    });
  document
    .getElementById("descLong")
    .addEventListener("input", updateCharCounters);

  // Инициализация при загрузке
  setTimeout(updateSmartCharCounter, 100);

  // Телефоны
  setupPhoneHandlers();

  // Ссылки
  setupLinksHandlers();

  // Отправка формы
  document
    .getElementById("serviceForm")
    .addEventListener("submit", handleSubmit);
  document.getElementById("resetBtn").addEventListener("click", handleReset);

  // Отслеживание изменений для прогресса
  document
    .querySelectorAll(
      "#serviceForm input, #serviceForm select, #serviceForm textarea"
    )
    .forEach((element) => {
      element.addEventListener("input", updateProgress);
      element.addEventListener("change", updateProgress);
    });
}

function loadInitialData() {
  loadRegionList();
  loadProfileList();
  updateProgress();
  updateCharCounters();
}

// === ЗАГРУЗКА ДАННЫХ ===
async function fetchSheetData(sheet, range = "") {
  try {
    const query = `SELECT *`;
    const url = `${sheetsURL}${query}&sheet=${sheet}${range}`;
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

async function loadRegionList() {
  try {
    const rows = await fetchSheetData("Населённые пункты");
    // Пропускаем первую строку (заголовки) и обрабатываем остальные
    const dataRows = rows.slice(1); // пропускаем первую строку
    const all = dataRows
      .map((r) => (r[1] || "").split(",")) // берем второй столбец (области)
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

    // Наблюдатель за изменением профиля
    select.addEventListener("change", async () => {
      const selected = cleanText(select.value);
      await loadKindsByProfile(selected);
    });
  } catch (error) {
    showMessage("Ошибка загрузки списка профилей", "error");
  }
}

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

    // Очистить выбранные виды при смене профиля
    selectedValues.selectedKindsContainer = [];
    document.getElementById("selectedKindsContainer").innerHTML = "";
  } catch (error) {
    showMessage("Ошибка загрузки видов деятельности", "error");
  }
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===
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

  // Также добавляем по blur для удобства
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

  // Автодобавление префикса
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
function cleanText(str) {
  return String(str || "")
    .replace(/[«»„“"'`]/g, "")
    .trim();
}

function countAndSort(arr) {
  const map = {};
  arr.forEach((v) => (map[v] = (map[v] || 0) + 1));
  return Object.keys(map).sort((a, b) => map[b] - map[a]);
}

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

function clearTownSelection() {
  selectedValues.selectedTownsContainer = [];
  document.getElementById("selectedTownsContainer").innerHTML = "";
  document.getElementById("townSelect").innerHTML =
    '<option value="">-- Выберите город --</option>';
  document.getElementById("townSelect").disabled = true;
  document.getElementById("townCustom").value = "";
  updateProgress();
}

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

function addPhoneNumber() {
  const input = document.getElementById("phoneInput");
  const container = document.getElementById("phonesContainer");
  const val = input.value.trim();

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

// === ПРОГРЕСС И ВАЛИДАЦИЯ ===
function updateProgress() {
  const totalFields = 8; // Основные обязательные поля
  let filledFields = 0;

  // Область
  if (
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value
  ) {
    filledFields++;
  }

  // Города
  if (
    selectedValues.selectedTownsContainer.length > 0 ||
    document.getElementById("townCustom").value
  ) {
    filledFields++;
  }

  // Профиль
  if (document.getElementById("profileSelect").value) {
    filledFields++;
  }

  // Виды деятельности
  if (
    selectedValues.selectedKindsContainer.length > 0 ||
    document.getElementById("kindCustom").value
  ) {
    filledFields++;
  }

  // Имя или компания
  if (
    document.getElementById("nameInput").value ||
    document.getElementById("companyInput").value
  ) {
    filledFields++;
  }

  // Описания
  if (document.getElementById("descShort").value) filledFields++;
  if (document.getElementById("descLong").value) filledFields++;

  // Телефоны
  if (document.querySelectorAll(".phone-item").length > 0) {
    filledFields++;
  }

  const progress = (filledFields / totalFields) * 100;
  document.getElementById("progressFill").style.width = `${progress}%`;
  document.getElementById("progressPercent").textContent = `${Math.round(
    progress
  )}%`;
}

// Умный подсчёт символов для краткого описания с учётом переносов
function updateSmartCharCounter() {
  const textarea = document.getElementById("descShort");
  const counter = document.getElementById("descShortCounter");
  const text = textarea.value;

  // Создаем невидимый элемент для измерения текста
  const measureDiv = document.createElement("div");
  measureDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${textarea.clientWidth}px;
        font: ${getComputedStyle(textarea).font};
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: ${getComputedStyle(textarea).lineHeight};
    `;
  measureDiv.textContent = text;
  document.body.appendChild(measureDiv);

  // Получаем высоту текста и вычисляем количество строк
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
  const textHeight = measureDiv.clientHeight;
  const lineCount = Math.round(textHeight / lineHeight);

  // Вычисляем потери из-за переносов
  const maxLines = 5;
  const charsPerLine = 25;
  const maxChars = 125;

  let lostChars = 0;
  if (lineCount > maxLines) {
    // Если превысили 5 строк - запрещаем дальнейший ввод
    lostChars = (lineCount - maxLines) * charsPerLine;
  }

  const usedChars = text.length;
  const availableChars = maxChars - lostChars;
  const remainingChars = Math.max(0, availableChars - usedChars);

  // Обновляем счётчик
  counter.textContent = `${usedChars}/${availableChars}`;

  // Визуальная индикация
  if (remainingChars < 20) {
    counter.style.color = "#e74c3c";
  } else if (remainingChars < 50) {
    counter.style.color = "#f39c12";
  } else {
    counter.style.color = "#27ae60";
  }

  // Удаляем измерительный элемент
  document.body.removeChild(measureDiv);

  // Блокируем ввод если превышен лимит
  if (usedChars >= availableChars && text.length > 0) {
    textarea.value = text.substring(0, availableChars);
    updateSmartCharCounter(); // Обновляем счётчик
  }
}

// Обновляем счётчики при загрузке
function updateCharCounters() {
  updateSmartCharCounter(); // Умный счётчик для краткого описания

  // Старый счётчик для полного описания
  const descLong = document.getElementById("descLong");
  document.getElementById("descLongCounter").textContent =
    descLong.value.length;
}

// === ОТПРАВКА ФОРМЫ ===
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

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

function validateForm() {
  const errors = [];

  // Область
  const region =
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value;
  if (!region) errors.push("Укажите область");

  // Города
  const selectedTowns = selectedValues["selectedTownsContainer"]
    .concat(document.getElementById("townCustom").value.trim())
    .filter(Boolean);
  if (selectedTowns.length === 0) {
    errors.push("Укажите хотя бы один населённый пункт");
  } else if (selectedTowns.length > 10) {
    errors.push("Нельзя указать более 10 населённых пунктов");
  }

  // Профиль
  const profile = document.getElementById("profileSelect").value;
  if (!profile) errors.push("Выберите профиль деятельности");

  // Виды деятельности
  const kinds = selectedValues["selectedKindsContainer"]
    .concat(document.getElementById("kindCustom").value.trim())
    .filter(Boolean);
  if (kinds.length === 0) {
    errors.push("Укажите хотя бы один вид деятельности");
  } else if (kinds.length > 10) {
    errors.push("Нельзя указать более 10 видов деятельности");
  }

  // Имя или компания
  const name = document.getElementById("nameInput").value.trim();
  const company = document.getElementById("companyInput").value.trim();
  if (!name && !company) errors.push("Укажите имя или название компании");

  // Описания
  const descShort = document.getElementById("descShort").value.trim();
  const descLong = document.getElementById("descLong").value.trim();
  if (!descShort) errors.push("Заполните краткое описание");
  if (!descLong) errors.push("Заполните полное описание");

  // Телефоны
  const phones = document.querySelectorAll(".phone-item");
  if (phones.length === 0) errors.push("Добавьте хотя бы один телефон");

  if (errors.length > 0) {
    showMessage("Исправьте ошибки:<br>" + errors.join("<br>"), "error");
    return false;
  }

  return true;
}

function prepareFormData() {
  const now = new Date();
  const date =
    now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU");

  const region =
    document.getElementById("regionSelect").value ||
    document.getElementById("regionCustom").value;
  const selectedTowns = selectedValues["selectedTownsContainer"]
    .concat(document.getElementById("townCustom").value.trim())
    .filter(Boolean);
  const kinds = selectedValues["selectedKindsContainer"]
    .concat(document.getElementById("kindCustom").value.trim())
    .filter(Boolean);

  // Подготовка ссылок
  const links = {};
  document.querySelectorAll("#linksInputsContainer input").forEach((input) => {
    if (input.value.trim()) {
      links[input.dataset.type] = input.value.trim();
    }
  });

  return {
    "Дата добавления": date,
    Область: region,
    "Населённый пункт": selectedTowns.join(", "),
    "Район города": document.getElementById("cityDistrict").value.trim(),
    "Профиль деятельности": document.getElementById("profileSelect").value,
    "Вид деятельности": kinds.join(", "),
    Имя: document.getElementById("nameInput").value.trim(),
    Компания: document.getElementById("companyInput").value.trim(),
    "Описание (до 75 симв)": document.getElementById("descShort").value.trim(),
    "Описание (до 700 симв)": document.getElementById("descLong").value.trim(),
    Адрес: document.getElementById("addressInput").value.trim(),
    Телефоны: Array.from(document.querySelectorAll(".phone-item"))
      .map((el) => el.textContent.replace(" ×", ""))
      .join(", "),
    Ссылки: JSON.stringify(links),
    Геолокация: document.getElementById("geoLocation").value.trim(),
    Статус: "черновик",
    Добавил: currentUser ? currentUser.name : "Неизвестный пользователь",
  };
}

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
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Ошибка отправки:", error);
    throw error;
  }
}

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

// === УВЕДОМЛЕНИЯ ===
function showMessage(text, type = "info") {
  const box = document.getElementById("messageBox");
  box.innerHTML = text;
  box.className = `message-box visible ${type}`;

  setTimeout(() => {
    box.classList.remove("visible");
    setTimeout(() => {
      box.className = "message-box hidden";
    }, 400);
  }, 5000);
}

function updateRoleInfo() {
  const roleInfo = document.getElementById("roleInfo");
  if (roleInfo && currentUser) {
    roleInfo.textContent =
      currentUser.role === "admin"
        ? "Режим администратора"
        : "Режим пользователя";
  }
}

// Обработчик перед закрытием страницы
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
