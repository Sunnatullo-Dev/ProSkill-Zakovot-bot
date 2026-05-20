import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ComponentType, ReactNode } from "react";
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
import {
  AlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ControllerIcon,
  DashboardIcon,
  EditIcon,
  type IconProps,
  InboxIcon,
  QuestionIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  SwordsIcon,
  TagIcon,
  TeamIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon
} from "./icons";

type AdminPanelProps = {
  onExitToUser: () => void;
};

type Section = "dashboard" | "questions" | "submissions" | "reports" | "categories";

type SectionMeta = {
  id: Section;
  label: string;
  Icon: ComponentType<IconProps>;
  accent: string;
  subtitle: string;
};

const SECTIONS: SectionMeta[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    Icon: DashboardIcon,
    accent: "#4DA6FF",
    subtitle: "Tizim ko'rsatkichlari va umumiy ma'lumot"
  },
  {
    id: "questions",
    label: "Savollar",
    Icon: QuestionIcon,
    accent: "#22C55E",
    subtitle: "Savollarni qo'shish, tahrirlash, o'chirish"
  },
  {
    id: "submissions",
    label: "Takliflar",
    Icon: InboxIcon,
    accent: "#F59E0B",
    subtitle: "Foydalanuvchilar yuborgan savollarni ko'rib chiqish"
  },
  {
    id: "reports",
    label: "Shikoyatlar",
    Icon: AlertIcon,
    accent: "#EF4444",
    subtitle: "Shikoyat tushgan savollarni moderatsiya qilish"
  },
  {
    id: "categories",
    label: "Kategoriyalar",
    Icon: TagIcon,
    accent: "#A78BFA",
    subtitle: "Kategoriyalarni ko'rish va qayta nomlash"
  }
];

const DIFFICULTIES: Array<{ value: Difficulty; label: string; color: string }> = [
  { value: "easy", label: "Oson", color: "#22C55E" },
  { value: "medium", label: "O'rta", color: "#F59E0B" },
  { value: "hard", label: "Qiyin", color: "#EF4444" }
];

const CATEGORY_PALETTE = ["#4DA6FF", "#A78BFA", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#F5C842"];

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: "12px",
  fontSize: "14px",
  color: "var(--text)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s"
};

const labelStyle: CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  marginBottom: "6px"
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "var(--text)",
  marginBottom: "12px",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

function primaryButton(disabled: boolean, accent = "#4DA6FF"): CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    background: disabled ? "var(--border)" : `linear-gradient(135deg, ${accent}, #7C3AED)`,
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "transform 0.1s, box-shadow 0.15s",
    boxShadow: disabled ? "none" : "0 6px 18px rgba(77,166,255,0.25)"
  };
}

const ghostButton: CSSProperties = {
  padding: "9px 12px",
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--accent)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "background 0.15s"
};

function iconButton(color: string): CSSProperties {
  return {
    width: "36px",
    height: "36px",
    background: `${color}15`,
    border: `1px solid ${color}30`,
    borderRadius: "10px",
    color,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.15s, transform 0.1s"
  };
}

function chipBadge(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    background: `${color}18`,
    color,
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase"
  };
}

function colorForCategory(name: string): string {
  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

export default function AdminPanel({ onExitToUser }: AdminPanelProps) {
  const [section, setSection] = useState<Section>("dashboard");
  const currentMeta = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];

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
          background: "linear-gradient(180deg, var(--bg) 88%, transparent)",
          padding: "16px 18px 0",
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          zIndex: 10,
          backdropFilter: "blur(6px)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 6px 14px rgba(124,58,237,0.35)"
              }}
            >
              <ShieldIcon size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "17px",
                  fontWeight: 900,
                  color: "var(--text)",
                  margin: 0,
                  lineHeight: 1.1
                }}
              >
                Boshqaruv paneli
              </h1>
              <div
                style={{
                  fontSize: "11px",
                  color: currentMeta.accent,
                  marginTop: "2px",
                  fontWeight: 700
                }}
              >
                {currentMeta.label}
              </div>
            </div>
          </div>
          <button
            style={{
              padding: "9px 13px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            type="button"
            onClick={onExitToUser}
          >
            <ChevronLeftIcon size={14} />
            Foydalanuvchi
          </button>
        </div>

        <nav
          style={{
            display: "flex",
            gap: "4px",
            overflowX: "auto",
            margin: "0 -18px",
            padding: "0 18px",
            borderBottom: "1px solid var(--border)",
            scrollbarWidth: "none"
          }}
        >
          {SECTIONS.map((item) => {
            const active = section === item.id;
            const Icon = item.Icon;

            return (
              <button
                key={item.id}
                style={{
                  flex: "0 0 auto",
                  padding: "10px 12px 12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? item.accent : "transparent"}`,
                  marginBottom: "-1px",
                  color: active ? item.accent : "var(--muted)",
                  fontSize: "13px",
                  fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, border-color 0.15s"
                }}
                type="button"
                onClick={() => setSection(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div
        style={{
          flex: 1,
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          padding: "18px 18px 40px"
        }}
      >
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--muted)",
            marginBottom: "18px",
            lineHeight: 1.5
          }}
        >
          {currentMeta.subtitle}
        </div>

        <div className="animate-fadeInUp" key={section}>
          {section === "dashboard" ? <DashboardSection /> : null}
          {section === "questions" ? <QuestionsSection /> : null}
          {section === "submissions" ? <SubmissionsSection /> : null}
          {section === "reports" ? <ReportsSection /> : null}
          {section === "categories" ? <CategoriesSection /> : null}
        </div>
      </div>
    </div>
  );
}

// ----- Reusable components -----

function MetricCard({
  label,
  value,
  Icon,
  accent,
  hint
}: {
  label: string;
  value: string | number;
  Icon: ComponentType<IconProps>;
  accent: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${accent}10`,
          filter: "blur(8px)"
        }}
      />
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: `${accent}18`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 900,
            color: "var(--text)",
            lineHeight: 1
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            marginTop: "6px"
          }}
        >
          {label}
        </div>
        {hint ? (
          <div style={{ fontSize: "10.5px", color: accent, marginTop: "4px", fontWeight: 600 }}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Card({ children, accent, padding = "16px" }: { children: ReactNode; accent?: string; padding?: string }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${accent ? `${accent}40` : "var(--border)"}`,
        borderRadius: "16px",
        padding
      }}
    >
      {children}
    </div>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button style={ghostButton} type="button" onClick={onClick}>
      <RefreshIcon size={14} /> Yangilash
    </button>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px dashed var(--border)",
        borderRadius: "14px",
        padding: "30px 14px",
        textAlign: "center",
        color: "var(--muted)"
      }}
    >
      <div style={{ marginBottom: "10px", opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: "13px" }}>{text}</div>
    </div>
  );
}

// ----- Dashboard -----

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
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[1, 2, 3].map((id) => (
          <div
            key={id}
            style={{
              height: "100px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              opacity: 0.5
            }}
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={<DashboardIcon size={36} />}
        text="Ma'lumotlarni olib bo'lmadi"
      />
    );
  }

  const totalSubmissions = stats.submissions.pending + stats.submissions.approved + stats.submissions.rejected;
  const topCategories = stats.categories.slice(0, 6);
  const maxCount = topCategories[0]?.count ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Hero card */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(77,166,255,0.16), rgba(124,58,237,0.18))",
          border: "1px solid rgba(77,166,255,0.35)",
          borderRadius: "18px",
          padding: "18px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.3), transparent 70%)"
          }}
        />
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontWeight: 700
          }}
        >
          Bugungi holat
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "8px" }}>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 900,
              color: "var(--text)",
              lineHeight: 1,
              background: "linear-gradient(135deg, #4DA6FF, #A78BFA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {stats.users}
          </span>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>foydalanuvchi</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "12px",
            fontSize: "12px",
            color: "var(--text)"
          }}
        >
          <span>
            <strong style={{ color: "#22C55E" }}>{stats.questions}</strong>
            <span style={{ color: "var(--muted)", marginLeft: "4px" }}>savol</span>
          </span>
          <span>
            <strong style={{ color: "#F5C842" }}>{stats.games}</strong>
            <span style={{ color: "var(--muted)", marginLeft: "4px" }}>o'yin</span>
          </span>
          <span>
            <strong style={{ color: "#A78BFA" }}>{stats.battles}</strong>
            <span style={{ color: "var(--muted)", marginLeft: "4px" }}>bellashuv</span>
          </span>
        </div>
      </div>

      {/* Metric grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <MetricCard
          Icon={UserIcon}
          accent="#4DA6FF"
          label="Foydalanuvchilar"
          value={stats.users}
        />
        <MetricCard
          Icon={QuestionIcon}
          accent="#22C55E"
          label="Savollar"
          value={stats.questions}
        />
        <MetricCard
          Icon={ControllerIcon}
          accent="#F5C842"
          label="O'yinlar"
          value={stats.games}
        />
        <MetricCard
          Icon={SwordsIcon}
          accent="#A78BFA"
          label="Bellashuvlar"
          value={stats.battles}
        />
        <MetricCard Icon={TeamIcon} accent="#06B6D4" label="Jamoalar" value={stats.teams} />
        <MetricCard
          Icon={InboxIcon}
          accent="#F59E0B"
          label="Kutilayotgan"
          value={stats.submissions.pending}
          hint={stats.submissions.pending > 0 ? "Ko'rib chiqing" : undefined}
        />
      </div>

      {/* Submissions breakdown */}
      <Card>
        <div style={sectionHeaderStyle}>
          <InboxIcon size={16} />
          Takliflar holati
        </div>

        {totalSubmissions === 0 ? (
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>Hozircha taklif yo'q</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                height: "10px",
                borderRadius: "999px",
                overflow: "hidden",
                background: "var(--border)",
                marginBottom: "14px"
              }}
            >
              {stats.submissions.approved > 0 ? (
                <div
                  style={{
                    width: `${(stats.submissions.approved / totalSubmissions) * 100}%`,
                    background: "linear-gradient(90deg, #22C55E, #4ADE80)"
                  }}
                />
              ) : null}
              {stats.submissions.pending > 0 ? (
                <div
                  style={{
                    width: `${(stats.submissions.pending / totalSubmissions) * 100}%`,
                    background: "linear-gradient(90deg, #F59E0B, #FBBF24)"
                  }}
                />
              ) : null}
              {stats.submissions.rejected > 0 ? (
                <div
                  style={{
                    width: `${(stats.submissions.rejected / totalSubmissions) * 100}%`,
                    background: "linear-gradient(90deg, #EF4444, #F87171)"
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px"
              }}
            >
              <SubmissionStat color="#22C55E" label="Tasdiqlangan" value={stats.submissions.approved} />
              <SubmissionStat color="#F59E0B" label="Kutilmoqda" value={stats.submissions.pending} />
              <SubmissionStat color="#EF4444" label="Rad etilgan" value={stats.submissions.rejected} />
            </div>
          </>
        )}
      </Card>

      {/* Category bar chart */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px"
          }}
        >
          <div style={sectionHeaderStyle}>
            <TagIcon size={16} />
            Eng katta kategoriyalar
          </div>
          <RefreshButton onClick={() => void load()} />
        </div>

        {topCategories.length === 0 ? (
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>Kategoriyalar topilmadi</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topCategories.map((row) => {
              const color = colorForCategory(row.category);
              const ratio = Math.max(0.04, row.count / maxCount);

              return (
                <div key={row.category}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                      fontSize: "12px"
                    }}
                  >
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>{row.category}</span>
                    <span style={{ color, fontWeight: 800 }}>{row.count}</span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "var(--border)",
                      borderRadius: "999px",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${ratio * 100}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${color}, ${color}99)`,
                        borderRadius: "999px",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SubmissionStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "10px 8px",
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: "12px"
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--muted)",
          marginTop: "4px",
          fontWeight: 700,
          letterSpacing: "0.5px"
        }}
      >
        {label}
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

function DifficultyBadge({ value }: { value: string | null }) {
  const meta = DIFFICULTIES.find((item) => item.value === value);

  if (!meta) {
    return <span style={chipBadge("#5A7A9F")}>—</span>;
  }

  return <span style={chipBadge(meta.color)}>{meta.label}</span>;
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

  const renderField = (
    label: string,
    children: ReactNode
  ) => (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Add question CTA */}
      <button
        style={primaryButton(false, "#22C55E")}
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
        <Card accent="#22C55E">
          <div style={{ ...sectionHeaderStyle, marginBottom: "14px" }}>
            <QuestionIcon size={16} />
            Yangi savol
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {renderField(
              "Savol matni",
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={createFields.text}
                onChange={(event) =>
                  setCreateFields((value) => ({ ...value, text: event.target.value }))
                }
              />
            )}
            {renderField(
              "To'g'ri javob",
              <input
                style={inputStyle}
                type="text"
                value={createFields.correctAnswer}
                onChange={(event) =>
                  setCreateFields((value) => ({ ...value, correctAnswer: event.target.value }))
                }
              />
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {renderField(
                "Kategoriya",
                <input
                  list="admin-category-options"
                  placeholder="Tarix"
                  style={inputStyle}
                  type="text"
                  value={createFields.category}
                  onChange={(event) =>
                    setCreateFields((value) => ({ ...value, category: event.target.value }))
                  }
                />
              )}
              {renderField(
                "Qiyinligi",
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
              )}
            </div>
            {createError ? (
              <div style={{ fontSize: "12px", color: "var(--error)" }}>{createError}</div>
            ) : null}
            <button
              disabled={creating}
              style={primaryButton(creating, "#22C55E")}
              type="button"
              onClick={() => void handleCreate()}
            >
              {creating ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </Card>
      ) : null}

      {/* Search + filters */}
      <Card padding="12px">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            padding: "0 12px",
            marginBottom: "10px"
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            <SearchIcon size={16} />
          </span>
          <input
            placeholder="Savol matni bo'yicha qidirish..."
            style={{
              ...inputStyle,
              background: "transparent",
              border: "none",
              padding: "12px 10px"
            }}
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
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
      </Card>

      <datalist id="admin-category-options">
        {categories.map((cat) => (
          <option key={cat.category} value={cat.category} />
        ))}
      </datalist>

      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span>{loading ? "Yuklanmoqda..." : `Topildi: ${total} ta savol`}</span>
        {data ? (
          <span style={{ fontWeight: 700 }}>
            {page} / {totalPages}
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.length === 0 && !loading ? (
          <EmptyState
            icon={<SearchIcon size={28} />}
            text="Bu shartlar bo'yicha savol topilmadi"
          />
        ) : null}

        {items.map((question) => {
          const isEditing = editingId === question.id;
          const busy = busyId === question.id;
          const categoryColor = question.category ? colorForCategory(question.category) : "#5A7A9F";

          if (isEditing) {
            return (
              <Card key={question.id} accent="#4DA6FF">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {renderField(
                    "Savol matni",
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                      value={editFields.text}
                      onChange={(event) =>
                        setEditFields((value) => ({ ...value, text: event.target.value }))
                      }
                    />
                  )}
                  {renderField(
                    "To'g'ri javob",
                    <input
                      style={inputStyle}
                      type="text"
                      value={editFields.correctAnswer}
                      onChange={(event) =>
                        setEditFields((value) => ({ ...value, correctAnswer: event.target.value }))
                      }
                    />
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {renderField(
                      "Kategoriya",
                      <input
                        list="admin-category-options"
                        style={inputStyle}
                        type="text"
                        value={editFields.category}
                        onChange={(event) =>
                          setEditFields((value) => ({ ...value, category: event.target.value }))
                        }
                      />
                    )}
                    {renderField(
                      "Qiyinligi",
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
                    )}
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
              </Card>
            );
          }

          return (
            <div
              key={question.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "14px"
              }}
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={chipBadge(categoryColor)}>{question.category ?? "Kategoriyasiz"}</span>
                <DifficultyBadge value={question.difficulty} />
              </div>
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
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--success)",
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <CheckCircleIcon size={13} />
                <strong>{question.correctAnswer}</strong>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  style={iconButton("#4DA6FF")}
                  title="Tahrirlash"
                  type="button"
                  onClick={() => startEdit(question)}
                >
                  <EditIcon size={15} />
                </button>
                <button
                  disabled={busy}
                  style={{ ...iconButton("#EF4444"), opacity: busy ? 0.5 : 1 }}
                  title="O'chirish"
                  type="button"
                  onClick={() => setConfirmDeleteId(question.id)}
                >
                  <TrashIcon size={15} />
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
            marginTop: "4px"
          }}
        >
          <button
            disabled={page <= 1}
            style={{ ...ghostButton, opacity: page <= 1 ? 0.4 : 1 }}
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeftIcon size={14} /> Oldingi
          </button>
          <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            style={{ ...ghostButton, opacity: page >= totalPages ? 0.4 : 1 }}
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Keyingi <ChevronRightIcon size={14} />
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
          marginBottom: "14px"
        }}
      >
        <div style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
          <InboxIcon size={16} />
          Kutilayotgan ({items.length})
        </div>
        <RefreshButton onClick={() => void load()} />
      </div>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={36} />}
          text="Kutilayotgan taklif yo'q. Hammasi ko'rib chiqilgan ✨"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((submission) => {
            const busy = busyId === submission.id;
            const isEditing = editingId === submission.id;
            const categoryColor = submission.category
              ? colorForCategory(submission.category)
              : "#5A7A9F";

            return (
              <div
                key={submission.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "14px"
                }}
              >
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <div style={labelStyle}>Savol matni</div>
                      <textarea
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                      />
                    </div>
                    <div>
                      <div style={labelStyle}>To'g'ri javob</div>
                      <input
                        style={inputStyle}
                        type="text"
                        value={editAnswer}
                        onChange={(event) => setEditAnswer(event.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                      {submission.category ? (
                        <span style={chipBadge(categoryColor)}>{submission.category}</span>
                      ) : null}
                      <DifficultyBadge value={submission.difficulty} />
                      <span style={chipBadge("#5A7A9F")}>
                        ID {submission.submittedBy || "Mehmon"}
                      </span>
                    </div>
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
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--success)",
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <CheckCircleIcon size={13} />
                      <strong>{submission.correctAnswer}</strong>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "11px",
                      background: busy ? "var(--border)" : "linear-gradient(135deg, #22C55E, #16A34A)",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "white",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: busy ? "none" : "0 4px 12px rgba(34,197,94,0.25)"
                    }}
                    type="button"
                    onClick={() => void review(submission, "approve")}
                  >
                    <CheckCircleIcon size={14} />
                    {isEditing ? "Saqlab tasdiqlash" : "Tasdiqlash"}
                  </button>
                  <button
                    disabled={busy}
                    style={{
                      flex: 1,
                      padding: "11px",
                      background: busy ? "var(--border)" : "linear-gradient(135deg, #EF4444, #DC2626)",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "white",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                    type="button"
                    onClick={() => void review(submission, "reject")}
                  >
                    <XCircleIcon size={14} />
                    Rad etish
                  </button>
                </div>

                <button
                  disabled={busy}
                  style={{ ...ghostButton, width: "100%", marginTop: "8px", justifyContent: "center" }}
                  type="button"
                  onClick={() => (isEditing ? setEditingId(null) : startEditing(submission))}
                >
                  <EditIcon size={14} />
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
          marginBottom: "14px"
        }}
      >
        <div style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
          <AlertIcon size={16} />
          Shikoyatlar ({items.length})
        </div>
        <RefreshButton onClick={() => void load()} />
      </div>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<AlertIcon size={36} />} text="Shikoyat yo'q — hammasi joyida 🛡" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((question) => {
            const busy = busyId === question.id;
            const categoryColor = question.category ? colorForCategory(question.category) : "#5A7A9F";

            return (
              <div
                key={question.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: "16px",
                  padding: "14px",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(239,68,68,0.06), transparent)",
                    pointerEvents: "none"
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                    position: "relative"
                  }}
                >
                  {question.category ? (
                    <span style={chipBadge(categoryColor)}>{question.category}</span>
                  ) : null}
                  <DifficultyBadge value={question.difficulty} />
                  <span style={chipBadge("#EF4444")}>{question.reportCount}× shikoyat</span>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text)",
                    lineHeight: 1.5,
                    position: "relative"
                  }}
                >
                  {question.text}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--success)",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    position: "relative"
                  }}
                >
                  <CheckCircleIcon size={13} />
                  <strong>{question.correctAnswer}</strong>
                </div>
                <button
                  disabled={busy}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: busy ? "var(--border)" : "linear-gradient(135deg, #EF4444, #DC2626)",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "white",
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.6 : 1,
                    marginTop: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    position: "relative"
                  }}
                  type="button"
                  onClick={() => setConfirmId(question.id)}
                >
                  <TrashIcon size={14} />
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

  const totalQuestions = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items]
  );

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
          marginBottom: "14px"
        }}
      >
        <div style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
          <TagIcon size={16} />
          Kategoriyalar ({items.length})
        </div>
        <RefreshButton onClick={() => void load()} />
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(124,58,237,0.08))",
          border: "1px solid rgba(167,139,250,0.3)",
          borderRadius: "14px",
          padding: "12px 14px",
          marginBottom: "14px",
          fontSize: "11.5px",
          color: "var(--text)",
          lineHeight: 1.5
        }}
      >
        <strong style={{ color: "#A78BFA" }}>Maslahat:</strong> yangi kategoriya yaratish uchun
        "Savollar" bo'limidan yangi savol qo'shing va kerakli kategoriyani kiriting — kategoriya
        avtomatik paydo bo'ladi.
      </div>

      {loading ? (
        <p style={{ fontSize: "12px", color: "var(--muted)" }}>Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<TagIcon size={36} />} text="Kategoriyalar topilmadi" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((row) => {
            const color = colorForCategory(row.category);
            const ratio = totalQuestions > 0 ? row.count / totalQuestions : 0;

            return (
              <div
                key={row.category}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: color,
                        flex: "0 0 auto"
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {row.category}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        {row.count} ta savol · {(ratio * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <button
                    style={iconButton("#A78BFA")}
                    title="Nomini o'zgartirish"
                    type="button"
                    onClick={() => {
                      setRenameOldName(row.category);
                      setRenameNewName(row.category);
                      setRenameError("");
                    }}
                  >
                    <EditIcon size={14} />
                  </button>
                </div>
                <div
                  style={{
                    height: "5px",
                    background: "var(--border)",
                    borderRadius: "999px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(2, ratio * 100)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${color}, ${color}99)`,
                      borderRadius: "999px",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renameOldName ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
            backdropFilter: "blur(4px)"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(167,139,250,0.18)",
                  color: "#A78BFA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <TagIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)" }}>
                  Kategoriyani qayta nomlash
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  Eski nom: <strong>{renameOldName}</strong>
                </div>
              </div>
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
                style={primaryButton(busy, "#A78BFA")}
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
