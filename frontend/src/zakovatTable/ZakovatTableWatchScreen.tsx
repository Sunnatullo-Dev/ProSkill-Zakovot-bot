/**
 * Zakovat Stoli — kuzatuvchi kirish ekrani.
 *
 * Faqat xona kodini so'raydi (masalan "7845" yoki "ZK-7845") — hech qanday
 * mutatsiya (join/spectate API) chaqirilmaydi, chunki bu ekran butunlay
 * o'qish uchun. Kod normalizatsiyasi backend bilan bir xil qoidaga amal
 * qiladi (apps/zakovat_table/repositories.normalize_code): faqat harf/raqam,
 * boshidagi "ZK" prefiksi olib tashlanadi.
 */
import { useState } from "react";

type Props = {
  onWatch: (code: string) => void;
  onBack: () => void;
};

function normalizeCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.startsWith("ZK") ? cleaned.slice(2) : cleaned;
}

export default function ZakovatTableWatchScreen({ onWatch, onBack }: Props) {
  const [input, setInput] = useState("");

  const cleanCode = normalizeCode(input);
  const canWatch = cleanCode.length >= 4;

  function handleWatch() {
    if (!canWatch) return;
    onWatch(cleanCode);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        maxWidth: "430px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
          aria-label="Orqaga"
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--text)" }}>
            Zakovat Stoli
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            O'yinni kuzatish
          </div>
        </div>
      </div>

      {/* Forma */}
      <div style={{ flex: 1, padding: "28px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>👁</div>
          <div style={{ fontSize: "15px", color: "var(--muted)" }}>
            Boshlovchi (admin) bergan xona kodini kiriting
          </div>
        </div>

        <div>
          <label
            htmlFor="zt-room-code"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "1.5px",
              marginBottom: "8px",
            }}
          >
            XONA KODI
          </label>
          <input
            id="zt-room-code"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            placeholder="Masalan: 7845 yoki ZK-7845"
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 3px rgba(77,166,255,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canWatch) handleWatch();
            }}
          />
        </div>

        <button
          type="button"
          disabled={!canWatch}
          onClick={handleWatch}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "14px",
            border: "none",
            background: canWatch
              ? "linear-gradient(135deg, #4DA6FF, #7C3AED)"
              : "var(--border)",
            color: canWatch ? "white" : "var(--muted)",
            fontSize: "16px",
            fontWeight: 800,
            cursor: canWatch ? "pointer" : "not-allowed",
            opacity: canWatch ? 1 : 0.5,
            boxShadow: canWatch ? "0 8px 22px rgba(77,166,255,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          Kuzatishni boshlash 👁
        </button>

        <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "4px" }}>
          Bu — faqat tomosha qilish ekrani. O'yinni faqat bot orqali boshqarish mumkin.
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "var(--card)",
  border: "1.5px solid var(--border)",
  borderRadius: "14px",
  fontSize: "15px",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
  letterSpacing: "2px",
  textAlign: "center",
};
