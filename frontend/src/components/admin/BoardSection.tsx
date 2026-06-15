/**
 * BoardSection — "Adminlarga murojaat" taxtasi.
 *
 * Faqat adminlar ko'radi va yozadi.
 * - Tepada compositor: textarea + media fayl biriktirish + "Joylash"
 * - Pastda feed: xabarlar yangi → eski, media (rasm/video) authed proxy orqali
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";

import {
  createAdminBoardPost,
  deleteAdminBoardPost,
  getAdminBoardPosts,
} from "../../api/client";
import type { AdminBoardPost } from "../../types";
import { useAuthedMedia } from "../../gameroom/useAuthedMedia";
import { BroadcastIcon, TrashIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";

// ─── Style tokens (AdminPanel'dagi tokenlar bilan bir xil) ───────────────────

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
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const ghostBtn: CSSProperties = {
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
  transition: "background 0.15s",
};

function primaryBtn(disabled: boolean, accent = "#4DA6FF"): CSSProperties {
  return {
    width: "100%",
    padding: "13px 16px",
    background: disabled
      ? "var(--border)"
      : `linear-gradient(135deg, ${accent}, #7C3AED)`,
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "transform 0.1s, box-shadow 0.15s",
    boxShadow: disabled ? "none" : "0 6px 18px rgba(77,166,255,0.25)",
  };
}

const BOARD_ACCENT = "#F59E0B";
const PAGE_LIMIT = 10;

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return "hozirgina";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

// ─── Media display ────────────────────────────────────────────────────────────

function PostMedia({ post }: { post: AdminBoardPost }) {
  const media = useAuthedMedia(post.mediaUrl);

  if (!post.mediaUrl || !post.mediaType) return null;

  if (media.status === "loading") {
    return (
      <div
        style={{
          height: "120px",
          background: "var(--surface)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: "12px",
          marginTop: "10px",
        }}
      >
        Yuklanmoqda...
      </div>
    );
  }

  if (media.status === "error") {
    return (
      <div
        style={{
          padding: "10px",
          background: "rgba(239,68,68,0.08)",
          borderRadius: "10px",
          fontSize: "12px",
          color: "var(--error)",
          marginTop: "10px",
        }}
      >
        Media yuklab bo'lmadi
      </div>
    );
  }

  if (media.status !== "ready") return null;

  if (post.mediaType === "image") {
    return (
      <img
        src={media.url}
        alt="post media"
        style={{
          width: "100%",
          borderRadius: "10px",
          marginTop: "10px",
          maxHeight: "320px",
          objectFit: "contain",
          background: "var(--surface)",
        }}
      />
    );
  }

  // video
  return (
    <video
      controls
      src={media.url}
      style={{
        width: "100%",
        borderRadius: "10px",
        marginTop: "10px",
        maxHeight: "320px",
        background: "#000",
      }}
    />
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onDelete,
}: {
  post: AdminBoardPost;
  onDelete: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAdminBoardPost(post.id);
    setDeleting(false);
    if (result.ok) {
      onDelete(post.id);
    }
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: `${BOARD_ACCENT}20`,
              color: BOARD_ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BroadcastIcon size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {post.authorName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 6px",
                  background: `${BOARD_ACCENT}18`,
                  color: BOARD_ACCENT,
                  borderRadius: "999px",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                admin
              </span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {relativeTime(post.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {post.canDelete ? (
          <button
            disabled={deleting}
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "8px",
              color: "#EF4444",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: deleting ? "wait" : "pointer",
              flexShrink: 0,
              opacity: deleting ? 0.5 : 1,
            }}
            title="O'chirish"
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={14} />
          </button>
        ) : null}
      </div>

      {/* Text */}
      {post.text ? (
        <p
          style={{
            fontSize: "14px",
            color: "var(--text)",
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {post.text}
        </p>
      ) : null}

      {/* Media */}
      <PostMedia post={post} />

      {/* Inline confirm */}
      {confirmDelete ? (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "10px",
          }}
        >
          <p style={{ fontSize: "12.5px", color: "var(--text)", margin: "0 0 8px" }}>
            Bu xabarni o'chirasizmi?
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                flex: 1,
                padding: "8px",
                background: "#EF4444",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              type="button"
              onClick={() => void handleDelete()}
            >
              Ha, o'chir
            </button>
            <button
              style={ghostBtn}
              type="button"
              onClick={() => setConfirmDelete(false)}
            >
              Bekor
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

function Composer({ onPosted }: { onPosted: (post: AdminBoardPost) => void }) {
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError("");
    if (!file) {
      setMediaFile(null);
      return;
    }
    // Client-side size check
    if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
      setError("Rasm 10 MB dan oshmasligi kerak");
      return;
    }
    if (file.type.startsWith("video/") && file.size > 50 * 1024 * 1024) {
      setError("Video 50 MB dan oshmasligi kerak");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Faqat rasm yoki video yuklanadi");
      return;
    }
    setMediaFile(file);
  }

  async function handleSubmit() {
    if (!text.trim() && !mediaFile) {
      setError("Matn yoki media bo'lishi shart");
      return;
    }
    setError("");
    setUploading(true);
    const result = await createAdminBoardPost(text, mediaFile);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
    setMediaFile(null);
    onPosted(result.data);
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${BOARD_ACCENT}40`,
        borderRadius: "16px",
        padding: "14px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 800,
          color: "var(--text)",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <BroadcastIcon size={16} />
        Yangi xabar
      </div>

      <textarea
        placeholder="Xabar yozing..."
        rows={3}
        style={{ ...inputStyle, resize: "vertical" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* Media birikit */}
      <input
        ref={fileInputRef}
        accept="image/*,video/*"
        style={{ display: "none" }}
        type="file"
        onChange={handleFileChange}
      />

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          style={ghostBtn}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {mediaFile ? `Fayl: ${mediaFile.name.slice(0, 24)}${mediaFile.name.length > 24 ? "..." : ""}` : "Media biriktir"}
        </button>
        {mediaFile ? (
          <button
            style={{ ...ghostBtn, color: "#EF4444" }}
            type="button"
            onClick={() => setMediaFile(null)}
          >
            Olib tashlash
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "var(--error)",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            padding: "8px 12px",
            borderRadius: "10px",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: "12px" }}>
        <button
          disabled={uploading}
          style={primaryBtn(uploading, BOARD_ACCENT)}
          type="button"
          onClick={() => void handleSubmit()}
        >
          {uploading ? "Joylashtirilmoqda..." : "Joylash"}
        </button>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function BoardSection() {
  const [posts, setPosts] = useState<AdminBoardPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const data = await getAdminBoardPosts({ page: p, limit: PAGE_LIMIT });
    setPosts(data.items);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  function handlePosted(post: AdminBoardPost) {
    // Yangi xabarni listning boshiga qo'shib, birinchi sahifaga o'tish
    setPage(1);
    setPosts((prev) => [post, ...prev]);
    setTotal((t) => t + 1);
  }

  function handleDeleted(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Composer */}
      <Composer onPosted={handlePosted} />

      {/* Feed header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <span
          style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}
        >
          Xabarlar{total > 0 ? ` (${total})` : ""}
        </span>
        <button
          style={ghostBtn}
          type="button"
          onClick={() => void load(page)}
        >
          <RefreshIcon size={14} /> Yangilash
        </button>
      </div>

      {/* Loading */}
      {loading && posts.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "80px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Empty */}
      {!loading && posts.length === 0 ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px dashed var(--border)",
            borderRadius: "14px",
            padding: "30px 14px",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          <div style={{ marginBottom: "10px", opacity: 0.6 }}>
            <BroadcastIcon size={32} />
          </div>
          <div style={{ fontSize: "13px" }}>Hozircha xabar yo'q</div>
        </div>
      ) : null}

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDelete={handleDeleted} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
          }}
        >
          <button
            disabled={page <= 1}
            style={{ ...ghostBtn, opacity: page <= 1 ? 0.4 : 1 }}
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
            style={{ ...ghostBtn, opacity: page >= totalPages ? 0.4 : 1 }}
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
