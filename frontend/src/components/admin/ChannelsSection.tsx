/**
 * ChannelsSection — Majburiy kanallar boshqaruvi.
 * Faqat 2 maydon: @username + kanal nomi.
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

const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "12px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "var(--bg)",
  border: "1.5px solid var(--border)",
  borderRadius: "11px",
  fontSize: "15px",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export default function ChannelsSection() {
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await adminListChannels();
    setChannels(list);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function notify(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd() {
    setFormErr("");
    const u = username.trim().replace(/^@/, "");
    const t = title.trim();
    if (!u) return setFormErr("@username kiriting");
    if (!t) return setFormErr("Kanal nomini kiriting");
    setSaving(true);
    const res = await adminAddChannel({ channelUsername: u, channelTitle: t });
    setSaving(false);
    if (res.ok) {
      setUsername(""); setTitle("");
      notify("ok", "Kanal qo'shildi ✓");
      await load();
    } else {
      setFormErr(res.error);
    }
  }

  async function handleDeactivate(id: number) {
    setActionId(id);
    const res = await adminDeactivateChannel(id);
    setActionId(null);
    if (res.ok) { notify("ok", "O'chirildi"); await load(); }
    else notify("err", res.error);
  }

  async function handleActivate(id: number) {
    setActionId(id);
    const res = await adminActivateChannel(id);
    setActionId(null);
    if (res.ok) { notify("ok", "Faollashtirildi ✓"); await load(); }
    else notify("err", res.error);
  }

  const active = channels.filter((c) => c.isActive);
  const inactive = channels.filter((c) => !c.isActive);

  if (loading) return (
    <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Yuklanmoqda...</div>
  );

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          padding: "10px 14px", borderRadius: "10px", marginBottom: "12px",
          fontSize: "13px", fontWeight: 700,
          background: toast.type === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: toast.type === "ok" ? "#22c55e" : "#ef4444",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Qo'shish formasi */}
      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", marginBottom: "14px" }}>
          ➕ Kanal qo'shish
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "5px", letterSpacing: "0.5px" }}>
            KANAL USERNAME
          </div>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
              fontSize: "15px", fontWeight: 700, color: ACCENT, userSelect: "none",
            }}>@</span>
            <input
              style={{ ...inputStyle, paddingLeft: "30px" }}
              placeholder="channelname"
              value={username}
              onChange={(e) => { setUsername(e.target.value.replace(/^@+/, "")); setFormErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
            />
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
            Kanal username'i (@ belgisiz) · Masalan: <code style={{ color: ACCENT }}>zakovot_uz</code>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "5px", letterSpacing: "0.5px" }}>
            KANAL NOMI (TUGMADA YOZILADI)
          </div>
          <input
            style={inputStyle}
            placeholder="Masalan: Zakovat Rasmiy Kanal"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setFormErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
          />
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
            Foydalanuvchi ko'radigan kanal nomi (inline tugmada)
          </div>
        </div>

        {/* Preview */}
        {(username || title) && (
          <div style={{
            padding: "10px 12px", borderRadius: "10px", marginBottom: "12px",
            background: "rgba(77,166,255,0.07)", border: "1px solid rgba(77,166,255,0.2)",
            fontSize: "12px", color: "var(--muted)",
          }}>
            <span style={{ color: ACCENT, fontWeight: 700 }}>Ko'rinishi: </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 10px", borderRadius: "8px",
              background: "linear-gradient(135deg,#4DA6FF,#7B61FF)", color: "#fff",
              fontWeight: 700, fontSize: "13px", marginLeft: "6px",
            }}>
              📢 {title || "@" + username} →
            </span>
            {username && (
              <span style={{ marginLeft: "8px" }}>
                t.me/<code style={{ color: ACCENT }}>{username}</code>
              </span>
            )}
          </div>
        )}

        {formErr && (
          <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.10)", color: "#ef4444", fontSize: "12px", marginBottom: "10px" }}>
            {formErr}
          </div>
        )}

        <button
          type="button"
          disabled={saving || !username.trim() || !title.trim()}
          onClick={() => void handleAdd()}
          style={{
            width: "100%", padding: "13px", borderRadius: "12px", border: "none",
            background: (saving || !username.trim() || !title.trim())
              ? "var(--border)"
              : `linear-gradient(135deg, ${ACCENT}, #7B61FF)`,
            color: (saving || !username.trim() || !title.trim()) ? "var(--muted)" : "#fff",
            fontSize: "15px", fontWeight: 800,
            cursor: (saving || !username.trim() || !title.trim()) ? "not-allowed" : "pointer",
            opacity: (saving || !username.trim() || !title.trim()) ? 0.5 : 1,
          }}
        >
          {saving ? "Qo'shilmoqda..." : "➕ Qo'shish"}
        </button>
      </div>

      {/* Aktiv kanallar */}
      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", marginBottom: active.length ? "12px" : 0 }}>
          ✅ Aktiv kanallar
          <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 700, color: "#22c55e" }}>
            {active.length}
          </span>
        </div>

        {active.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0", fontSize: "13px" }}>
            Hozircha majburiy kanal yo'q
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {active.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                loading={actionId === ch.id}
                onRemove={() => void handleDeactivate(ch.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* O'chirilgan kanallar */}
      {inactive.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)", marginBottom: "12px" }}>
            🗑 O'chirilgan
            <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 700 }}>{inactive.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {inactive.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                loading={actionId === ch.id}
                onRestore={() => void handleActivate(ch.id)}
                inactive
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelRow({
  channel, loading, onRemove, onRestore, inactive,
}: {
  channel: RequiredChannel;
  loading: boolean;
  onRemove?: () => void;
  onRestore?: () => void;
  inactive?: boolean;
}) {
  const date = channel.createdAt
    ? new Date(channel.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "—";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "11px 13px", borderRadius: "12px",
      background: inactive ? "var(--bg)" : "rgba(34,197,94,0.06)",
      border: `1px solid ${inactive ? "var(--border)" : "rgba(34,197,94,0.18)"}`,
      opacity: inactive ? 0.7 : 1,
    }}>
      {/* Ikon */}
      <span style={{ fontSize: "20px", flexShrink: 0 }}>{inactive ? "📵" : "📢"}</span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {channel.channelTitle}
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "1px" }}>
          @{channel.channelUsername || channel.channelId.replace(/^@/, "")}
          <span style={{ marginLeft: "8px", color: "var(--border-2, #2a3a5c)" }}>· {date}</span>
          {channel.addedByName && (
            <span style={{ marginLeft: "6px" }}>· {channel.addedByName}</span>
          )}
        </div>
      </div>

      {/* Tugmalar */}
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "6px 10px", borderRadius: "8px",
            background: "rgba(77,166,255,0.10)", border: "1px solid rgba(77,166,255,0.25)",
            color: "#4DA6FF", fontSize: "12px", fontWeight: 700,
            textDecoration: "none", display: "block",
          }}
        >
          🔗
        </a>
        {inactive ? (
          <button
            type="button" disabled={loading} onClick={onRestore}
            style={{
              padding: "6px 10px", borderRadius: "8px",
              background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)",
              color: "#22c55e", fontSize: "12px", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "↩"}
          </button>
        ) : (
          <button
            type="button" disabled={loading} onClick={onRemove}
            style={{
              padding: "6px 10px", borderRadius: "8px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontSize: "12px", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}
