import type { ComponentType } from "react";
import type { NavTab } from "../types";
import type { IconProps } from "./icons";
import { HomeIcon, ShieldIcon, TeamIcon, TrophyIcon, UserIcon } from "./icons";

type BottomNavProps = {
  active: NavTab;
  showAdmin: boolean;
  onNavigate: (tab: NavTab) => void;
};

type NavItem = {
  tab: NavTab;
  label: string;
  Icon: ComponentType<IconProps>;
};

const BASE_ITEMS: NavItem[] = [
  { tab: "home", label: "Asosiy", Icon: HomeIcon },
  { tab: "leaderboard", label: "Reyting", Icon: TrophyIcon },
  { tab: "team", label: "Jamoa", Icon: TeamIcon },
  { tab: "profile", label: "Profil", Icon: UserIcon }
];

const ADMIN_ITEM: NavItem = { tab: "admin", label: "Admin", Icon: ShieldIcon };

export default function BottomNav({ active, showAdmin, onNavigate }: BottomNavProps) {
  const items = showAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

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
        const Icon = item.Icon;

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
              gap: "4px",
              padding: "10px 4px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              transition: "color 0.15s"
            }}
            type="button"
            onClick={() => onNavigate(item.tab)}
          >
            <Icon size={22} />
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
