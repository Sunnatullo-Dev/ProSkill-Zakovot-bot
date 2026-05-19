import { TeamIcon } from "./icons";

export default function TeamScreen() {
  return (
    <div
      className="animate-fadeInUp"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 24px 104px",
        textAlign: "center"
      }}
    >
      <div style={{ color: "var(--accent)", marginBottom: "16px" }}>
        <TeamIcon size={56} />
      </div>
      <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", marginBottom: "8px" }}>
        Jamoa
      </h1>
      <p style={{ fontSize: "14px", color: "var(--muted)" }}>Bu bo'lim tez orada ishga tushadi.</p>
    </div>
  );
}
