// === КОНФИГУРАЦИЯ ===
const spreadsheetId = "1vKErM8FIGNM5if0zpsaCWutsQgscqrPo2bUWJACTcf0";
const sheetsURL = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&tq=`;
const formUrl = "https://script.google.com/macros/s/AKfycbw6FAWTC1ux2M3H6H8tuoZvmVEpYEfWcpihd0C0Huh-U_ErgajS6WfKOIugafn1yFTzVg/exec";

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentUser = null;
const selectedValues = {
    selectedTownsContainer: [],
    selectedKindsContainer: []
};

// === ОСНОВНЫЕ ФУНКЦИИ ===

// Инициализация при загрузке
document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
    setupAllEventListeners();
    loadInitialData();
});

// Проверка авторизации
async function checkAuth() {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (e) {
            localStorage.removeItem("user");
        }
    }

    if (!currentUser || currentUser.role !== "admin") {
        showMessage("Доступ запрещён. Требуются права администратора.", "error");
        setTimeout(() => window.location.href = "index.html", 3000);
        return;
    }

    if (typeof Telegram !== "undefined" && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
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

    // Города и виды деятельности
    document.getElementById("townSelect").addEventListener("change", handleTownSelect);
    document.getElementById("kindSelect").addEventListener("change", handleKindSelect);
    setupMultiInput("townCustom", "selectedTownsContainer", 10);
    setupMultiInput("kindCustom", "selectedKindsContainer", 10);

    // Профиль деятельности
    document.getElementById("profileSelect").addEventListener("change", async function() {
        await loadKindsByProfile(this.value);
    });

    // Счётчики символов
    document.getElementById("descShort").addEventListener("input", updateCharCounters);
    document.getElementById("descLong").addEventListener("input", updateCharCounters);

    // Телефоны
    setupPhoneHandlers();

    // Ссылки
    setupLinksHandlers();

    // Форма
    document.getElementById("serviceForm").addEventListener("submit", handleSubmit);
    document.getElementById("resetBtn").addEventListener("click", handleReset);

    // Отслеживание прогресса
    document.querySelectorAll("#serviceForm input, #serviceForm select, #serviceForm textarea").forEach(element => {
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
        return json.table.rows.map(row => row.c.map(cell => cell ? cell.v : ""));
    } catch (error) {
        console.error(`Ошибка загрузки данных из ${sheet}:`, error);
        showMessage("Ошибка загрузки данных. Проверьте подключение к интернету.", "error");
        return [];
    }
}

// Загрузка списка областей
async function loadRegionList() {
    try {
        const rows = await fetchSheetData("Населённые пункты");
        const dataRows = rows.slice(1); // пропускаем заголовки
        const all = dataRows
            .map(r => (r[1] || "").split(","))
            .flat()
            .map(cleanText)
            .filter(Boolean);
        const list = countAndSort(all);
        const select = document.getElementById("regionSelect");

        list.forEach(val => {
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
            .filter(row => {
                const areas = (row[1] || "").split(",").map(s => cleanText(s));
                return areas.includes(region);
            })
            .map(r => (r[0] || "").split(","))
            .flat()
            .map(cleanText)
            .filter(Boolean);

        const uniqueTowns = [...new Set(towns)].sort();
        const select = document.getElementById("townSelect");
        select.innerHTML = '<option value="">-- Выберите город --</option>';

        uniqueTowns.forEach(town => {
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

        rows.slice(7).forEach(r => {
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
            .filter(r => cleanText(r[0]) === profile)
            .map(r => cleanText(r[1]))
            .filter(Boolean);

        const uniqueKinds = [...new Set(kinds)];
        const select = document.getElementById("kindSelect");
        select.innerHTML = '<option value="">-- Выберите вид --</option>';

        uniqueKinds.forEach(val => {
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

// === ОБРАБОТКА ФОРМЫ ===

// Обработчик выбора города
function handleTownSelect(e) {
    const val = e.target.value;
    if (!val) return;

    const containerId = "selectedTownsContainer";

    if (selectedValues[containerId].includes(val)) {
        selectedValues[containerId] = selectedValues[containerId].filter(v => v !== val);
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
        if (val && !selectedValues[containerId].includes(val) && selectedValues[containerId].length < limit) {
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
    document.querySelectorAll(".link-checkbox").forEach(checkbox => {
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
    arr.forEach(v => map[v] = (map[v] || 0) + 1);
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
        selectedValues[containerId] = selectedValues[containerId].filter(v => v !== val);
        updateProgress();
    });

    container.appendChild(span);
}

// Очистка выбора городов
function clearTownSelection() {
    selectedValues.selectedTownsContainer = [];
    document.getElementById("selectedTownsContainer").innerHTML = "";
    document.getElementById("townSelect").innerHTML = '<option value="">-- Выберите город --</option>';
    document.getElementById("townSelect").disabled = true;
    document.getElementById("townCustom").value = "";
    updateProgress();
}

// Обновление UI выбранных городов
function updateSelectedTownsUI() {
    const container = document.getElementById("selectedTownsContainer");
    container.innerHTML = "";

    selectedValues.selectedTownsContainer.forEach(val => {
        const span = document.createElement("span");
        span.textContent = val;
        span.className = "selected-item";
        span.title = "Клик для удаления";

        span.addEventListener("click", () => {
            selectedValues.selectedTownsContainer = selectedValues.selectedTownsContainer.filter(v => v !== val);
            updateSelectedTownsUI();
            updateProgress();
        });

        container.appendChild(span);
    });
}

// Добавление телефона
function addPhoneNumber() {
    const input = document.getElementById("phoneInput");
    const container = document.getElementById("phonesContainer");
    const val = input.value.trim();

    if (!/^380\d{9}$/.test(val)) {
        showMessage("Неверный формат телефона. Пример: 380671112233", "error");
        return;
    }

    const existingPhones = Array.from(container.querySelectorAll(".phone-item"))
        .map(el => el.textContent.replace(" ×", ""));

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
        other: "Другая ссылка"
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
        other: "Введите ссылку"
    };
    return placeholders[type] || "Введите значение";
}

// Форматирование текста в строки
function formatTextToLines(text, maxLines = 5, charsPerLine = 25) {
    if (!text) return '';
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
        if (word.length > charsPerLine) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = '';
            }
            for (let i = 0; i < word.length; i += charsPerLine) {
                if (lines.length >= maxLines) break;
                const part = word.substring(i, i + charsPerLine);
                if (part) lines.push(part);
            }
            continue;
        }
        
        const potentialLine = currentLine ? currentLine + ' ' + word : word;
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
    
    return lines.join('\n');
}

// === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ===

// Обновление прогресс-бара
function updateProgress() {
    const totalFields = 8;
    let filledFields = 0;

    if (document.getElementById("regionSelect").value || document.getElementById("regionCustom").value) filledFields++;
    if (selectedValues.selectedTownsContainer.length > 0 || document.getElementById("townCustom").value) filledFields++;
    if (document.getElementById("profileSelect").value) filledFields++;
    if (selectedValues.selectedKindsContainer.length > 0 || document.getElementById("kindCustom").value) filledFields++;
    if (document.getElementById("nameInput").value || document.getElementById("companyInput").value) filledFields++;
    if (document.getElementById("descShort").value) filledFields++;
    if (document.getElementById("descLong").value) filledFields++;
    if (document.querySelectorAll(".phone-item").length > 0) filledFields++;

    const progress = (filledFields / totalFields) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressPercent").textContent = `${Math.round(progress)}%`;
}

// Обновление счётчиков символов
function updateCharCounters() {
    const descShort = document.getElementById("descShort");
    const descLong = document.getElementById("descLong");
    
    const shortText = descShort.value;
    const shortCounter = document.getElementById("descShortCounter");
    shortCounter.textContent = `${shortText.length}/125`;
    
    if (shortText.length > 100) {
        shortCounter.style.color = '#e74c3c';
    } else if (shortText.length > 75) {
        shortCounter.style.color = '#f39c12';
    } else {
        shortCounter.style.color = '#27ae60';
    }
    
    if (shortText.length > 125) {
        descShort.value = shortText.substring(0, 125);
        updateCharCounters();
    }
    
    document.getElementById("descLongCounter").textContent = `${descLong.value.length}/700`;
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

    const region = document.getElementById("regionSelect").value || document.getElementById("regionCustom").value;
    if (!region) errors.push("Укажите область");

    const selectedTowns = selectedValues.selectedTownsContainer
        .concat(document.getElementById("townCustom").value.trim())
        .filter(Boolean);
    if (selectedTowns.length === 0) errors.push("Укажите хотя бы один населённый пункт");
    else if (selectedTowns.length > 10) errors.push("Нельзя указать более 10 населённых пунктов");

    const profile = document.getElementById("profileSelect").value;
    if (!profile) errors.push("Выберите профиль деятельности");

    const kinds = selectedValues.selectedKindsContainer
        .concat(document.getElementById("kindCustom").value.trim())
        .filter(Boolean);
    if (kinds.length === 0) errors.push("Укажите хотя бы один вид деятельности");
    else if (kinds.length > 10) errors.push("Нельзя указать более 10 видов деятельности");

    const name = document.getElementById("nameInput").value.trim();
    const company = document.getElementById("companyInput").value.trim();
    if (!name && !company) errors.push("Укажите имя или название компании");

    const descShort = document.getElementById("descShort").value.trim();
    const descLong = document.getElementById("descLong").value.trim();
    if (!descShort) errors.push("Заполните краткое описание");
    if (!descLong) errors.push("Заполните полное описание");
    if (descShort.length > 125) errors.push("Краткое описание не должно превышать 125 символов");

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
    const now = new Date();
    const date = now.toLocaleDateString("ru-RU") + " " + now.toLocaleTimeString("ru-RU");

    const region = document.getElementById("regionSelect").value || document.getElementById("regionCustom").value;
    const selectedTowns = selectedValues.selectedTownsContainer
        .concat(document.getElementById("townCustom").value.trim())
        .filter(Boolean);
    const kinds = selectedValues.selectedKindsContainer
        .concat(document.getElementById("kindCustom").value.trim())
        .filter(Boolean);

    const links = {};
    document.querySelectorAll("#linksInputsContainer input").forEach(input => {
        if (input.value.trim()) {
            links[input.dataset.type] = input.value.trim();
        }
    });

    return {
        "Дата добавления": date,
        "Область": region,
        "Населённый пункт": selectedTowns.join(", "),
        "Район города": document.getElementById("cityDistrict").value.trim(),
        "Профиль деятельности": document.getElementById("profileSelect").value,
        "Вид деятельности": kinds.join(", "),
        "Имя": document.getElementById("nameInput").value.trim(),
        "Компания": document.getElementById("companyInput").value.trim(),
        "Описание (до 75 симв)": formatTextToLines(document.getElementById("descShort").value.trim()),
        "Описание (до 700 симв)": document.getElementById("descLong").value.trim(),
        "Адрес": document.getElementById("addressInput").value.trim(),
        "Телефоны": Array.from(document.querySelectorAll(".phone-item"))
            .map(el => el.textContent.replace(" ×", ""))
            .join(", "),
        "Ссылки": JSON.stringify(links),
        "Геолокация": document.getElementById("geoLocation").value.trim(),
        "Статус": "черновик",
        "Добавил": currentUser ? currentUser.name : "Неизвестный пользователь"
    };
}

// Отправка данных на сервер
async function submitToSheet(data) {
    try {
        const formData = new FormData();
        Object.keys(data).forEach(key => formData.append(key, data[key]));

        const response = await fetch(formUrl, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            showMessage("Услуга успешно добавлена!", "success");
            setTimeout(() => window.location.href = "index.html", 2000);
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
        document.querySelectorAll(".link-checkbox").forEach(cb => cb.checked = false);
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
        setTimeout(() => box.className = "message-box hidden", 400);
    }, 5000);
}

// Защита от потери данных
window.addEventListener("beforeunload", (e) => {
    const isFormDirty = document.getElementById("regionSelect").value ||
        document.getElementById("regionCustom").value ||
        selectedValues.selectedTownsContainer.length > 0;

    if (isFormDirty) {
        e.preventDefault();
        e.returnValue = "У вас есть несохранённые изменения. Вы уверены, что хотите уйти?";
    }
});