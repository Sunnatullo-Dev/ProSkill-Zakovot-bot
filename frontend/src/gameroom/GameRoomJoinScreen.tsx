/**
 * Online O'yin Xonasi — kirish ekrani.
 *
 * Uchta vazifa:
 *   1. Xona kodi kiritish (manual) yoki deep link orqali avtomatik to'ldirilgan
 *   2. Taxallus kiritish (agar displayName yo'q bo'lsa)
 *   3. `join_room` API'ni chaqirish → muvaffaqiyatli bo'lsa onJoined
 *
 * Deep link: `room_<CODE>` start_param orqali kelsa `initialCode` to'ldirilgan.
 */
import { useState } from "react";
import { joinGameRoom } from "../api/client";

type Props = {
  /** Deep link yoki boshqa manbadan kelgan kod (optsional). */
  initialCode?: string;
  /** Foydalanuvchi displayName'i — bo'sh bo'lmasa taxallus so'ralmaydi. */
  playerName: string;
  onJoined: (code: string) => void;
  onBack: () => void;
};

export default function GameRoomJoinScreen({
  initialCode,
  playerName,
  onJoined,
  onBack,
}: Props) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [displayName, setDisplayName] = useState(playerName);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanCode = code.toUpperCase().trim();
  const cleanName = displayName.trim();
  const canJoin = cleanCode.length >= 4 && cleanName.length >= 1 && !loading;

  async function handleJoin() {
    if (!canJoin) return;
    setLoading(true);
    setError("");
    try {
      const result = await joinGameRoom(
        cleanCode,
        cleanName,
        password.trim() || undefined,
      );
      if (result.ok) {
        onJoined(cleanCode);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Ulanishda xato. Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
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
            Online O'yin Xonasi
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Kod bilan kirish
          </div>
        </div>
      </div>

      {/* Forma */}
      <div style={{ flex: 1, padding: "28px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>🎮</div>
          <div style={{ fontSize: "15px", color: "var(--muted)" }}>
            Admin bergan kodni kiriting
          </div>
        </div>

        {/* Xona kodi */}
        <div>
          <label
            htmlFor="room-code"
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
            id="room-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="Masalan: ABC123"
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
          />
        </div>

        {/* Taxallus */}
        <div>
          <label
            htmlFor="display-name"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "1.5px",
              marginBottom: "8px",
            }}
          >
            TAXALLUS (O'YINDAGI ISM)
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ismingizni kiriting"
            maxLength={50}
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
          />
        </div>

        {/* Parol (ixtiyoriy) */}
        <div>
          <label
            htmlFor="room-password"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "1.5px",
              marginBottom: "8px",
            }}
          >
            PAROL (agar kerak bo'lsa)
          </label>
          <input
            id="room-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parolsiz bo'lsa — bo'sh qoldiring"
            autoComplete="off"
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
              if (e.key === "Enter" && canJoin) void handleJoin();
            }}
          />
        </div>

        {error && (
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--error)",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!canJoin}
          onClick={() => void handleJoin()}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "14px",
            border: "none",
            background: canJoin
              ? "linear-gradient(135deg, #4DA6FF, #7C3AED)"
              : "var(--border)",
            color: canJoin ? "white" : "var(--muted)",
            fontSize: "16px",
            fontWeight: 800,
            cursor: canJoin ? "pointer" : "not-allowed",
            opacity: canJoin ? 1 : 0.5,
            boxShadow: canJoin ? "0 8px 22px rgba(77,166,255,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Kirilmoqda..." : "Xonaga kirish 🎮"}
        </button>

        <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "4px" }}>
          Kodni admin (o'yin boshlovchi)dan oling
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
};
