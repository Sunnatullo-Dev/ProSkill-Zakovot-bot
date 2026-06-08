/**
 * SubscriptionGate — Majburiy kanallarga obuna bo'lmaganlar uchun to'siq.
 *
 * Ekran to'liq qoplab turadi (overlay). Foydalanuvchi barcha kanallarga
 * obuna bo'lgandagina onAllSubscribed() chaqiriladi.
 *
 * Telegram WebApp.openLink() orqali kanal ochiladi (in-app browser emas,
 * to'g'ridan-to'g'ri Telegram kanal sahifasi).
 */
import { useState } from "react";
import { checkSubscriptions } from "../api/client";
import type { ChannelSubscriptionStatus } from "../api/client";

const tg = (typeof window !== "undefined" && (window as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp) as {
  openLink?: (url: string, opts?: { try_instant_view?: boolean }) => void;
  HapticFeedback?: { notificationOccurred: (type: string) => void };
} | undefined;

type Props = {
  /** Barcha kanallarga obuna bo'linganda chaqiriladi — gate yopiladi. */
  onAllSubscribed: () => void;
  /** Dastlabki holat — tashqaridan beriladi (tezkor yuklanish uchun). */
  channels: ChannelSubscriptionStatus[];
};

export default function SubscriptionGate({ onAllSubscribed, channels: initialChannels }: Props) {
  const [channels, setChannels] = useState<ChannelSubscriptionStatus[]>(initialChannels);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const unsubscribed = channels.filter((c) => !c.subscribed);
  const subscribed = channels.filter((c) => c.subscribed);

  function openChannel(url: string) {
    tg?.HapticFeedback?.notificationOccurred("warning");
    if (tg?.openLink) {
      tg.openLink(url, { try_instant_view: false });
    } else {
      window.open(url, "_blank");
    }
  }

  async function handleCheck() {
    tg?.HapticFeedback?.notificationOccurred("warning");
    setChecking(true);
    setError("");
    try {
      const result = await checkSubscriptions();
      if (!result) {
        setError("Tekshirib bo'lmadi. Qayta urinib ko'ring.");
        return;
      }
      setChannels(result.channels);
      if (result.allSubscribed) {
        tg?.HapticFeedback?.notificationOccurred("success");
        onAllSubscribed();
      } else {
        const stillMissing = result.channels.filter((c) => !c.subscribed).length;
        setError(`Hali ${stillMissing} ta kanalga obuna bo'lmadingiz.`);
      }
    } catch {
      setError("Internet aloqasida muammo. Qayta urinib ko'ring.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bg, #0B0B14)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "390px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "52px", marginBottom: "12px", lineHeight: 1 }}>🔔</div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "var(--text, #F5F5F5)",
              marginBottom: "8px",
              lineHeight: 1.2,
            }}
          >
            Kanallarga obuna bo'ling
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--muted, #8892A4)",
              lineHeight: 1.5,
            }}
          >
            O'yin boshlash uchun quyidagi rasmiy kanallarga obuna bo'lishingiz shart.
          </div>
        </div>

        {/* Kanallar ro'yxati */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {channels.map((ch) => (
            <div
              key={ch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                borderRadius: "16px",
                background: ch.subscribed
                  ? "rgba(34,197,94,0.10)"
                  : "var(--card, #161B2E)",
                border: `1.5px solid ${
                  ch.subscribed
                    ? "rgba(34,197,94,0.35)"
                    : "var(--border, #1F2D4A)"
                }`,
                transition: "all 0.2s",
              }}
            >
              {/* Holat belgisi */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: ch.subscribed
                    ? "rgba(34,197,94,0.20)"
                    : "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                {ch.subscribed ? "✅" : "📢"}
              </div>

              {/* Kanal nomi */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text, #F5F5F5)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.channelTitle}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: ch.subscribed ? "var(--success, #22c55e)" : "var(--muted, #8892A4)",
                    marginTop: "2px",
                  }}
                >
                  {ch.subscribed ? "Obuna bo'ldingiz ✓" : "Obuna bo'lmadingiz"}
                </div>
              </div>

              {/* Obuna tugmasi */}
              {!ch.subscribed && (
                <button
                  type="button"
                  onClick={() => openChannel(ch.channelUrl)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #4DA6FF, #7B61FF)",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Obuna →
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Progress ko'rsatkich */}
        {subscribed.length > 0 && unsubscribed.length > 0 && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(77,166,255,0.08)",
              border: "1px solid rgba(77,166,255,0.2)",
              fontSize: "13px",
              color: "#4DA6FF",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            ✓ {subscribed.length} ta obuna bo'lindi · Qoldi: {unsubscribed.length} ta
          </div>
        )}

        {/* Xato xabari */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Tekshirish tugmasi */}
        <button
          type="button"
          onClick={() => void handleCheck()}
          disabled={checking}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: checking
              ? "var(--border, #1F2D4A)"
              : "linear-gradient(135deg, #22c55e, #16a34a)",
            color: checking ? "var(--muted)" : "#fff",
            fontSize: "16px",
            fontWeight: 800,
            cursor: checking ? "not-allowed" : "pointer",
            opacity: checking ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {checking ? "Tekshirilmoqda..." : "✓ Tekshirish"}
        </button>

        <div
          style={{
            fontSize: "11px",
            color: "var(--muted, #8892A4)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Barcha kanallarga obuna bo'lgach "Tekshirish" tugmasini bosing
        </div>
      </div>
    </div>
  );
}
