import { useCallback, useEffect, useState } from "react";
import { getPendingSubmissions, reviewSubmission } from "../api/client";
import type { Submission } from "../types";

export default function AdminScreen() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const items = await getPendingSubmissions();
    setSubmissions(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReview(id: string, decision: "approve" | "reject") {
    setProcessingId(id);
    const ok = await reviewSubmission(id, decision);

    if (ok) {
      setSubmissions((current) => current.filter((item) => item.id !== id));
    }

    setProcessingId(null);
  }

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px"
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)" }}>Admin panel</h1>
        <button
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--accent)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer"
          }}
          type="button"
          onClick={() => void load()}
        >
          Yangilash
        </button>
      </div>
      <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
        Kutilayotgan savollar: {submissions.length}
      </p>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : submissions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--muted)"
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{"✅"}</div>
          <p style={{ fontSize: "14px", fontWeight: 600 }}>Kutilayotgan savol yo'q</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {submissions.map((submission) => {
            const isProcessing = processingId === submission.id;

            return (
              <div
                key={submission.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "16px"
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", lineHeight: 1.5 }}>
                  {submission.text}
                </div>
                <div style={{ fontSize: "13px", color: "var(--success)", marginTop: "8px" }}>
                  Javob: <strong>{submission.correctAnswer}</strong>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  {submission.category ? `${submission.category} · ` : ""}
                  {submission.difficulty ?? "—"} · ID {submission.submittedBy || "Mehmon"}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: "11px",
                      borderRadius: "12px",
                      border: "none",
                      background: "var(--success)",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      opacity: isProcessing ? 0.6 : 1
                    }}
                    type="button"
                    onClick={() => void handleReview(submission.id, "approve")}
                  >
                    Tasdiqlash
                  </button>
                  <button
                    disabled={isProcessing}
                    style={{
                      flex: 1,
                      padding: "11px",
                      borderRadius: "12px",
                      border: "none",
                      background: "var(--error)",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      opacity: isProcessing ? 0.6 : 1
                    }}
                    type="button"
                    onClick={() => void handleReview(submission.id, "reject")}
                  >
                    Rad etish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
