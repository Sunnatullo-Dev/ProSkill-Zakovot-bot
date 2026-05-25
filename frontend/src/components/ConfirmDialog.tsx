import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * "danger" — qizil tugma (delete, forfeit, leave kabi qaytarib bo'lmas ish).
   * "primary" — havorang tugma (transfer-owner kabi destruktiv emas tasdiq).
   * Default: "danger" — eski xulq-atvor.
   */
  variant?: "danger" | "primary";
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "danger"
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  // Modal ochilganda fokus qaerda edi — yopilganda qaytarish uchun saqlaymiz.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Modal ochilganda fokus xavfsiz tugmaga (cancel) ko'chiriladi —
    // tasodifan Enter bosilsa destruktiv tugma ishlamasin.
    cancelButtonRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Modal yopilganda fokusni avvalgi joyiga qaytarish — screen reader UX.
      try {
        previouslyFocusedRef.current?.focus();
      } catch {
        /* ignore */
      }
    };
  }, [onCancel]);

  const confirmBackground = variant === "primary" ? "var(--accent)" : "var(--error)";

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
      onClick={onCancel}
    >
      <div
        className="animate-scaleIn"
        style={{
          width: "100%",
          maxWidth: "320px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "22px"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          id={titleId}
          style={{ fontSize: "17px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}
        >
          {title}
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.5, marginBottom: "20px" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            ref={cancelButtonRef}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer"
            }}
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: confirmBackground,
              color: "white",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer"
            }}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
