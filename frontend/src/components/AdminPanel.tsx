import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ComponentType, ReactNode } from "react";
import {
  bulkCreateAdminQuestions,
  createAdminQuestion,
  deleteAdminQuestion,
  getAdminCategories,
  getAdminQuestions,
  getAdminStats,
  getAdminUserProfile,
  getAdminUsers,
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
  AdminStats,
  AdminUserListItem,
  AdminUserProfile
} from "../api/client";
import type { Difficulty, ReportedQuestion } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import SvoyakAdminSection from "./admin/SvoyakAdminSection";
import SettingsSection from "./admin/SettingsSection";
import ChannelsSection from "./admin/ChannelsSection";
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

type Section = "dashboard" | "questions" | "reports" | "categories" | "svoyak" | "settings" | "channels" | "users";

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
  },
  {
    id: "svoyak",
    label: "Svoyak",
    Icon: ControllerIcon,
    accent: "#F5C842",
    subtitle: "Svoyak kategoriyalari va savollar bazasi"
  },
  {
    id: "channels",
    label: "Kanallar",
    Icon: AlertIcon,
    accent: "#F59E0B",
    subtitle: "Majburiy kanallar — qo'shish, o'chirish, tarix"
  },
  {
    id: "users",
    label: "Foydalanuvchilar",
    Icon: UserIcon,
    accent: "#06B6D4",
    subtitle: "Foydalanuvchilar ro'yxati va individual profillar"
  },
  {
    id: "settings",
    label: "Sozlamalar",
    Icon: ShieldIcon,
    accent: "#22C55E",
    subtitle: "Xususiyatlarni yoqish va o'chirish, sozlamalar"
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
          {section === "svoyak" ? <SvoyakAdminSection /> : null}
          {section === "channels" ? <ChannelsSection /> : null}
          {section === "users" ? <UsersSection /> : null}
          {section === "settings" ? <SettingsSection /> : null}
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
  timeLimitSeconds: number | null;
};

function emptyFields(): EditFields {
  return {
    text: "",
    correctAnswer: "",
    category: "",
    difficulty: "",
    timeLimitSeconds: 90,
  };
}

function fromQuestion(question: AdminQuestion): EditFields {
  return {
    text: question.text,
    correctAnswer: question.correctAnswer,
    category: question.category ?? "",
    difficulty: (question.difficulty as Difficulty | null) ?? "",
    timeLimitSeconds: question.timeLimitSeconds ?? null,
  };
}


const TIME_PRESETS_Q = [15, 30, 45, 60, 90, 120] as const;

function TimeLimitPicker({
  value,
  onChange
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div style={labelStyle}>Vaqt limiti</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {TIME_PRESETS_Q.map((s) => {
          const active = value === s;
          const mins = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
          return (
            <button
              key={s}
              type="button"
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                border: active ? "1.5px solid #22C55E" : "1.5px solid var(--border)",
                background: active
                  ? "linear-gradient(135deg, #22C55E22, #16A34A18)"
                  : "var(--surface)",
                color: active ? "#22C55E" : "var(--muted)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: active ? "0 0 0 2px #22C55E33" : "none",
              }}
              onClick={() => onChange(s)}
            >
              ⏱ {mins}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
        Tanlangan: <strong style={{ color: "var(--text)" }}>
          {value == null
            ? "Belgilanmagan (o'yin standartida)"
            : value >= 60
            ? `${Math.floor(value / 60)} daqiqa ${value % 60 ? `${value % 60} soniya` : ""}`
            : `${value} soniya`}
        </strong>
      </div>
    </div>
  );
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

    setCreating(true);
    const result = await createAdminQuestion({
      text: createFields.text.trim(),
      correctAnswer: createFields.correctAnswer.trim(),
      category: createFields.category.trim() || null,
      difficulty: createFields.difficulty || null,
      wrongAnswers: [],
      timeLimitSeconds: createFields.timeLimitSeconds,
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
      difficulty: editFields.difficulty || null,
      wrongAnswers: [],
      timeLimitSeconds: editFields.timeLimitSeconds,
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
        accept=".json,.csv,.tsv,.txt,.xls,.xlsx,.pdf"
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

            {/* A/B/C/D variantlar olib tashlandi — erkin matn rejimi ishlatiladi */}

            {/* Vaqt limiti — preset pill tugmalar */}
            <TimeLimitPicker
              value={createFields.timeLimitSeconds}
              onChange={(v) => setCreateFields((f) => ({ ...f, timeLimitSeconds: v }))}
            />

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

                  {/* A/B/C/D variantlar olib tashlandi — erkin matn rejimi */}

                  {/* Vaqt limiti — preset pill tugmalar */}
                  <TimeLimitPicker
                    value={editFields.timeLimitSeconds}
                    onChange={(v) => setEditFields((f) => ({ ...f, timeLimitSeconds: v }))}
                  />

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
              {/* Vaqt limiti */}
              {question.timeLimitSeconds ? (
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  ⏱ {question.timeLimitSeconds}s
                </div>
              ) : null}
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

// ----- Users -----

const USER_PAGE_LIMIT = 20;

function userDisplayName(u: AdminUserListItem): string {
  return u.displayName ?? u.firstName ?? u.username ?? `#${u.telegramId}`;
}

function UsersSection() {
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    const res = await getAdminUsers({ page: p, limit: USER_PAGE_LIMIT, search: q.trim() || undefined });
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(page, search);
  }, [load, page, search]);

  const totalPages = Math.max(1, Math.ceil(total / USER_PAGE_LIMIT));

  if (selectedUser) {
    return (
      <UserProfileDetail
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Search */}
      <Card padding="12px">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "12px",
            padding: "0 12px"
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            <SearchIcon size={16} />
          </span>
          <input
            placeholder="Ism, username yoki Telegram ID..."
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
      </Card>

      {/* Count + refresh row */}
      <div
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span>{loading ? "Yuklanmoqda..." : `Jami: ${total} ta foydalanuvchi`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {totalPages > 1 ? (
            <span style={{ fontWeight: 700 }}>
              {page} / {totalPages}
            </span>
          ) : null}
          <RefreshButton onClick={() => void load(page, search)} />
        </div>
      </div>

      {/* List */}
      {!loading && items.length === 0 ? (
        <EmptyState icon={<UserIcon size={36} />} text="Foydalanuvchi topilmadi" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((u) => {
            const initial = (userDisplayName(u)[0] ?? "?").toUpperCase();
            return (
              <button
                key={u.telegramId}
                style={{
                  width: "100%",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  transition: "border-color 0.15s"
                }}
                type="button"
                onClick={() => setSelectedUser(u)}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #06B6D4, #4DA6FF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "white",
                    flex: "0 0 auto"
                  }}
                >
                  {initial}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
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
                    {userDisplayName(u)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                    {u.username ? `@${u.username} · ` : ""}ID: {u.telegramId}
                  </div>
                </div>
                {/* Score */}
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--gold)" }}>
                    {u.score}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    ball
                  </div>
                </div>
                <ChevronRightIcon size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Keyingi <ChevronRightIcon size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ----- User profile detail (admin view) -----

function UserProfileDetail({
  user,
  onBack
}: {
  user: AdminUserListItem;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getAdminUserProfile(user.telegramId).then((res) => {
      if (active) {
        setProfile(res);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [user.telegramId]);

  const displayName = userDisplayName(user);
  const initial = (displayName[0] ?? "?").toUpperCase();

  const STAT_ACCENT = "#06B6D4";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Back button */}
      <button
        style={{
          ...ghostButton,
          alignSelf: "flex-start"
        }}
        type="button"
        onClick={onBack}
      >
        <ChevronLeftIcon size={14} /> Ro'yxatga qaytish
      </button>

      {/* Identity hero card — ProfileScreen style */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(77,166,255,0.16))",
          border: "1px solid rgba(6,182,212,0.4)",
          borderRadius: "20px",
          padding: "18px",
          boxShadow: "0 8px 24px rgba(6,182,212,0.14)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #06B6D4, #4DA6FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 800,
              color: "white",
              flex: "0 0 auto",
              boxShadow: "0 6px 16px rgba(6,182,212,0.4)"
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayName}
            </div>
            {user.username ? (
              <div style={{ fontSize: "12px", color: STAT_ACCENT, fontWeight: 700, marginTop: "3px" }}>
                @{user.username}
              </div>
            ) : null}
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
              Telegram ID: {user.telegramId}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map((id) => (
            <div
              key={id}
              style={{
                height: "88px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                opacity: 0.5
              }}
            />
          ))}
        </div>
      ) : profile ? (
        <>
          {/* Score row — big tiles matching ProfileScreen */}
          <div style={{ display: "flex", gap: "10px" }}>
            <UserStatTile label="Joriy ball" value={profile.user.score} color="var(--gold)" large />
            <UserStatTile label="To'g'ri javoblar" value={profile.stats.totalCorrect} color={STAT_ACCENT} large />
          </div>

          {/* Stats grid */}
          <div style={{ display: "flex", gap: "10px" }}>
            <UserStatTile label="O'yinlar" value={profile.stats.gamesPlayed} color="var(--accent)" />
            <UserStatTile label="Aniqlik" value={`${profile.stats.accuracy}%`} color="var(--success)" />
            <UserStatTile label="Eng yaxshi" value={profile.stats.bestRoundScore} color="var(--gold)" />
          </div>

          {/* Referrals */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(6,182,212,0.16)",
                color: STAT_ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto"
              }}
            >
              <TeamIcon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
                Taklif qilinganlar
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                {profile.referralCount} ta do'st taklif qilgan
              </div>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: STAT_ACCENT }}>
              {profile.referralCount}
            </div>
          </div>

          {/* Recent games — ProfileScreen style */}
          {profile.recentGames.length > 0 ? (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "18px",
                padding: "14px"
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--muted)",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  marginBottom: "12px"
                }}
              >
                So'nggi o'yinlar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {profile.recentGames.map((item) => {
                  const d = new Date(item.createdAt);
                  const label = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
                  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "var(--bg)",
                        borderRadius: "12px",
                        border: "1px solid var(--border)"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {label} · {time}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>
                          {item.correctCount}/{item.totalCount} to'g'ri · {item.accuracy}%
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "17px", fontWeight: 900, color: "var(--gold)" }}>
                          +{item.roundScore}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                          ball
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={<ControllerIcon size={30} />} text="Hali o'yin o'ynamagan" />
          )}
        </>
      ) : (
        <EmptyState icon={<UserIcon size={36} />} text="Profil ma'lumotlarini olib bo'lmadi" />
      )}
    </div>
  );
}

function UserStatTile({
  label,
  value,
  color,
  large
}: {
  label: string;
  value: string | number;
  color: string;
  large?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: large ? "16px" : "14px",
        padding: large ? "16px 10px" : "12px 10px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: large ? "28px" : "20px",
          fontWeight: 900,
          color,
          lineHeight: 1
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: large ? "10px" : "9.5px",
          color: "var(--muted)",
          letterSpacing: "1.3px",
          textTransform: "uppercase",
          marginTop: "5px"
        }}
      >
        {label}
      </div>
    </div>
  );
}
