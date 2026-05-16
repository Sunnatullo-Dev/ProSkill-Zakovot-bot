import { useCallback, useEffect, useState } from "react";
import {
  deleteQuestion,
  getPendingSubmissions,
  getReportedQuestions,
  reviewSubmission
} from "../api/client";
import type { ReportedQuestion, Submission } from "../types";

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "var(--text)",
  outline: "none"
};

const actionButton = (background: string, disabled: boolean) => ({
  flex: 1,
  padding: "11px",
  borderRadius: "12px",
  border: "none",
  background,
  color: "white",
  fontSize: "14px",
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1
});

export default function AdminScreen() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reported, setReported] = useState<ReportedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    const [pending, reportedQuestions] = await Promise.all([
      getPendingSubmissions(),
      getReportedQuestions()
    ]);
    setSubmissions(pending);
    setReported(reportedQuestions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing(submission: Submission) {
    setEditingId(submission.id);
    setEditText(submission.text);
    setEditAnswer(submission.correctAnswer);
  }

  async function handleReview(submission: Submission, decision: "approve" | "reject") {
    setProcessingId(submission.id);
    const isEditing = editingId === submission.id;
    const edits =
      decision === "approve" && isEditing
        ? { text: editText.trim(), correctAnswer: editAnswer.trim() }
        : undefined;
    const ok = await reviewSubmission(submission.id, decision, edits);

    if (ok) {
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setEditingId(null);
    }

    setProcessingId(null);
  }

  async function handleDelete(questionId: string) {
    setProcessingId(questionId);
    const ok = await deleteQuestion(questionId);

    if (ok) {
      setReported((current) => current.filter((item) => item.id !== questionId));
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
          marginBottom: "20px"
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

      <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
        Kutilayotgan savollar ({submissions.length})
      </h2>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : submissions.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
          Kutilayotgan savol yo'q.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {submissions.map((submission) => {
            const isProcessing = processingId === submission.id;
            const isEditing = editingId === submission.id;

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
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea
                      rows={2}
                      style={{ ...fieldStyle, resize: "vertical" }}
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                    />
                    <input
                      style={fieldStyle}
                      type="text"
                      value={editAnswer}
                      onChange={(event) => setEditAnswer(event.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", lineHeight: 1.5 }}
                    >
                      {submission.text}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--success)", marginTop: "8px" }}>
                      Javob: <strong>{submission.correctAnswer}</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                      {submission.category ? `${submission.category} · ` : ""}
                      {submission.difficulty ?? "—"} · ID {submission.submittedBy || "Mehmon"}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button
                    disabled={isProcessing}
                    style={actionButton("var(--success)", isProcessing)}
                    type="button"
                    onClick={() => void handleReview(submission, "approve")}
                  >
                    {isEditing ? "Saqlab tasdiqlash" : "Tasdiqlash"}
                  </button>
                  <button
                    disabled={isProcessing}
                    style={actionButton("var(--error)", isProcessing)}
                    type="button"
                    onClick={() => void handleReview(submission, "reject")}
                  >
                    Rad etish
                  </button>
                </div>

                <button
                  disabled={isProcessing}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "9px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                  type="button"
                  onClick={() => (isEditing ? setEditingId(null) : startEditing(submission))}
                >
                  {isEditing ? "Tahrirlashni bekor qilish" : "Tahrirlash"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "var(--text)",
          margin: "28px 0 12px"
        }}
      >
        Shikoyat qilingan savollar ({reported.length})
      </h2>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : reported.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Shikoyat yo'q.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {reported.map((question) => {
            const isProcessing = processingId === question.id;

            return (
              <div
                key={question.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "16px",
                  padding: "16px"
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", lineHeight: 1.5 }}>
                  {question.text}
                </div>
                <div style={{ fontSize: "13px", color: "var(--success)", marginTop: "8px" }}>
                  Javob: <strong>{question.correctAnswer}</strong>
                </div>
                <div style={{ fontSize: "11px", color: "var(--error)", marginTop: "6px" }}>
                  {question.reportCount} marta shikoyat qilingan
                </div>

                <button
                  disabled={isProcessing}
                  style={{ ...actionButton("var(--error)", isProcessing), marginTop: "12px", width: "100%" }}
                  type="button"
                  onClick={() => void handleDelete(question.id)}
                >
                  Savolni o'chirish
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
