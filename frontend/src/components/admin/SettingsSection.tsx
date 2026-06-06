/**
 * SettingsSection — Admin panel ichidagi global sozlamalar bo'limi.
 *
 * Boshqariluvchi xususiyatlar:
 *  1. Battle chat (yoq/o'chir + polling interval)
 *  2. Vaqt tugaganda to'g'ri javob ko'rsatish
 *  3. TTS ovoz (global yoq/o'chir + default muted holati)
 *  4. Qiyinlik darajalari (oson/o'rtacha/qiyin har birini yoq/o'chir)
 *  5. Koordinator rejimi (Svoyak)
 */
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getAppSettings, updateAppSettings } from "../../api/client";
import type { AppSettings } from "../../api/client";

const ACCENT = "#4DA6FF";

const cardStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "12px",
};

const sectionTitle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "var(--text)",
  marginBottom: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const lastRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
};

const labelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--text)",
};

const hintStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--muted)",
  marginTop: "2px",
};

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "999px",
        border: "none",
        background: value ? ACCENT : "var(--border)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: value ? "23px" : "3px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function SettingRow({
  label,
  hint,
  value,
  onChange,
  disabled,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div style={last ? lastRowStyle : rowStyle}>
      <div style={{ flex: 1, marginRight: "12px" }}>
        <div style={labelStyle}>{label}</div>
        {hint ? <div style={hintStyle}>{hint}</div> : null}
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function SettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // qaysi maydon saqlanmoqda
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAppSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleChange(key: keyof AppSettings, value: boolean | number) {
    if (!settings) return;
    setSaving(key);
    setError("");
    setSuccess("");

    const optimistic = { ...settings, [key]: value };
    setSettings(optimistic);

    const result = await updateAppSettings({ [key]: value });
    setSaving(null);

    if (result.ok) {
      setSettings(result.data);
      setSuccess("Saqlandi ✓");
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setSettings(settings); // rollback
      setError(result.error);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ padding: "16px", background: "rgba(239,68,68,0.1)", borderRadius: "12px", color: "#EF4444" }}>
        Sozlamalarni yuklab bo'lmadi. Qayta urinib ko'ring.
        <button
          type="button"
          onClick={() => void load()}
          style={{ marginTop: "8px", padding: "8px 14px", background: ACCENT, border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: 700, display: "block" }}
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#EF4444", fontSize: "12px", marginBottom: "12px" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", color: "#22C55E", fontSize: "12px", marginBottom: "12px", fontWeight: 700 }}>
          {success}
        </div>
      ) : null}

      {/* 1. Battle Chat */}
      <div style={cardStyle}>
        <div style={sectionTitle}>💬 Battle Chat</div>
        <SettingRow
          label="Battle chatni yoqish"
          hint="Battle o'yinida jamoa chat paneli ko'rinadi"
          value={settings.battleChatEnabled}
          onChange={(v) => void handleChange("battleChatEnabled", v)}
          disabled={saving === "battleChatEnabled"}
        />
        {/* Polling interval slider */}
        <div style={{ padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <div style={labelStyle}>Chat yangilanish tezligi</div>
              <div style={hintStyle}>Hozir: {settings.battleChatPollIntervalMs / 1000}s da bir marta</div>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800, color: ACCENT }}>
              {settings.battleChatPollIntervalMs}ms
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={15000}
            step={1000}
            value={settings.battleChatPollIntervalMs}
            disabled={saving === "battleChatPollIntervalMs"}
            onChange={(e) => void handleChange("battleChatPollIntervalMs", Number(e.target.value))}
            style={{ width: "100%", accentColor: ACCENT }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
            <span>1s (tez)</span>
            <span>15s (sekin)</span>
          </div>
        </div>
      </div>

      {/* 2. Vaqt tugaganda javob */}
      <div style={cardStyle}>
        <div style={sectionTitle}>⏱ Battle — Vaqt tugaganda</div>
        <SettingRow
          label="To'g'ri javobni ko'rsatish"
          hint="Vaqt tugaganda foydalanuvchiga to'g'ri javob ko'rsatiladi"
          value={settings.battleShowCorrectOnTimeout}
          onChange={(v) => void handleChange("battleShowCorrectOnTimeout", v)}
          disabled={saving === "battleShowCorrectOnTimeout"}
          last
        />
      </div>

      {/* 3. TTS Ovoz */}
      <div style={cardStyle}>
        <div style={sectionTitle}>🔊 TTS Ovoz sozlamalari</div>
        <SettingRow
          label="TTS ovozni yoqish (global)"
          hint="O'chirilsa barcha o'yinlarda TTS ishlamaydi"
          value={settings.ttsEnabled}
          onChange={(v) => void handleChange("ttsEnabled", v)}
          disabled={saving === "ttsEnabled"}
        />
        <SettingRow
          label="Yangi foydalanuvchilarda ovoz o'chiq"
          hint="Yangi kirgan foydalanuvchilar uchun TTS default o'chiq bo'ladi"
          value={settings.ttsDefaultMuted}
          onChange={(v) => void handleChange("ttsDefaultMuted", v)}
          disabled={saving === "ttsDefaultMuted" || !settings.ttsEnabled}
          last
        />
      </div>

      {/* 4. Qiyinlik darajalari */}
      <div style={cardStyle}>
        <div style={sectionTitle}>🎯 Qiyinlik darajalari</div>
        <SettingRow
          label="🟢 Oson"
          hint="Bosh sahifada 'Oson' tugmasi ko'rinadi"
          value={settings.difficultyEasyEnabled}
          onChange={(v) => void handleChange("difficultyEasyEnabled", v)}
          disabled={saving === "difficultyEasyEnabled"}
        />
        <SettingRow
          label="🟡 O'rtacha"
          hint="Bosh sahifada 'O'rtacha' tugmasi ko'rinadi"
          value={settings.difficultyMediumEnabled}
          onChange={(v) => void handleChange("difficultyMediumEnabled", v)}
          disabled={saving === "difficultyMediumEnabled"}
        />
        <SettingRow
          label="🔴 Qiyin"
          hint="Bosh sahifada 'Qiyin' tugmasi ko'rinadi"
          value={settings.difficultyHardEnabled}
          onChange={(v) => void handleChange("difficultyHardEnabled", v)}
          disabled={saving === "difficultyHardEnabled"}
          last
        />
      </div>

      {/* 5. Svoyak sozlamalari */}
      <div style={cardStyle}>
        <div style={sectionTitle}>🎯 Svoyak sozlamalari</div>

        {/* Vaqt sozlamasi */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
            ⏱ Har savol uchun vaqt
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
            Standart: 15 soniya · Minimal: 5 · Maksimal: 60
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[5, 10, 15, 20, 30, 45, 60].map((secs) => (
              <button
                key={secs}
                type="button"
                disabled={saving === "svoyakTimePerQuestion"}
                onClick={() => void handleChange("svoyakTimePerQuestion", secs)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: `1.5px solid ${settings.svoyakTimePerQuestion === secs ? ACCENT : "var(--border)"}`,
                  background: settings.svoyakTimePerQuestion === secs ? `${ACCENT}20` : "var(--card)",
                  color: settings.svoyakTimePerQuestion === secs ? ACCENT : "var(--text)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: saving === "svoyakTimePerQuestion" ? "not-allowed" : "pointer",
                  opacity: saving === "svoyakTimePerQuestion" ? 0.5 : 1,
                }}
              >
                {secs}s
              </button>
            ))}
          </div>
          {saving === "svoyakTimePerQuestion" && (
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
              Saqlanmoqda...
            </div>
          )}
        </div>

        <SettingRow
          label="🎤 Koordinator sifatida kirish"
          hint="Svoyak xonasiga koordinator sifatida qo'shilish mumkin bo'ladi"
          value={settings.svoyakCoordinatorEnabled}
          onChange={(v) => void handleChange("svoyakCoordinatorEnabled", v)}
          disabled={saving === "svoyakCoordinatorEnabled"}
          last
        />
      </div>

      <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: "8px" }}>
        O'zgarishlar darhol kuchga kiradi (60 soniya ichida)
      </div>
    </div>
  );
}
