import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
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
        <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
          {title}
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.5, marginBottom: "20px" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
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
              background: "var(--error)",
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
