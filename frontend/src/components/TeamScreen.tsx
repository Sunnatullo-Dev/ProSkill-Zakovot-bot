import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptBattle,
  cancelBattle,
  declineBattle,
  getMyTeam,
  getPendingBattles,
  leaveTeam,
  renameMyTeam
} from "../api/client";
import type { PendingChallenge, TeamMember, TeamWithMembers } from "../types";
import ChallengeModal from "./ChallengeModal";
import ConfirmDialog from "./ConfirmDialog";
import CreateTeamModal from "./CreateTeamModal";
import JoinTeamModal from "./JoinTeamModal";
import TeamChatPanel from "./TeamChatPanel";
import { EditIcon, TeamIcon } from "./icons";

type Props = {
  currentUserId: number;
  onEnterBattle: (battleId: string) => void;
};

const POLL_MS = 3000;

function memberLabel(m: TeamMember): string {
  return m.firstName || (m.username ? `@${m.username}` : `#${m.telegramId}`);
}

function memberInitial(m: TeamMember): string {
  const n = m.firstName || m.username || "?";
  return n[0]?.toUpperCase() ?? "?";
}

export default function TeamScreen({ currentUserId, onEnterBattle }: Props) {
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [pending, setPending] = useState<PendingChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");
  const mountedRef = useRef(true);

  async function handleRename() {
    setRenameError("");
    const trimmed = renameDraft.trim();
    if (trimmed.length < 2) {
      setRenameError("Nom kamida 2 belgi");
      return;
    }
    if (trimmed.length > 30) {
      setRenameError("Nom 30 belgidan oshmasin");
      return;
    }
    if (team && trimmed === team.name) {
      setRenameOpen(false);
      return;
    }

    setRenaming(true);
    const result = await renameMyTeam(trimmed);
    setRenaming(false);

    if (!result.ok) {
      setRenameError(result.error);
      return;
    }

    setTeam(result.data.team);
    setRenameOpen(false);
  }

  const refresh = useCallback(async () => {
    const [t, p] = await Promise.all([getMyTeam(), getPendingBattles()]);
    if (!mountedRef.current) return;
    setTeam(t);
    setPending(p);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    void refresh().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    const pollId = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);

    function handleVisibility() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  async function handleLeave() {
    setLeaveOpen(false);
    await leaveTeam();
    setTeam(null);
    setPending([]);
    void refresh();
  }

  async function handleCopyCode() {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.code);
    } catch {
      const el = document.createElement("textarea");
      el.value = team.code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleAccept(battleId: string) {
    setActionId(battleId);
    setActionError("");
    const result = await acceptBattle(battleId);
    setActionId(null);
    if (result.ok) {
      await refresh();
      onEnterBattle(result.data.battleId);
    } else {
      setActionError(result.error);
      void refresh();
    }
  }

  async function handleDecline(battleId: string) {
    setActionId(battleId);
    setActionError("");
    const result = await declineBattle(battleId);
    setActionId(null);
    if (!result.ok) setActionError(result.error);
    void refresh();
  }

  async function handleCancel(battleId: string) {
    setActionId(battleId);
    setActionError("");
    const result = await cancelBattle(battleId);
    setActionId(null);
    if (!result.ok) setActionError(result.error);
    void refresh();
  }

  const isOwner = team !== null && team.ownerId === currentUserId && currentUserId !== 0;

  // *** FIX: No more auto-redirect. Show banner instead. ***
  const activeBattle = pending.find((c) => c.status === "in_progress");
  const incoming = pending.filter((c) => c.iAmOpponent && c.status === "pending");
  const outgoing = pending.filter((c) => !c.iAmOpponent && c.status === "pending");

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px 16px 104px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 900,
          color: "var(--text)",
          marginBottom: "16px"
        }}
      >
        Jamoa
      </h1>

      {/* Active in-progress battle banner — no auto-redirect, user decides */}
      {activeBattle ? (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(77,166,255,0.14), rgba(124,58,237,0.14))",
            border: "1.5px solid var(--accent)",
            borderRadius: "18px",
            padding: "14px 16px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "1.5px",
                marginBottom: "3px"
              }}
            >
              ⚔️ BELLASHUV DAVOM ETMOQDA
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {activeBattle.challengerTeam.name} vs {activeBattle.opponentTeam.name}
            </div>
          </div>
          <button
            style={{
              padding: "10px 16px",
              background: "var(--accent)",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 800,
              color: "white",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              boxShadow: "0 4px 12px rgba(77,166,255,0.35)"
            }}
            type="button"
            onClick={() => onEnterBattle(activeBattle.battleId)}
          >
            Kirish ▶
          </button>
        </div>
      ) : null}

      {/* Incoming challenges */}
      {incoming.map((ch) => {
        const canAct = ch.opponentTeam.ownerId === currentUserId && currentUserId !== 0;
        const busy = actionId === ch.battleId;
        return (
          <div
            key={ch.battleId}
            style={{
              background: "linear-gradient(135deg, rgba(245,200,66,0.10), rgba(239,68,68,0.08))",
              border: "1.5px solid var(--gold)",
              borderRadius: "18px",
              padding: "16px",
              marginBottom: "12px"
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--gold)",
                letterSpacing: "1.5px",
                marginBottom: "6px"
              }}
            >
              ⚔️ BELLASHUV TAKLIFI
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: canAct ? "12px" : "6px"
              }}
            >
              "{ch.challengerTeam.name}" jamoangizni bellashuvga chaqirdi
            </div>
            {canAct ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: "11px",
                    background: "var(--success)",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "white",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.6 : 1
                  }}
                  type="button"
                  onClick={() => void handleAccept(ch.battleId)}
                >
                  {busy ? "..." : "Qabul qilish"}
                </button>
                <button
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: "11px",
                    background: "transparent",
                    border: "1px solid var(--error)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--error)",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.6 : 1
                  }}
                  type="button"
                  onClick={() => void handleDecline(ch.battleId)}
                >
                  Rad etish
                </button>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Faqat jamoa egasi qabul yoki rad eta oladi
              </div>
            )}
          </div>
        );
      })}

      {/* Outgoing challenges */}
      {outgoing.map((ch) => {
        const canCancel = ch.challengerTeam.ownerId === currentUserId && currentUserId !== 0;
        const busy = actionId === ch.battleId;
        return (
          <div
            key={ch.battleId}
            style={{
              background: "var(--card)",
              border: "1px dashed var(--border)",
              borderRadius: "16px",
              padding: "14px",
              marginBottom: "12px"
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: canCancel ? "10px" : 0
              }}
            >
              ⏳ "{ch.opponentTeam.name}" jamoasidan javob kutilmoqda...
            </div>
            {canCancel ? (
              <button
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "transparent",
                  border: "1px solid var(--error)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--error)",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1
                }}
                type="button"
                onClick={() => void handleCancel(ch.battleId)}
              >
                Taklifni bekor qilish
              </button>
            ) : null}
          </div>
        );
      })}

      {actionError ? (
        <div
          style={{
            fontSize: "12px",
            color: "var(--error)",
            marginBottom: "10px",
            textAlign: "center",
            fontWeight: 600
          }}
        >
          {actionError}
        </div>
      ) : null}

      {/* Main content */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</div>
        </div>
      ) : !team ? (
        <NoTeamView
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
        />
      ) : (
        <HasTeamView
          team={team}
          currentUserId={currentUserId}
          isOwner={isOwner}
          codeCopied={codeCopied}
          hasOutgoing={outgoing.length > 0}
          activeBattle={activeBattle}
          onCopyCode={() => void handleCopyCode()}
          onChallenge={() => setChallengeOpen(true)}
          onLeave={() => setLeaveOpen(true)}
          onRename={() => {
            setRenameDraft(team.name);
            setRenameOpen(true);
            setRenameError("");
          }}
        />
      )}

      {createOpen ? (
        <CreateTeamModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => void refresh()}
        />
      ) : null}
      {joinOpen ? (
        <JoinTeamModal
          onClose={() => setJoinOpen(false)}
          onJoined={() => void refresh()}
        />
      ) : null}
      {challengeOpen ? (
        <ChallengeModal
          onClose={() => setChallengeOpen(false)}
          onChallenged={() => void refresh()}
        />
      ) : null}
      {leaveOpen ? (
        <ConfirmDialog
          title="Jamoadan chiqish"
          message={
            isOwner
              ? "Siz jamoa egasi sifatida chiqsangiz, egalik keyingi a'zoga o'tadi. Davom etamizmi?"
              : "Jamoadan chiqasizmi?"
          }
          confirmLabel="Ha, chiqish"
          cancelLabel="Yo'q"
          onConfirm={() => void handleLeave()}
          onCancel={() => setLeaveOpen(false)}
        />
      ) : null}

      {renameOpen ? (
        <RenameTeamDialog
          busy={renaming}
          error={renameError}
          value={renameDraft}
          onCancel={() => {
            setRenameOpen(false);
            setRenameError("");
          }}
          onChange={(v) => {
            setRenameDraft(v);
            setRenameError("");
          }}
          onSubmit={() => void handleRename()}
        />
      ) : null}
    </div>
  );
}

function RenameTeamDialog({
  value,
  error,
  busy,
  onChange,
  onCancel,
  onSubmit
}: {
  value: string;
  error: string;
  busy: boolean;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
        backdropFilter: "blur(4px)"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 900,
            color: "var(--text)",
            margin: 0,
            marginBottom: "12px"
          }}
        >
          Jamoa nomini o'zgartirish
        </h2>
        <input
          autoFocus
          maxLength={30}
          placeholder="Yangi nom"
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            fontSize: "14px",
            color: "var(--text)",
            outline: "none",
            fontFamily: "inherit"
          }}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
        {error ? (
          <div style={{ fontSize: "12px", color: "var(--error)", marginTop: "8px" }}>{error}</div>
        ) : null}
        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <button
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px",
              background: busy ? "var(--border)" : "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 800,
              color: "white",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1
            }}
            type="button"
            onClick={onSubmit}
          >
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button
            disabled={busy}
            style={{
              padding: "12px 18px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text)",
              cursor: "pointer"
            }}
            type="button"
            onClick={onCancel}
          >
            Bekor
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────── Sub-components ──────── */

function NoTeamView({
  onCreate,
  onJoin
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <>
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "32px 20px",
          textAlign: "center",
          marginBottom: "16px"
        }}
      >
        <div
          style={{
            color: "var(--accent)",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "center"
          }}
        >
          <TeamIcon size={52} />
        </div>
        <div
          style={{
            fontSize: "17px",
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: "8px"
          }}
        >
          Hali jamoada emassiz
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            lineHeight: 1.6
          }}
        >
          Yangi jamoa yarating yoki do'stingizning kodi orqali qo'shiling
        </div>
      </div>

      <button
        style={{
          width: "100%",
          padding: "16px",
          background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
          border: "none",
          borderRadius: "14px",
          fontSize: "15px",
          fontWeight: 800,
          color: "white",
          cursor: "pointer",
          marginBottom: "10px",
          boxShadow: "0 8px 24px rgba(77,166,255,0.28)"
        }}
        type="button"
        onClick={onCreate}
      >
        + Yangi jamoa yaratish
      </button>
      <button
        style={{
          width: "100%",
          padding: "16px",
          background: "var(--card)",
          border: "2px solid var(--accent)",
          borderRadius: "14px",
          fontSize: "15px",
          fontWeight: 700,
          color: "var(--accent)",
          cursor: "pointer"
        }}
        type="button"
        onClick={onJoin}
      >
        Kod orqali qo'shilish
      </button>
    </>
  );
}

function HasTeamView({
  team,
  currentUserId,
  isOwner,
  codeCopied,
  hasOutgoing,
  activeBattle,
  onCopyCode,
  onChallenge,
  onLeave,
  onRename
}: {
  team: TeamWithMembers;
  currentUserId: number;
  isOwner: boolean;
  codeCopied: boolean;
  hasOutgoing: boolean;
  activeBattle: PendingChallenge | undefined;
  onCopyCode: () => void;
  onChallenge: () => void;
  onLeave: () => void;
  onRename: () => void;
}) {
  const challengeDisabled = hasOutgoing || team.status !== "open" || !!activeBattle;

  return (
    <>
      {/* Team card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "18px",
          marginBottom: "12px"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px"
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flex: "0 0 auto",
              boxShadow: "0 4px 12px rgba(124,58,237,0.35)"
            }}
          >
            <TeamIcon size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px"
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1
                }}
              >
                {team.name}
              </span>
              {team.ownerId === currentUserId ? (
                <button
                  aria-label="Jamoa nomini o'zgartirish"
                  style={{
                    width: "28px",
                    height: "28px",
                    padding: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--accent)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto"
                  }}
                  title="Jamoa nomini o'zgartirish"
                  type="button"
                  onClick={onRename}
                >
                  <EditIcon size={13} />
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color:
                    team.status === "open"
                      ? "var(--success)"
                      : "var(--gold)",
                  background:
                    team.status === "open"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(245,200,66,0.12)",
                  border: `1px solid ${
                    team.status === "open"
                      ? "rgba(34,197,94,0.3)"
                      : "rgba(245,200,66,0.3)"
                  }`,
                  padding: "2px 8px",
                  borderRadius: "20px"
                }}
              >
                {team.status === "open"
                  ? "● OCHIQ"
                  : team.status === "in_battle"
                    ? "⚔ BELLASHUVDA"
                    : "🔒 YOPIQ"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {team.members.length}/{team.maxMembers} a'zo
              </span>
            </div>
          </div>
        </div>

        {/* Code block */}
        <div
          style={{
            background: "rgba(77,166,255,0.06)",
            border: "1px dashed rgba(77,166,255,0.3)",
            borderRadius: "12px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: "16px"
          }}
        >
          <div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--muted)",
                letterSpacing: "2px",
                marginBottom: "3px",
                fontWeight: 700
              }}
            >
              QO'SHILISH KODI
            </div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "var(--accent)",
                letterSpacing: "5px",
                fontFamily: "monospace"
              }}
            >
              {team.code}
            </div>
          </div>
          <button
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: `1px solid ${codeCopied ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
              background: codeCopied ? "rgba(34,197,94,0.12)" : "var(--surface)",
              color: codeCopied ? "var(--success)" : "var(--accent)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap"
            }}
            type="button"
            onClick={onCopyCode}
          >
            {codeCopied ? "✓ Nusxalandi" : "Nusxa"}
          </button>
        </div>

        {/* Members */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.5px",
            marginBottom: "8px"
          }}
        >
          A'ZOLAR
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {team.members.map((m) => {
            const isMe = m.telegramId === currentUserId && currentUserId !== 0;
            const isTeamOwner = m.telegramId === team.ownerId;
            return (
              <div
                key={m.telegramId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 10px",
                  background: isMe
                    ? "rgba(77,166,255,0.07)"
                    : "transparent",
                  border: `1px solid ${isMe ? "rgba(77,166,255,0.2)" : "var(--border)"}`,
                  borderRadius: "12px"
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 700,
                    flex: "0 0 auto"
                  }}
                >
                  {memberInitial(m)}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {memberLabel(m)}
                  {isMe ? " (siz)" : ""}
                </span>
                {isTeamOwner ? (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "var(--gold)",
                      background: "rgba(245,200,66,0.14)",
                      border: "1px solid rgba(245,200,66,0.3)",
                      padding: "2px 7px",
                      borderRadius: "20px",
                      letterSpacing: "0.5px",
                      flex: "0 0 auto"
                    }}
                  >
                    EGASI
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Team chat */}
      <TeamChatPanel
        canSend={currentUserId > 0}
        currentUserId={currentUserId}
        members={team.members}
      />

      {/* Challenge button — owner-only with explanation */}
      {isOwner ? (
        <button
          disabled={challengeDisabled}
          style={{
            width: "100%",
            padding: "15px",
            background: challengeDisabled
              ? "var(--card)"
              : "linear-gradient(135deg, #F5C842, #7C3AED)",
            border: challengeDisabled ? "1px dashed var(--border)" : "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: 800,
            color: challengeDisabled ? "var(--muted)" : "white",
            cursor: challengeDisabled ? "not-allowed" : "pointer",
            marginBottom: "10px",
            boxShadow: challengeDisabled ? "none" : "0 6px 20px rgba(124,58,237,0.3)"
          }}
          type="button"
          onClick={onChallenge}
        >
          ⚔️ Bellashuvga taklif qilish
        </button>
      ) : (
        <div
          style={{
            padding: "12px 14px",
            background: "var(--card)",
            border: "1px dashed var(--border)",
            borderRadius: "14px",
            fontSize: "12.5px",
            color: "var(--muted)",
            textAlign: "center",
            marginBottom: "10px",
            lineHeight: 1.5
          }}
        >
          Bellashuvga taklif qilish — faqat jamoa egasining qo'lida
        </div>
      )}

      {/* Leave team */}
      <button
        style={{
          width: "100%",
          padding: "13px",
          background: "transparent",
          border: "1px solid var(--error)",
          borderRadius: "14px",
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--error)",
          cursor: "pointer"
        }}
        type="button"
        onClick={onLeave}
      >
        Jamoadan chiqish
      </button>
    </>
  );
}
