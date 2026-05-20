import { useEffect, useState } from "react";
import {
  acceptBattle,
  declineBattle,
  getMyTeam,
  getPendingBattles,
  leaveTeam
} from "../api/client";
import type { PendingChallenge, TeamMember, TeamWithMembers } from "../types";
import ChallengeModal from "./ChallengeModal";
import ConfirmDialog from "./ConfirmDialog";
import CreateTeamModal from "./CreateTeamModal";
import { TeamIcon } from "./icons";
import JoinTeamModal from "./JoinTeamModal";

type TeamScreenProps = {
  currentUserId: number;
  onEnterBattle: (battleId: string) => void;
};

function memberLabel(member: TeamMember): string {
  return member.firstName || (member.username ? `@${member.username}` : `#${member.telegramId}`);
}

function memberInitial(member: TeamMember): string {
  const name = member.firstName || member.username || "?";

  return name[0]?.toUpperCase() ?? "?";
}

export default function TeamScreen({ currentUserId, onEnterBattle }: TeamScreenProps) {
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

  async function refresh() {
    setLoading(true);
    const [t, p] = await Promise.all([getMyTeam(), getPendingBattles()]);
    setTeam(t);
    setPending(p);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Agar foydalanuvchining jamoasida aktiv bellashuv bo'lsa — battle ekraniga avtomatik o'tamiz.
  useEffect(() => {
    const active = pending.find((c) => c.status === "in_progress");

    if (active) {
      onEnterBattle(active.battleId);
    }
  }, [pending, onEnterBattle]);

  async function handleLeave() {
    setLeaveOpen(false);
    await leaveTeam();
    setTeam(null);
    await refresh();
  }

  async function handleCopyCode() {
    if (!team) {
      return;
    }

    try {
      await navigator.clipboard.writeText(team.code);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // jim qoldiramiz
    }
  }

  async function handleAccept(battleId: string) {
    setActionId(battleId);
    setActionError("");
    const result = await acceptBattle(battleId);
    setActionId(null);

    if (result.ok) {
      onEnterBattle(result.data.battleId);
    } else {
      setActionError(result.error);
      await refresh();
    }
  }

  async function handleDecline(battleId: string) {
    setActionId(battleId);
    setActionError("");
    const result = await declineBattle(battleId);
    setActionId(null);

    if (result.ok) {
      await refresh();
    } else {
      setActionError(result.error);
    }
  }

  const isOwner = team !== null && team.ownerId === currentUserId;
  const incoming = pending.filter((c) => c.iAmOpponent && c.status === "pending");
  const outgoing = pending.filter((c) => !c.iAmOpponent && c.status === "pending");

  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px 20px 104px",
        maxWidth: "430px",
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "16px" }}>
        Jamoa
      </h1>

      {loading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : !team ? (
        <>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "24px",
              textAlign: "center",
              marginBottom: "16px"
            }}
          >
            <div style={{ color: "var(--accent)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
              <TeamIcon size={48} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)", marginBottom: "6px" }}>
              Hali jamoadа emassiz
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
              Yangi jamoa yarating yoki do'stingizning kodi bilan mavjud jamoaga qo'shiling.
            </div>
          </div>

          <button
            style={{
              width: "100%",
              padding: "15px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              border: "none",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 800,
              color: "white",
              cursor: "pointer",
              marginBottom: "10px"
            }}
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            Yangi jamoa yaratish
          </button>
          <button
            style={{
              width: "100%",
              padding: "15px",
              background: "var(--card)",
              border: "1.5px solid var(--accent)",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--accent)",
              cursor: "pointer"
            }}
            type="button"
            onClick={() => setJoinOpen(true)}
          >
            Kod orqali qo'shilish
          </button>
        </>
      ) : (
        <>
          {incoming.map((challenge) => (
            <div
              key={challenge.battleId}
              style={{
                background: "linear-gradient(135deg, rgba(245,200,66,0.18), rgba(124,58,237,0.18))",
                border: "1px solid var(--gold)",
                borderRadius: "18px",
                padding: "16px",
                marginBottom: "14px"
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold)", marginBottom: "6px" }}>
                ⚔️ BELLASHUV TAKLIFI
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>
                "{challenge.challengerTeam.name}" sizning jamoangizga taklif yubordi
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  disabled={actionId === challenge.battleId}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "var(--success)",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "white",
                    cursor: "pointer",
                    opacity: actionId === challenge.battleId ? 0.6 : 1
                  }}
                  type="button"
                  onClick={() => void handleAccept(challenge.battleId)}
                >
                  Qabul qilish
                </button>
                <button
                  disabled={actionId === challenge.battleId}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: "1px solid var(--error)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--error)",
                    cursor: "pointer",
                    opacity: actionId === challenge.battleId ? 0.6 : 1
                  }}
                  type="button"
                  onClick={() => void handleDecline(challenge.battleId)}
                >
                  Rad etish
                </button>
              </div>
              {actionError ? (
                <div style={{ fontSize: "12px", color: "var(--error)", marginTop: "8px" }}>
                  {actionError}
                </div>
              ) : null}
            </div>
          ))}

          {outgoing.map((challenge) => (
            <div
              key={challenge.battleId}
              style={{
                background: "var(--card)",
                border: "1px dashed var(--border)",
                borderRadius: "16px",
                padding: "14px",
                marginBottom: "14px",
                fontSize: "13px",
                color: "var(--muted)",
                textAlign: "center"
              }}
            >
              ⏳ "{challenge.opponentTeam.name}" jamoasidan javob kutilmoqda...
            </div>
          ))}

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flex: "0 0 auto"
                }}
              >
                <TeamIcon size={22} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {team.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  {team.members.length} / {team.maxMembers} a'zo
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px dashed var(--border)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px"
              }}
            >
              <div>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1.5px", marginBottom: "2px" }}>
                  QO'SHILISH KODI
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "var(--accent)",
                    letterSpacing: "4px",
                    fontFamily: "monospace"
                  }}
                >
                  {team.code}
                </div>
              </div>
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: codeCopied ? "var(--success)" : "var(--card)",
                  color: codeCopied ? "white" : "var(--accent)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                type="button"
                onClick={() => void handleCopyCode()}
              >
                {codeCopied ? "✓" : "Nusxa"}
              </button>
            </div>
          </div>

          <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", marginBottom: "10px" }}>
            A'zolar
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {team.members.map((member) => {
              const isMemberOwner = member.telegramId === team.ownerId;
              const isMe = member.telegramId === currentUserId && currentUserId !== 0;

              return (
                <div
                  key={member.telegramId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "10px 14px"
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700
                    }}
                  >
                    {memberInitial(member)}
                  </div>
                  <div style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {memberLabel(member)}
                    {isMe ? " (siz)" : ""}
                  </div>
                  {isMemberOwner ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--gold)",
                        background: "rgba(245,200,66,0.14)",
                        border: "1px solid rgba(245,200,66,0.3)",
                        padding: "3px 8px",
                        borderRadius: "20px"
                      }}
                    >
                      EGASI
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {isOwner ? (
            <button
              disabled={outgoing.length > 0 || team.status !== "open"}
              style={{
                width: "100%",
                padding: "15px",
                background:
                  outgoing.length > 0 || team.status !== "open"
                    ? "var(--card)"
                    : "linear-gradient(135deg, #F5C842, #7C3AED)",
                border: outgoing.length > 0 || team.status !== "open" ? "1px dashed var(--border)" : "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 800,
                color: outgoing.length > 0 || team.status !== "open" ? "var(--muted)" : "white",
                cursor: outgoing.length > 0 || team.status !== "open" ? "not-allowed" : "pointer",
                marginBottom: "10px"
              }}
              type="button"
              onClick={() => setChallengeOpen(true)}
            >
              ⚔️ Bellashuvga taklif qilish
            </button>
          ) : null}

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
            onClick={() => setLeaveOpen(true)}
          >
            Jamoadan chiqish
          </button>
        </>
      )}

      {createOpen ? (
        <CreateTeamModal onClose={() => setCreateOpen(false)} onCreated={() => void refresh()} />
      ) : null}
      {joinOpen ? (
        <JoinTeamModal onClose={() => setJoinOpen(false)} onJoined={() => void refresh()} />
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
    </div>
  );
}
