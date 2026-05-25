/**
 * Birinchi kirgan foydalanuvchi uchun 3 bosqichli tanishtirish.
 *
 *   1) Til tanlash (UZ-latn / UZ-cyrl / RU)
 *   2) "Zakovat nima?" — 3 ta feature kartasi bilan
 *   3) "Qanday o'ynaymiz?" — 4 ta zinapoya bosqichlari
 *
 * Vizual: gradient background, gradient title, glow ring icon ortida,
 * feature cards, gradient primary button. Har bosqichda Skip mavjud.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LANG_FLAGS, LANG_LABELS, LANG_SUBLABEL, SUPPORTED_LANGS } from "../i18n/strings";
import type { Lang } from "../i18n/strings";
import { hapticSelect, hapticTap } from "../utils/haptics";

type OnboardingScreenProps = {
  onDone: (chosenLang: Lang) => void;
};

const TOTAL_STEPS = 3;

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  padding: "20px 20px 24px",
  maxWidth: "430px",
  margin: "0 auto",
  width: "100%",
  position: "relative",
  overflow: "hidden"
};

// Yuqori-chap radial yorug'lik — chuqurlik hissi, professional ko'rinish.
const ambientGlowStyle: CSSProperties = {
  position: "absolute",
  top: "-160px",
  left: "-100px",
  width: "360px",
  height: "360px",
  background:
    "radial-gradient(closest-side, rgba(77,166,255,0.20), rgba(77,166,255,0) 70%)",
  pointerEvents: "none",
  zIndex: 0
};

// Pastki-o'ngdagi binafsha radial yorug'lik
const ambientGlow2Style: CSSProperties = {
  position: "absolute",
  bottom: "-120px",
  right: "-80px",
  width: "320px",
  height: "320px",
  background:
    "radial-gradient(closest-side, rgba(167,139,250,0.16), rgba(167,139,250,0) 70%)",
  pointerEvents: "none",
  zIndex: 0
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  position: "relative",
  zIndex: 1
};

const progressBarStyle: CSSProperties = {
  flex: 1,
  height: "4px",
  background: "rgba(255,255,255,0.08)",
  borderRadius: "999px",
  marginRight: "14px",
  overflow: "hidden"
};

const skipButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  padding: "8px 4px",
  letterSpacing: "0.01em"
};

const stepCounterStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginTop: "12px",
  marginBottom: "4px",
  position: "relative",
  zIndex: 1
};

const contentWrapStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  gap: "16px",
  padding: "8px 4px 24px",
  position: "relative",
  zIndex: 1
};

const iconWrapStyle: CSSProperties = {
  position: "relative",
  width: "120px",
  height: "120px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "8px"
};

const iconGlowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  background:
    "radial-gradient(closest-side, rgba(77,166,255,0.35), rgba(167,139,250,0.15), rgba(77,166,255,0) 70%)",
  filter: "blur(4px)"
};

const iconEmojiStyle: CSSProperties = {
  position: "relative",
  fontSize: "76px",
  lineHeight: 1,
  filter: "drop-shadow(0 6px 14px rgba(77,166,255,0.35))"
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  background: "linear-gradient(120deg, #ffffff 0%, #BFD7FF 60%, #C4B5FD 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  lineHeight: 1.2
};

const subtitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--muted)",
  lineHeight: 1.6,
  maxWidth: "320px"
};

const featureGridStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
  maxWidth: "320px",
  marginTop: "12px"
};

const featureCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
  border: "1px solid rgba(255,255,255,0.06)",
  textAlign: "left"
};

const featureIconStyle: CSSProperties = {
  flex: "0 0 auto",
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  background: "linear-gradient(135deg, rgba(77,166,255,0.20), rgba(167,139,250,0.20))",
  border: "1px solid rgba(77,166,255,0.20)"
};

const featureTextWrapStyle: CSSProperties = {
  flex: 1,
  minWidth: 0
};

const featureTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "var(--text)",
  marginBottom: "2px"
};

const featureSubtitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--muted)",
  lineHeight: 1.4
};

const langListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
  maxWidth: "320px",
  marginTop: "8px"
};

const langButtonBase: CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "16px",
  fontSize: "16px",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "transform 0.12s, border-color 0.15s, background 0.15s"
};

const footerStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
  position: "relative",
  zIndex: 1
};

const primaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: "17px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #4DA6FF 0%, #7C5BFF 100%)",
  color: "#0B1126",
  fontSize: "15px",
  fontWeight: 900,
  cursor: "pointer",
  letterSpacing: "0.01em",
  boxShadow: "0 10px 24px -8px rgba(77,166,255,0.55), 0 6px 14px -6px rgba(124,91,255,0.45)",
  transition: "transform 0.1s, box-shadow 0.2s"
};

const secondaryButtonStyle: CSSProperties = {
  padding: "17px 22px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--text)",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer"
};

// Animatsiya uchun key — har bosqich o'zgarganda content qayta enter qiladi.
function stepAnimationStyle(step: number): CSSProperties {
  return {
    animation: "onboardingFadeUp 0.35s ease-out both",
    // key alohida `key=` prop sifatida ham qo'shilgan, lekin animation
    // qaytadan ishlashi uchun shu yo'l ishonchli.
    animationDelay: "0ms",
    // step parametri faqat animatsiya re-trigger uchun ishlatiladi
    // (key orqali React mount qaytadan amalga oshiradi).
  };
}

function ProgressBar({ step }: { step: number }) {
  const percent = ((step + 1) / TOTAL_STEPS) * 100;
  return (
    <div style={progressBarStyle}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: "linear-gradient(90deg, #4DA6FF, #7C5BFF)",
          borderRadius: "999px",
          transition: "width 0.35s cubic-bezier(0.22, 1, 0.36, 1)"
        }}
      />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={featureCardStyle}>
      <div style={featureIconStyle} aria-hidden="true">
        {icon}
      </div>
      <div style={featureTextWrapStyle}>
        <div style={featureTitleStyle}>{title}</div>
        <div style={featureSubtitleStyle}>{subtitle}</div>
      </div>
    </div>
  );
}

function NumberedStep({
  number,
  icon,
  title,
  subtitle
}: {
  number: number;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={featureCardStyle}>
      <div
        style={{
          ...featureIconStyle,
          background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(77,166,255,0.18))",
          position: "relative"
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4DA6FF, #7C5BFF)",
            color: "#0B1126",
            fontSize: "11px",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(77,166,255,0.5)"
          }}
        >
          {number}
        </span>
      </div>
      <div style={featureTextWrapStyle}>
        <div style={featureTitleStyle}>{title}</div>
        <div style={featureSubtitleStyle}>{subtitle}</div>
      </div>
    </div>
  );
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { lang, setLang, t } = useLanguage();
  const [step, setStep] = useState(0);

  function handleSkip() {
    hapticTap();
    onDone(lang);
  }

  function handleNext() {
    hapticTap();
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      onDone(lang);
    }
  }

  function handleBack() {
    if (step > 0) {
      hapticTap();
      setStep(step - 1);
    }
  }

  function handlePickLang(next: Lang) {
    hapticSelect();
    setLang(next);
  }

  // Bosqichga qarab xabarlar — i18n string'lari (lekin feature kartlari
  // matnlari hozircha shu komponent ichida, kelajakda strings.ts'ga
  // ko'chirilishi mumkin).
  const stepLabels: Record<Lang, { features: { title: string; subtitle: string }[]; steps: { title: string; subtitle: string }[] }> = {
    "uz-latn": {
      features: [
        { title: "Tezkor o'yin", subtitle: "10 ta savol, har biriga 15 soniya" },
        { title: "Jamoa bilan", subtitle: "Do'stlar bilan birgalikda bellashing" },
        { title: "Reyting", subtitle: "TOP-100 ichiga kiring" }
      ],
      steps: [
        { title: "Savol oching", subtitle: "Mavzu va qiyinlikni tanlang" },
        { title: "Vaqt ichida", subtitle: "Tezroq javob — ko'proq ball" },
        { title: "Streak yig'ing", subtitle: "Ketma-ket to'g'ri javob — bonus" },
        { title: "Reytingda", subtitle: "Eng yaxshilar qatoriga chiqing" }
      ]
    },
    "uz-cyrl": {
      features: [
        { title: "Тезкор ўйин", subtitle: "10 та савол, ҳар бирига 15 сония" },
        { title: "Жамоа билан", subtitle: "Дўстлар билан биргаликда беллашинг" },
        { title: "Рейтинг", subtitle: "ТОП-100 ичига киринг" }
      ],
      steps: [
        { title: "Савол очинг", subtitle: "Мавзу ва қийинликни танланг" },
        { title: "Вақт ичида", subtitle: "Тезроқ жавоб — кўпроқ балл" },
        { title: "Streak йиғинг", subtitle: "Кетма-кет тўғри жавоб — бонус" },
        { title: "Рейтингда", subtitle: "Энг яхшилар қаторига чиқинг" }
      ]
    },
    ru: {
      features: [
        { title: "Быстрая игра", subtitle: "10 вопросов, по 15 секунд" },
        { title: "С командой", subtitle: "Соревнуйтесь вместе с друзьями" },
        { title: "Рейтинг", subtitle: "Попадите в ТОП-100" }
      ],
      steps: [
        { title: "Выберите", subtitle: "Тему и уровень сложности" },
        { title: "Отвечайте", subtitle: "Быстрее — больше очков" },
        { title: "Серия", subtitle: "Подряд правильно — бонус" },
        { title: "Рейтинг", subtitle: "Войдите в число лучших" }
      ]
    }
  };

  const labels = stepLabels[lang];

  return (
    <main style={containerStyle}>
      <div style={ambientGlowStyle} aria-hidden="true" />
      <div style={ambientGlow2Style} aria-hidden="true" />

      <style>
        {`@keyframes onboardingFadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }`}
      </style>

      <div style={headerStyle}>
        <ProgressBar step={step} />
        <button type="button" style={skipButtonStyle} onClick={handleSkip}>
          {t("skip")}
        </button>
      </div>
      <div style={stepCounterStyle}>
        {t("onboarding_step_progress", { n: step + 1, total: TOTAL_STEPS })}
      </div>

      <div key={step} style={{ ...contentWrapStyle, ...stepAnimationStyle(step) }}>
        {step === 0 ? (
          <>
            <div style={iconWrapStyle}>
              <div style={iconGlowStyle} aria-hidden="true" />
              <span style={iconEmojiStyle} aria-hidden="true">🌍</span>
            </div>
            <div style={titleStyle}>{t("onboarding_step_lang_title")}</div>
            <div style={subtitleStyle}>{t("onboarding_step_lang_subtitle")}</div>
            <div style={langListStyle}>
              {SUPPORTED_LANGS.map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handlePickLang(code)}
                    style={{
                      ...langButtonBase,
                      background: active
                        ? "linear-gradient(135deg, rgba(77,166,255,0.18), rgba(124,91,255,0.14))"
                        : "rgba(255,255,255,0.03)",
                      border: active ? "1.5px solid #4DA6FF" : "1.5px solid rgba(255,255,255,0.08)",
                      color: "var(--text)",
                      boxShadow: active
                        ? "0 6px 18px -10px rgba(77,166,255,0.6)"
                        : "none"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ marginRight: "12px", fontSize: "22px" }}>{LANG_FLAGS[code]}</span>
                      <span style={{ fontWeight: 800 }}>{LANG_LABELS[code]}</span>
                      {LANG_SUBLABEL[code] ? (
                        <span style={{ color: "var(--muted)", marginLeft: "8px", fontWeight: 500, fontSize: "14px" }}>
                          {LANG_SUBLABEL[code]}
                        </span>
                      ) : null}
                    </span>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: active ? "linear-gradient(135deg, #4DA6FF, #7C5BFF)" : "transparent",
                        border: active ? "none" : "1.5px solid rgba(255,255,255,0.20)",
                        color: "#0B1126",
                        fontSize: "13px",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {active ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div style={iconWrapStyle}>
              <div style={iconGlowStyle} aria-hidden="true" />
              <span style={iconEmojiStyle} aria-hidden="true">🧠</span>
            </div>
            <div style={titleStyle}>{t("onboarding_step_welcome_title")}</div>
            <div style={subtitleStyle}>{t("onboarding_step_welcome_text")}</div>
            <div style={featureGridStyle}>
              <FeatureCard icon="🎯" title={labels.features[0].title} subtitle={labels.features[0].subtitle} />
              <FeatureCard icon="👥" title={labels.features[1].title} subtitle={labels.features[1].subtitle} />
              <FeatureCard icon="🏆" title={labels.features[2].title} subtitle={labels.features[2].subtitle} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div style={iconWrapStyle}>
              <div style={iconGlowStyle} aria-hidden="true" />
              <span style={iconEmojiStyle} aria-hidden="true">🎯</span>
            </div>
            <div style={titleStyle}>{t("onboarding_step_play_title")}</div>
            <div style={subtitleStyle}>{t("onboarding_step_play_text")}</div>
            <div style={featureGridStyle}>
              <NumberedStep number={1} icon="📚" title={labels.steps[0].title} subtitle={labels.steps[0].subtitle} />
              <NumberedStep number={2} icon="⏱️" title={labels.steps[1].title} subtitle={labels.steps[1].subtitle} />
              <NumberedStep number={3} icon="🔥" title={labels.steps[2].title} subtitle={labels.steps[2].subtitle} />
              <NumberedStep number={4} icon="🏆" title={labels.steps[3].title} subtitle={labels.steps[3].subtitle} />
            </div>
          </>
        ) : null}
      </div>

      <div style={footerStyle}>
        {step > 0 ? (
          <button type="button" style={secondaryButtonStyle} onClick={handleBack}>
            {t("back")}
          </button>
        ) : null}
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={handleNext}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          {step === TOTAL_STEPS - 1 ? t("onboarding_get_started") : t("next")}
        </button>
      </div>
    </main>
  );
}
