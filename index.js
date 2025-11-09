// Минимальный тестовый код
const apiUrl = "test";
const API_USER_URL = "test"; 
let currentUser = null;
let allServices = [];

alert("index.js выполняется!");

// TG логика
let isTelegramWebApp = false;
let tgUser = null;
alert("1 - Переменные TG объявлены");

function isReallyTelegramWebApp() {
  alert("2.1 - Проверка window.Telegram");
  if (typeof window.Telegram === "undefined") return false;
  alert("2.2 - Проверка Telegram.WebApp");
  if (!window.Telegram.WebApp) return false;
  alert("2.3 - Проверка initData");
  if (!window.Telegram.WebApp.initData) return false;
  alert("2.4 - Проверка platform");
  if (!window.Telegram.WebApp.platform) return false;
  alert("2.5 - Проверка platform !== unknown");
  if (window.Telegram.WebApp.platform === "unknown") return false;
  
  return true;
}

alert("3 - Функция создана");

alert("4 - Перед вызовом функции");
const result = isReallyTelegramWebApp();
alert("4.1 - После вызова функции: " + result);

if (isReallyTelegramWebApp()) {
  alert("5 - Это TG WebApp!");
  isTelegramWebApp = true;
  try {
    tgUser = Telegram.WebApp.initDataUnsafe?.user || null;
    alert("6 - TG User: " + (tgUser ? tgUser.first_name : "null"));
  } catch (e) {
    alert("7 - Ошибка TG: " + e);
  }
} else {
  alert("8 - Это не TG");
}