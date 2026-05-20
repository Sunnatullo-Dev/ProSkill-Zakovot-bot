import { useState } from "react";
import { createPortal } from "react-dom";
import { createTeam } from "../api/client";
import { hapticResult } from "../utils/haptics";

type CreateTeamModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--card)",
  border: "1.5px solid var(--border)",
  borderRadius: "12px",
  fontSize: "15px",
  color: "var(--text)",
  outline: "none",
  marginBottom: "12px"
};

export default function CreateTeamModal({ onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();

    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    const result = await createTeam(trimmed);
    setSubmitting(false);

    if (result.ok) {
      hapticResult("correct");
      setCode(result.data.code);
    } else {
      setError(result.error);
    }
  }

  async function handleCopy() {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Klipboard ishlamasa — fallback (handleCopy alohida helperga muhtoj emas, oddiy textarea)
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        // jim qoldiramiz
      }
      document.body.removeChild(textarea);
    }
  }

  function handleDone() {
    onCreated();
    onClose();
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
      onClick={code ? undefined : onClose}
    >
      <div
        className="animate-scaleIn"
        style={{
          width: "100%",
          maxWidth: "340px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "24px"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {code ? (
          <>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)", marginBottom: "8px", textAlign: "center" }}>
              Jamoa yaratildi! {"\u{1F389}"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px", textAlign: "center" }}>
              Do'stlaringiz quyidagi kod bilan qo'shilishi mumkin:
            </div>
            <div
              style={{
                background: "var(--card)",
                border: "2px dashed var(--accent)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "14px",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  color: "var(--accent)",
                  letterSpacing: "6px",
                  fontFamily: "monospace"
                }}
              >
                {code}
              </div>
            </div>
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: copied ? "var(--success)" : "var(--card)",
                border: `1px solid ${copied ? "var(--success)" : "var(--border)"}`,
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                color: copied ? "white" : "var(--accent)",
                cursor: "pointer",
                marginBottom: "10px"
              }}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Nusxalandi ✓" : "Kodni nusxalash 📋"}
            </button>
            <button
              style={{
                width: "100%",
                padding: "13px",
                background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                border: "none",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 800,
                color: "white",
                cursor: "pointer"
              }}
              type="button"
              onClick={handleDone}
            >
              Tugatdim
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "14px" }}>
              Yangi jamoa
            </div>
            <input
              autoFocus
              maxLength={30}
              placeholder="Jamoa nomi (2-30 belgi)"
              style={inputStyle}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSubmit();
                }
              }}
            />
            {error ? (
              <div style={{ fontSize: "13px", color: "var(--error)", marginBottom: "12px" }}>{error}</div>
            ) : null}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer"
                }}
                type="button"
                onClick={onClose}
              >
                Bekor qilish
              </button>
              <button
                disabled={!name.trim() || submitting}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "12px",
                  border: "none",
                  background: !name.trim() || submitting ? "var(--border)" : "var(--accent)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: !name.trim() || submitting ? "not-allowed" : "pointer",
                  opacity: !name.trim() || submitting ? 0.6 : 1
                }}
                type="button"
                onClick={() => void handleSubmit()}
              >
                {submitting ? "..." : "Yaratish"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
