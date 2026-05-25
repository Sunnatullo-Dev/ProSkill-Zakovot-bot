import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ComponentType, ReactNode } from "react";
import {
  bulkCreateAdminQuestions,
  createAdminQuestion,
  deleteAdminQuestion,
  getAdminCategories,
  getAdminQuestions,
  getAdminStats,
  getReportedQuestions,
  renameAdminCategory,
  updateAdminQuestion
} from "../api/client";
import { parseQuestionsFile } from "../utils/questionFileParser";
import type { ParsedQuestion, ParseResult } from "../utils/questionFileParser";
import type {
  AdminCategoryStat,
  AdminQuestion,
  AdminQuestionsResponse,
  AdminStats
} from "../api/client";
import type { Difficulty, ReportedQuestion } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import {
  AlertIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ControllerIcon,
  DashboardIcon,
  EditIcon,
  FileIcon,
  type IconProps,
  QuestionIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  SwordsIcon,
  TagIcon,
  TeamIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
  XCircleIcon
} from "./icons";

type AdminPanelProps = {
  onExitToUser: () => void;
};

type Section = "dashboard" | "questions" | "reports" | "categories";

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

  const topCategories = stats.categories.slice(0, 6);
  const maxCount = topCategories[0]?.count ?? 1;
  const categoriesCount = stats.categories.length;

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
        <MetricCard Icon={TagIcon} accent="#A78BFA" label="Kategoriyalar" value={categoriesCount} />
      </div>

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

// ----- Questions -----

type EditFields = {
  text: string;
  correctAnswer: string;
  category: string;
  difficulty: "" | Difficulty;
  /** A/B/C/D rejimi uchun 3 ta noto'g'ri variant (bo'sh bo'lsa — erkin matn). */
  wrongA: string;
  wrongB: string;
  wrongC: string;
};

function emptyFields(): EditFields {
  return {
    text: "",
    correctAnswer: "",
    category: "",
    difficulty: "",
    wrongA: "",
    wrongB: "",
    wrongC: ""
  };
}

function fromQuestion(question: AdminQuestion): EditFields {
  const wrong = question.wrongAnswers ?? [];
  return {
    text: question.text,
    correctAnswer: question.correctAnswer,
    category: question.category ?? "",
    difficulty: (question.difficulty as Difficulty | null) ?? "",
    wrongA: wrong[0] ?? "",
    wrongB: wrong[1] ?? "",
    wrongC: wrong[2] ?? ""
  };
}

/** EditFields'dan API uchun wrongAnswers tayyorlaydi.
 *  - Hammasi bo'sh bo'lsa: [] (erkin matn rejimi)
 *  - Hammasi to'la bo'lsa: 3 ta string
 *  - Qisman to'la: xato (foydalanuvchi tushunsin)
 */
function collectWrongAnswers(fields: EditFields): { ok: true; value: string[] } | { ok: false; error: string } {
  const items = [fields.wrongA.trim(), fields.wrongB.trim(), fields.wrongC.trim()];
  const filled = items.filter((x) => x.length > 0);
  if (filled.length === 0) {
    return { ok: true, value: [] };
  }
  if (filled.length !== 3) {
    return {
      ok: false,
      error: "A/B/C/D rejimi uchun 3 ta noto'g'ri variant to'liq kerak (yoki uchchalasini bo'sh qoldiring)"
    };
  }
  if (new Set(filled.map((x) => x.toLowerCase())).size !== 3) {
    return { ok: false, error: "Noto'g'ri variantlar takrorlanmasin" };
  }
  if (filled.map((x) => x.toLowerCase()).includes(fields.correctAnswer.trim().toLowerCase())) {
    return { ok: false, error: "To'g'ri javob noto'g'ri variantlar orasida bo'lmasin" };
  }
  return { ok: true, value: items };
}

function DifficultyBadge({ value }: { value: string | null }) {
  const meta = DIFFICULTIES.find((item) => item.value === value);

  if (!meta) {
    return <span style={chipBadge("#5A7A9F")}>—</span>;
  }

  return <span style={chipBadge(meta.color)}>{meta.label}</span>;
}

type UploadStage = "idle" | "deciding" | "reviewing" | "uploading";

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
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [reviewItems, setReviewItems] = useState<ParsedQuestion[]>([]);
  const [bulkMessage, setBulkMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const wrongResult = collectWrongAnswers(createFields);
    if (!wrongResult.ok) {
      setCreateError(wrongResult.error);
      return;
    }

    setCreating(true);
    const result = await createAdminQuestion({
      text: createFields.text.trim(),
      correctAnswer: createFields.correctAnswer.trim(),
      category: createFields.category.trim() || null,
      difficulty: createFields.difficulty || null,
      wrongAnswers: wrongResult.value
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

    const wrongResult = collectWrongAnswers(editFields);
    if (!wrongResult.ok) {
      setEditError(wrongResult.error);
      return;
    }

    setBusyId(id);
    const result = await updateAdminQuestion(id, {
      text: editFields.text.trim(),
      correctAnswer: editFields.correctAnswer.trim(),
      category: editFields.category.trim() || null,
      difficulty: editFields.difficulty || null,
      wrongAnswers: wrongResult.value
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

  function openFilePicker() {
    setBulkMessage(null);
    setParseError("");
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setParsing(true);
    setParseError("");
    setBulkMessage(null);

    try {
      const result = await parseQuestionsFile(file);

      if (result.valid.length === 0) {
        const reason = result.invalid[0]?.reason ?? "Faylda haqiqiy savol topilmadi";
        setParseError(`Fayl o'qib bo'lmadi: ${reason}`);
        return;
      }

      setParseResult(result);
      setReviewItems(result.valid);
      setUploadStage("deciding");
    } catch (error) {
      console.error("File parse failed", error);
      setParseError("Faylni o'qishda xato yuz berdi");
    } finally {
      setParsing(false);
    }
  }

  async function uploadAll(items: ParsedQuestion[]) {
    if (items.length === 0) {
      setBulkMessage({ kind: "error", text: "Qo'shadigan savol yo'q" });
      return;
    }

    setUploadStage("uploading");
    const result = await bulkCreateAdminQuestions(items);

    if (result.ok) {
      setBulkMessage({
        kind: "success",
        text: `${result.data.inserted} ta savol bazaga qo'shildi`
      });
      setUploadStage("idle");
      setParseResult(null);
      setReviewItems([]);
      setPage(1);
      await refresh();
    } else {
      setBulkMessage({ kind: "error", text: result.error });
      setUploadStage("reviewing");
    }
  }

  function cancelUpload() {
    setUploadStage("idle");
    setParseResult(null);
    setReviewItems([]);
  }

  function updateReviewItem(index: number, patch: Partial<ParsedQuestion>) {
    setReviewItems((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeReviewItem(index: number) {
    setReviewItems((items) => items.filter((_, i) => i !== index));
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
      <input
        ref={fileInputRef}
        accept=".json,.csv,.tsv,.txt,.xls,.xlsx"
        style={{ display: "none" }}
        type="file"
        onChange={(event) => void handleFileChange(event)}
      />

      {/* Yuklash usullarini tanlash — qo'lda yoki fayl orqali */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <button
          style={{
            padding: "14px 12px",
            background: createOpen
              ? "linear-gradient(135deg, #22C55E, #16A34A)"
              : "var(--card)",
            border: `1px solid ${createOpen ? "#22C55E" : "var(--border)"}`,
            borderRadius: "14px",
            color: createOpen ? "white" : "var(--text)",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            transition: "transform 0.1s",
            boxShadow: createOpen ? "0 6px 14px rgba(34,197,94,0.25)" : "none"
          }}
          type="button"
          onClick={() => {
            setCreateFields(emptyFields());
            setCreateError("");
            setCreateOpen((value) => !value);
          }}
        >
          <span style={{ color: createOpen ? "white" : "#22C55E" }}>
            <EditIcon size={18} />
          </span>
          Qo'lda yuklash
        </button>
        <button
          disabled={parsing}
          style={{
            padding: "14px 12px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            color: "var(--text)",
            fontSize: "13px",
            fontWeight: 800,
            cursor: parsing ? "wait" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            opacity: parsing ? 0.6 : 1
          }}
          type="button"
          onClick={openFilePicker}
        >
          <span style={{ color: "#4DA6FF" }}>
            <UploadIcon size={18} />
          </span>
          {parsing ? "O'qilmoqda..." : "Fayl orqali"}
        </button>
      </div>

      {parseError ? (
        <div
          style={{
            fontSize: "12px",
            color: "var(--error)",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            padding: "10px 12px",
            borderRadius: "10px"
          }}
        >
          {parseError}
        </div>
      ) : null}

      {bulkMessage ? (
        <div
          style={{
            fontSize: "12.5px",
            color: bulkMessage.kind === "success" ? "var(--success)" : "var(--error)",
            background:
              bulkMessage.kind === "success"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.08)",
            border: `1px solid ${
              bulkMessage.kind === "success"
                ? "rgba(34,197,94,0.35)"
                : "rgba(239,68,68,0.3)"
            }`,
            padding: "10px 12px",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <span>{bulkMessage.text}</span>
          <button
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "2px",
              display: "inline-flex"
            }}
            type="button"
            onClick={() => setBulkMessage(null)}
          >
            <XCircleIcon size={16} />
          </button>
        </div>
      ) : null}

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

            {/* A/B/C/D rejimi uchun 3 ta noto'g'ri variant — ixtiyoriy.
                Bo'sh qoldirilsa savol erkin matn rejimida (Gemini AI baholaydi).
                Uchchalasini to'ldirilsa A/B/C/D test rejimida. */}
            <div
              style={{
                marginTop: "4px",
                padding: "10px 12px",
                background: "rgba(77,166,255,0.06)",
                border: "1px dashed var(--border)",
                borderRadius: "10px"
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>
                A/B/C/D variantlari (ixtiyoriy — 3 ta noto'g'ri variant)
              </div>
              {renderField(
                "Noto'g'ri variant 1",
                <input
                  placeholder="Birinchi noto'g'ri javob"
                  style={inputStyle}
                  type="text"
                  value={createFields.wrongA}
                  onChange={(event) =>
                    setCreateFields((value) => ({ ...value, wrongA: event.target.value }))
                  }
                />
              )}
              {renderField(
                "Noto'g'ri variant 2",
                <input
                  placeholder="Ikkinchi noto'g'ri javob"
                  style={inputStyle}
                  type="text"
                  value={createFields.wrongB}
                  onChange={(event) =>
                    setCreateFields((value) => ({ ...value, wrongB: event.target.value }))
                  }
                />
              )}
              {renderField(
                "Noto'g'ri variant 3",
                <input
                  placeholder="Uchinchi noto'g'ri javob"
                  style={inputStyle}
                  type="text"
                  value={createFields.wrongC}
                  onChange={(event) =>
                    setCreateFields((value) => ({ ...value, wrongC: event.target.value }))
                  }
                />
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

                  {/* A/B/C/D variantlari — tahrirlash uchun */}
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "10px 12px",
                      background: "rgba(77,166,255,0.06)",
                      border: "1px dashed var(--border)",
                      borderRadius: "10px"
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>
                      A/B/C/D variantlari (ixtiyoriy — 3 ta noto'g'ri variant)
                    </div>
                    {renderField(
                      "Noto'g'ri variant 1",
                      <input
                        style={inputStyle}
                        type="text"
                        value={editFields.wrongA}
                        onChange={(event) =>
                          setEditFields((value) => ({ ...value, wrongA: event.target.value }))
                        }
                      />
                    )}
                    {renderField(
                      "Noto'g'ri variant 2",
                      <input
                        style={inputStyle}
                        type="text"
                        value={editFields.wrongB}
                        onChange={(event) =>
                          setEditFields((value) => ({ ...value, wrongB: event.target.value }))
                        }
                      />
                    )}
                    {renderField(
                      "Noto'g'ri variant 3",
                      <input
                        style={inputStyle}
                        type="text"
                        value={editFields.wrongC}
                        onChange={(event) =>
                          setEditFields((value) => ({ ...value, wrongC: event.target.value }))
                        }
                      />
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
              {/* A/B/C/D rejimi belgisi */}
              {question.wrongAnswers && question.wrongAnswers.length === 3 ? (
                <div
                  style={{
                    marginTop: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, rgba(77,166,255,0.18), rgba(124,91,255,0.14))",
                    border: "1px solid rgba(77,166,255,0.3)",
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--accent)",
                    letterSpacing: "0.04em"
                  }}
                  title={`Variantlar: ${question.wrongAnswers.join(", ")}`}
                >
                  A/B/C/D rejimi
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "rgba(245,200,66,0.10)",
                    border: "1px solid rgba(245,200,66,0.25)",
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "var(--gold)",
                    letterSpacing: "0.04em"
                  }}
                  title="Foydalanuvchi javobni o'zi yozadi, AI baholaydi"
                >
                  Erkin matn (AI)
                </div>
              )}
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

      {uploadStage === "deciding" && parseResult ? (
        <ParseDecisionDialog
          result={parseResult}
          onCancel={cancelUpload}
          onDirectAdd={() => void uploadAll(reviewItems)}
          onReview={() => setUploadStage("reviewing")}
        />
      ) : null}

      {uploadStage === "reviewing" ? (
        <BulkReviewScreen
          items={reviewItems}
          uploading={false}
          onAddAll={() => void uploadAll(reviewItems)}
          onCancel={cancelUpload}
          onRemove={removeReviewItem}
          onUpdate={updateReviewItem}
        />
      ) : null}

      {uploadStage === "uploading" ? <BulkUploadingOverlay count={reviewItems.length} /> : null}
    </div>
  );
}

// ----- Bulk upload helper components -----

function ParseDecisionDialog({
  result,
  onCancel,
  onReview,
  onDirectAdd
}: {
  result: ParseResult;
  onCancel: () => void;
  onReview: () => void;
  onDirectAdd: () => void;
}) {
  return (
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
          maxWidth: "380px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4DA6FF, #7C3AED)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)" }}>
              Fayl o'qildi
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
              Format: {result.format}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "12px",
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--text)" }}>To'g'ri savollar</span>
          <span style={{ fontSize: "16px", fontWeight: 900, color: "#22C55E" }}>
            {result.valid.length}
          </span>
        </div>

        {result.invalid.length > 0 ? (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "12px",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px"
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text)" }}>Xato qatorlar</span>
            <span style={{ fontSize: "16px", fontWeight: 900, color: "#EF4444" }}>
              {result.invalid.length}
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: "14px" }} />
        )}

        <div
          style={{
            fontSize: "13px",
            color: "var(--text)",
            marginBottom: "16px",
            lineHeight: 1.5
          }}
        >
          Savollarni ko'rib chiqishni hohlaysizmi? Yo'q desangiz, hammasi shu zahoti bazaga qo'shiladi.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button style={primaryButton(false, "#4DA6FF")} type="button" onClick={onReview}>
            Ha, ko'rib chiqaman
          </button>
          <button style={primaryButton(false, "#22C55E")} type="button" onClick={onDirectAdd}>
            Yo'q, to'g'ridan-to'g'ri qo'shing
          </button>
          <button style={{ ...ghostButton, justifyContent: "center" }} type="button" onClick={onCancel}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkUploadingOverlay({ count }: { count: number }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        backdropFilter: "blur(6px)"
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "26px 28px",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "3px solid rgba(77,166,255,0.2)",
            borderTopColor: "#4DA6FF",
            margin: "0 auto",
            animation: "spin 0.8s linear infinite"
          }}
        />
        <div style={{ marginTop: "14px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
          {count} ta savol qo'shilmoqda...
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function BulkReviewScreen({
  items,
  uploading,
  onUpdate,
  onRemove,
  onAddAll,
  onCancel
}: {
  items: ParsedQuestion[];
  uploading: boolean;
  onUpdate: (index: number, patch: Partial<ParsedQuestion>) => void;
  onRemove: (index: number) => void;
  onAddAll: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1050,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "linear-gradient(180deg, var(--bg) 92%, transparent)",
          borderBottom: "1px solid var(--border)",
          padding: "16px 18px 14px",
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backdropFilter: "blur(8px)"
        }}
      >
        <button
          aria-label="Bekor qilish"
          style={{
            width: "36px",
            height: "36px",
            padding: 0,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            color: "var(--text)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto"
          }}
          type="button"
          onClick={onCancel}
        >
          <ChevronLeftIcon size={16} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 900,
              color: "var(--text)",
              margin: 0
            }}
          >
            Savollarni ko'rib chiqish
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "3px"
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22C55E"
              }}
            />
            <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>
              {items.length} ta savol tayyor
            </span>
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          padding: "16px 18px 120px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<FileIcon size={36} />}
            text="Hech qanday savol qolmadi — hammasini o'chirib yubordingiz"
          />
        ) : (
          items.map((item, index) => (
            <ReviewItemCard
              key={index}
              index={index}
              item={item}
              onRemove={() => onRemove(index)}
              onUpdate={(patch) => onUpdate(index, patch)}
            />
          ))
        )}
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "linear-gradient(180deg, transparent, var(--bg) 35%)",
          padding: "16px 18px 20px",
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%"
        }}
      >
        <button
          disabled={items.length === 0 || uploading}
          style={primaryButton(items.length === 0 || uploading, "#22C55E")}
          type="button"
          onClick={onAddAll}
        >
          {uploading
            ? "Qo'shilmoqda..."
            : `${items.length} ta savolni bazaga qo'shish`}
        </button>
      </div>
    </div>
  );
}

function ReviewItemCard({
  item,
  index,
  onUpdate,
  onRemove
}: {
  item: ParsedQuestion;
  index: number;
  onUpdate: (patch: Partial<ParsedQuestion>) => void;
  onRemove: () => void;
}) {
  const difficultyMeta = DIFFICULTIES.find((opt) => opt.value === item.difficulty);
  const difficultyColor = difficultyMeta?.color ?? "#5A7A9F";

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "12px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Chap chetdagi rangli aksent — qiyinlik rangiga moslashadi */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: `linear-gradient(180deg, ${difficultyColor}, ${difficultyColor}55)`,
          borderRadius: "3px 0 0 3px"
        }}
      />

      {/* Header: raqam + qiyinlik selektori + o'chirish */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px"
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--muted)",
            letterSpacing: "1px"
          }}
        >
          #{index + 1}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            style={{
              padding: "6px 28px 6px 10px",
              background: `${difficultyColor}15`,
              border: `1px solid ${difficultyColor}40`,
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              color: difficultyColor,
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `linear-gradient(45deg, transparent 50%, ${difficultyColor} 50%), linear-gradient(135deg, ${difficultyColor} 50%, transparent 50%)`,
              backgroundPosition: "calc(100% - 14px) center, calc(100% - 10px) center",
              backgroundSize: "4px 4px, 4px 4px",
              backgroundRepeat: "no-repeat",
              fontFamily: "inherit"
            }}
            value={item.difficulty ?? ""}
            onChange={(event) =>
              onUpdate({
                difficulty: event.target.value ? (event.target.value as Difficulty) : null
              })
            }
          >
            <option value="">Qiyinligi —</option>
            {DIFFICULTIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            style={iconButton("#EF4444")}
            title="O'chirish"
            type="button"
            onClick={onRemove}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {/* Savol matni — asosiy ko'rinish */}
      <textarea
        placeholder="Savol matni..."
        rows={3}
        style={{
          ...inputStyle,
          resize: "vertical",
          fontSize: "14px",
          lineHeight: 1.5,
          minHeight: "60px"
        }}
        value={item.text}
        onChange={(event) => onUpdate({ text: event.target.value })}
      />

      {/* Javob — yashil aksent bilan */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(34,197,94,0.06)",
          border: "1.5px solid rgba(34,197,94,0.25)",
          borderRadius: "12px",
          padding: "2px 12px"
        }}
      >
        <span style={{ color: "var(--success)", flex: "0 0 auto" }}>
          <CheckCircleIcon size={14} />
        </span>
        <input
          placeholder="To'g'ri javob..."
          style={{
            flex: 1,
            padding: "10px 0",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "inherit"
          }}
          type="text"
          value={item.correctAnswer}
          onChange={(event) => onUpdate({ correctAnswer: event.target.value })}
        />
      </div>
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
        <EmptyState icon={<AlertIcon size={36} />} text="Shikoyat yo'q — barcha savollar tartibda" />
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
