const apiUrl =
  "https://raw.githubusercontent.com/Wow4ik-wow/vizitnica/master/data.json";

const API_USER_URL =
  "https://script.google.com/macros/s/AKfycbzpraBNAzlF_oqYIDLYVjczKdY6Ui32qJNwY37HGSj6vtPs9pXseJYqG3oLAr28iZ0c/exec";
let currentUser = null;

let allServices = [];

// ===== Функция для поиска по тегам =====
function filterByTags(inputText, services) {
  if (!inputText.trim()) return services;
  
  const searchWord = inputText.toLowerCase().trim();
  
  return services.filter(service => {
    const tags = (service['Теги'] || '').toLowerCase().split(/,\s*/);
    return tags.some(tag => tag.startsWith(searchWord));
  });
}

async function loadServices() {
  const CACHE_KEY = "services_cache";
  const CACHE_TIME = 3600000; // 1 час в миллисекундах

  document.getElementById("cards").innerText = "Сайт загружается...";

  try {
    // Проверяем кэш
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_TIME) {
        allServices = data;
        populateAllLists();
        document.getElementById("cards").innerText =
          "Сайт готов к работе (данные из кэша)";
        return;
      }
    }

    // Загружаем свежие данные
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Ошибка загрузки");

    allServices = await response.json();

    // Сохраняем в кэш
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: allServices,
        timestamp: Date.now(),
      })
    );

    populateAllLists();
    document.getElementById("cards").innerText = "Сайт готов к работе";
  } catch (e) {
    console.error("Ошибка загрузки данных:", e);
    document.getElementById("cards").innerText =
      "Сайт готов к работе (используются последние сохранённые данные)";
  }
}

function renderCards(services) {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  if (services.length === 0) {
    container.innerText = "Нет результатов по заданным фильтрам.";
    return;
  }

  let openedCard = null;

  services.forEach((service) => {
    let imageUrl = (service["Ссылка на картинку"] || "").trim();

    if (imageUrl.includes("drive.google.com")) {
      const match = imageUrl.match(/id=([^&]+)/);
      if (match && match[1]) {
        const imageId = match[1];
        imageUrl = `https://drive.google.com/thumbnail?id=${imageId}&sz=w1000`;
      } else {
        imageUrl = "";
      }
    } else if (imageUrl.length === 33) {
      imageUrl = `https://drive.google.com/thumbnail?id=${imageUrl}&sz=w1000`;
    } else {
      imageUrl = "";
    }

    const card = document.createElement("div");
    card.className = "card";

    const id = service["ID"] || "";

    const name = (service["Имя"] || "").trim();
    const company = (service["Компания"] || "").trim();
    const profile = (service["Профиль деятельности"] || "").trim();
    const description = (service["Описание (до 700 симв)"] || "").trim();
    const phones = ("" + (service["Телефоны"] ?? "")).trim();
    const city = (service["Населённый пункт"] || "").trim();
    const district = (service["Район города"] || "").trim();
    const type = (service["Вид деятельности"] || "").trim();
    const geo = (service["Геолокация"] || "").trim();

    const nameCompanyLine =
      name && company ? `${name} ⏩⏩⏩ ${company}` : name || company || "";

    const socials = [
      { name: "Facebook", url: service["facebook"] },
      { name: "Instagram", url: service["instagram"] },
      { name: "Telegram", url: service["telegram"] },
      { name: "Viber", url: service["viber"] },
      { name: "WhatsApp", url: service["whatsapp"] },
      { name: "Другое", url: service["Другое"] },
    ].filter((s) => s.url);

    const socialButtonsHTML =
      socials.length > 0
        ? `<div style="margin: 10px 0;">` +
          socials
            .map(
              (
                s
              ) => `<a href="${s.url}" target="_blank" style="margin: 4px; display: inline-block;">
                  <button style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                    ${s.name}
                  </button>
                </a>`
            )
            .join("") +
          `</div>`
        : "";

    const geoHTML = geo
      ? `<div><strong>Геолокация:</strong> <a href="${geo}" target="_blank" style="color: #2c3e50;">Открыть на карте</a></div>`
      : "";

    let contentHTML = `
      <img src="${imageUrl}" alt="Превью" style="width: 95%; margin: 8px auto; display: block; cursor: pointer; border-radius: 6px; object-fit: contain;" />

      <div class="card-text" style="display:none; font-size: 14px; text-align: left; padding: 0 12px; margin: 0 auto; width: 100%; box-sizing: border-box;">
`;

    if (type) {
      contentHTML += `<div style="font-weight: bold; font-size: 18px; margin-bottom: 6px;">${type}</div>`;
    }

    if (nameCompanyLine) {
      contentHTML += `<div style="font-size: 13px; margin-bottom: 6px;">${nameCompanyLine}</div>`;
    }

    if (type || nameCompanyLine) {
      contentHTML += `<hr style="margin: 8px 0;" />`;
    }

    if (profile)
      contentHTML += `<div><strong>Профиль деятельности:</strong> ${profile}</div>`;
    if (description)
      contentHTML += `<div><strong>Описание:</strong><br>${description.replace(
        /\n/g,
        "<br>"
      )}</div>`;

    if (profile || description) {
      contentHTML += `<hr style="margin: 8px 0;" />`;
    }

    if (phones) {
      const phoneLinks = phones
        .split(",")
        .map((phone) => {
          const clean = phone.trim();
          return `<a href="tel:${clean}" style="color: #2563eb;">${clean}</a>`;
        })
        .join(", ");
      contentHTML += `<div><strong>Телефон:</strong> ${phoneLinks}</div>`;
    }

    if (city)
      contentHTML += `<div><strong>Населённый пункт:</strong> ${city}</div>`;
    if (district)
      contentHTML += `<div><strong>Район:</strong> ${district}</div>`;

    const address = (service["Адрес"] || "").trim();
    if (address) {
      contentHTML += `<div><strong>Адрес:</strong> ${address.replace(
        /\n/g,
        "<br>"
      )}</div>`;
    }

    // 1. Парсим соцсети из столбца "Ссылки"
    const socialLinksText = service["Ссылки"] || "";
    const parsedSocialLinks = [];
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(socialLinksText)) !== null) {
      parsedSocialLinks.push({
        name: match[1].trim(),
        url: match[2].trim(),
      });
    }

    // 2. Объединяем с существующими соцсетями (socialButtonsHTML)
    const allSocialLinks = [
      ...socials.filter((s) => s.url), // Из текущего socialButtonsHTML
      ...parsedSocialLinks, // Из нового парсинга
    ];

    // 3. Генерируем HTML для всех соцсетей
    if (allSocialLinks.length > 0) {
      contentHTML += `
    <div style="margin: 10px 0; display: flex; flex-wrap: wrap; gap: 6px;">
      ${allSocialLinks
        .map(
          (link) => `
        <a href="${link.url}" target="_blank" style="text-decoration: none;">
          <button style="
            background: #4a6fa5;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            cursor: pointer;
          ">
            ${link.name}
          </button>
        </a>
      `
        )
        .join("")}
    </div>
  `;
    }

    // 4. Добавляем геолокацию (geoHTML)
    contentHTML += geoHTML;

    contentHTML += `
  <div class="card-buttons">
    <button class="btn small" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">НАЗАД К ПОИСКУ</button>
    ${
      currentUser?.role === "admin"
        ? `<button class="btn small" onclick="console.log('Добавить в избранное: ${id}')">В ИЗБРАННОЕ</button>`
        : ""
    }
  </div>

  ${
    currentUser?.role === "admin"
      ? `
    <div class="card-buttons" style="margin-top: 8px; color: #888; justify-content: space-between; align-items: center;">
      <div style="font-weight: bold; user-select: none;">
        ОЦЕНИ &nbsp;
        <span style="font-size: 20px; cursor: default;">☆ ☆ ☆ ☆ ☆</span>
      </div>
      <button class="btn small" style="background-color:rgb(176, 204, 236); color:rgb(5, 29, 68); cursor: default; border: none;">ОТЗЫВЫ</button>
    </div>
  `
      : ""
  }

  ${
    currentUser?.role === "admin"
      ? `
    <div class="card-buttons" style="margin-top: 8px;">
      <button class="btn small" onclick="console.log('Редактировать: ${id}')">РЕДАКТИРОВАТЬ</button>
      <button class="btn small" onclick="console.log('Опубликовать: ${id}')">ОПУБЛИКОВАТЬ</button>
    </div>
  `
      : ""
  }

  <div style="text-align: right; font-size: 11px; color: red; margin-top: 4px;">ID: ${id}</div>
</div>`;

    card.innerHTML = contentHTML;

    const img = card.querySelector("img");
    const textDiv = card.querySelector(".card-text");

    img.addEventListener("click", () => {
      if (openedCard && openedCard !== textDiv) {
        openedCard.style.display = "none";
      }

      const isOpening = textDiv.style.display === "none";

      if (isOpening) {
        textDiv.style.display = "block";
        openedCard = textDiv;

        // Прокрутка к карточке
        setTimeout(() => {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        textDiv.style.display = "none";
        openedCard = null;
      }
    });

    container.appendChild(card);
    
  });
  // Добавляем кнопку "ВЕРНУТЬСЯ НАВЕРХ" после всех карточек
const backToTopContainer = document.getElementById("backToTopContainer");
  backToTopContainer.innerHTML = ''; // Очищаем перед добавлением
  
  const backToTopBtn = document.createElement("button");
  backToTopBtn.className = "btn back-to-top";
  backToTopBtn.textContent = "ВЕРНУТЬСЯ НАВЕРХ";
  backToTopBtn.onclick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  backToTopContainer.appendChild(backToTopBtn);
}

function applyFilters() {
  const region = document
    .getElementById("filterRegion")
    .value.trim()
    .toLowerCase();
  const city = document.getElementById("filterCity").value.trim().toLowerCase();
  const profile = document
    .getElementById("filterProfile")
    .value.trim()
    .toLowerCase();
  const type = document.getElementById("filterType").value.trim().toLowerCase();
  const district = document
    .getElementById("filterDistrict")
    .value.trim()
    .toLowerCase();
  const name = document.getElementById("filterName").value.trim().toLowerCase();

  if (!region || !city) {
    showNotification("Пожалуйста, заполните поля Область и Город.");
    return;
  }

  if (!profile && !type && !district && !name) {
    showNotification(
      "Заполните хотя бы одно из полей: Профиль, Вид, Район, Имя."
    );
    return;
  }

  const filtered = allServices.filter((service) => {
    const области = (service["Область"] || "")
      .toLowerCase()
      .split(",")
      .map((x) => x.trim());
    const города = (service["Населённый пункт"] || "")
      .toLowerCase()
      .split(",")
      .map((x) => x.trim());
    const профиль = (service["Профиль деятельности"] || "").toLowerCase();
    const вид = (service["Вид деятельности"] || "").toLowerCase();
    const район = (service["Район"] || "").toLowerCase();
    const имя = (service["Имя"] || "").toLowerCase();
    const компания = (service["Компания"] || "").toLowerCase();

    const regionMatch = области.some((r) => r.includes(region));
    const cityMatch = города.some((c) => c.includes(city));
    const profileMatch = !profile || профиль.includes(profile);
    const typeMatch = !type || вид.includes(type);
    const districtMatch = !district || район.includes(district);
    const nameMatch = !name || (имя + " " + компания).includes(name);

    return (
      regionMatch &&
      cityMatch &&
      profileMatch &&
      typeMatch &&
      districtMatch &&
      nameMatch
    );
  });

  renderCards(filtered);
  populateDependentLists(allServices);

  const countElem = document.getElementById("searchCount");
  countElem.innerText = `Найдено совпадений: ${filtered.length}`;

  populateList("listProfile", filtered, "Профиль деятельности");
  populateList("listType", filtered, "Вид деятельности");
  populateList("listDistrict", filtered, "Район");
  populateList("listName", filtered, "Имя", true);

  // Прокрутка к результатам (после ВСЕХ операций с DOM)
  setTimeout(() => {
    const scrollToResults = () => {
      const target = document.getElementById('scrollTarget');
      if (!target) return;
      
      // Получаем позицию кнопки ПОИСК
      const searchBtn = document.querySelector('.search-btn');
      const searchBtnHeight = searchBtn ? searchBtn.offsetHeight : 0;
      
      // Вычисляем позицию с учётом высоты кнопки
      const targetPosition = target.getBoundingClientRect().top;
      const offsetPosition = targetPosition + window.pageYOffset - searchBtnHeight - 10;
      
      // Плавная прокрутка
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    };

    // Первая попытка
    scrollToResults();
    
    // Страховка на случай если DOM не обновился
    setTimeout(scrollToResults, 50);
  }, 100);
}

function populateAllLists() {
  populateList("listProfile", allServices, "Профиль деятельности");
  populateDatalist("listRegion", getUniqueValues(allServices, "Область"));
  populateDatalist(
    "listType",
    getUniqueValues(allServices, "Вид деятельности")
  );
  populateDatalist("listDistrict", getUniqueValues(allServices, "Район"));
  populateList("listName", allServices, "Имя", true);
  populateDependentLists(allServices);
}
populateAllLists();

function populateList(listId, services, fieldName, useLowerCase = true, filterFields = {}) {
  const datalist = document.getElementById(listId);
  datalist.innerHTML = '';

  // Особый случай для "Вид деятельности"
  if (listId === 'listType') {
    const inputText = document.getElementById('filterType').value.trim();
    let filtered = services;

    if (inputText) {
      filtered = filterByTags(inputText, services);
    }

    const allTypes = [...new Set(
      filtered.flatMap(service => 
        (service['Вид деятельности'] || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
      )
    )];

    allTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      datalist.appendChild(option);
    });
    return;
  }

  // Стандартная обработка для других полей
  const valuesSet = new Set();
  services.forEach((service) => {
    let valueToAdd = service[fieldName];
    if (!valueToAdd) return;

    if (fieldName === "Имя" || fieldName === "Компания") {
      const name = (service["Имя"] || "").trim();
      const company = (service["Компания"] || "").trim();
      if (name) valuesSet.add(name);
      if (company) valuesSet.add(company);
    } else {
      valuesSet.add(
        useLowerCase ? valueToAdd.trim().toLowerCase() : valueToAdd.trim()
      );
    }
  });

  const sortedValues = Array.from(valuesSet).sort((a, b) => a.localeCompare(b, "ru"));
  sortedValues.forEach((val) => {
    if (val) {
      const option = document.createElement("option");
      option.value = val;
      datalist.appendChild(option);
    }
  });
}

function populateDatalist(listId, values) {
  const datalist = document.getElementById(listId);
  datalist.innerHTML = "";
  values.forEach((val) => {
    if (val) {
      const option = document.createElement("option");
      option.value = val;
      datalist.appendChild(option);
    }
  });
}

function getUniqueValues(arr, field) {
  const set = new Set();
  arr.forEach((item) => {
    const val = (item[field] || "").trim();
    if (val) {
      val.split(",").forEach((subVal) => {
        const trimmed = subVal.trim();
        if (trimmed) set.add(trimmed);
      });
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

function getUniqueNames(arr) {
  const set = new Set();
  arr.forEach((item) => {
    const name = (item["Имя"] || "").trim();
    const company = (item["Компания"] || "").trim();
    if (name) set.add(name);
    if (company) set.add(company);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}
// 🔹 Заполнение <select> для поля Профиль
function populateSelectOptions(selectId, values) {
  const select = document.getElementById(selectId);
  const prev = select.value;
  select.innerHTML = '<option value="">Выберите профиль</option>';
  values.forEach((val) => {
    if (val) {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    }
  });
  select.value = prev;
}

function populateDependentLists(filteredServices) {
  const regionValue = document.getElementById("filterRegion").value.trim();

  let citySet = new Set();

  if (regionValue) {
    filteredServices
      .filter((s) => {
        const areas = (s["Область"] || "").split(",").map((x) => x.trim());
        return areas.includes(regionValue);
      })
      .forEach((s) => {
        const cities = (s["Населённый пункт"] || "")
          .split(",")
          .map((x) => x.trim());
        cities.forEach((city) => {
          if (city) citySet.add(city);
        });
      });
  }

  if (citySet.size === 0) {
    allServices.forEach((s) => {
      const cities = (s["Населённый пункт"] || "")
        .split(",")
        .map((x) => x.trim());
      cities.forEach((city) => {
        if (city) citySet.add(city);
      });
    });
  }

  const citiesArray = Array.from(citySet).sort((a, b) =>
    a.localeCompare(b, "ru")
  );

  populateDatalist("listCity", citiesArray);
}

function setupInputAutobehavior(id, onFocusCallback) {
  const input = document.getElementById(id);
  input.addEventListener("focus", () => {
    // input.value = ""; // <- закомментировано, чтобы не очищать поле сразу
    if (typeof onFocusCallback === "function") onFocusCallback();
  });
  input.addEventListener("blur", () => {
    // пустой обработчик, чтобы не мешать списку выпадать
  });
}

// Поведение поля ОБЛАСТЬ
setupInputAutobehavior("filterRegion", () => {
  populateDependentLists(allServices);
});

// Поведение поля ГОРОД
setupInputAutobehavior("filterCity", () => {
  populateDependentLists(allServices);
});

document.getElementById("filterRegion").addEventListener("input", () => {
  const regionInput = document.getElementById("filterRegion");
  const regionVal = regionInput.value.trim();
  localStorage.setItem("selectedRegion", regionVal);

  // Очищаем поле Город
  const cityEl = document.getElementById("filterCity");
  cityEl.value = "";

  // Очищаем поля Профиль, Вид, Район, Имя
  ["filterProfile", "filterType", "filterDistrict", "filterName"].forEach(
    (id) => {
      const el = document.getElementById(id);
      el.value = "";
    }
  );

  // Очищаем результаты и уведомления
  document.getElementById("cards").innerHTML =
    "Пожалуйста, выберите город и профиль для поиска.";
  document.getElementById("searchCount").innerText = "";

  checkFilterAccess();
});

document.getElementById("filterCity").addEventListener("input", () => {
  const cityVal = document.getElementById("filterCity").value.trim();
  localStorage.setItem("selectedCity", cityVal);

  // Очищаем поля Профиль, Вид, Район, Имя
  ["filterProfile", "filterType", "filterDistrict", "filterName"].forEach(
    (id) => {
      const el = document.getElementById(id);
      el.value = "";
    }
  );

  // Очищаем результаты и уведомления
  document.getElementById("cards").innerHTML =
    "Пожалуйста, выберите профиль для поиска.";
  document.getElementById("searchCount").innerText = "";

  checkFilterAccess();
});

function checkFilterAccess() {
  const region = document.getElementById("filterRegion").value.trim();
  const city = document.getElementById("filterCity").value.trim();

  const allow = region !== "" && city !== "";

  ["filterProfile", "filterType", "filterDistrict", "filterName"].forEach(
    (id) => {
      const el = document.getElementById(id);
      el.disabled = !allow;

      if (!allow) {
        el.addEventListener("focus", showWarningOnce);
      } else {
        el.removeEventListener("focus", showWarningOnce);
      }
    }
  );
}

function showWarningOnce(e) {
  alert("Пожалуйста, сначала выберите Область и Город");
  e.target.blur();
}

function restoreRegionCity() {
  const region = localStorage.getItem("selectedRegion");
  const city = localStorage.getItem("selectedCity");

  if (region) {
    document.getElementById("filterRegion").value = region;
  }
  if (city) {
    document.getElementById("filterCity").value = city;
  }

  // После установки значений, обновляем списки и доступность фильтров
  populateDependentLists(allServices);
  checkFilterAccess();
}

restoreRegionCity();
loadServices();

const filterFields = [
  "filterRegion",
  "filterCity",
  "filterProfile",
  "filterType",
  "filterDistrict",
  "filterName",
];

// Добавляем функцию фильтрации по тегам в начало файла (после let allServices = [];)
function filterByTags(inputText, services) {
  if (!inputText.trim()) return services;
  
  const searchWord = inputText.toLowerCase().trim();
  
  return services.filter(service => {
    const tags = (service['Теги'] || '').toLowerCase().split(/,\s*/);
    return tags.some(tag => tag.includes(searchWord));
  });
}

// Полностью заменяем обработчик filterType
document.getElementById('filterType').addEventListener('input', function(e) {
  const inputText = e.target.value.trim();
  const region = document.getElementById('filterRegion').value.trim();
  const city = document.getElementById('filterCity').value.trim();

  if (!region || !city) {
    showNotification('Сначала выберите область и город');
    return;
  }

  // Фильтр по региону и городу
  let filtered = allServices.filter(service => {
    const regions = (service['Область'] || '').split(',').map(r => r.trim());
    const cities = (service['Населённый пункт'] || '').split(',').map(c => c.trim());
    return regions.includes(region) && cities.includes(city);
  });

  // Фильтр по тегам
  if (inputText) {
    filtered = filterByTags(inputText, filtered);
  }

  // Получаем уникальные виды деятельности
  const datalist = document.getElementById('listType');
  datalist.innerHTML = '';
  
  const uniqueTypes = [...new Set(
    filtered.flatMap(service => 
      (service['Вид деятельности'] || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    )
  )];

  uniqueTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    datalist.appendChild(option);
  });
});

// Модифицируем общий обработчик (оставляя остальные поля без изменений)
filterFields.forEach((id) => {
  const el = document.getElementById(id);
  
  if (id === 'filterType') {
    // Для filterType уже есть отдельный обработчик
    return;
  }

  el.addEventListener("focus", () => {
    el.value = "";

    requestAnimationFrame(() => {
      el.setSelectionRange(0, 0);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    if (id === "filterCity") {
      populateDependentLists(allServices);
    } else if (id === "filterRegion") {
      populateAllLists();
    }
  });

  el.addEventListener("change", () => {
    el.blur();
  });
});

function showNotification(message) {
  const el = document.getElementById("notification");
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 5000);
}

window.onload = () => {
  restoreRegionCity();
  loadServices();
  document.getElementById("logoutBtn").onclick = () => {
    logout();
  };

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      localStorage.removeItem("user");
    }
  }

  initGoogleAuth();
  updateAuthUI();
  if (currentUser?.role !== "admin") {
    const adminBtn = document.getElementById("goToAdmin");
    if (adminBtn) adminBtn.style.display = "none";
  }

  document.getElementById("addServiceBtn").onclick = () => {
    window.location.href = "add.html";
  };
};

function initGoogleAuth() {
  google.accounts.id.initialize({
    client_id:
      "1060687932793-sk24egn7c7r0h6t6i1dedk4u6hrgdotc.apps.googleusercontent.com",
    callback: handleCredentialResponse,
    auto_select: false,
  });

  google.accounts.id.renderButton(document.getElementById("googleAuthBtn"), {
    theme: "outline",
    size: "large",
    type: "standard",
  });
}

async function handleCredentialResponse(response) {
  try {
    const payload = parseJWT(response.credential);

    // Сохраняем пользователя
    const user = {
      uid: "",
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      role: (await getUserRoleFromServer(payload.email)) || "user",
    };

    await saveUserToBackend(user);
    currentUser = user;
    currentUser.role = user.role || "user";
    localStorage.setItem("user", JSON.stringify(currentUser));
    updateAuthUI();
  } catch (error) {
    console.error("Ошибка авторизации:", error);
    alert("Ошибка авторизации: " + error.message);
    logout();
  }
}

function parseJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    throw new Error("Невалидный токен");
  }
}

async function getUserRoleFromServer(email) {
  try {
    const response = await fetch(
      `${API_USER_URL}?action=getRole&email=${encodeURIComponent(email)}`
    );
    const data = await response.json();
    return data.role;
  } catch (e) {
    console.error("Ошибка при получении роли:", e);
    return null;
  }
}

async function saveUserToBackend(user) {
  try {
    const params = new URLSearchParams({
      email: user.email || "",
      name: user.name || "",
      picture: user.picture || "",
    });

    await fetch(`${API_USER_URL}?${params}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-cache",
    });

    return { success: true };
  } catch (error) {
    console.error("Ошибка отправки:", error);
    return { success: false, error: error.message };
  }
}

function logout() {
  try {
    google.accounts.id.disableAutoSelect();
    if (currentUser?.email) {
      google.accounts.id.revoke(currentUser.email, () => {
        console.log("Доступ отозван");
      });
    }
  } catch (e) {
    console.error("Ошибка revoke:", e);
  }

  currentUser = null;
  localStorage.removeItem("user");
  updateAuthUI();
  location.reload();
}

function updateAuthUI() {
  const googleAuthBtn = document.getElementById("googleAuthBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const cabinetBtn = document.getElementById("cabinetBtn");
  const adminBtn = document.getElementById("adminBtn");
  const addServiceBtn = document.getElementById("addServiceBtn");
  const roleInfo = document.getElementById("roleInfo");

  if (currentUser && currentUser.role) {
    googleAuthBtn.style.display = "none";
    logoutBtn.classList.remove("hidden");

    if (currentUser.role === "admin") {
      cabinetBtn.classList.remove("hidden");
      adminBtn.classList.remove("hidden");
      addServiceBtn.classList.remove("hidden");
      roleInfo.innerText = "Вы сейчас админ";
    } else {
      cabinetBtn.classList.add("hidden");
      adminBtn.classList.add("hidden");
      addServiceBtn.classList.add("hidden");
      roleInfo.innerText = "Вы сегодня молодец!";
    }
  } else {
    googleAuthBtn.style.display = "block";
    logoutBtn.classList.add("hidden");
    cabinetBtn.classList.add("hidden");
    adminBtn.classList.add("hidden");
    addServiceBtn.classList.add("hidden");
    roleInfo.innerText = "Вы не авторизованы";
  }
}
