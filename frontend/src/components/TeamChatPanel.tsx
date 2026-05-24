import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { getTeamChat, postTeamChat } from "../api/client";
import type { TeamChatMessage } from "../api/client";
import type { TeamMember } from "../types";

type TeamChatPanelProps = {
  currentUserId: number;
  members: TeamMember[];
  canSend: boolean; // mehmon (telegramId<=0) yoza olmaydi
};

const POLL_INTERVAL_MS = 4000;
const MAX_MESSAGES = 100;

const containerStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "14px",
  marginBottom: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px"
};

const headerLabel: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "var(--text)",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const liveDotStyle: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#22C55E",
  boxShadow: "0 0 8px rgba(34,197,94,0.6)"
};

const scrollAreaStyle: CSSProperties = {
  maxHeight: "260px",
  minHeight: "120px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "4px 2px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  paddingTop: "8px",
  paddingBottom: "8px",
  paddingLeft: "8px",
  paddingRight: "8px"
};

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

export default function TeamChatPanel({ currentUserId, members, canSend }: TeamChatPanelProps) {
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  const memberMap = new Map<number, TeamMember>(members.map((m) => [m.telegramId, m]));

  const refresh = useCallback(async () => {
    const next = await getTeamChat();
    if (!mountedRef.current) return;
    // Tarmoq xatosida getTeamChat bo'sh massiv qaytaradi — mavjud xabarlar
    // birdaniga yo'qolib qolmasligi uchun faqat haqiqiy javobni yozamiz.
    // Birinchi marta yuklanganda esa bo'sh massivni qabul qilamiz (allaqachon bo'sh).
    if (next.length === 0) {
      setMessages((prev) => (prev.length === 0 ? [] : prev));
      return;
    }
    setMessages(next.slice(-MAX_MESSAGES));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const id = window.setInterval(() => {
      // Brauzer tab orqada bo'lsa polling'ni o'tkazib yuboramiz —
      // batareya va server resurslarini tejaymiz.
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  // Yangi xabar kelganda pastga aylantirib qo'yamiz.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    if (text.length > 500) {
      setError("Xabar 500 belgidan oshmasin");
      return;
    }

    setSending(true);
    setError("");
    const result = await postTeamChat(text);
    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDraft("");
    // O'z xabarimizni darhol qo'shamiz, keyingi polling tasdiqlaydi.
    setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), result.data.message]);
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={headerLabel}>
          <span style={liveDotStyle} />
          <span>Jamoa chat</span>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
            ({messages.length})
          </span>
        </div>
      </div>

      <div ref={scrollRef} style={scrollAreaStyle}>
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "12px",
              textAlign: "center",
              padding: "16px"
            }}
          >
            Birinchi xabarni yozing — jamoadoshlar 4 sekundda ko'rishadi
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.telegramId === currentUserId && currentUserId !== 0;
            const sender = memberMap.get(msg.telegramId);
            const senderName =
              sender?.firstName || (sender?.username ? `@${sender.username}` : `#${msg.telegramId}`);
            const initial = (senderName[0] || "?").toUpperCase();

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: isMe ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: "8px"
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: isMe
                      ? "linear-gradient(135deg, #22C55E, #16A34A)"
                      : "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 700,
                    flex: "0 0 auto"
                  }}
                >
                  {initial}
                </div>
                <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: "2px", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {!isMe ? (
                    <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: 700, padding: "0 8px" }}>
                      {senderName}
                    </span>
                  ) : null}
                  <div
                    style={{
                      background: isMe
                        ? "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,197,94,0.14))"
                        : "var(--card)",
                      border: `1px solid ${isMe ? "rgba(34,197,94,0.35)" : "var(--border)"}`,
                      color: "var(--text)",
                      padding: "8px 12px",
                      borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      fontSize: "13.5px",
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}
                  >
                    {msg.text}
                  </div>
                  <span style={{ fontSize: "9.5px", color: "var(--muted)", padding: "0 8px" }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <form
          style={{ display: "flex", gap: "6px", alignItems: "stretch" }}
          onSubmit={(e) => void handleSend(e)}
        >
          <input
            maxLength={500}
            placeholder="Xabar yozing..."
            style={{
              flex: 1,
              padding: "10px 14px",
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "12px",
              fontSize: "14px",
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit"
            }}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
          />
          <button
            disabled={sending || !draft.trim()}
            style={{
              padding: "0 18px",
              background:
                sending || !draft.trim()
                  ? "var(--border)"
                  : "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 800,
              color: "white",
              cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
              opacity: sending || !draft.trim() ? 0.6 : 1
            }}
            type="submit"
          >
            {sending ? "..." : "Yuborish"}
          </button>
        </form>
      ) : (
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--muted)",
            textAlign: "center",
            padding: "8px",
            background: "var(--surface)",
            borderRadius: "10px"
          }}
        >
          Chat'da yozish uchun Telegram orqali kiring
        </div>
      )}

      {error ? (
        <div style={{ fontSize: "12px", color: "var(--error)", fontWeight: 600 }}>{error}</div>
      ) : null}
    </div>
  );
}
