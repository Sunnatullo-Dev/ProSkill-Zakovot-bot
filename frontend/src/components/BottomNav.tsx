import type { ComponentType } from "react";
import type { NavTab } from "../types";
import type { IconProps } from "./icons";
import { useT } from "../i18n/LanguageContext";
import type { StringKey } from "../i18n/strings";
import { HomeIcon, ShieldIcon, TeamIcon, TrophyIcon, UserIcon } from "./icons";

type BottomNavProps = {
  active: NavTab;
  showAdmin: boolean;
  onNavigate: (tab: NavTab) => void;
};

type NavItem = {
  tab: NavTab;
  /** i18n kalit — Til o'zgarsa label avtomatik yangilanadi. */
  labelKey: StringKey;
  Icon: ComponentType<IconProps>;
};

// Asosiy nav itemlari — Svoyak markazda alohida tugma sifatida render qilinadi.
// Tartibi: chap [Asosiy, Reyting], markaz [Svoyak], o'ng [Jamoa, Profil]
const LEFT_ITEMS: NavItem[] = [
  { tab: "home", labelKey: "nav_home", Icon: HomeIcon },
  { tab: "leaderboard", labelKey: "nav_leaderboard", Icon: TrophyIcon }
];

const RIGHT_ITEMS: NavItem[] = [
  { tab: "team", labelKey: "nav_team", Icon: TeamIcon },
  { tab: "profile", labelKey: "nav_profile", Icon: UserIcon }
];

const ADMIN_ITEM: NavItem = { tab: "admin", labelKey: "nav_home", Icon: ShieldIcon };

function NavButton({
  item,
  active,
  onClick,
  label
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const Icon = item.Icon;
  return (
    <button
      aria-current={active ? "page" : undefined}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "10px 4px 12px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--accent)" : "var(--muted)",
        transition: "color 0.15s"
      }}
      type="button"
      onClick={onClick}
    >
      <Icon size={22} />
      <span
        style={{
          fontSize: "10px",
          fontWeight: active ? 700 : 600,
          whiteSpace: "nowrap"
        }}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav({ active, showAdmin, onNavigate }: BottomNavProps) {
  const t = useT();
  const svoyakActive = active === "svoyak";

  return (
    <nav
      style={{
        position: "fixed",
        left: "50%",
        bottom: 0,
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        display: "flex",
        alignItems: "stretch",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50
      }}
    >
      {/* Chap blok */}
      {LEFT_ITEMS.map((item) => (
        <NavButton
          key={item.tab}
          item={item}
          active={item.tab === active}
          label={t(item.labelKey)}
          onClick={() => onNavigate(item.tab)}
        />
      ))}

      {/* Markaz: SVOYAK — ko'tarilgan, gradient, ko'zga ko'rinarli */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          position: "relative"
        }}
      >
        <button
          type="button"
          aria-current={svoyakActive ? "page" : undefined}
          onClick={() => onNavigate("svoyak")}
          style={{
            position: "relative",
            top: "-18px",
            width: "62px",
            height: "62px",
            borderRadius: "50%",
            border: "4px solid var(--bg)",
            background: "linear-gradient(135deg, #F59E0B, #DC2626)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1px",
            boxShadow: svoyakActive
              ? "0 8px 24px -4px rgba(245,158,11,0.7), 0 0 0 4px rgba(245,158,11,0.18)"
              : "0 6px 18px -4px rgba(245,158,11,0.55)",
            transform: svoyakActive ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.15s, box-shadow 0.2s"
          }}
        >
          <span style={{ fontSize: "26px", lineHeight: 1 }} aria-hidden="true">
            🎲
          </span>
        </button>
        <span
          style={{
            position: "absolute",
            bottom: "8px",
            fontSize: "10px",
            fontWeight: 800,
            color: svoyakActive ? "#F59E0B" : "var(--muted)",
            letterSpacing: "0.02em",
            pointerEvents: "none"
          }}
        >
          Svoyak
        </span>
      </div>

      {/* O'ng blok */}
      {RIGHT_ITEMS.map((item) => (
        <NavButton
          key={item.tab}
          item={item}
          active={item.tab === active}
          label={t(item.labelKey)}
          onClick={() => onNavigate(item.tab)}
        />
      ))}

      {/* Admin (faqat admin uchun) — ro'yxat oxirida */}
      {showAdmin ? (
        <NavButton
          item={ADMIN_ITEM}
          active={active === "admin"}
          label="Admin"
          onClick={() => onNavigate("admin")}
        />
      ) : null}
    </nav>
  );
}
