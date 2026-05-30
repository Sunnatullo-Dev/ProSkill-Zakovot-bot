/**
 * Svoyak xatolarni tutib oluvchi error boundary.
 *
 * Production'da React renderlash vaqtida xato bo'lsa, butun mini-app qora
 * ekran ko'rsatadi (Telegram WebView'ning default'i). Bu boundary xatoni
 * tutib qulay xato xabar + qayta urinish tugmasini ko'rsatadi.
 */
import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

type Props = {
  children: ReactNode;
  onReset?: () => void;
  /** Tarjima qilingan matnlar — render xato bo'lganda useT() ishlatilmaydi
   * (class component), shuning uchun parent props orqali yuboradi. */
  labels?: {
    title: string;
    text: string;
    details: string;
    retry: string;
  };
};

const DEFAULT_LABELS = {
  title: "Svoyak'da xato yuz berdi",
  text: "Tashvishlanmang — qayta urinish tugmasini bosing yoki Mini-App'ni yopib qayta oching.",
  details: "Texnik tafsilot",
  retry: "🔄 Qayta urinib ko'rish",
};

type State = {
  hasError: boolean;
  error: Error | null;
  info: string;
};

export default class SvoyakErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Stack trace'ni console'ga ham yozamiz (debug uchun)
    console.error("[svoyak] render error:", error, info);
    this.setState({ info: info.componentStack ?? "" });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: "" });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const labels = this.props.labels ?? DEFAULT_LABELS;
    const err = this.state.error;
    const msg = err instanceof Error ? err.message : String(err ?? "Noma'lum xato");
    const stack = err instanceof Error ? err.stack ?? "" : "";

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--svoyak-bg, #0a1428)",
          color: "var(--text)",
          padding: "24px 16px",
          fontFamily: "var(--svoyak-font-body)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "60px", marginBottom: "12px" }}>⚠️</div>
        <div
          style={{
            fontFamily: "var(--svoyak-font-heading)",
            fontWeight: 900,
            fontSize: "20px",
            color: "var(--svoyak-neon-red, #ff3b5c)",
            marginBottom: "10px",
            textAlign: "center",
          }}
        >
          {labels.title}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            marginBottom: "20px",
            textAlign: "center",
            maxWidth: "320px",
            lineHeight: 1.5,
          }}
        >
          {labels.text}
        </div>

        {/* Texnik tafsilot — debug uchun ko'rinadi */}
        <details
          style={{
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "10px",
            maxWidth: "92%",
            fontSize: "11px",
            color: "var(--muted)",
            marginBottom: "20px",
          }}
        >
          <summary style={{ cursor: "pointer", color: "var(--text)" }}>
            {labels.details}
          </summary>
          <div
            style={{
              marginTop: "10px",
              fontFamily: "monospace",
              fontSize: "10px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            {msg}
            {stack ? "\n\n" + stack.slice(0, 600) : ""}
            {this.state.info ? "\n\n" + this.state.info.slice(0, 400) : ""}
          </div>
        </details>

        <button
          type="button"
          onClick={this.handleReset}
          style={{
            padding: "12px 24px",
            borderRadius: "12px",
            border: "none",
            background:
              "linear-gradient(135deg, var(--svoyak-gold, #f5c842) 0%, #FF8A4C 100%)",
            color: "#0B0B14",
            fontFamily: "var(--svoyak-font-heading)",
            fontWeight: 900,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {labels.retry}
        </button>
      </div>
    );
  }
}
