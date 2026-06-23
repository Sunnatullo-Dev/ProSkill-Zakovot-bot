import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getPremiumInfo, requestPremium } from "../api/client";
import type { PremiumInfo, PremiumUsageEntry } from "../types";

// ─── Countdown hook ───────────────────────────────────────────────────────────
// Bir intervalda barcha resetsAt sanalgichlarni yangilaymiz.
// Qaytaradi: { [resetsAt ISO]: "HH:MM:SS" | "Yangilandi" }

function useCountdowns(resetsAtList: (string | null | undefined)[]): Record<string, string> {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    // Hech qanday aktiv resetsAt bo'lmasa interval keraksiz
    const hasAny = resetsAtList.some((r) => r != null);
    if (!hasAny) return;

    const id = window.setInterval(() => setTicks((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [resetsAtList.filter(Boolean).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const result: Record<string, string> = {};
  for (const iso of resetsAtList) {
    if (!iso) continue;
    if (result[iso] !== undefined) continue; // deduplicate
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) {
      result[iso] = "Yangilandi — qayta urinib ko'ring";
    } else {
      const totalSec = Math.ceil(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      result[iso] = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }
  // ticks used only to trigger re-render
  void ticks;
  return result;
}

type PremiumScreenProps = {
  onBack: () => void;
};

const SECTION_LABELS: Record<string, string> = {
  round: "Oddiy o'yin",
  daily: "Kunlik topshiriq",
  battle: "Jamoaviy bellashuv",
  svoyak: "Svoyak",
  gameroom: "O'yin xonasi",
};

const SECTION_EMOJIS: Record<string, string> = {
  round: "🎮",
  daily: "📅",
  battle: "⚔️",
  svoyak: "🌟",
  gameroom: "🏟️",
};

// Per-section accent palette — 5 distinct hues that harmonize with gold premium theme
const SECTION_ACCENTS: Record<string, { color: string; bg: string; border: string }> = {
  round:    { color: "#6366F1", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.28)" },
  daily:    { color: "#0EA5E9", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.28)" },
  battle:   { color: "#F43F5E", bg: "rgba(244,63,94,0.10)",   border: "rgba(244,63,94,0.28)"  },
  svoyak:   { color: "#DAA520", bg: "rgba(218,165,32,0.12)",  border: "rgba(218,165,32,0.35)" },
  gameroom: { color: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.28)" },
};

// Fallback for unknown keys
const DEFAULT_ACCENT = { color: "#6366F1", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.28)" };

function remainingDays(until: string): number {
  const diff = new Date(until).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  maxWidth: "430px",
  margin: "0 auto",
  paddingBottom: "40px",
};

export default function PremiumScreen({ onBack }: PremiumScreenProps) {
  const [info, setInfo] = useState<PremiumInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    let active = true;
    void getPremiumInfo().then((res) => {
      if (active) {
        setInfo(res);
        setLoading(false);
      }
    });
    return () => { active = false; };
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRefresh() {
    setLoading(true);
    void getPremiumInfo().then((res) => {
      setInfo(res);
      setLoading(false);
    });
  }

  return (
    <div style={containerStyle} className="animate-fadeInUp">
      {/* Back header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "14px 18px 0",
          background: "var(--bg)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "9px 13px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Ortga
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !info ? (
        <ErrorState onBack={onBack} />
      ) : !info.enabled ? (
        <ComingSoonState onBack={onBack} />
      ) : info.isPremium ? (
        <ActivePremiumView info={info} />
      ) : (
        <UpgradeView info={info} onRefresh={handleRefresh} />
      )}
    </div>
  );
}

// ─── Hero gradient banner ─────────────────────────────────────────────────────

function HeroBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "16px 18px 0",
        borderRadius: "24px",
        background: "linear-gradient(135deg, #B8860B 0%, #DAA520 30%, #FFD700 55%, #FFA500 80%, #FF8C00 100%)",
        boxShadow:
          "0 12px 40px rgba(218,165,32,0.45), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.35)",
        padding: "28px 20px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle sparkle orbs */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -20,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}

// ─── Active premium view ──────────────────────────────────────────────────────

function ActivePremiumView({ info }: { info: PremiumInfo }) {
  const days = info.premiumUntil ? remainingDays(info.premiumUntil) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 0 20px" }}>
      <HeroBanner>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "8px" }}>👑</div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#1a0a00",
              letterSpacing: "-0.3px",
            }}
          >
            Zakovat Premium
          </div>
          <div
            style={{
              marginTop: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.3)",
              borderRadius: "999px",
              padding: "5px 14px",
            }}
          >
            <span style={{ fontSize: "14px" }}>✅</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#1a0a00" }}>
              Siz Premium a'zosiz
            </span>
          </div>
        </div>
      </HeroBanner>

      {/* Expiry card */}
      <div style={{ padding: "0 18px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(218,165,32,0.14), rgba(255,200,50,0.08))",
            border: "1.5px solid rgba(218,165,32,0.4)",
            borderRadius: "18px",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Premium tugash sanasi
              </div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--text)" }}>
                {info.premiumUntil ? formatDate(info.premiumUntil) : "—"}
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                background: "rgba(218,165,32,0.16)",
                borderRadius: "14px",
                padding: "10px 14px",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "var(--gold)",
                  lineHeight: 1,
                }}
              >
                {days}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--muted)",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginTop: "3px",
                }}
              >
                kun qoldi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section access */}
      <SectionList info={info} isPremium={true} />

      {/* Benefits */}
      {info.benefits ? <BenefitsBlock text={info.benefits} /> : null}

      {/* Usage */}
      <UsageBlock info={info} />
    </div>
  );
}

// ─── Upgrade (non-premium) view ───────────────────────────────────────────────

function UpgradeView({ info, onRefresh }: { info: PremiumInfo; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myReq = info.myRequest;
  const isPending = myReq?.status === "pending";
  const isRejected = myReq?.status === "rejected";

  const hasPrice = info.price > 0;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const result = await requestPremium(file);
    setUploading(false);

    if (result.ok) {
      setUploadSuccess(true);
      onRefresh();
    } else {
      setUploadError(result.error ?? "Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 0 20px" }}>
      <HeroBanner>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "8px" }}>⭐</div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#1a0a00",
              letterSpacing: "-0.3px",
            }}
          >
            Zakovat Premium
          </div>
          <div style={{ fontSize: "13px", color: "rgba(26,10,0,0.7)", marginTop: "5px", fontWeight: 600 }}>
            Cheksiz o'yin tajribasini his qiling
          </div>
          {hasPrice ? (
            <div
              style={{
                marginTop: "14px",
                display: "inline-block",
                background: "rgba(0,0,0,0.18)",
                borderRadius: "14px",
                padding: "8px 20px",
              }}
            >
              <span style={{ fontSize: "26px", fontWeight: 900, color: "#1a0a00" }}>
                {info.price.toLocaleString()} {info.currency}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "rgba(26,10,0,0.65)",
                  marginLeft: "6px",
                }}
              >
                / {info.durationDays} kun
              </span>
            </div>
          ) : null}
        </div>
      </HeroBanner>

      {/* Status block — pending / rejected / upload CTA */}
      <div style={{ padding: "0 18px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(218,165,32,0.12), rgba(255,200,50,0.06))",
            border: "1.5px solid rgba(218,165,32,0.35)",
            borderRadius: "18px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Payment block */}
          <PaymentBlock info={info} />

          {/* Pending state */}
          {isPending && !uploadSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "6px 0" }}>
              <div style={{ fontSize: "32px" }}>⏳</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", textAlign: "center" }}>
                To'lovingiz tekshirilmoqda
              </div>
              <div style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                Admin chekingizni ko'rib chiqayotir. Tez orada javob beriladi.
              </div>
            </div>
          ) : null}

          {/* Rejected state */}
          {isRejected && !uploadSuccess ? (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#EF4444", marginBottom: "4px" }}>
                Rad etildi
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.5 }}>
                {myReq?.rejectReason
                  ? `Sabab: ${myReq.rejectReason}`
                  : "Chek noto'g'ri yoki soxta bo'lishi mumkin. To'g'ri to'lov cheki bilan qayta urinib ko'ring."}
              </div>
            </div>
          ) : null}

          {/* Success state */}
          {uploadSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "6px 0" }}>
              <div style={{ fontSize: "32px" }}>✅</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", textAlign: "center" }}>
                Chekingiz yuborildi!
              </div>
              <div style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                Admin tekshirgach Premium beriladi.
              </div>
            </div>
          ) : null}

          {/* Upload error */}
          {uploadError ? (
            <div
              style={{
                fontSize: "12px",
                color: "#EF4444",
                fontWeight: 600,
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                borderRadius: "10px",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {uploadError}
            </div>
          ) : null}

          {/* Upload CTA — show when not pending (or when rejected = allow re-upload) */}
          {!uploadSuccess && !isPending ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { void handleFileChange(e); }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  background: uploading
                    ? "rgba(218,165,32,0.5)"
                    : "linear-gradient(135deg, #B8860B, #DAA520, #FFD700)",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 900,
                  color: "#1a0a00",
                  cursor: uploading ? "not-allowed" : "pointer",
                  boxShadow: uploading ? "none" : "0 8px 24px rgba(218,165,32,0.45)",
                  letterSpacing: "0.2px",
                  opacity: uploading ? 0.7 : 1,
                  transition: "opacity 0.2s, box-shadow 0.2s",
                }}
              >
                {uploading
                  ? "Yuklanmoqda..."
                  : isRejected
                  ? "📸 Yangi chek yuklash"
                  : "📸 Chek yuklash"}
              </button>
              {!isRejected ? (
                <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                  To'lovni amalga oshiring, so'ng chek rasmini yuklang. Admin tekshirib, Premium beradi.
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* Section access */}
      <SectionList info={info} isPremium={false} />

      {/* Benefits */}
      {info.benefits ? <BenefitsBlock text={info.benefits} /> : null}

      {/* Usage */}
      <UsageBlock info={info} />
    </div>
  );
}

// ─── Payment block ────────────────────────────────────────────────────────────

function PaymentBlock({ info }: { info: PremiumInfo }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(info.cardNumber).then(() => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [info.cardNumber]);

  // Card number yo'q — "ma'lumot kiritilmagan" holat
  if (!info.cardNumber) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "12px",
          padding: "14px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "18px", flex: "0 0 auto", marginTop: "1px" }}>💳</span>
        <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.55, fontWeight: 600 }}>
          To'lov ma'lumotlari hali kiritilmagan. Iltimos admin bilan bog'laning.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(218,165,32,0.12)",
        border: "1.5px solid rgba(218,165,32,0.4)",
        borderRadius: "14px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: "10px",
          fontWeight: 800,
          color: "var(--gold)",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
        }}
      >
        💳 To'lov uchun karta
      </div>

      {/* Card number — full-width single row, never wraps */}
      <div
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "clamp(14px, 4.8vw, 20px)",
          fontWeight: 900,
          color: "var(--text)",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {info.cardNumber}
      </div>

      {/* Copy button — own row so it never squeezes the number */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: "7px 14px",
            background: copied
              ? "rgba(34,197,94,0.18)"
              : "rgba(218,165,32,0.22)",
            border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(218,165,32,0.4)"}`,
            borderRadius: "9px",
            fontSize: "12px",
            fontWeight: 800,
            color: copied ? "#22C55E" : "var(--gold)",
            cursor: "pointer",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✅ Nusxalandi!" : "📋 Nusxalash"}
        </button>
      </div>

      {/* Card holder — label muted, name high-contrast */}
      {info.cardHolder ? (
        <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>
          Egasi:{" "}
          <span style={{ color: "var(--text)", fontWeight: 800, fontSize: "15px" }}>
            {info.cardHolder}
          </span>
        </div>
      ) : null}

      {/* Optional extra note */}
      {info.paymentDetails ? (
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--muted)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            borderTop: "1px solid rgba(218,165,32,0.2)",
            paddingTop: "8px",
          }}
        >
          {info.paymentDetails}
        </div>
      ) : null}
    </div>
  );
}

// ─── Section list ─────────────────────────────────────────────────────────────

function SectionList({ info, isPremium }: { info: PremiumInfo; isPremium: boolean }) {
  const sections = Object.entries(info.sections) as [string, { limited: boolean; free_limit: number }][];
  const anyLimited = sections.some(([, cfg]) => cfg.limited);
  if (!anyLimited) return null;

  return (
    <div style={{ padding: "0 18px" }}>
      <SectionHeader icon="🎯" title="Bo'limlar kirish huquqi" />
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {sections.map(([key, cfg]) => {
          const isUnlimited = isPremium || !cfg.limited;
          const isClosed = !isUnlimited && cfg.free_limit === 0;
          const accent = SECTION_ACCENTS[key] ?? DEFAULT_ACCENT;

          // Badge appearance
          const badgeText = isUnlimited ? "Cheksiz" : isClosed ? "Yopiq" : `${cfg.free_limit}/kun`;
          const badgeBg   = isUnlimited ? "rgba(34,197,94,0.13)"  : isClosed ? "rgba(239,68,68,0.13)"  : "rgba(218,165,32,0.14)";
          const badgeBorder= isUnlimited ? "rgba(34,197,94,0.35)" : isClosed ? "rgba(239,68,68,0.35)"  : "rgba(218,165,32,0.4)";
          const badgeColor= isUnlimited ? "#22C55E"               : isClosed ? "#EF4444"               : "#DAA520";

          // Subtitle
          const subtitle = cfg.limited && !isPremium
            ? isClosed
              ? "Bepul foydalanuvchilarga yopiq"
              : `Kunlik bepul: ${cfg.free_limit} ta urinish`
            : null;

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  width: "4px",
                  alignSelf: "stretch",
                  background: isUnlimited
                    ? "linear-gradient(180deg, #22C55E, #16A34A)"
                    : isClosed
                    ? "linear-gradient(180deg, #EF4444, #DC2626)"
                    : `linear-gradient(180deg, ${accent.color}, ${accent.color}aa)`,
                  flex: "0 0 auto",
                  borderRadius: "0",
                }}
              />

              {/* Icon chip */}
              <div
                style={{
                  margin: "12px 12px 12px 14px",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: accent.bg,
                  border: `1.5px solid ${accent.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "0 0 auto",
                }}
              >
                {SECTION_EMOJIS[key] ?? "🎮"}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0, padding: "12px 0" }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
                  {SECTION_LABELS[key] ?? key}
                </div>
                {subtitle ? (
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", fontWeight: 500 }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>

              {/* Badge pill */}
              <div style={{ padding: "12px 14px 12px 8px", flex: "0 0 auto" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    borderRadius: "999px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: badgeColor,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isUnlimited ? "∞" : isClosed ? "✕" : "◑"}{" "}
                  {badgeText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Benefits block ───────────────────────────────────────────────────────────

function BenefitsBlock({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div style={{ padding: "0 18px" }}>
      <SectionHeader icon="✨" title="Premium imtiyozlari" />
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "14px",
              color: "var(--text)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: "var(--gold)", flex: "0 0 auto", marginTop: "1px" }}>⭐</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Usage block ──────────────────────────────────────────────────────────────

function UsageBlock({ info }: { info: PremiumInfo }) {
  const entries = Object.entries(info.usage) as [string, PremiumUsageEntry][];
  const hasLimitedEntries = entries.some(([, u]) => u.limited);

  // Barcha cheklangan bo'limlarning resetsAt qiymatlarini yig'amiz
  const resetsAtList = entries
    .filter(([, u]) => u.limited && u.remaining === 0)
    .map(([, u]) => u.resetsAt ?? null);

  const countdowns = useCountdowns(resetsAtList);

  if (!hasLimitedEntries) return null;

  return (
    <div style={{ padding: "0 18px" }}>
      <SectionHeader icon="📊" title="Bugungi foydalanish" />
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {entries
          .filter(([, u]) => u.limited && u.limit !== null)
          .map(([key, u]) => {
            const limit = u.limit ?? 1;
            const pct = limit > 0 ? Math.min(1, u.used / limit) : 0;
            const isFull = u.remaining === 0;
            const isNear = !isFull && pct >= 0.7;   // 70%+ used = warning
            const accent = SECTION_ACCENTS[key] ?? DEFAULT_ACCENT;

            // Bar gradient color by state
            const barGradient = isFull
              ? "linear-gradient(90deg, #EF4444, #DC2626)"
              : isNear
              ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
              : `linear-gradient(90deg, ${accent.color}, ${accent.color}cc)`;

            // Border tint by state
            const borderColor = isFull
              ? "rgba(239,68,68,0.35)"
              : isNear
              ? "rgba(245,158,11,0.35)"
              : "var(--border)";

            // Count label color
            const countColor = isFull ? "#EF4444" : isNear ? "#F59E0B" : "var(--text)";

            // Countdown label — faqat limit to'lib turganida ko'rsatiladi
            const countdownText = isFull && u.resetsAt ? countdowns[u.resetsAt] : null;
            const countdownDone = countdownText === "Yangilandi — qayta urinib ko'ring";

            return (
              <div
                key={key}
                style={{
                  background: "var(--card)",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                {/* Top row: icon chip + label + count */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "13px 14px 10px",
                  }}
                >
                  {/* Icon chip with section accent */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "11px",
                      background: accent.bg,
                      border: `1.5px solid ${accent.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flex: "0 0 auto",
                    }}
                  >
                    {SECTION_EMOJIS[key] ?? "🎮"}
                  </div>

                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
                      {SECTION_LABELS[key] ?? key}
                    </div>
                    {/* State subtitle */}
                    {isFull ? (
                      <div style={{ fontSize: "11px", color: "#EF4444", fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                        <span style={{ fontSize: "10px" }}>🔴</span> Bugungi limit tugadi
                      </div>
                    ) : isNear ? (
                      <div style={{ fontSize: "11px", color: "#F59E0B", fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                        <span style={{ fontSize: "10px" }}>🟡</span> {u.remaining} ta qoldi
                      </div>
                    ) : (
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        {u.remaining} ta qoldi
                      </div>
                    )}
                  </div>

                  {/* Count badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "baseline",
                      gap: "2px",
                      flex: "0 0 auto",
                    }}
                  >
                    <span style={{ fontSize: "18px", fontWeight: 900, color: countColor, lineHeight: 1 }}>
                      {u.used}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                      /{limit}
                    </span>
                  </div>
                </div>

                {/* Progress bar area */}
                <div style={{ padding: "0 14px 13px" }}>
                  {/* Track */}
                  <div
                    style={{
                      height: "7px",
                      background: isFull
                        ? "rgba(239,68,68,0.12)"
                        : isNear
                        ? "rgba(245,158,11,0.12)"
                        : "var(--border)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Fill */}
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: "100%",
                        background: barGradient,
                        borderRadius: "999px",
                        transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                        boxShadow: isFull
                          ? "0 0 6px rgba(239,68,68,0.4)"
                          : isNear
                          ? "0 0 6px rgba(245,158,11,0.35)"
                          : `0 0 6px ${accent.color}44`,
                      }}
                    />
                  </div>

                  {/* Live countdown — faqat limit to'lib turganida */}
                  {countdownText ? (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: countdownDone ? "#22C55E" : "#F59E0B",
                      }}
                    >
                      <span style={{ fontSize: "12px" }}>{countdownDone ? "✅" : "⏳"}</span>
                      {countdownDone
                        ? countdownText
                        : `${countdownText} dan keyin yangilanadi`}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
      }}
    >
      {/* Icon chip with gold tint */}
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "9px",
          background: "linear-gradient(135deg, rgba(218,165,32,0.22), rgba(255,200,50,0.12))",
          border: "1.5px solid rgba(218,165,32,0.38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "15px",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "0.2px",
          }}
        >
          {title}
        </div>
        {/* Subtle gold underline accent */}
        <div
          style={{
            width: "32px",
            height: "2px",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #DAA520, rgba(218,165,32,0))",
          }}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {[200, 120, 160].map((h) => (
        <div
          key={h}
          style={{
            height: `${h}px`,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        padding: "40px 18px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div style={{ fontSize: "48px" }}>⚠️</div>
      <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
        Ma'lumot yuklanmadi
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: "11px 20px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        Ortga
      </button>
    </div>
  );
}

function ComingSoonState({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        padding: "40px 18px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div style={{ fontSize: "52px" }}>⭐</div>
      <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--text)" }}>
        Zakovat Premium
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "var(--muted)",
          lineHeight: 1.6,
          maxWidth: "280px",
        }}
      >
        Premium tizimi tez orada ishga tushadi. Yangiliklar uchun kuzatib boring!
      </div>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(218,165,32,0.14), rgba(255,200,50,0.08))",
          border: "1.5px solid rgba(218,165,32,0.35)",
          borderRadius: "16px",
          padding: "14px 20px",
          fontSize: "14px",
          fontWeight: 800,
          color: "var(--gold)",
        }}
      >
        Tez kunda...
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: "11px 20px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        Ortga
      </button>
    </div>
  );
}
