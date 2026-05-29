/**
 * SvoyakAdminSection — AdminPanel ichidagi Svoyak boshqaruvi.
 *
 * 2 ta sub-tab:
 *  - Kategoriyalar (qo'shish/tahrir/o'chirish, aktiv/passiv toggle)
 *  - Savollar (filter kategoriya × ball, qo'shish, tahrir, o'chirish)
 *
 * Spec: AdminPanel'ning umumiy uslubiga mos (rangli accent kartochkalar,
 * modal-style form, kompakt mobile UI).
 */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
} from "../../svoyak/adminApi";
import type { AdminSvoyakCategory, AdminSvoyakQuestion } from "../../svoyak/adminApi";

type SubTab = "categories" | "questions";

const SVOYAK_ACCENT = "#f5c842"; // oltinrang

const VALUE_TIERS: Array<10 | 20 | 30 | 40 | 50> = [10, 20, 30, 40, 50];

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  fontSize: "13px",
  color: "var(--text)",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "1.4px",
  textTransform: "uppercase",
  marginBottom: "5px",
  display: "block",
};

function primaryButton(disabled = false): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: disabled ? "rgba(255,255,255,0.06)" : SVOYAK_ACCENT,
    color: disabled ? "var(--muted)" : "#0B0B14",
    fontWeight: 800,
    fontSize: "13px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

const ghostButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

const dangerButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(239,68,68,0.40)",
  background: "rgba(239,68,68,0.10)",
  color: "#EF4444",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};


export default function SvoyakAdminSection() {
  const [sub, setSub] = useState<SubTab>("categories");

  return (
    <div>
      {/* Sub-tab switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "4px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          marginBottom: "14px",
        }}
      >
        <SubTabButton active={sub === "categories"} onClick={() => setSub("categories")}>
          🗂 Kategoriyalar
        </SubTabButton>
        <SubTabButton active={sub === "questions"} onClick={() => setSub("questions")}>
          ❓ Savollar
        </SubTabButton>
      </div>

      {sub === "categories" ? <CategoriesTab /> : <QuestionsTab />}
    </div>
  );
}


function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: "9px",
        border: "none",
        background: active ? SVOYAK_ACCENT : "transparent",
        color: active ? "#0B0B14" : "var(--text)",
        fontWeight: 800,
        fontSize: "13px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}


// ─── Kategoriyalar tabini ─────────────────────────────────────────────────

function CategoriesTab() {
  const [items, setItems] = useState<AdminSvoyakCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSvoyakCategory | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await adminListCategories();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(c: AdminSvoyakCategory) {
    if (c.questionCount > 0) {
      alert(`"${c.name}" ichida ${c.questionCount} savol bor — avval ularni o'chiring yoki kategoriyani passiv qiling.`);
      return;
    }
    if (!window.confirm(`"${c.name}" kategoriyani o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await adminDeleteCategory(c.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirib bo'lmadi");
    }
  }

  async function handleToggleActive(c: AdminSvoyakCategory) {
    try {
      await adminUpdateCategory(c.id, { isActive: !c.isActive });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Yangilab bo'lmadi");
    }
  }

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>Yuklanmoqda...</div>;
  }
  if (error) {
    return (
      <div style={{ padding: "16px", background: "rgba(239,68,68,0.10)", borderRadius: "10px", color: "#EF4444" }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>{items.length} ta kategoriya</div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          style={primaryButton()}
        >
          + Yangi
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              opacity: c.isActive ? 1 : 0.55,
            }}
          >
            <span style={{ fontSize: "22px" }}>{c.iconEmoji || "🎲"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--text)" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                {c.questionCount} ta savol · {c.language} · #{c.order} · {c.isActive ? "Aktiv" : "Passiv"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" onClick={() => { setEditing(c); setShowForm(true); }} style={ghostButton}>
                ✎
              </button>
              <button type="button" onClick={() => handleToggleActive(c)} style={ghostButton}>
                {c.isActive ? "Off" : "On"}
              </button>
              <button type="button" onClick={() => handleDelete(c)} style={dangerButton}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <CategoryForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); void load(); }}
        />
      ) : null}
    </div>
  );
}


function CategoryForm(props: {
  initial: AdminSvoyakCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { initial, onClose, onSaved } = props;
  const [name, setName] = useState(initial?.name ?? "");
  const [iconEmoji, setIconEmoji] = useState(initial?.iconEmoji ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "uz-latn");
  const [order, setOrder] = useState<string>(initial?.order != null ? String(initial.order) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Nom kamida 2 belgi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        iconEmoji: iconEmoji.trim(),
        language: language.trim() || "uz-latn",
        order: order.trim() ? Number(order) : undefined,
      };
      if (initial) {
        await adminUpdateCategory(initial.id, payload);
      } else {
        await adminCreateCategory(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? `Kategoriya: ${initial.name}` : "Yangi kategoriya"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={labelStyle}>Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Tarix, Sport..."
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Emoji</label>
            <input
              type="text"
              value={iconEmoji}
              onChange={(e) => setIconEmoji(e.target.value)}
              style={inputStyle}
              placeholder="🏛️"
              maxLength={4}
            />
          </div>
          <div>
            <label style={labelStyle}>Til</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ ...inputStyle, paddingRight: "8px" }}
            >
              <option value="uz-latn">uz-latn</option>
              <option value="uz-cyrl">uz-cyrl</option>
              <option value="ru">ru</option>
              <option value="en">en</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Tartib</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            style={inputStyle}
            placeholder="Avto"
          />
        </div>
        {err ? (
          <div style={{ padding: "10px", background: "rgba(239,68,68,0.10)", borderRadius: "8px", color: "#EF4444", fontSize: "12px" }}>
            {err}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button type="button" onClick={onClose} style={{ ...ghostButton, flex: 1 }}>
            Bekor qilish
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton(saving), flex: 2 }}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}


// ─── Savollar tab ─────────────────────────────────────────────────────────

function QuestionsTab() {
  const [items, setItems] = useState<AdminSvoyakQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [categories, setCategories] = useState<AdminSvoyakCategory[]>([]);
  const [filterCat, setFilterCat] = useState<number | undefined>(undefined);
  const [filterTier, setFilterTier] = useState<number | undefined>(undefined);
  const [filterSearch, setFilterSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSvoyakQuestion | null>(null);

  async function loadCats() {
    try {
      setCategories(await adminListCategories());
    } catch {
      /* ignore — keyin filter ko'rinmaydi */
    }
  }

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminListQuestions({
        categoryId: filterCat,
        valueTier: filterTier,
        search: filterSearch.trim() || undefined,
        page,
        limit,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCats();
  }, []);

  useEffect(() => {
    void loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, filterTier, page]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await loadQuestions();
  }

  async function handleDelete(q: AdminSvoyakQuestion) {
    if (!window.confirm(`"${q.text.slice(0, 50)}..." savolini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await adminDeleteQuestion(q.id);
      await loadQuestions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirib bo'lmadi");
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* Filtr panel */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <select
            value={filterCat ?? ""}
            onChange={(e) => { setFilterCat(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            style={inputStyle}
          >
            <option value="">Barcha kategoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.iconEmoji} {c.name} ({c.questionCount})
              </option>
            ))}
          </select>
          <select
            value={filterTier ?? ""}
            onChange={(e) => { setFilterTier(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            style={inputStyle}
          >
            <option value="">Barcha ballar</option>
            {VALUE_TIERS.map((t) => (
              <option key={t} value={t}>{t} ball</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Savol matn bo'yicha qidirish..."
          />
          <button type="submit" style={ghostButton}>Qidir</button>
        </div>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          {total} savol topildi · {page}/{pages}
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          style={primaryButton()}
        >
          + Yangi savol
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>Yuklanmoqda...</div>
      ) : error ? (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.10)", borderRadius: "10px", color: "#EF4444" }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "30px 12px", textAlign: "center", color: "var(--muted)" }}>
          Filtr bo'yicha hech narsa topilmadi
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              onEdit={() => { setEditing(q); setShowForm(true); }}
              onDelete={() => void handleDelete(q)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 ? (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...ghostButton, opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Oldingi
          </button>
          <div style={{ padding: "8px 12px", color: "var(--muted)", fontSize: "12px" }}>
            {page} / {pages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            style={{ ...ghostButton, opacity: page >= pages ? 0.4 : 1 }}
          >
            Keyingi →
          </button>
        </div>
      ) : null}

      {showForm ? (
        <QuestionForm
          initial={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); void loadQuestions(); }}
        />
      ) : null}
    </div>
  );
}


function QuestionCard(props: {
  q: AdminSvoyakQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { q, onEdit, onDelete } = props;
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        opacity: q.isActive ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "14px" }}>{q.categoryIcon || "🎲"}</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em" }}>
          {q.categoryName.toUpperCase()}
        </span>
        <span
          style={{
            marginLeft: "auto",
            background: SVOYAK_ACCENT,
            color: "#0B0B14",
            padding: "3px 8px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          {q.valueTier}
        </span>
      </div>
      <div style={{ fontSize: "13px", color: "var(--text)", marginBottom: "6px", lineHeight: 1.4 }}>
        {q.text}
      </div>
      <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
        ✓ <span style={{ color: "#22C55E", fontWeight: 700 }}>{q.correctAnswer}</span>
        {q.wrongAnswers.length === 3 ? (
          <span> · ✗ {q.wrongAnswers.join(", ")}</span>
        ) : (
          <span style={{ color: "#FFAA1C" }}> · erkin matn</span>
        )}
      </div>
      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onEdit} style={ghostButton}>✎ Tahrir</button>
        <button type="button" onClick={onDelete} style={dangerButton}>✕ O'chir</button>
      </div>
    </div>
  );
}


function QuestionForm(props: {
  initial: AdminSvoyakQuestion | null;
  categories: AdminSvoyakCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { initial, categories, onClose, onSaved } = props;
  const [categoryId, setCategoryId] = useState<number>(initial?.categoryId ?? categories[0]?.id ?? 0);
  const [valueTier, setValueTier] = useState<10 | 20 | 30 | 40 | 50>(
    (initial?.valueTier as 10 | 20 | 30 | 40 | 50) ?? 10
  );
  const [text, setText] = useState(initial?.text ?? "");
  const [correct, setCorrect] = useState(initial?.correctAnswer ?? "");
  const [wrongs, setWrongs] = useState<[string, string, string]>(() => {
    const w = initial?.wrongAnswers ?? [];
    return [w[0] ?? "", w[1] ?? "", w[2] ?? ""];
  });
  const [textMode, setTextMode] = useState<boolean>(() => {
    if (!initial) return false;
    return initial.questionType === "text";
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setErr(null);
    if (!categoryId) { setErr("Kategoriya tanlang"); return; }
    if (text.trim().length < 3) { setErr("Savol juda qisqa"); return; }
    if (!correct.trim()) { setErr("To'g'ri javob bo'sh"); return; }
    if (!textMode) {
      const w = wrongs.map((s) => s.trim());
      if (w.some((s) => !s)) { setErr("3 ta noto'g'ri variant kerak"); return; }
      const seen = new Set([correct.trim().toLowerCase()]);
      for (const item of w) {
        const k = item.toLowerCase();
        if (seen.has(k)) { setErr("Variantlar takrorlanmasin"); return; }
        seen.add(k);
      }
    }

    setSaving(true);
    try {
      const payload = {
        categoryId,
        valueTier,
        text: text.trim(),
        correctAnswer: correct.trim(),
        wrongAnswers: textMode ? [] : wrongs.map((s) => s.trim()),
      };
      if (initial) {
        await adminUpdateQuestion(initial.id, payload);
      } else {
        await adminCreateQuestion(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Savolni tahrirlash" : "Yangi savol"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={labelStyle}>Kategoriya</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              style={inputStyle}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.iconEmoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ball</label>
            <select
              value={valueTier}
              onChange={(e) => setValueTier(Number(e.target.value) as 10 | 20 | 30 | 40 | 50)}
              style={inputStyle}
            >
              {VALUE_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Savol matni</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ ...inputStyle, minHeight: "60px", resize: "vertical", fontFamily: "inherit" }}
            placeholder="Savolni kiriting..."
          />
        </div>

        <div>
          <label style={labelStyle}>To'g'ri javob</label>
          <input
            type="text"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            style={inputStyle}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={textMode}
            onChange={(e) => setTextMode(e.target.checked)}
          />
          <span style={{ fontSize: "12px", color: "var(--text)" }}>
            Erkin matn (A/B/C/D yo'q — foydalanuvchi qo'lda yozadi)
          </span>
        </label>

        {!textMode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>3 ta noto'g'ri variant</label>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="text"
                value={wrongs[i]}
                onChange={(e) => {
                  const next: [string, string, string] = [...wrongs];
                  next[i] = e.target.value;
                  setWrongs(next);
                }}
                style={inputStyle}
                placeholder={`Variant ${i + 1}`}
              />
            ))}
          </div>
        ) : null}

        {err ? (
          <div style={{ padding: "10px", background: "rgba(239,68,68,0.10)", borderRadius: "8px", color: "#EF4444", fontSize: "12px" }}>
            {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={onClose} style={{ ...ghostButton, flex: 1 }}>
            Bekor qilish
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...primaryButton(saving), flex: 2 }}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}


// ─── Modal helper ─────────────────────────────────────────────────────────

function Modal(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Body'ga portal qilamiz — ancestor'da `transform` bo'lsa `position: fixed`
  // viewport'ga emas, shu transformlangan ancestor'ga bog'lanadi. AdminPanel'ning
  // `animate-fadeInUp` ichidagi transform: matrix(...) shu muammoni keltirib chiqaradi.
  if (typeof document === "undefined") return null;
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
        padding: "12px",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#1a2440",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--text)" }}>{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: "20px",
              cursor: "pointer",
              padding: "0 6px",
            }}
          >
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>,
    document.body
  );
}
