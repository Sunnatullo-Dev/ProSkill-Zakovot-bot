import { useCallback, useEffect, useState } from "react";
import {
  createAdminQuestion,
  deleteAdminQuestion,
  getAdminCategories,
  getAdminQuestions,
  getAdminStats,
  getPendingSubmissions,
  getReportedQuestions,
  renameAdminCategory,
  reviewSubmission,
  updateAdminQuestion
} from "../api/client";
import type {
  AdminCategoryStat,
  AdminQuestion,
  AdminQuestionsResponse,
  AdminStats
} from "../api/client";
import type { Difficulty, ReportedQuestion, Submission } from "../types";
import ConfirmDialog from "./ConfirmDialog";

type AdminPanelProps = {
  onExitToUser: () => void;
};

type Section = "dashboard" | "questions" | "submissions" | "reports" | "categories";

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "\u{1F4CA}" },
  { id: "questions", label: "Savollar", icon: "\u{2753}" },
  { id: "submissions", label: "Takliflar", icon: "\u{1F4E5}" },
  { id: "reports", label: "Shikoyatlar", icon: "\u{1F6A8}" },
  { id: "categories", label: "Kategoriyalar", icon: "\u{1F3F7}️" }
];

const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Oson" },
  { value: "medium", label: "O'rta" },
  { value: "hard", label: "Qiyin" }
];

const inputStyle = {
  width: "100%",
  padding: "11px 13px",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "var(--text)",
  outline: "none",
  fontFamily: "inherit"
} as const;

const labelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  marginBottom: "6px"
};

const primaryButton = (disabled: boolean) => ({
  width: "100%",
  padding: "14px",
  background: disabled ? "var(--border)" : "linear-gradient(135deg, #4DA6FF, #7C3AED)",
  border: "none",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 800,
  color: "white",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1
});

const ghostButton = {
  padding: "9px 12px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--accent)",
  cursor: "pointer"
} as const;

const dangerButton = (disabled: boolean) => ({
  padding: "10px 12px",
  background: disabled ? "var(--border)" : "var(--error)",
  border: "none",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700,
  color: "white",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1
});

export default function AdminPanel({ onExitToUser }: AdminPanelProps) {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 16px 0",
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          zIndex: 10
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>{"\u{1F6E1}️"}</span>
            <h1 style={{ fontSize: "18px", fontWeight: 900, color: "var(--text)", margin: 0 }}>
              Admin panel
            </h1>
          </div>
          <button
            style={{
              padding: "8px 12px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--accent)",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
            type="button"
            onClick={onExitToUser}
          >
            {"← Foydalanuvchi"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "10px",
            margin: "0 -16px",
            padding: "0 16px 10px",
            scrollbarWidth: "none"
          }}
        >
          {SECTIONS.map((item) => {
            const active = section === item.id;

            return (
              <button
                key={item.id}
                style={{
                  flex: "0 0 auto",
                  padding: "9px 14px",
                  background: active
                    ? "linear-gradient(135deg, rgba(77,166,255,0.22), rgba(124,58,237,0.22))"
                    : "var(--card)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: active ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap"
                }}
                type="button"
                onClick={() => setSection(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          padding: "16px 16px 32px"
        }}
      >
        {section === "dashboard" ? <DashboardSection /> : null}
        {section === "questions" ? <QuestionsSection /> : null}
        {section === "submissions" ? <SubmissionsSection /> : null}
        {section === "reports" ? <ReportsSection /> : null}
        {section === "categories" ? <CategoriesSection /> : null}
      </div>
    </div>
  );
}

// ----- Dashboard -----

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "14px"
      }}
    >
      <div style={{ fontSize: "26px", fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--muted)",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          marginTop: "6px"
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await getAdminStats();
    setStats(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return <p style={{ color: "var(--muted)", fontSize: "13px" }}>Yuklanmoqda...</p>;
  }

  if (!stats) {
    return <p style={{ color: "var(--muted)", fontSize: "13px" }}>Ma'lumot yo'q</p>;
  }

  const topCategories = stats.categories.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <StatCard label="Foydalanuvchilar" value={stats.users} accent="var(--accent)" />
        <StatCard label="Savollar" value={stats.questions} accent="var(--success)" />
        <StatCard label="O'yinlar" value={stats.games} accent="var(--gold)" />
        <StatCard label="Bellashuvlar" value={stats.battles} accent="#A78BFA" />
        <StatCard label="Jamoalar" value={stats.teams} accent="var(--accent)" />
        <StatCard
          label="Kutilayotgan takliflar"
          value={stats.submissions.pending}
          accent="var(--warning)"
        />
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "14px"
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: "10px"
          }}
        >
          Takliflar holati
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--warning)" }}>
              {stats.submissions.pending}
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
              Kutilmoqda
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--success)" }}>
              {stats.submissions.approved}
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
              Tasdiqlangan
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--error)" }}>
              {stats.submissions.rejected}
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
              Rad etilgan
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "14px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px"
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
            Eng ko'p savol bo'lgan kategoriyalar
          </span>
          <button style={ghostButton} type="button" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
        {topCategories.length === 0 ? (
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>Kategoriyalar topilmadi</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topCategories.map((row) => (
              <div
                key={row.category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text)" }}>{row.category}</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Questions -----

type EditFields = {
  text: string;
  correctAnswer: string;
  category: string;
  difficulty: "" | Difficulty;
};

function emptyFields(): EditFields {
  return { text: "", correctAnswer: "", category: "", difficulty: "" };
}

function fromQuestion(question: AdminQuestion): EditFields {
  return {
    text: question.text,
    correctAnswer: question.correctAnswer,
    category: question.category ?? "",
    difficulty: (question.difficulty as Difficulty | null) ?? ""
  };
}

function QuestionsSection() {
  const [data, setData] = useState<AdminQuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"" | Difficulty>("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFields, setCreateFields] = useState<EditFields>(emptyFields());
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditFields>(emptyFields());
  const [editError, setEditError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminCategoryStat[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await getAdminQuestions({
      search: search.trim() || undefined,
      category: categoryFilter || undefined,
      difficulty: difficultyFilter || undefined,
      page,
      limit: 20
    });
    setData(next);
    setLoading(false);
  }, [search, categoryFilter, difficultyFilter, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    void getAdminCategories().then((items) => {
      if (active) {
        setCategories(items);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function startEdit(question: AdminQuestion) {
    setEditingId(question.id);
    setEditFields(fromQuestion(question));
    setEditError("");
  }

  async function handleCreate() {
    setCreateError("");

    if (!createFields.text.trim() || !createFields.correctAnswer.trim()) {
      setCreateError("Savol va javob to'ldirilishi shart");
      return;
    }

    setCreating(true);
    const result = await createAdminQuestion({
      text: createFields.text.trim(),
      correctAnswer: createFields.correctAnswer.trim(),
      category: createFields.category.trim() || null,
      difficulty: createFields.difficulty || null
    });
    setCreating(false);

    if (!result.ok) {
      setCreateError(result.error);
      return;
    }

    setCreateFields(emptyFields());
    setCreateOpen(false);
    setPage(1);
    await refresh();
  }

  async function handleSaveEdit(id: string) {
    setEditError("");

    if (!editFields.text.trim() || !editFields.correctAnswer.trim()) {
      setEditError("Savol va javob to'ldirilishi shart");
      return;
    }

    setBusyId(id);
    const result = await updateAdminQuestion(id, {
      text: editFields.text.trim(),
      correctAnswer: editFields.correctAnswer.trim(),
      category: editFields.category.trim() || null,
      difficulty: editFields.difficulty || null
    });
    setBusyId(null);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditingId(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteAdminQuestion(id);
    setBusyId(null);
    setConfirmDeleteId(null);

    if (result.ok) {
      await refresh();
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <button
        style={primaryButton(false)}
        type="button"
        onClick={() => {
          setCreateFields(emptyFields());
          setCreateError("");
          setCreateOpen((value) => !value);
        }}
      >
        {createOpen ? "Yopish" : "+ Yangi savol qo'shish"}
      </button>

      {createOpen ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <div>
            <div style={labelStyle}>Savol matni</div>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={createFields.text}
              onChange={(event) =>
                setCreateFields((value) => ({ ...value, text: event.target.value }))
              }
            />
          </div>
          <div>
            <div style={labelStyle}>To'g'ri javob</div>
            <input
              style={inputStyle}
              type="text"
              value={createFields.correctAnswer}
              onChange={(event) =>
                setCreateFields((value) => ({ ...value, correctAnswer: event.target.value }))
              }
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <div style={labelStyle}>Kategoriya</div>
              <input
                list="admin-category-options"
                placeholder="Masalan: Tarix"
                style={inputStyle}
                type="text"
                value={createFields.category}
                onChange={(event) =>
                  setCreateFields((value) => ({ ...value, category: event.target.value }))
                }
              />
            </div>
            <div>
              <div style={labelStyle}>Qiyinligi</div>
              <select
                style={inputStyle}
                value={createFields.difficulty}
                onChange={(event) =>
                  setCreateFields((value) => ({
                    ...value,
                    difficulty: event.target.value as "" | Difficulty
                  }))
                }
              >
                <option value="">—</option>
                {DIFFICULTIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {createError ? (
            <div style={{ fontSize: "12px", color: "var(--error)" }}>{createError}</div>
          ) : null}
          <button
            disabled={creating}
            style={primaryButton(creating)}
            type="button"
            onClick={() => void handleCreate()}
          >
            {creating ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      ) : null}

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        <input
          placeholder="Qidirish (savol matni bo'yicha)..."
          style={inputStyle}
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <select
            style={inputStyle}
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Barcha kategoriyalar</option>
            {categories.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.count})
              </option>
            ))}
          </select>
          <select
            style={inputStyle}
            value={difficultyFilter}
            onChange={(event) => {
              setDifficultyFilter(event.target.value as "" | Difficulty);
              setPage(1);
            }}
          >
            <option value="">Barcha darajalar</option>
            {DIFFICULTIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <datalist id="admin-category-options">
        {categories.map((cat) => (
          <option key={cat.category} value={cat.category} />
        ))}
      </datalist>

      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
        {loading ? "Yuklanmoqda..." : `Topildi: ${total}`}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((question) => {
          const isEditing = editingId === question.id;
          const busy = busyId === question.id;

          if (isEditing) {
            return (
              <div
                key={question.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--accent)",
                  borderRadius: "14px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div>
                  <div style={labelStyle}>Savol matni</div>
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                    value={editFields.text}
                    onChange={(event) =>
                      setEditFields((value) => ({ ...value, text: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <div style={labelStyle}>To'g'ri javob</div>
                  <input
                    style={inputStyle}
                    type="text"
                    value={editFields.correctAnswer}
                    onChange={(event) =>
                      setEditFields((value) => ({ ...value, correctAnswer: event.target.value }))
                    }
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={labelStyle}>Kategoriya</div>
                    <input
                      list="admin-category-options"
                      style={inputStyle}
                      type="text"
                      value={editFields.category}
                      onChange={(event) =>
                        setEditFields((value) => ({ ...value, category: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Qiyinligi</div>
                    <select
                      style={inputStyle}
                      value={editFields.difficulty}
                      onChange={(event) =>
                        setEditFields((value) => ({
                          ...value,
                          difficulty: event.target.value as "" | Difficulty
                        }))
                      }
                    >
                      <option value="">—</option>
                      {DIFFICULTIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {editError ? (
                  <div style={{ fontSize: "12px", color: "var(--error)" }}>{editError}</div>
                ) : null}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    disabled={busy}
                    style={primaryButton(busy)}
                    type="button"
                    onClick={() => void handleSaveEdit(question.id)}
                  >
                    {busy ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                  <button
                    style={ghostButton}
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditError("");
                    }}
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={question.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "14px"
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.5
                }}
              >
                {question.text}
              </div>
              <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "6px" }}>
                Javob: <strong>{question.correctAnswer}</strong>
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>
                {question.category ?? "Kategoriyasiz"} · {question.difficulty ?? "—"}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button style={ghostButton} type="button" onClick={() => startEdit(question)}>
                  Tahrirlash
                </button>
                <button
                  disabled={busy}
                  style={dangerButton(busy)}
                  type="button"
                  onClick={() => setConfirmDeleteId(question.id)}
                >
                  O'chirish
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px"
          }}
        >
          <button
            disabled={page <= 1}
            style={{ ...ghostButton, opacity: page <= 1 ? 0.4 : 1 }}
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            ‹ Oldingi
          </button>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            style={{ ...ghostButton, opacity: page >= totalPages ? 0.4 : 1 }}
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Keyingi ›
          </button>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <ConfirmDialog
          cancelLabel="Bekor qilish"
          confirmLabel="O'chirish"
          message="Bu savolni o'chirish — ortga qaytarib bo'lmaydi."
          title="Savolni o'chirasizmi?"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => void handleDelete(confirmDeleteId)}
        />
      ) : null}
    </div>
  );
}

// ----- Submissions -----

function SubmissionsSection() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const next = await getPendingSubmissions();
    setItems(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing(submission: Submission) {
    setEditingId(submission.id);
    setEditText(submission.text);
    setEditAnswer(submission.correctAnswer);
  }

  async function review(submission: Submission, decision: "approve" | "reject") {
    setBusyId(submission.id);
    const isEditing = editingId === submission.id;
    const edits =
      decision === "approve" && isEditing
        ? { text: editText.trim(), correctAnswer: editAnswer.trim() }
        : undefined;
    const ok = await reviewSubmission(submission.id, decision, edits);
    setBusyId(null);

    if (ok) {
      setItems((current) => current.filter((item) => item.id !== submission.id));
      setEditingId(null);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
          Kutilayotgan takliflar ({items.length})
        </span>
        <button style={ghostButton} type="button" onClick={() => void load()}>
          Yangilash
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Kutilayotgan taklif yo'q.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((submission) => {
            const busy = busyId === submission.id;
            const isEditing = editingId === submission.id;

            return (
              <div
                key={submission.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "14px"
                }}
              >
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                    />
                    <input
                      style={inputStyle}
                      type="text"
                      value={editAnswer}
                      onChange={(event) => setEditAnswer(event.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--text)",
                        lineHeight: 1.5
                      }}
                    >
                      {submission.text}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "6px" }}>
                      Javob: <strong>{submission.correctAnswer}</strong>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>
                      {submission.category ? `${submission.category} · ` : ""}
                      {submission.difficulty ?? "—"} · ID {submission.submittedBy || "Mehmon"}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: busy ? "var(--border)" : "var(--success)",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "white",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.6 : 1
                    }}
                    type="button"
                    onClick={() => void review(submission, "approve")}
                  >
                    {isEditing ? "Saqlab tasdiqlash" : "Tasdiqlash"}
                  </button>
                  <button
                    disabled={busy}
                    style={dangerButton(busy)}
                    type="button"
                    onClick={() => void review(submission, "reject")}
                  >
                    Rad etish
                  </button>
                </div>

                <button
                  disabled={busy}
                  style={{ ...ghostButton, width: "100%", marginTop: "8px" }}
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
    </div>
  );
}

// ----- Reports -----

function ReportsSection() {
  const [items, setItems] = useState<ReportedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await getReportedQuestions();
    setItems(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteAdminQuestion(id);
    setBusyId(null);
    setConfirmId(null);

    if (result.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
          Shikoyat qilingan savollar ({items.length})
        </span>
        <button style={ghostButton} type="button" onClick={() => void load()}>
          Yangilash
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Shikoyat yo'q.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((question) => {
            const busy = busyId === question.id;

            return (
              <div
                key={question.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "14px",
                  padding: "14px"
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text)",
                    lineHeight: 1.5
                  }}
                >
                  {question.text}
                </div>
                <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "6px" }}>
                  Javob: <strong>{question.correctAnswer}</strong>
                </div>
                <div style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>
                  {question.reportCount} marta shikoyat qilingan
                </div>
                <button
                  disabled={busy}
                  style={{ ...dangerButton(busy), width: "100%", marginTop: "12px" }}
                  type="button"
                  onClick={() => setConfirmId(question.id)}
                >
                  Savolni o'chirish
                </button>
              </div>
            );
          })}
        </div>
      )}

      {confirmId ? (
        <ConfirmDialog
          cancelLabel="Bekor qilish"
          confirmLabel="O'chirish"
          message="Bu savol bazadan butunlay o'chiriladi."
          title="Savolni o'chirasizmi?"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => void handleDelete(confirmId)}
        />
      ) : null}
    </div>
  );
}

// ----- Categories -----

function CategoriesSection() {
  const [items, setItems] = useState<AdminCategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameOldName, setRenameOldName] = useState<string | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await getAdminCategories();
    setItems(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRename() {
    setRenameError("");

    if (!renameOldName) {
      return;
    }

    const trimmed = renameNewName.trim();

    if (!trimmed) {
      setRenameError("Yangi nom kiritilishi shart");
      return;
    }

    if (trimmed === renameOldName) {
      setRenameError("Yangi nom eskisidan farq qilishi kerak");
      return;
    }

    setBusy(true);
    const result = await renameAdminCategory(renameOldName, trimmed);
    setBusy(false);

    if (!result.ok) {
      setRenameError(result.error);
      return;
    }

    setRenameOldName(null);
    setRenameNewName("");
    await load();
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
          Kategoriyalar ({items.length})
        </span>
        <button style={ghostButton} type="button" onClick={() => void load()}>
          Yangilash
        </button>
      </div>

      <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "10px" }}>
        Yangi kategoriya yaratish uchun "Savollar" bo'limidan yangi savol qo'shing va
        kerakli kategoriyani kiriting — kategoriya avtomatik paydo bo'ladi.
      </p>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Kategoriyalar topilmadi</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((row) => (
            <div
              key={row.category}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                  {row.category}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  {row.count} ta savol
                </div>
              </div>
              <button
                style={ghostButton}
                type="button"
                onClick={() => {
                  setRenameOldName(row.category);
                  setRenameNewName(row.category);
                  setRenameError("");
                }}
              >
                Nomini o'zgartirish
              </button>
            </div>
          ))}
        </div>
      )}

      {renameOldName ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "18px"
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: "10px"
              }}
            >
              Kategoriyani qayta nomlash
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
              Eski nom: <strong>{renameOldName}</strong>
            </div>
            <input
              autoFocus
              placeholder="Yangi nom"
              style={inputStyle}
              type="text"
              value={renameNewName}
              onChange={(event) => setRenameNewName(event.target.value)}
            />
            {renameError ? (
              <div style={{ fontSize: "12px", color: "var(--error)", marginTop: "8px" }}>
                {renameError}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button
                disabled={busy}
                style={primaryButton(busy)}
                type="button"
                onClick={() => void handleRename()}
              >
                {busy ? "Saqlanmoqda..." : "Saqlash"}
              </button>
              <button
                disabled={busy}
                style={ghostButton}
                type="button"
                onClick={() => {
                  setRenameOldName(null);
                  setRenameError("");
                }}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
