import { useState } from "react";
import { createPortal } from "react-dom";
import type { ShareContent } from "../utils/share";
import { copyShareLink, shareToTelegram, shareToWhatsApp } from "../utils/share";

type ShareSheetProps = {
  content: ShareContent;
  onClose: () => void;
};

function TelegramIcon() {
  return (
    <svg height="56" viewBox="0 0 32 32" width="56">
      <circle cx="16" cy="16" fill="#229ED9" r="16" />
      <path
        d="M7 15.7l16.2-6.25c.75-.27 1.41.18 1.16 1.32l-2.76 13c-.2.92-.75 1.15-1.52.71l-4.2-3.1-2.03 1.95c-.22.22-.41.41-.84.41l.3-4.3 7.8-7.05c.34-.3-.07-.47-.52-.17l-9.64 6.07-4.16-1.3c-.9-.28-.92-.9.19-1.33z"
        fill="#fff"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg height="56" viewBox="0 0 32 32" width="56">
      <circle cx="16" cy="16" fill="#25D366" r="16" />
      <path
        d="M16 7c-5 0-9 4-9 9 0 1.6.4 3.1 1.2 4.4L7 25l4.8-1.2A9 9 0 1016 7zm0 16.2c-1.3 0-2.6-.35-3.7-1l-.27-.16-2.8.73.75-2.73-.18-.28A7.2 7.2 0 1116 23.2zm4.1-5.4c-.22-.11-1.32-.65-1.53-.72-.2-.08-.35-.11-.5.11-.15.22-.57.72-.7.87-.13.15-.26.16-.48.05-.22-.11-.94-.35-1.79-1.1-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.05-.11-.5-1.2-.68-1.65-.18-.43-.37-.37-.5-.38h-.43c-.15 0-.39.05-.59.28-.2.22-.78.76-.78 1.85s.8 2.15.91 2.3c.11.15 1.57 2.4 3.8 3.36.53.23.95.37 1.27.47.53.17 1.02.15 1.4.09.43-.06 1.32-.54 1.5-1.06.18-.52.18-.97.13-1.06-.05-.09-.2-.15-.42-.26z"
        fill="#fff"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg height="56" viewBox="0 0 32 32" width="56">
      <circle cx="16" cy="16" fill="#4DA6FF" r="16" />
      <path
        d="M13 9h7a2 2 0 012 2v8h-2v-8h-7zm-3 4h7a2 2 0 012 2v7a2 2 0 01-2 2h-7a2 2 0 01-2-2v-7a2 2 0 012-2zm0 2v7h7v-7z"
        fill="#fff"
      />
    </svg>
  );
}

const optionLabelStyle = {
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--text)",
  marginTop: "8px"
};

export default function ShareSheet({ content, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  function handleTelegram() {
    shareToTelegram(content);
    onClose();
  }

  function handleWhatsApp() {
    shareToWhatsApp(content);
    onClose();
  }

  async function handleCopy() {
    const ok = await copyShareLink(content);
    setCopied(ok);
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        className="animate-fadeInUp"
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "var(--surface)",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--border)"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            width: "40px",
            height: "4px",
            background: "var(--border)",
            borderRadius: "2px",
            margin: "0 auto 16px"
          }}
        />
        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)", marginBottom: "18px" }}>
          Ulashish
        </div>

        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}
            type="button"
            onClick={handleTelegram}
          >
            <TelegramIcon />
            <span style={optionLabelStyle}>Telegram</span>
          </button>

          <button
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}
            type="button"
            onClick={handleWhatsApp}
          >
            <WhatsAppIcon />
            <span style={optionLabelStyle}>WhatsApp</span>
          </button>

          <button
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}
            type="button"
            onClick={handleCopy}
          >
            <CopyIcon />
            <span style={{ ...optionLabelStyle, color: copied ? "var(--success)" : "var(--text)" }}>
              {copied ? "Nusxalandi" : "Nusxalash"}
            </span>
          </button>
        </div>

        <button
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "13px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--muted)",
            cursor: "pointer"
          }}
          type="button"
          onClick={onClose}
        >
          Yopish
        </button>
      </div>
    </div>,
    document.body
  );
}
