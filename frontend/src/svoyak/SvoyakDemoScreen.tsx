/**
 * Svoyak Demo Screen — overlay'larni mock data bilan ko'rsatish (dev/test).
 *
 * Maqsad: backend va multi-player sozlamasiz QuestionOverlay va BuzzOverlay
 * vizual ko'rinishini lokal browser'da ko'rish. URL'ga ?svoyakDemo=1 qo'shsa
 * App.tsx shu komponentni render qiladi.
 */
import { useState } from "react";
import QuestionOverlay from "./QuestionOverlay";
import BuzzOverlay from "./BuzzOverlay";
import AnswerOverlay from "./AnswerOverlay";
import RoundResultOverlay from "./RoundResultOverlay";

type Stage = "reading" | "waiting_buzz" | "winner" | "blocked" | "answering" | "correct" | "wrong";

const DEMO_QUESTION =
  "Amir Temur saltanati poytaxti qaysi shahar edi va u qaysi yilda asoschisi tomonidan tanlangan?";

export default function SvoyakDemoScreen() {
  const [stage, setStage] = useState<Stage>("reading");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());

  function resetTimer(next: Stage) {
    setStartedAt(new Date().toISOString());
    setStage(next);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050a18" }}>
      {/* Pastdagi kontroller (dev only) */}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          left: 12,
          right: 12,
          zIndex: 200,
          display: "flex",
          gap: 6,
          padding: 8,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          backdropFilter: "blur(8px)",
          flexWrap: "wrap",
        }}
      >
        {(["reading", "waiting_buzz", "winner", "answering", "blocked", "correct", "wrong"] as Stage[]).map((s) => (
          <button
            key={s}
            onClick={() => resetTimer(s)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.20)",
              background: stage === s ? "rgba(245,200,66,0.20)" : "transparent",
              color: stage === s ? "#f5c842" : "#fff",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <QuestionOverlay
        categoryName="Tarix"
        categoryIcon="🏛️"
        value={30}
        questionText={DEMO_QUESTION}
        startedAt={startedAt}
      >
        {stage === "reading" ? (
          <div style={{ textAlign: "center", color: "#FFAA1C", fontSize: 13, padding: 14 }}>
            ⏳ Boshlovchi savolni o'qimoqda...
          </div>
        ) : null}

        {stage === "waiting_buzz" ? (
          <BuzzOverlay state="active" onPress={async () => resetTimer("winner")} />
        ) : null}

        {stage === "winner" ? (
          <BuzzOverlay state="winner" onPress={async () => {}} />
        ) : null}

        {stage === "blocked" ? (
          <BuzzOverlay state="blocked" onPress={async () => {}} blockedBy="Alice" />
        ) : null}

        {stage === "answering" ? (
          <AnswerOverlay
            options={["Saljuqiylar", "Sheyboniylar", "Temuriylar", "Shayboniylar"]}
            onAnswer={async (a) => {
              resetTimer(a === "Temuriylar" ? "correct" : "wrong");
            }}
            onSkip={() => resetTimer("wrong")}
          />
        ) : null}
      </QuestionOverlay>

      {stage === "correct" ? (
        <RoundResultOverlay
          correct={true}
          scoreDelta={30}
          correctAnswer="Temuriylar"
          onDismiss={() => resetTimer("reading")}
          autoDismissMs={0}
        />
      ) : null}

      {stage === "wrong" ? (
        <RoundResultOverlay
          correct={false}
          scoreDelta={-30}
          correctAnswer="Temuriylar"
          userAnswer="Shayboniylar"
          onDismiss={() => resetTimer("reading")}
          autoDismissMs={0}
        />
      ) : null}
    </div>
  );
}
