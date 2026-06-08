/**
 * ChannelsSection — Admin panel ichidagi majburiy kanallar boshqaruvi.
 *
 * Imkoniyatlar:
 *  - Kanallar ro'yxati (aktiv + o'chirilgan) + qachon, kim qo'shgani
 *  - Yangi kanal qo'shish formasi
 *  - Soft delete (o'chirish) va qayta faollashtirish
 */
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  adminActivateChannel,
  adminAddChannel,
  adminDeactivateChannel,
  adminListChannels,
} from "../../api/client";
import type { RequiredChannel } from "../../api/client";

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

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--bg)",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "8px",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ChannelsSection() {
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forma holati
  const [form, setForm] = useState({
    channelId: "",
    channelUsername: "",
    channelTitle: "",
    channelUrl: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Amal bajarish holatini saqlaymiz (qaysi kanal)
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const list = await adminListChannels();
    setChannels(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleAdd() {
    setFormError("");
    const { channelId, channelTitle, channelUrl } = form;
    if (!channelId.trim()) return setFormError("Kanal ID kerak");
    if (!channelTitle.trim()) return setFormError("Kanal nomi kerak");
    if (!channelUrl.trim()) return setFormError("Kanal havolasi kerak");

    setSubmitting(true);
    const result = await adminAddChannel({
      channelId: channelId.trim(),
      channelUsername: form.channelUsername.trim().replace(/^@/, ""),
      channelTitle: channelTitle.trim(),
      channelUrl: channelUrl.trim(),
    });
    setSubmitting(false);

    if (result.ok) {
      setForm({ channelId: "", channelUsername: "", channelTitle: "", channelUrl: "" });
      setShowForm(false);
      showSuccess("Kanal muvaffaqiyatli qo'shildi ✓");
      await load();
    } else {
      setFormError(result.error);
    }
  }

  async function handleDeactivate(id: number) {
    setActionLoading(id);
    const result = await adminDeactivateChannel(id);
    setActionLoading(null);
    if (result.ok) {
      showSuccess("Kanal o'chirildi");
      await load();
    } else {
      setError(result.error);
    }
  }

  async function handleActivate(id: number) {
    setActionLoading(id);
    const result = await adminActivateChannel(id);
    setActionLoading(null);
    if (result.ok) {
      showSuccess("Kanal qayta faollashtirildi ✓");
      await load();
    } else {
      setError(result.error);
    }
  }

  const active = channels.filter((c) => c.isActive);
  const inactive = channels.filter((c) => !c.isActive);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div>
      {/* Xabarlar */}
      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#EF4444", fontSize: "12px", marginBottom: "12px" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", color: "#22C55E", fontSize: "12px", marginBottom: "12px", fontWeight: 700 }}>
          {success}
        </div>
      )}

      {/* Umumiy holat */}
      <div style={cardStyle}>
        <div style={sectionTitle}>📢 Majburiy kanallar holati</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <div style={{ flex: 1, minWidth: "100px", padding: "14px", background: "rgba(34,197,94,0.08)", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#22c55e" }}>{active.length}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Aktiv kanal</div>
          </div>
          <div style={{ flex: 1, minWidth: "100px", padding: "14px", background: "rgba(239,68,68,0.08)", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ef4444" }}>{inactive.length}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>O'chirilgan</div>
          </div>
          <div style={{ flex: 1, minWidth: "100px", padding: "14px", background: "rgba(77,166,255,0.08)", borderRadius: "12px", border: "1px solid rgba(77,166,255,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 900, color: ACCENT }}>{channels.length}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Jami</div>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
          ℹ️ Foydalanuvchi ilovani ochganda barcha aktiv kanallarga obuna bo'lmaguncha o'ynay olmaydi.
          Bot <b>getChatMember</b> API orqali obunani tekshiradi.
        </div>
      </div>

      {/* Yangi kanal qo'shish */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showForm ? "14px" : 0 }}>
          <div style={sectionTitle}>➕ Yangi kanal qo'shish</div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: `1px solid ${showForm ? "rgba(239,68,68,0.4)" : "rgba(77,166,255,0.4)"}`,
              background: showForm ? "rgba(239,68,68,0.08)" : "rgba(77,166,255,0.08)",
              color: showForm ? "#ef4444" : ACCENT,
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showForm ? "✕ Bekor" : "+ Qo'shish"}
          </button>
        </div>

        {showForm && (
          <div>
            {/* Yordam */}
            <div style={{ padding: "10px 12px", background: "rgba(77,166,255,0.08)", borderRadius: "10px", border: "1px solid rgba(77,166,255,0.2)", fontSize: "12px", color: "var(--muted)", marginBottom: "12px", lineHeight: 1.6 }}>
              <b style={{ color: ACCENT }}>Kanal ID</b> — Raqamli ID (masalan: <code>-1001234567890</code>) yoki username (<code>@mychannel</code>).
              Raqamli ID ishlatish tavsiya etiladi — kanal username o'zgarsa ham ishlaydi.
              Botni kanalga admin sifatida qo'shing!
            </div>

            <input
              style={inputStyle}
              placeholder="Kanal ID * (masalan: -1001234567890)"
              value={form.channelId}
              onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
            />
            <input
              style={inputStyle}
              placeholder="Kanal nomi * (masalan: Zakovat Rasmiy)"
              value={form.channelTitle}
              onChange={(e) => setForm((f) => ({ ...f, channelTitle: e.target.value }))}
            />
            <input
              style={inputStyle}
              placeholder="Kanal havolasi * (masalan: https://t.me/mychannel)"
              value={form.channelUrl}
              onChange={(e) => setForm((f) => ({ ...f, channelUrl: e.target.value }))}
            />
            <input
              style={{ ...inputStyle, marginBottom: "12px" }}
              placeholder="Username (ixtiyoriy, masalan: mychannel)"
              value={form.channelUsername}
              onChange={(e) => setForm((f) => ({ ...f, channelUsername: e.target.value }))}
            />

            {formError && (
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.10)", borderRadius: "8px", color: "#ef4444", fontSize: "12px", marginBottom: "10px" }}>
                {formError}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleAdd()}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: submitting ? "var(--border)" : `linear-gradient(135deg, ${ACCENT}, #7B61FF)`,
                color: submitting ? "var(--muted)" : "#fff",
                fontSize: "15px",
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Qo'shilmoqda..." : "➕ Kanalni qo'shish"}
            </button>
          </div>
        )}
      </div>

      {/* Aktiv kanallar */}
      {active.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionTitle}>✅ Aktiv kanallar ({active.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {active.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                loading={actionLoading === ch.id}
                onDeactivate={() => void handleDeactivate(ch.id)}
              />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", color: "var(--muted)", padding: "28px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
          <div style={{ fontSize: "14px" }}>Hozircha majburiy kanallar yo'q</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Yuqoridagi forma orqali qo'shing</div>
        </div>
      )}

      {/* O'chirilgan kanallar */}
      {inactive.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...sectionTitle, color: "var(--muted)" }}>🗑 O'chirilgan kanallar ({inactive.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {inactive.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                loading={actionLoading === ch.id}
                onActivate={() => void handleActivate(ch.id)}
                isInactive
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kanal kartochkasi ─────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  loading,
  onDeactivate,
  onActivate,
  isInactive,
}: {
  channel: RequiredChannel;
  loading: boolean;
  onDeactivate?: () => void;
  onActivate?: () => void;
  isInactive?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "14px",
        background: isInactive ? "var(--bg)" : "rgba(34,197,94,0.06)",
        border: `1px solid ${isInactive ? "var(--border)" : "rgba(34,197,94,0.2)"}`,
        opacity: isInactive ? 0.7 : 1,
      }}
    >
      {/* Kanal nomi va ID */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: isInactive ? "var(--border)" : "rgba(34,197,94,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          {isInactive ? "📵" : "📢"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", marginBottom: "2px" }}>
            {channel.channelTitle}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", wordBreak: "break-all" }}>
            ID: <code style={{ color: "#4DA6FF" }}>{channel.channelId}</code>
            {channel.channelUsername && (
              <span> · @{channel.channelUsername}</span>
            )}
          </div>
        </div>
      </div>

      {/* Havola */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          padding: "6px 10px",
          background: "var(--bg)",
          borderRadius: "8px",
          marginBottom: "10px",
          wordBreak: "break-all",
          border: "1px solid var(--border)",
        }}
      >
        🔗 {channel.channelUrl}
      </div>

      {/* Audit trail */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)", marginBottom: "10px" }}>
        <span>👤 {channel.addedByName || "Noma'lum"}</span>
        <span>🕐 {channel.createdAt ? new Date(channel.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
      </div>

      {/* Tugmalar */}
      <div style={{ display: "flex", gap: "8px" }}>
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "9px",
            border: "1px solid rgba(77,166,255,0.3)",
            background: "rgba(77,166,255,0.08)",
            color: "#4DA6FF",
            fontSize: "12px",
            fontWeight: 700,
            textAlign: "center" as const,
            textDecoration: "none",
            display: "block",
          }}
        >
          🔗 Ko'rish
        </a>

        {isInactive ? (
          <button
            type="button"
            disabled={loading}
            onClick={onActivate}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "9px",
              border: "1px solid rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.08)",
              color: "#22c55e",
              fontSize: "12px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "✓ Faollashtirish"}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={onDeactivate}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "9px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "✕ O'chirish"}
          </button>
        )}
      </div>
    </div>
  );
}
