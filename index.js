// Минимальный тестовый код
const apiUrl = "test";
const API_USER_URL = "test"; 
let currentUser = null;
let allServices = [];

alert("index.js выполняется!");

// TG логика
let isTelegramWebApp = false;
let tgUser = null;

function isReallyTelegramWebApp() {
  return (
    typeof window.Telegram !== "undefined" &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initData &&
    window.Telegram.WebApp.platform &&
    window.Telegram.WebApp.platform !== "unknown"
  );
}

alert("TG логика добавлена!");