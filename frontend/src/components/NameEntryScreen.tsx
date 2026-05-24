import { useState } from "react";
import type { FormEvent } from "react";
import { updateMyDisplayName } from "../api/client";
import type { AppUser } from "../types";

type NameEntryScreenProps = {
  initialName: string;
  isGuest: boolean;
  onDone: (user: AppUser | null, name: string) => void;
};

// Birinchi marta kirgan foydalanuvchidan ismni so'raydigan oddiy ekran.
// - Real Telegram foydalanuvchi: backend'ga PATCH /me yuboradi (DB'ga saqlanadi)
// - Mehmon (telegram_id=0): faqat localStorage'ga yozadi — chunki barcha mehmon
//   bitta DB qatorida (telegram_id=0) bo'lib qoladi va boshqa mehmonlarning
//   nomini ko'rib qolmasligi uchun.
export default function NameEntryScreen({ initialName, isGuest, onDone }: NameEntryScreenProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setError("Ism kamida 2 belgi bo'lishi kerak");
      return;
    }
    if (trimmed.length > 30) {
      setError("Ism 30 belgidan oshmasin");
      return;
    }

    setSaving(true);
    setError("");

    try {
      window.localStorage.setItem("zakovat:playerName", trimmed);
    } catch {
      // localStorage o'chirilgan bo'lishi mumkin
    }

    if (isGuest) {
      // Mehmon — DB'ga yozmaymiz (shared bug oldini olish uchun).
      setSaving(false);
      onDone(null, trimmed);
      return;
    }

    const result = await updateMyDisplayName(trimmed);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onDone(result.data.user, trimmed);
  }

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <div
        style={{
          width: "84px",
          height: "84px",
          borderRadius: "26px",
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "42px",
          marginBottom: "20px",
          boxShadow: "0 12px 32px rgba(124,58,237,0.45)"
        }}
      >
        {"\u{1F9E0}"}
      </div>

      <h1
        style={{
          fontSize: "26px",
          fontWeight: 900,
          color: "var(--text)",
          margin: 0,
          textAlign: "center",
          letterSpacing: "1px"
        }}
      >
        Xush kelibsiz!
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--muted)",
          marginTop: "8px",
          marginBottom: "28px",
          textAlign: "center",
          lineHeight: 1.5
        }}
      >
        Davom etishdan oldin ismingizni kiriting.
        <br />
        Bu sizning profilingizda va reytingda ko'rinadi.
      </p>

      <form
        style={{
          width: "100%",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
        }}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "8px"
          }}
        >
          Ismingiz
        </label>
        <input
          autoFocus
          maxLength={30}
          placeholder="Masalan: Ali"
          style={{
            width: "100%",
            padding: "14px 16px",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            fontSize: "16px",
            color: "var(--text)",
            outline: "none",
            fontFamily: "inherit"
          }}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />

        {error ? (
          <div
            style={{
              marginTop: "10px",
              fontSize: "12.5px",
              color: "var(--error)",
              fontWeight: 600
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          disabled={saving || name.trim().length < 2}
          style={{
            width: "100%",
            marginTop: "16px",
            padding: "15px",
            background:
              saving || name.trim().length < 2
                ? "var(--border)"
                : "linear-gradient(135deg, #4DA6FF, #7C3AED)",
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: 800,
            color: "white",
            cursor: saving || name.trim().length < 2 ? "not-allowed" : "pointer",
            opacity: saving || name.trim().length < 2 ? 0.6 : 1,
            boxShadow:
              saving || name.trim().length < 2
                ? "none"
                : "0 8px 20px rgba(77,166,255,0.35)",
            transition: "transform 0.1s"
          }}
          type="submit"
        >
          {saving ? "Saqlanmoqda..." : "Davom etish"}
        </button>
      </form>

      <p
        style={{
          fontSize: "11.5px",
          color: "var(--muted)",
          marginTop: "16px",
          textAlign: "center"
        }}
      >
        Ismni keyinroq Profil bo'limidan o'zgartirishingiz mumkin.
      </p>
    </div>
  );
}
