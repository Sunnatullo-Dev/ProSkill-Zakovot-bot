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

export function TeamIcon({ size = 22 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.2 19.5c.6-3.6 3-5.4 5.8-5.4s5.2 1.8 5.8 5.4" />
      <path d="M15.6 5.2a3.4 3.4 0 0 1 0 6.4" />
      <path d="M17 14.4c2.4.5 3.9 2.2 4.3 5.1" />
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

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M6 6l12 12M18 6 6 18" />
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

export function DashboardIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    </svg>
  );
}

export function QuestionIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.6 2.6 0 0 1 5.2 0c0 1.6-2.6 1.9-2.6 3.6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function InboxIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M3.5 13.4 5 5.2A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.2l1.5 8.2" />
      <path d="M3.5 13.4V19a1.5 1.5 0 0 0 1.5 1.5h14A1.5 1.5 0 0 0 20.5 19v-5.6" />
      <path d="M3.5 13.4h4.6l1.5 2.6h4.8l1.5-2.6h4.6" />
    </svg>
  );
}

export function AlertIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M11 4.3 3.5 18a1.5 1.5 0 0 0 1.3 2.3h14.4A1.5 1.5 0 0 0 20.5 18L13 4.3a1.5 1.5 0 0 0-2 0Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function TagIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M3.5 12.6 11.4 4.7a1.5 1.5 0 0 1 1.1-.4h6a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-.4 1.1l-7.9 7.9a1.5 1.5 0 0 1-2.1 0L3.5 14.7a1.5 1.5 0 0 1 0-2.1Z" />
      <circle cx="15.6" cy="8.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </svg>
  );
}

export function EditIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      {/* Qalam tanasi — burchakda chizilgan to'g'ri to'rtburchak */}
      <path d="m4 20 1.2-4.4L16.6 4.2a1.7 1.7 0 0 1 2.4 0l1 1a1.7 1.7 0 0 1 0 2.4L8.4 19l-4.4 1Z" />
      {/* Eraser/metal ferrule — qalamning yuqori ulanish chizig'i */}
      <path d="m14.4 6.4 3.5 3.5" />
      {/* Tip alomati — qalamning uchki burchagi */}
      <path d="m4.6 18 1.8 1.8" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M5.5 7 6.6 19.4A1.5 1.5 0 0 0 8.1 21h7.8a1.5 1.5 0 0 0 1.5-1.6L18.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function RefreshIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6" />
      <path d="M20 4v4.6h-4.6" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.4" />
      <path d="M4 20v-4.6h4.6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M14.5 4.5 8 12l6.5 7.5" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M9.5 4.5 16 12l-6.5 7.5" />
    </svg>
  );
}

export function ControllerIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M6.5 7h11A3.5 3.5 0 0 1 21 10.5v3A3.5 3.5 0 0 1 17.5 17h-1.2L14.5 19h-5L7.7 17H6.5A3.5 3.5 0 0 1 3 13.5v-3A3.5 3.5 0 0 1 6.5 7Z" />
      <path d="M7.5 11.2v2.6M6.2 12.5h2.6" />
      <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="17.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function SwordsIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="m3.5 17.5 7-7 3 3-7 7H3.5v-3Z" />
      <path d="m20.5 6.5-7 7-3-3 7-7h3v3Z" />
      <path d="m6.5 14.5 3 3" />
      <path d="m17.5 9.5-3-3" />
    </svg>
  );
}

export function UploadIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M12 4v12" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </svg>
  );
}

export function FileIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M14 3.5H6.5A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5Z" />
      <path d="M14 3.5V8.5h5" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

export function XCircleIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function SpeakerIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function BroadcastIcon({ size = 20 }: IconProps) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}
