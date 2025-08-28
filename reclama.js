// reclаma.js — финальный файл для работы с GAS
// URL твоего опубликованного GAS
const GAS_URL = "https://script.google.com/macros/s/AKfycby3VudtrNIahOTHXlKi91UPQiHI5vHHwwUm0C5Azw-eIgWzdt6wcUv0QHjRfhgg7ewgoA/exec";

// --- ID HTML-блоков под рекламу ---
const promoBlocks = [
  "promoLeft",
  "promoRight",
  "promoRow1",
  "promoRow2",
  "promoRow3",
  "promoRow4"
];

// --- Загрузка рекламы ---
async function loadAds() {
  try {
    const res = await fetch(GAS_URL);
    const data = await res.json();

    // Преобразуем структуру данных из GAS в нужный формат
    const activeAds = data.ads.map(ad => ({
      "Статус": "Подтверждён",
      "Ссылки на картинки": ad.image || "",
      "Название": ad.title || "",
      "Описание": ad.description || "",
      "Ссылка на сайт": ad.link || "",
      "ID заказа": ad.id || ""
    }));

    const fallbacks = data.fallbacks.map(fb => ({
      "Статус": "Заглушка",
      "Ссылки на картинки": fb.image || "",
      "Название": fb.title || "",
      "Описание": fb.description || "",
      "Ссылка на сайт": fb.link || "",
      "ID заказа": fb.id || ""
    }));

    promoBlocks.forEach((id) => {
      const block = document.getElementById(id);
      if (!block) return;

      // Сначала пытаемся взять обычную рекламу
      let ad = activeAds.shift();

      // Если обычной рекламы нет, берём случайную заглушку
      if (!ad && fallbacks.length > 0) {
        ad = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      // Если нет ни рекламы, ни заглушек — блок остаётся пустым
      if (!ad) return;

      const imgUrl = ad["Ссылки на картинки"]
        ? convertDriveLink(ad["Ссылки на картинки"])
        : "";

      block.innerHTML = `
  <div class="ad-card">
    <img src="${imgUrl}" alt="${ad["Название"]}">
  </div>
`;

      block.onclick = () => {
        if (ad["Ссылка на сайт"]) {
          window.open(ad["Ссылка на сайт"], "_blank");
        } else {
          window.open(`reclama.html?id=${ad["ID заказа"]}`, "_blank");
        }
      };
    });

  } catch (err) {
    console.error("Ошибка загрузки рекламы:", err);
    
    // Покажем заглушки при ошибке
    promoBlocks.forEach((id) => {
      const block = document.getElementById(id);
      if (block) {
        block.innerHTML = '<div style="padding:20px; text-align:center;">Рекламный блок</div>';
      }
    });
  }
}

// --- Функция для конвертации ссылок Google Drive ---
function convertDriveLink(url) {
  if (!url) return "";
  console.log("Конвертируем ссылку:", url);
  
  // Для прямых ID
  if (url.length === 33 && !url.includes('/')) {
    return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
  }
  
  // Для Google Drive ссылок
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
  }
  
  // Для других ссылок
  return url;
}

// Запуск загрузки рекламы при готовности DOM
document.addEventListener("DOMContentLoaded", loadAds);
