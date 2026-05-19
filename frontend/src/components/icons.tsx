export type IconProps = {
  size?: number;
};

function strokeProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
}

export function HomeIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M3 10.7 12 3.5l9 7.2" />
      <path d="M5.5 9.4V20.5h13V9.4" />
      <path d="M9.8 20.5v-5.2h4.4v5.2" />
    </svg>
  );
}

export function TrophyIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5.5H4.2v1.8A3.8 3.8 0 0 0 8 11" />
      <path d="M17 5.5h2.8v1.8A3.8 3.8 0 0 1 16 11" />
      <path d="M12 14v3.4" />
      <path d="M8.4 20.5h7.2" />
      <path d="M9.8 17.4h4.4l.7 3.1H9.1Z" />
    </svg>
  );
}

export function PlusIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2v7.6M8.2 12h7.6" />
    </svg>
  );
}

export function UserIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M5 20.3c.6-4 3.5-6.1 7-6.1s6.4 2.1 7 6.1" />
    </svg>
  );
}

export function ShieldIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M12 3.2 19.5 6v6.1c0 4.7-3.2 7.6-7.5 8.9-4.3-1.3-7.5-4.2-7.5-8.9V6Z" />
      <path d="M9 12.2l2.2 2.2L15 10.5" />
    </svg>
  );
}

export function StarIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.4l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 17.3l-5.38 2.7 1.03-6L3.3 9.8l6-.9z" />
    </svg>
  );
}

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.1v13.8a1 1 0 0 0 1.52.85l11-6.9a1 1 0 0 0 0-1.7l-11-6.9A1 1 0 0 0 8 5.1Z" />
    </svg>
  );
}
