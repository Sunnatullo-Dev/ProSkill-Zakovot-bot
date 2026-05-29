import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./styles/globals.css";

// Build version — Mini-App yangi yuklanganini tekshirish uchun.
// Console'da har sahifa ochilganda ko'rinadi: "[zakovat] v2026-05-29-svoyak-invite"
const BUILD_VERSION = "2026-05-29-svoyak-invite-button";
console.log(`%c[zakovat] v${BUILD_VERSION}`, "color: #f5c842; font-weight: bold");
// Telegram WebApp shapkasida ham ko'rinarli (debug uchun)
try {
  if ((window as any).Telegram?.WebApp?.MainButton) {
    /* no-op — shu yerda build version log'i muhim */
  }
} catch {
  /* ignore */
}

// Dev-only: ?devTid=12345 URL param o'qiladi va localStorage'ga saqlanadi.
// Bu telegram_id sifatida X-Dev-Tid header orqali backend'ga yuboriladi —
// bir browser'dan ko'p tab orqali Svoyak multi-player test qilish uchun.
// `?devTid=0` clear qilib qo'yadi.
try {
  const params = new URLSearchParams(window.location.search);
  const devTid = params.get("devTid");
  if (devTid !== null) {
    if (devTid === "" || devTid === "0") {
      window.localStorage.removeItem("svoyak:devTid");
    } else if (/^\d+$/.test(devTid)) {
      window.localStorage.setItem("svoyak:devTid", devTid);
    }
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
