import type { NavTab } from "../types";

type BottomNavProps = {
  active: NavTab;
  isAdmin: boolean;
  onNavigate: (tab: NavTab) => void;
};

type NavItem = {
  tab: NavTab;
  label: string;
  icon: string;
};

const BASE_ITEMS: NavItem[] = [
  { tab: "home", label: "Asosiy", icon: "\u{1F3E0}" },
  { tab: "add", label: "Savol qo'shish", icon: "➕" },
  { tab: "profile", label: "Profil", icon: "\u{1F464}" }
];

const ADMIN_ITEM: NavItem = { tab: "admin", label: "Admin", icon: "\u{1F6E1}" };

export default function BottomNav({ active, isAdmin, onNavigate }: BottomNavProps) {
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

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
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50
      }}
    >
      {items.map((item) => {
        const isActive = item.tab === active;

        return (
          <button
            key={item.tab}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              padding: "9px 4px 11px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              transition: "color 0.15s"
            }}
            type="button"
            onClick={() => onNavigate(item.tab)}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{item.icon}</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 700 : 600,
                whiteSpace: "nowrap"
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
