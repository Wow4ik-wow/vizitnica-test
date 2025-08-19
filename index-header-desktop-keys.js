// index-header-desktop-keys-full.js
console.log("✅ index-header-desktop-keys-full.js загружен");

// ----------------------------
// Ключевые точки для шапки (desktop)
// ----------------------------
const headerKeys = {
  // Боковые рекламные блоки
  promoLeft: {
    1920: { top: 80, left: 100, width: 450, height: 450 },
    1440: { top: 80, left: 20, width: 370, height: 370 },
    1280: { top: 80, left: 20, width: 340, height: 340 },
    960: { top: 430, left: 20, width: 300, height: 300 },
    720: { top: 430, left: 320, width: 300, height: 300 },
  },
  promoRight: {
    1920: { top: 80, left: 1360, width: 450, height: 450 },
    1440: { top: 80, left: 1030, width: 370, height: 370 },
    1280: { top: 80, left: 910, width: 340, height: 340 },
    960: { top: 430, left: 640, width: 300, height: 300 },
    720: { top: 430, left: 320, width: 300, height: 300 },
  },

  // Нижние рекламные блоки под фильтрами (каждый блок отдельно)
  promoRow1: {
    1920: { top: 555, left: 320, width: 300, height: 300 },
    1440: { top: 500, left: 100, width: 300, height: 300 },
    1280: { top: 430, left: 20, width: 300, height: 300 },
    960: { top: 430, left: 330, width: 300, height: 300 },
    720: { top: 430, left: 320, width: 300, height: 300 },
  },
  promoRow2: {
    1920: { top: 555, left: 640, width: 300, height: 300 },
    1440: { top: 500, left: 420, width: 300, height: 300 },
    1280: { top: 430, left: 330, width: 300, height: 300 },
    960: { top: 740, left: 20, width: 300, height: 300 },
    720: { top: 430, left: 640, width: 300, height: 300 },
  },
  promoRow3: {
    1920: { top: 555, left: 960, width: 300, height: 300 },
    1440: { top: 500, left: 740, width: 300, height: 300 },
    1280: { top: 430, left: 640, width: 300, height: 300 },
    960: { top: 740, left: 330, width: 300, height: 300 },
    720: { top: 430, left: 960, width: 300, height: 300 },
  },
  promoRow4: {
    1920: { top: 555, left: 1280, width: 300, height: 300 },
    1440: { top: 500, left: 1060, width: 300, height: 300 },
    1280: { top: 430, left: 950, width: 300, height: 300 },
    960: { top: 740, left: 640, width: 300, height: 300 },
    720: { top: 430, left: 1280, width: 300, height: 300 },
  },

  // Заголовок
  pageTitle: {
    1920: { top: 68, left: 830, fontSize: 48, width: 350 },
    1440: { top: 68, left: 590, fontSize: 48, width: 350 },
    1280: { top: 68, left: 510, fontSize: 48, width: 350 },
    960: { top: 215, left: 100, fontSize: 48, width: 350 },
    720: { top: 68, left: 830, fontSize: 48, width: 350 },
  },
  // Подпись под заголовком
  pageSubtitle: {
    1920: { top: 180, left: 830, fontSize: 32 },
    1440: { top: 180, left: 590, fontSize: 27 },
    1280: { top: 180, left: 510, fontSize: 24 },
    960: { top: 385, left: 100, fontSize: 22 },
    720: { top: 180, left: 830, fontSize: 32 },
  },

  // Кнопка поиска
  searchBtn: {
    1920: { top: 380, left: 600, width: 705, height: 35 },
    1440: { top: 380, left: 420, width: 590, height: 35 },
    1280: { top: 380, left: 365, width: 540, height: 35 },
    960: { top: 380, left: 470, width: 350, height: 40 },
    720: { top: 380, left: 600, width: 300, height: 35 },
  },

  // Кнопки (каждая отдельная)
  authLogin: {
    // Кнопка ВХОД/ВЫХОД
    1920: { top: 28, left: 50, width: 80, height: 40 },
    1440: { top: 28, left: 50, width: 80, height: 40 },
    1280: { top: 28, left: 50, width: 80, height: 40 },
    720: { top: 28, left: 10, width: 80, height: 40 },
  },
  authAdmin: {
    // Кнопка АДМИНКА
    1920: { top: 28, left: 150, width: 90, height: 40 },
    1440: { top: 28, left: 150, width: 90, height: 40 },
    1280: { top: 28, left: 150, width: 90, height: 40 },
    720: { top: 28, left: 95, width: 90, height: 40 },
  },
  authAddService: {
    // Кнопка ДОБАВИТЬ УСЛУГУ
    1920: { top: 28, left: 255, width: 140, height: 40 },
    1440: { top: 28, left: 255, width: 140, height: 40 },
    1280: { top: 28, left: 255, width: 140, height: 40 },
    720: { top: 28, left: 190, width: 140, height: 40 },
  },
  authProfile: {
    // Кнопка ЛИЧНЫЙ КАБИНЕТ
    1920: { top: 28, left: 410, width: 133, height: 40 },
    1440: { top: 28, left: 410, width: 133, height: 40 },
    1280: { top: 28, left: 410, width: 133, height: 40 },
    720: { top: 28, left: 335, width: 133, height: 40 },
  },

  // Поля фильтров (каждое поле отдельно)
  filter1: {
    // Поле ОБЛАСТЬ
    1920: { top: 230, left: 600, width: 350, height: 40 },
    1440: { top: 230, left: 410, width: 300, height: 40 },
    1280: { top: 230, left: 365, width: 265, height: 40 },
    960: { top: 80, left: 470, width: 350, height: 40 },
    720: { top: 230, left: 600, width: 350, height: 40 },
  },
  filter2: {
    // Поле ГОРОД
    1920: { top: 230, left: 955, width: 350, height: 40 },
    1440: { top: 230, left: 715, width: 300, height: 40 },
    1280: { top: 230, left: 640, width: 265, height: 40 },
    960: { top: 130, left: 470, width: 350, height: 40 },
    720: { top: 230, left: 955, width: 350, height: 40 },
  },

  filter3: {
    // Поле ПРОФИЛЬ
    1920: { top: 280, left: 600, width: 350, height: 40 },
    1440: { top: 280, left: 410, width: 300, height: 40 },
    1280: { top: 280, left: 365, width: 265, height: 40 },
    960: { top: 180, left: 470, width: 350, height: 40 },
    720: { top: 280, left: 600, width: 350, height: 40 },
  },
  filter4: {
    // Поле ВИД
    1920: { top: 280, left: 955, width: 350, height: 40 },
    1440: { top: 280, left: 715, width: 300, height: 40 },
    1280: { top: 280, left: 640, width: 265, height: 40 },
    960: { top: 230, left: 470, width: 350, height: 40 },
    720: { top: 280, left: 955, width: 350, height: 40 },
  },

  filter5: {
    // Поле РАЙОН
    1920: { top: 330, left: 600, width: 350, height: 40 },
    1440: { top: 330, left: 410, width: 300, height: 40 },
    1280: { top: 330, left: 365, width: 265, height: 40 },
    960: { top: 280, left: 470, width: 350, height: 40 },
    720: { top: 330, left: 600, width: 350, height: 40 },
  },
  filter6: {
    // Поле ИМЯ
    1920: { top: 330, left: 955, width: 350, height: 40 },
    1440: { top: 330, left: 715, width: 300, height: 40 },
    1280: { top: 330, left: 640, width: 265, height: 40 },
    960: { top: 330, left: 470, width: 350, height: 40 },
    720: { top: 330, left: 955, width: 350, height: 40 },
  },
};

// ----------------------------
// Интерполяция числовых значений
// ----------------------------
function interpolate(val1, val2, ratio) {
  return val1 + (val2 - val1) * ratio;
}

// ----------------------------
// Применяем ключевые точки к объектам
// ----------------------------
function applyHeaderKeys() {
  const width = window.innerWidth;

  const applyElement = (element, points) => {
    if (!element) return;

    const breakpoints = Object.keys(points)
      .map(Number)
      .sort((a, b) => a - b);
    let leftBP = breakpoints[0];
    let rightBP = breakpoints[breakpoints.length - 1];

    for (let i = 0; i < breakpoints.length; i++) {
      if (width >= breakpoints[i]) leftBP = breakpoints[i];
      if (width <= breakpoints[i]) {
        rightBP = breakpoints[i];
        break;
      }
    }

    const leftVal = points[leftBP];
    const rightVal = points[rightBP];
    const ratio = (width - leftBP) / (rightBP - leftBP || 1);

    if (element.id === "googleAuthBtn") {
      const googleInner = element.querySelector("div");
      if (googleInner) googleInner.style.transform = "none";
    }

    if (
      element.classList?.contains("filter1") ||
      element.classList?.contains("filter2") ||
      element.classList?.contains("filter3") ||
      element.classList?.contains("filter4") ||
      element.classList?.contains("filter5") ||
      element.classList?.contains("filter6")
    ) {
      element.style.position = "static";
      element.style.margin = "0";
      const container =
        element.closest(".input-wrapper-dt") || element.parentElement;
      container.style.position = "absolute";
      container.style.left = `${interpolate(
        leftVal.left || leftVal.marginLeft,
        rightVal.left || rightVal.marginLeft,
        ratio
      )}px`;
      container.style.top = `${interpolate(
        leftVal.top || leftVal.marginTop,
        rightVal.top || rightVal.marginTop,
        ratio
      )}px`;
      container.style.width = `${interpolate(
        leftVal.width,
        rightVal.width,
        ratio
      )}px`;
      element.style.width = "100%";
      element.style.height = `${interpolate(
        leftVal.height,
        rightVal.height,
        ratio
      )}px`;
      return;
    }

    element.style.position = "absolute";
    for (let prop in leftVal) {
      if (["left", "top", "width", "height", "fontSize"].includes(prop)) {
        element.style[prop] = `${interpolate(
          leftVal[prop],
          rightVal[prop],
          ratio
        )}px`;
      }
    }
  };

  for (let key in headerKeys) {
    const el =
      document.querySelector("." + key) || document.getElementById(key);

    if (key === "authLogin") {
      // Применяем стили к обеим кнопкам (ВХОД и ВЫХОД)
      const loginBtn = document.querySelector(".authLogin");
      const logoutBtn = document.getElementById("logoutBtn");

      if (loginBtn) applyElement(loginBtn, headerKeys[key]);
      if (logoutBtn) applyElement(logoutBtn, headerKeys[key]);
      continue;
    }

    if (el) applyElement(el, headerKeys[key]);
  }
}

// ----------------------------
// Запуск при загрузке и ресайзе
// ----------------------------
window.addEventListener("load", applyHeaderKeys);
window.addEventListener("resize", applyHeaderKeys);
