/**
 * Svoyak Lobby — birinchi ekran.
 *
 * Ikki rejim:
 *   - Host: kategoriyalarni tanlab xona yaratadi → kod ulashadi
 *   - O'yinchi: kod kiritib qo'shiladi
 *
 * Xona yaratilganda yoki qo'shilingandan keyin lobby ko'rinishi:
 *   - Kod (katta + Copy)
 *   - Ishtirokchilar ro'yxati
 *   - Boshlash tugma (faqat host'da, kamida 2 o'yinchi)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  createRoom,
  endGame,
  joinRoom,
  leaveRoom,
  listCategories,
  startGame,
} from "./api";
import type { SvoyakCategoryListItem } from "./api";
import { useSvoyakRoom } from "./useSvoyakRoom";
import type { SvoyakRoomState } from "./types";
import { hapticSelect, hapticTap } from "../utils/haptics";
import { useT } from "../i18n";

type SvoyakLobbyScreenProps = {
  /** Joriy foydalanuvchi (Telegram'dan) */
  playerName: string;
  /** Deep link orqali kelgan room kod (?startapp=svoyak_XXXXXX). */
  initialJoinCode?: string;
  /** Xona o'yin "playing" holatiga o'tganda chaqiriladi — Board ekranga o'tish. */
  onGameStarted: (state: SvoyakRoomState) => void;
  /** Koordinator rejimi admin tomonidan yoqilganmi */
  coordinatorEnabled?: boolean;
};

type Mode = "menu" | "host_setup" | "joining" | "in_lobby";

const PAGE: CSSProperties = {
  minHeight: "100dvh",
  background:
    "radial-gradient(140% 80% at 20% 0%, rgba(245,200,66,0.12), transparent 60%)," +
    "radial-gradient(140% 80% at 80% 100%, rgba(124,58,237,0.18), transparent 55%)," +
    "var(--svoyak-bg, #0a1428)",
  color: "var(--text)",
  fontFamily: "var(--svoyak-font-body)",
  padding: "20px 16px 100px",
  maxWidth: "430px",
  margin: "0 auto",
};

const TITLE: CSSProperties = {
  fontFamily: "var(--svoyak-font-heading)",
  fontSize: "26px",
  fontWeight: 900,
  letterSpacing: "0.02em",
  background:
    "linear-gradient(120deg, #FFFFFF 0%, var(--svoyak-gold, #f5c842) 60%, #FF8A4C 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  marginBottom: "8px",
};

const SUBTITLE: CSSProperties = {
  fontSize: "13px",
  color: "var(--muted)",
  lineHeight: 1.55,
  marginBottom: "20px",
};

const CARD: CSSProperties = {
  background: "var(--svoyak-surface, #0f1f3a)",
  border: "1px solid var(--svoyak-border, #1f3a6e)",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "12px",
};

const PRIMARY_BTN: CSSProperties = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background:
    "linear-gradient(135deg, var(--svoyak-gold, #f5c842) 0%, #FF8A4C 100%)",
  color: "#0B0B14",
  fontFamily: "var(--svoyak-font-heading)",
  fontSize: "15px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  cursor: "pointer",
  boxShadow: "0 10px 24px -6px rgba(245,200,66,0.45)",
};

const SECONDARY_BTN: CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--text)",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "10px",
};

const INPUT: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid var(--svoyak-border, #1f3a6e)",
  background: "rgba(0,0,0,0.25)",
  color: "var(--text)",
  fontFamily: "var(--svoyak-font-body)",
  fontSize: "16px",
  outline: "none",
};


export default function SvoyakLobbyScreen({
  playerName,
  initialJoinCode,
  onGameStarted,
  coordinatorEnabled = true,
}: SvoyakLobbyScreenProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialJoinCode ? "joining" : "menu");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Host yaratish ekrani:
  const [categories, setCategories] = useState<SvoyakCategoryListItem[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set());
  const [catsLoading, setCatsLoading] = useState(false);

  // Join ekrani:
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode ?? "");
  const [joinRole, setJoinRole] = useState<"player" | "coordinator">("player");

  // Lobby (xona ichidagi state — polling)
  const { data: roomState, error: pollError, refetch } = useSvoyakRoom(activeCode);

  // Xona "playing" holatiga o'tdi → Board ekranga
  // startedRef: handleStartGame allaqachon onGameStarted chaqirgan bo'lsa,
  // polling orqali ikkinchi marta chaqirilmasin (double render → #310)
  const gameStartedRef = useRef(false);
  useEffect(() => {
    if (gameStartedRef.current) return;
    if (roomState && roomState.status === "playing" && activeCode) {
      gameStartedRef.current = true;
      onGameStarted(roomState);
    }
  }, [roomState, activeCode, onGameStarted]);

  // Deep link orqali kelgan bo'lsa, auto-join
  useEffect(() => {
    if (initialJoinCode && mode === "joining" && !activeCode && !busy) {
      void handleJoinRoom(initialJoinCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode]);

  // Host setup'ga kirganida kategoriyalarni yuklash.
  // Render free tier coldstart bo'lsa 20+ sek davom etadi — api.ts'da retry bor.
  const loadCategories = () => {
    setCatsLoading(true);
    setError("");
    void listCategories()
      .then((items) => {
        setCategories(items);
        // Tayyor (ready=true) kategoriyalarni odatda auto-tanlaymiz
        const readyIds = items.filter((c) => c.ready).slice(0, 3).map((c) => c.id);
        setSelectedCatIds(new Set(readyIds));
      })
      .catch((err) => {
        const msg = String(err?.message ?? err);
        // Foydalanuvchiga to'liq xato xabari ko'rsatamiz — Backend URL ham bor.
        // Bu prod muammosini debug qilishga yordam beradi.
        setError(msg);
      })
      .finally(() => setCatsLoading(false));
  };
  useEffect(() => {
    if (mode !== "host_setup" || categories.length > 0 || catsLoading) return;
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, categories.length]);

  async function handleCreateRoom() {
    setError("");
    setBusy(true);
    try {
      // Auto rejim: kategoriya tanlanmaydi — savollar avtomatik beriladi
      const state = await createRoom({ displayName: playerName });
      setActiveCode(state.code);
      setMode("in_lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xona yaratib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinRoom(code: string) {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setError("Kod kamida 4 belgi");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const state = await joinRoom({ code: normalized, displayName: playerName, role: joinRole });
      setActiveCode(state.code);
      setMode("in_lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qo'shilib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartGame() {
    if (!activeCode) return;
    setError("");
    setBusy(true);
    try {
      const state = await startGame(activeCode);
      gameStartedRef.current = true;  // polling ikkinchi marta chaqirmasin
      onGameStarted(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Boshlab bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveRoom() {
    if (!activeCode) return;
    setBusy(true);
    try {
      await leaveRoom(activeCode);
    } catch {
      /* ignore */
    } finally {
      setActiveCode(null);
      setMode("menu");
      setBusy(false);
    }
  }

  async function handleCopyCode() {
    if (!activeCode) return;
    try {
      await navigator.clipboard?.writeText(activeCode);
      hapticTap();
    } catch {
      /* ignore */
    }
  }

  /**
   * Telegram kontakt taklif qilish.
   *
   * Telegram WebApp.switchInlineQuery — foydalanuvchining chat ro'yxati
   * ochiladi, foydalanuvchi kontaktni tanlasa bot inline natija sifatida
   * o'yin havolasini yuboradi. Bot esa /start svoyak_CODE bilan kelgan
   * foydalanuvchini avtomatik xonaga qo'shadi (deep link).
   *
   * Eski telegram client'larda yoki desktop'da switchInlineQuery yo'q —
   * shu holda openTelegramLink yoki share URL fallback.
   */
  function handleInvite() {
    if (!activeCode) return;
    hapticTap();
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    const botUsername = "ZakovatApp_bot"; // ?startapp= deep link uchun
    const startParam = `svoyak_${activeCode}`;
    const inviteText = `🎲 Svoyak'ga qo'shiling — kod: ${activeCode}`;

    // 1) Birinchi tanlov: switchInlineQuery — kontakt picker ochiladi
    if (tg?.switchInlineQuery) {
      try {
        tg.switchInlineQuery(startParam, ["users", "groups", "channels"]);
        return;
      } catch (err) {
        console.warn("[svoyak] switchInlineQuery xato:", err);
      }
    }

    // 2) Fallback: openTelegramLink (t.me/share/url) — share dialog
    const shareUrl =
      `https://t.me/share/url?` +
      `url=${encodeURIComponent(`https://t.me/${botUsername}?startapp=${startParam}`)}` +
      `&text=${encodeURIComponent(inviteText)}`;
    if (tg?.openTelegramLink) {
      try {
        tg.openTelegramLink(shareUrl);
        return;
      } catch (err) {
        console.warn("[svoyak] openTelegramLink xato:", err);
      }
    }

    // 3) Eng oxirgi fallback: clipboard'ga link nusxalash
    const fullLink = `https://t.me/${botUsername}?startapp=${startParam}`;
    void navigator.clipboard?.writeText(fullLink).then(() => {
      alert("Taklif havolasi nusxalandi:\n" + fullLink);
    }).catch(() => {
      alert("Taklif havolasi:\n" + fullLink);
    });
  }

  // ────────────────────────────────────────────────────────────────────────

  if (mode === "menu") {
    return (
      <div style={PAGE}>
        <div style={TITLE}>{t("svoyak_menu_title")}</div>
        <div style={SUBTITLE}>{t("svoyak_menu_subtitle")}</div>

        <div style={CARD}>
          <button
            type="button"
            disabled={busy}
            style={PRIMARY_BTN}
            onClick={() => {
              hapticSelect();
              setError("");
              setMode("host_setup");
            }}
          >
            {t("svoyak_menu_create")}
          </button>
          <button
            type="button"
            disabled={busy}
            style={SECONDARY_BTN}
            onClick={() => {
              hapticSelect();
              setError("");
              setMode("joining");
            }}
          >
            {t("svoyak_menu_join")}
          </button>
        </div>

        {error ? (
          <div style={{ color: "#FCA5A5", fontSize: "12px", textAlign: "center" }}>
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === "host_setup") {
    // Xona yaratish — auto rejim, kategoriya tanlanmaydi
    return (
      <div style={PAGE}>
        <div style={TITLE}>🎯 Yangi o'yin</div>
        <div style={SUBTITLE}>Savollar avtomatik ketma-ket beriladi</div>

        <div style={{ ...CARD, textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚀</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
            Auto rejim
          </div>
          <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            Solo: 3 ta savol • Jamoa: 7 ta savol<br />
            Daraja oshsa — savol soni ham ko'payadi<br />
            Faqat matn javob, vaqt: 15 soniya
          </div>
        </div>

        {error ? (
          <div style={{ color: "#FCA5A5", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          style={PRIMARY_BTN}
          onClick={handleCreateRoom}
        >
          {busy ? "Yaratilmoqda..." : "Xona yaratish →"}
        </button>
        <button
          type="button"
          disabled={busy}
          style={SECONDARY_BTN}
          onClick={() => { setMode("menu"); setError(""); }}
        >
          ← Orqaga
        </button>
      </div>
    );
  }

  if (mode === "joining") {
    return (
      <div style={PAGE}>
        <div style={TITLE}>{t("svoyak_join_title")}</div>
        <div style={SUBTITLE}>{t("svoyak_join_subtitle")}</div>

        <div style={CARD}>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder={t("svoyak_join_placeholder")}
            style={{
              ...INPUT,
              textAlign: "center",
              letterSpacing: "0.4em",
              fontSize: "22px",
              fontWeight: 800,
              fontFamily: "var(--svoyak-font-heading)",
            }}
            maxLength={8}
          />
          {/* Rol tanlash — faqat admin yoqqan bo'lsa */}
          {coordinatorEnabled ? (
            <>
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setJoinRole("player")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: joinRole === "player"
                      ? "1.5px solid var(--svoyak-gold, #f5c842)"
                      : "1.5px solid var(--svoyak-border, #1f3a6e)",
                    background: joinRole === "player"
                      ? "rgba(245,200,66,0.15)"
                      : "var(--svoyak-surface, #0f1f3a)",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  🎮 O'yinchi
                </button>
                <button
                  type="button"
                  onClick={() => setJoinRole("coordinator")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: joinRole === "coordinator"
                      ? "1.5px solid #4DA6FF"
                      : "1.5px solid var(--svoyak-border, #1f3a6e)",
                    background: joinRole === "coordinator"
                      ? "rgba(77,166,255,0.15)"
                      : "var(--svoyak-surface, #0f1f3a)",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  🎤 Koordinator
                </button>
              </div>
              {joinRole === "coordinator" ? (
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px", textAlign: "center" }}>
                  Koordinator savol o'qiydi, ball olmaydi
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {error ? (
          <div style={{ color: "#FCA5A5", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || joinCodeInput.trim().length < 4}
          style={{
            ...PRIMARY_BTN,
            opacity: joinCodeInput.trim().length < 4 ? 0.5 : 1,
          }}
          onClick={() => handleJoinRoom(joinCodeInput)}
        >
          {busy ? t("svoyak_admin_saving") : t("svoyak_join_button")}
        </button>
        <button type="button" style={SECONDARY_BTN} onClick={() => setMode("menu")}>
          ← {t("back")}
        </button>
      </div>
    );
  }

  // mode === "in_lobby"
  const players = roomState?.players ?? [];
  const isHost = roomState?.viewerIsHost ?? false;
  // Auto rejimda 1 o'yinchi (solo) ham o'ynay oladi
  const isAutoMode = Boolean(roomState?.isAutoMode);
  const minPlayers = isAutoMode ? 1 : 2;
  const canStart = isHost && players.filter((p) => p.status === "connected").length >= minPlayers;

  return (
    <div style={PAGE}>
      <div style={TITLE}>{t("svoyak_room_ready_title")}</div>
      <div style={SUBTITLE}>{t("svoyak_room_ready_subtitle")}</div>

      {/* Kod kartochkasi */}
      <div
        style={{
          ...CARD,
          textAlign: "center",
          background:
            "linear-gradient(135deg, rgba(245,200,66,0.15), rgba(255,138,76,0.08))",
          border: "1px solid var(--svoyak-gold, #f5c842)",
          padding: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.2em", marginBottom: "8px" }}>
          {t("svoyak_room_code_label")}
        </div>
        <div
          style={{
            fontFamily: "var(--svoyak-font-heading)",
            fontSize: "38px",
            fontWeight: 900,
            letterSpacing: "0.25em",
            color: "var(--svoyak-gold, #f5c842)",
            textShadow: "0 0 24px rgba(245,200,66,0.5)",
          }}
        >
          {activeCode}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleInvite}
            style={{
              padding: "10px 18px",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #4DA6FF 0%, #2C6FCC 100%)",
              color: "#FFFFFF",
              fontFamily: "var(--svoyak-font-heading)",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 6px 18px -4px rgba(77,166,255,0.45)",
            }}
          >
            {t("svoyak_invite_friend")}
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📋 {t("svoyak_copy_code")}
          </button>
        </div>
      </div>

      {/* O'yinchilar */}
      <div style={CARD}>
        <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.2em", marginBottom: "10px" }}>
          {t("svoyak_players_count", { n: players.length })}
        </div>
        {players.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "8px" }}>
            ...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {players.map((p) => (
              <div
                key={p.telegramId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.20)",
                  border: p.status === "connected" ? "none" : "1px dashed rgba(255,255,255,0.10)",
                  opacity: p.status === "connected" ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: "18px" }}>
                  {p.isHost ? "👑" : p.role === "coordinator" ? "🎤" : "👤"}
                </span>
                <span style={{ flex: 1, fontWeight: 700 }}>{p.displayName}</span>
                {p.role === "coordinator" ? (
                  <span style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(77,166,255,0.15)",
                    color: "#4DA6FF",
                    fontWeight: 700,
                    marginRight: "4px",
                  }}>
                    Koordinator
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background:
                      p.status === "connected"
                        ? "rgba(34,224,127,0.18)"
                        : "rgba(255,255,255,0.05)",
                    color: p.status === "connected" ? "var(--svoyak-neon-green, #22e07f)" : "var(--muted)",
                  }}
                >
                  {p.status === "connected" ? t("svoyak_player_status_connected") : t("svoyak_player_status_disconnected")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {pollError ? (
        <div style={{ color: "#FCA5A5", fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>
          ⚠ {pollError}
        </div>
      ) : null}

      {isHost ? (
        <>
          <button
            type="button"
            disabled={!canStart || busy}
            style={{
              ...PRIMARY_BTN,
              opacity: canStart ? 1 : 0.45,
              cursor: canStart ? "pointer" : "not-allowed",
            }}
            onClick={handleStartGame}
          >
            {busy ? "..." : canStart ? t("svoyak_start_game") : t("svoyak_need_2_players")}
          </button>
          <button
            type="button"
            style={SECONDARY_BTN}
            onClick={async () => {
              if (!activeCode) return;
              await endGame(activeCode).catch(() => {});
              setActiveCode(null);
              setMode("menu");
            }}
          >
            {t("svoyak_close_room")}
          </button>
        </>
      ) : (
        <button type="button" style={SECONDARY_BTN} onClick={handleLeaveRoom}>
          {t("svoyak_leave_room")}
        </button>
      )}

      {error ? (
        <div style={{ color: "#FCA5A5", fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
