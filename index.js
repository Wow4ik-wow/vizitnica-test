// Минимальный тестовый код
const apiUrl = "test";
const API_USER_URL = "test"; 
let currentUser = null;
let allServices = [];

alert("20");

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

isReallyTelegramWebApp();

alert("3 - Функция создана");

const tgResult = isReallyTelegramWebApp();
alert("TG результат: " + tgResult);

if (tgResult) {
  alert("Это TG WebApp!");
  isTelegramWebApp = true;
  tgUser = Telegram.WebApp.initDataUnsafe?.user || null;
  alert("TG пользователь: " + (tgUser ? tgUser.first_name : "нет"));
} else {
  alert("Это не TG");
}