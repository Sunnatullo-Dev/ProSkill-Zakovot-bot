import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getPremiumInfo, requestPremium } from "../api/client";
import type { PremiumInfo, PremiumUsageEntry } from "../types";

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
          {/* Payment details */}
          {info.paymentDetails ? (
            <div
              style={{
                background: "rgba(218,165,32,0.12)",
                border: "1px solid rgba(218,165,32,0.3)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "var(--gold)",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                To'lov ma'lumotlari
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {info.paymentDetails}
              </div>
            </div>
          ) : null}

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

// ─── Section list ─────────────────────────────────────────────────────────────

function SectionList({ info, isPremium }: { info: PremiumInfo; isPremium: boolean }) {
  const sections = Object.entries(info.sections) as [string, { limited: boolean; free_limit: number }][];
  const anyLimited = sections.some(([, cfg]) => cfg.limited);
  if (!anyLimited) return null;

  return (
    <div style={{ padding: "0 18px" }}>
      <SectionHeader icon="🎯" title="Bo'limlar kirish huquqi" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sections.map(([key, cfg]) => {
          const isUnlimited = isPremium || !cfg.limited;
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "var(--card)",
                border: `1px solid ${isUnlimited ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                borderRadius: "14px",
                padding: "12px 14px",
              }}
            >
              <span style={{ fontSize: "20px", flex: "0 0 auto" }}>
                {SECTION_EMOJIS[key] ?? "🎮"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>
                  {SECTION_LABELS[key] ?? key}
                </div>
                {cfg.limited && !isPremium ? (
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    {cfg.free_limit === 0
                      ? "Bepul foydalanuvchilarga yopiq"
                      : `Kunlik bepul: ${cfg.free_limit} ta`}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: isUnlimited ? "#22C55E" : cfg.free_limit === 0 ? "#EF4444" : "var(--gold)",
                  flex: "0 0 auto",
                }}
              >
                {isUnlimited ? "Cheksiz" : cfg.free_limit === 0 ? "Yopiq" : `${cfg.free_limit}/kun`}
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
  if (!hasLimitedEntries) return null;

  return (
    <div style={{ padding: "0 18px" }}>
      <SectionHeader icon="📊" title="Bugungi foydalanish" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {entries
          .filter(([, u]) => u.limited && u.limit !== null)
          .map(([key, u]) => {
            const pct = u.limit && u.limit > 0 ? Math.min(1, (u.used) / u.limit) : 0;
            const isFull = u.remaining === 0;
            return (
              <div
                key={key}
                style={{
                  background: "var(--card)",
                  border: `1px solid ${isFull ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  borderRadius: "14px",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                    {SECTION_EMOJIS[key] ?? "🎮"} {SECTION_LABELS[key] ?? key}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: isFull ? "#EF4444" : "var(--text)",
                    }}
                  >
                    {u.used} / {u.limit}
                  </span>
                </div>
                <div
                  style={{
                    height: "5px",
                    background: "var(--border)",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct * 100}%`,
                      height: "100%",
                      background: isFull
                        ? "linear-gradient(90deg, #EF4444, #DC2626)"
                        : "linear-gradient(90deg, var(--gold), #F59E0B)",
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                {isFull ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#EF4444",
                      fontWeight: 700,
                      marginTop: "5px",
                    }}
                  >
                    Bugungi limit tugadi
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "5px",
                    }}
                  >
                    {u.remaining} ta qoldi
                  </div>
                )}
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
        fontSize: "12px",
        fontWeight: 800,
        color: "var(--muted)",
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span>{icon}</span>
      {title}
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
