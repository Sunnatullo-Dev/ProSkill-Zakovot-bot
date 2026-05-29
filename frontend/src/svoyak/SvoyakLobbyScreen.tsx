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
import { useEffect, useMemo, useState } from "react";
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

type SvoyakLobbyScreenProps = {
  /** Joriy foydalanuvchi (Telegram'dan) */
  playerName: string;
  /** Deep link orqali kelgan room kod (?startapp=svoyak_XXXXXX). */
  initialJoinCode?: string;
  /** Xona o'yin "playing" holatiga o'tganda chaqiriladi — Board ekranga o'tish. */
  onGameStarted: (state: SvoyakRoomState) => void;
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
}: SvoyakLobbyScreenProps) {
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

  // Lobby (xona ichidagi state — polling)
  const { data: roomState, error: pollError, refetch } = useSvoyakRoom(activeCode);

  // Xona "playing" holatiga o'tdi → Board ekranga
  useEffect(() => {
    if (roomState && roomState.status === "playing" && activeCode) {
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

  // Host setup'ga kirganida kategoriyalarni yuklash
  useEffect(() => {
    if (mode !== "host_setup" || categories.length > 0 || catsLoading) return;
    setCatsLoading(true);
    void listCategories()
      .then((items) => {
        setCategories(items);
        // Tayyor (ready=true) kategoriyalarni odatda auto-tanlaymiz
        const readyIds = items.filter((c) => c.ready).slice(0, 3).map((c) => c.id);
        setSelectedCatIds(new Set(readyIds));
      })
      .catch((err) => setError(String(err?.message ?? err)))
      .finally(() => setCatsLoading(false));
  }, [mode, categories.length, catsLoading]);

  async function handleCreateRoom() {
    if (selectedCatIds.size === 0) {
      setError("Kamida 1 ta kategoriya tanlang");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const state = await createRoom({
        displayName: playerName,
        categoryIds: Array.from(selectedCatIds),
      });
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
      const state = await joinRoom({ code: normalized, displayName: playerName });
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

  // ────────────────────────────────────────────────────────────────────────

  if (mode === "menu") {
    return (
      <div style={PAGE}>
        <div style={TITLE}>🎲 Svoyak</div>
        <div style={SUBTITLE}>
          Boshlovchi va do'stlar bilan jonli intellektual o'yin. Tezkorlik,
          aniqlik va tavakkalchilik.
        </div>

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
            🆕 Yangi xona yaratish
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
            🔑 Kod orqali kirish
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
    return (
      <div style={PAGE}>
        <div style={TITLE}>Kategoriyalarni tanlang</div>
        <div style={SUBTITLE}>
          Kamida 1 ta. Tavsiya: 3-5 ta — har biri 5 ta savol tushadi.
        </div>

        {catsLoading ? (
          <div style={{ ...CARD, textAlign: "center", color: "var(--muted)" }}>
            Yuklanmoqda...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {categories.map((cat) => {
              const selected = selectedCatIds.has(cat.id);
              const disabled = !cat.ready;
              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => {
                    hapticSelect();
                    setSelectedCatIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(cat.id)) next.delete(cat.id);
                      else next.add(cat.id);
                      return next;
                    });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    border: selected
                      ? "1.5px solid var(--svoyak-gold, #f5c842)"
                      : "1.5px solid var(--svoyak-border, #1f3a6e)",
                    background: selected
                      ? "linear-gradient(135deg, rgba(245,200,66,0.18), rgba(255,138,76,0.10))"
                      : "var(--svoyak-surface, #0f1f3a)",
                    color: disabled ? "var(--muted)" : "var(--text)",
                    fontFamily: "var(--svoyak-font-body)",
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{cat.iconEmoji}</span>
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {cat.questionCount} savol
                  </span>
                  {selected ? (
                    <span style={{ color: "var(--svoyak-gold, #f5c842)" }}>✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {error ? (
          <div style={{ color: "#FCA5A5", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || selectedCatIds.size === 0}
          style={{
            ...PRIMARY_BTN,
            opacity: selectedCatIds.size === 0 ? 0.5 : 1,
            cursor: selectedCatIds.size === 0 ? "not-allowed" : "pointer",
          }}
          onClick={handleCreateRoom}
        >
          {busy ? "Yaratilmoqda..." : `▶ Xona yaratish (${selectedCatIds.size})`}
        </button>
        <button
          type="button"
          disabled={busy}
          style={SECONDARY_BTN}
          onClick={() => {
            setMode("menu");
            setError("");
          }}
        >
          ← Orqaga
        </button>
      </div>
    );
  }

  if (mode === "joining") {
    return (
      <div style={PAGE}>
        <div style={TITLE}>Xonaga qo'shilish</div>
        <div style={SUBTITLE}>Boshlovchidan olgan 6-belgili kodni kiriting.</div>

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
            placeholder="ABCDE6"
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
          {busy ? "Kirilmoqda..." : "→ Kirish"}
        </button>
        <button type="button" style={SECONDARY_BTN} onClick={() => setMode("menu")}>
          ← Orqaga
        </button>
      </div>
    );
  }

  // mode === "in_lobby"
  const players = roomState?.players ?? [];
  const isHost = roomState?.viewerIsHost ?? false;
  const canStart = isHost && players.filter((p) => p.status === "connected").length >= 2;

  return (
    <div style={PAGE}>
      <div style={TITLE}>Xona tayyor</div>
      <div style={SUBTITLE}>
        {isHost
          ? "Do'stlaringizga kodni yuboring va boshlash uchun kuting."
          : "Boshlovchi o'yinni boshlashini kuting..."}
      </div>

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
          XONA KODI
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
        <button
          type="button"
          onClick={handleCopyCode}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--text)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📋 Nusxalash
        </button>
      </div>

      {/* O'yinchilar */}
      <div style={CARD}>
        <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.2em", marginBottom: "10px" }}>
          O'YINCHILAR ({players.length})
        </div>
        {players.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "8px" }}>
            Hali hech kim qo'shilmagan
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
                <span style={{ fontSize: "18px" }}>{p.isHost ? "👑" : "👤"}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{p.displayName}</span>
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
                  {p.status === "connected" ? "● ulangan" : "○ uzilgan"}
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
            {busy ? "..." : canStart ? "▶ O'yinni boshlash" : "Kamida 2 ta ulangan o'yinchi kerak"}
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
            ✕ Xonani yopish
          </button>
        </>
      ) : (
        <button type="button" style={SECONDARY_BTN} onClick={handleLeaveRoom}>
          ← Chiqib ketish
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
