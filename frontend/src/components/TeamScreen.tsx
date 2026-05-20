import { useEffect, useState } from "react";
import { getMyTeam, leaveTeam } from "../api/client";
import type { TeamMember, TeamWithMembers } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import CreateTeamModal from "./CreateTeamModal";
import { TeamIcon } from "./icons";
import JoinTeamModal from "./JoinTeamModal";

type TeamScreenProps = {
  currentUserId: number;
};

function memberLabel(member: TeamMember): string {
  return member.firstName || (member.username ? `@${member.username}` : `#${member.telegramId}`);
}

function memberInitial(member: TeamMember): string {
  const name = member.firstName || member.username || "?";

  return name[0]?.toUpperCase() ?? "?";
}

export default function TeamScreen({ currentUserId }: TeamScreenProps) {
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    const t = await getMyTeam();
    setTeam(t);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

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

  const isOwner = team !== null && team.ownerId === currentUserId;

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
              disabled
              style={{
                width: "100%",
                padding: "15px",
                background: "var(--card)",
                border: "1px dashed var(--border)",
                borderRadius: "14px",
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--muted)",
                cursor: "not-allowed",
                marginBottom: "10px"
              }}
              type="button"
            >
              ⚔️ Bellashuvga taklif qilish (tez orada)
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
