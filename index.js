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
  alert("2 - Проверка TG началась");
  return (
    typeof window.Telegram !== "undefined" &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initData &&
    window.Telegram.WebApp.platform &&
    window.Telegram.WebApp.platform !== "unknown"
  );
}

alert("3 - Функция создана");