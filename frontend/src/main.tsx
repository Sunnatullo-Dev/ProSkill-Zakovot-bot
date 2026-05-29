import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./styles/globals.css";

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
