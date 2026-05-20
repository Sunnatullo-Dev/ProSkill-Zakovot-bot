import { useState } from "react";
import { createPortal } from "react-dom";
import { joinTeamByCode } from "../api/client";
import { hapticResult } from "../utils/haptics";

type JoinTeamModalProps = {
  onClose: () => void;
  onJoined: () => void;
};

export default function JoinTeamModal({ onClose, onJoined }: JoinTeamModalProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmed = code.trim().toUpperCase();

    if (trimmed.length < 4 || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    const result = await joinTeamByCode(trimmed);
    setSubmitting(false);

    if (result.ok) {
      hapticResult("correct");
      onJoined();
      onClose();
    } else {
      setError(result.error);
    }
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
      onClick={onClose}
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
        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "14px" }}>
          Jamoaga qo'shilish
        </div>
        <input
          autoFocus
          maxLength={6}
          placeholder="6 belgili kod"
          style={{
            width: "100%",
            padding: "16px",
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "8px",
            color: "var(--text)",
            outline: "none",
            marginBottom: "12px",
            textAlign: "center",
            fontFamily: "monospace",
            textTransform: "uppercase"
          }}
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
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
            disabled={code.trim().length < 4 || submitting}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: code.trim().length < 4 || submitting ? "var(--border)" : "var(--accent)",
              color: "white",
              fontSize: "14px",
              fontWeight: 800,
              cursor: code.trim().length < 4 || submitting ? "not-allowed" : "pointer",
              opacity: code.trim().length < 4 || submitting ? 0.6 : 1
            }}
            type="button"
            onClick={() => void handleSubmit()}
          >
            {submitting ? "..." : "Qo'shilish"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
