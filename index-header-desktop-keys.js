// index-header-desktop-keys-full.js
console.log("✅ index-header-desktop-keys-full.js загружен");

// ----------------------------
// Ключевые точки для шапки (desktop)
// ----------------------------
const headerKeys = {
  // Боковые рекламные блоки
  adLeft: {
    1920: { top: 100, left: 100, width: 450, height: 450 },
    1440: { top: 100, left: 80, width: 400, height: 400 },
    1280: { top: 80, left: 70, width: 350, height: 350 },
    720:  { top: 50, left: 20, width: 300, height: 300 }
  },
  adRight: {
    1920: { top: 100, left: 1370, width: 450, height: 450 },
    1440: { top: 100, left: 1060, width: 400, height: 400 },
    1280: { top: 80, left: 860, width: 350, height: 350 },
    720:  { top: 50, left: 600, width: 300, height: 300 }
  },

  // Нижние рекламные блоки под фильтрами (каждый блок отдельно)
  adRow1: {
    1920: { top: 500, left: 50, width: 400, height: 400 },
    1440: { top: 480, left: 40, width: 350, height: 140 },
    1280: { top: 460, left: 30, width: 300, height: 130 },
    720:  { top: 440, left: 20, width: 250, height: 120 }
  },
  adRow2: {
    1920: { top: 500, left: 500, width: 400, height: 150 },
    1440: { top: 480, left: 450, width: 350, height: 140 },
    1280: { top: 460, left: 400, width: 300, height: 130 },
    720:  { top: 440, left: 350, width: 250, height: 120 }
  },
  adRow3: {
    1920: { top: 500, left: 950, width: 400, height: 150 },
    1440: { top: 480, left: 850, width: 350, height: 140 },
    1280: { top: 460, left: 750, width: 300, height: 130 },
    720:  { top: 440, left: 650, width: 250, height: 120 }
  },
  adRow4: {
    1920: { top: 500, left: 1400, width: 400, height: 150 },
    1440: { top: 480, left: 1200, width: 350, height: 140 },
    1280: { top: 460, left: 1050, width: 300, height: 130 },
    720:  { top: 440, left: 900, width: 250, height: 120 }
  },

  // Заголовок
  pageTitle: {
    1920: { top: 30, left: 830, fontSize: 50, width: 10 },
    1440: { top: 60, left: 100, fontSize: 28 },
    1280: { top: 50, left: 80, fontSize: 26 },
    720:  { top: 40, left: 20, fontSize: 22 }
  },
  // Подпись под заголовком
  pageSubtitle: {
    1920: { top: 180, left: 830, fontSize: 32 },
    1440: { top: 140, left: 100, fontSize: 18 },
    1280: { top: 120, left: 80, fontSize: 15 },
    720:  { top: 100, left: 20, fontSize: 14 }
  },

  // Кнопка поиска
  searchBtn: {
    1920: { top: 400, left: 600, width: 300, height: 50 },
    1440: { top: 600, left: 700, width: 400, height: 400 },
    1280: { top: 180, left: 80, width: 140, height: 35 },
    720:  { top: 160, left: 20, width: 120, height: 30 }
  },

  // Кнопки (каждая отдельная)
  authLogin: { // Кнопка ВХОД/ВЫХОД
  1920: { top: 28, left: 50, width: 120, height: 40 },
  1440: { top: 20, left: 1200, width: 100, height: 35 },
  1280: { top: 20, left: 1100, width: 90, height: 30 },
  720:  { top: 15, left: 600, width: 80, height: 28 }
},
  authAdmin: { // Кнопка АДМИНКА
    1920: { top: 28, left: 180, width: 90, height: 40 },
    1440: { top: 20, left: 1320, width: 100, height: 35 },
    1280: { top: 20, left: 1200, width: 90, height: 30 },
    720:  { top: 15, left: 700, width: 80, height: 28 }
  },
  authAddService: { // Кнопка ДОБАВИТЬ УСЛУГУ
    1920: { top: 28, left: 300, width: 140, height: 40 },
    1440: { top: 20, left: 1200, width: 120, height: 35 },
    1280: { top: 20, left: 1100, width: 100, height: 30 },
    720:  { top: 15, left: 600, width: 90, height: 28 }
  },
  authProfile: { // Кнопка ЛИЧНЫЙ КАБИНЕТ
    1920: { top: 28, left: 450, width: 133, height: 40 },
    1440: { top: 20, left: 1350, width: 100, height: 35 },
    1280: { top: 20, left: 1230, width: 90, height: 30 },
    720:  { top: 15, left: 720, width: 80, height: 28 }
  },

  // Поля фильтров (каждое поле отдельно)
  filter1: { // Поле ОБЛАСТЬ
  1920: { left: 600, top: 205, width: 350, height: 40 },
  1440: { left: 600, top: 205, width: 350, height: 40 },
  1280: { left: 600, top: 205, width: 350, height: 40 },
  720:  { left: 600, top: 205, width: 350, height: 40 }
},
filter2: { // Поле ГОРОД
  1920: { left: 955, top: 205, width: 350, height: 40 },
  1440: { left: 955, top: 205, width: 350, height: 40 },
  1280: { left: 955, top: 205, width: 350, height: 40 },
  720:  { left: 955, top: 205, width: 350, height: 40 }
},

  filter3: { // Поле ПРОФИЛЬ
    1920: { top: 255, left: 600, width: 350, height: 40 },
    1440: { top: 255, left: 600, width: 350, height: 40 },
    1280: { top: 255, left: 600, width: 350, height: 40 },
    720:  { top: 255, left: 600, width: 350, height: 40 }
  },
  filter4: { // Поле ВИД
    1920: { top: 255, left: 955, width: 350, height: 40 },
    1440: { top: 255, left: 955, width: 350, height: 40 },
    1280: { top: 255, left: 955, width: 350, height: 40 },
    720:  { top: 255, left: 955, width: 350, height: 40 }
  },
  
  filter5: { // Поле РАЙОН
    1920: { top: 305, left: 600, width: 350, height: 40 },
    1440: { top: 305, left: 600, width: 350, height: 40 },
    1280: { top: 305, left: 600, width: 350, height: 40 },
    720:  { top: 305, left: 600, width: 350, height: 40 }
  },
  filter6: { // Поле ИМЯ
    1920: { top: 305, left: 955, width: 350, height: 40 },
    1440: { top: 305, left: 955, width: 350, height: 40 },
    1280: { top: 305, left: 955, width: 350, height: 40 },
    720:  { top: 305, left: 955, width: 350, height: 40 }
  }
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

    if (element.classList.contains('ad-block')) {
    element.style.display = 'flex'; // Принудительно включаем flex
    element.style.visibility = 'visible'; // Гарантируем видимость
  }

    const breakpoints = Object.keys(points).map(Number).sort((a,b)=>a-b);
    let leftBP = breakpoints[0];
    let rightBP = breakpoints[breakpoints.length - 1];
    
    for (let i = 0; i < breakpoints.length; i++) {
      if (width >= breakpoints[i]) leftBP = breakpoints[i];
      if (width <= breakpoints[i]) { rightBP = breakpoints[i]; break; }
    }

    const leftVal = points[leftBP];
    const rightVal = points[rightBP];
    const ratio = (width - leftBP) / (rightBP - leftBP || 1);

    if (element.id === 'googleAuthBtn') {
      const googleInner = element.querySelector('div');
      if (googleInner) googleInner.style.transform = 'none';
    }

    if (element.classList?.contains('filter1') || 
        element.classList?.contains('filter2') ||
        element.classList?.contains('filter3') ||
        element.classList?.contains('filter4') ||
        element.classList?.contains('filter5') ||
        element.classList?.contains('filter6')) {
      element.style.position = 'static';
      element.style.margin = '0';
      const container = element.closest('.input-wrapper-dt') || element.parentElement;
      container.style.position = 'absolute';
      container.style.left = `${interpolate(leftVal.left || leftVal.marginLeft, rightVal.left || rightVal.marginLeft, ratio)}px`;
      container.style.top = `${interpolate(leftVal.top || leftVal.marginTop, rightVal.top || rightVal.marginTop, ratio)}px`;
      container.style.width = `${interpolate(leftVal.width, rightVal.width, ratio)}px`;
      element.style.width = '100%';
      element.style.height = `${interpolate(leftVal.height, rightVal.height, ratio)}px`;
      return;
    }

    element.style.position = 'absolute';
    for (let prop in leftVal) {
      if (['left', 'top', 'width', 'height', 'fontSize'].includes(prop)) {
        element.style[prop] = `${interpolate(leftVal[prop], rightVal[prop], ratio)}px`;
      }
    }
  };

 for (let key in headerKeys) {
  const el = document.querySelector('.'+key) || document.getElementById(key);
  
  if (key === 'authLogin') {
    // Применяем стили к обеим кнопкам (ВХОД и ВЫХОД)
    const loginBtn = document.querySelector('.authLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    
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
window.addEventListener('load', applyHeaderKeys);
window.addEventListener('resize', applyHeaderKeys);
