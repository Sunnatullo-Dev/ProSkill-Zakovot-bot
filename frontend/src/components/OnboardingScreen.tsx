/**
 * Birinchi kirgan foydalanuvchi uchun 3 bosqichli tanishtirish.
 *
 *   1) Til tanlash (UZ-latn / UZ-cyrl / RU)
 *   2) "Zakovat nima?" — qisqacha xush kelibsiz
 *   3) "Qanday o'ynaymiz?" — asosiy mexanika
 *
 * Har bosqichda "O'tkazib yuborish" tugmasi bor — istamasa darrov ekrandan
 * chiqib ketishi mumkin (lekin tanlagan til saqlanadi).
 */
import { useState } from "react";
import type { CSSProperties } from "react";
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
  padding: "20px",
  maxWidth: "430px",
  margin: "0 auto",
  width: "100%"
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
};

const dotsStyle: CSSProperties = {
  display: "flex",
  gap: "6px"
};

const skipButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 10px"
};

const contentWrapStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  gap: "16px",
  padding: "20px 8px"
};

const titleStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 900,
  letterSpacing: "-0.02em"
};

const subtitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--muted)",
  lineHeight: 1.5,
  maxWidth: "320px"
};

const langListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
  maxWidth: "320px",
  marginTop: "16px"
};

const langButtonBase: CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "14px",
  fontSize: "16px",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "transform 0.15s, border-color 0.15s, background 0.15s"
};

const footerStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "20px"
};

const primaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background: "var(--accent)",
  color: "var(--bg)",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer"
};

const secondaryButtonStyle: CSSProperties = {
  padding: "16px 20px",
  borderRadius: "14px",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer"
};

const stepIconStyle: CSSProperties = {
  fontSize: "56px",
  marginBottom: "4px"
};

function Dot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: active ? "20px" : "8px",
        height: "8px",
        borderRadius: "999px",
        background: active ? "var(--accent)" : "var(--border)",
        transition: "all 0.2s"
      }}
    />
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

  return (
    <main style={containerStyle}>
      <div style={headerStyle}>
        <div style={dotsStyle}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <Dot key={i} active={i === step} />
          ))}
        </div>
        <button type="button" style={skipButtonStyle} onClick={handleSkip}>
          {t("skip")}
        </button>
      </div>

      <div style={contentWrapStyle}>
        {step === 0 ? (
          <>
            <div style={stepIconStyle} aria-hidden="true">🌍</div>
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
                      background: active ? "rgba(77,166,255,0.12)" : "var(--card)",
                      border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      color: "var(--text)"
                    }}
                  >
                    <span>
                      <span style={{ marginRight: "10px", fontSize: "20px" }}>{LANG_FLAGS[code]}</span>
                      {LANG_LABELS[code]}
                      {LANG_SUBLABEL[code] ? (
                        <span style={{ color: "var(--muted)", marginLeft: "6px", fontWeight: 500 }}>
                          {LANG_SUBLABEL[code]}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ fontSize: "18px", opacity: active ? 1 : 0 }}>✓</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div style={stepIconStyle} aria-hidden="true">🧠</div>
            <div style={titleStyle}>{t("onboarding_step_welcome_title")}</div>
            <div style={subtitleStyle}>{t("onboarding_step_welcome_text")}</div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div style={stepIconStyle} aria-hidden="true">🎯</div>
            <div style={titleStyle}>{t("onboarding_step_play_title")}</div>
            <div style={subtitleStyle}>{t("onboarding_step_play_text")}</div>
          </>
        ) : null}
      </div>

      <div style={footerStyle}>
        {step > 0 ? (
          <button type="button" style={secondaryButtonStyle} onClick={handleBack}>
            {t("back")}
          </button>
        ) : null}
        <button type="button" style={primaryButtonStyle} onClick={handleNext}>
          {step === TOTAL_STEPS - 1 ? t("onboarding_get_started") : t("next")}
        </button>
      </div>
    </main>
  );
}
