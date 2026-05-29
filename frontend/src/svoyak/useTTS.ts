/**
 * useTTS — Web Speech API orqali savolni ovozli o'qish.
 *
 * Svoyak spec'i: "Boshlovchi savolni o'qiydi" — bu ovozli imitatsiya.
 * Browser'lar (Chrome, Safari, Telegram WebView) `speechSynthesis` qo'llab-quvvatlaydi.
 *
 * Tanlangan til: o'zbek bo'lsa `uz` (yoki `tr` fallback — yaqinroq tovush),
 * rus bo'lsa `ru-RU`. Foydalanuvchi mute qila oladi (localStorage'da
 * `svoyak:tts:mute` saqlanadi).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "svoyak:tts:mute";

function readMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMute(v: boolean): void {
  try {
    if (v) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
}

function pickVoice(lang: "uz" | "ru"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const wanted = lang === "uz" ? ["uz", "tr", "az"] : ["ru"];
  for (const prefix of wanted) {
    const v = voices.find((vv) => vv.lang.toLowerCase().startsWith(prefix));
    if (v) return v;
  }
  return voices[0] ?? null;
}

type UseTTSOptions = {
  /** Til kodi — `uz` (Lat/Cyr) yoki `ru`. */
  lang?: "uz" | "ru";
  /** onend callback — TTS tugaganda chaqiriladi. */
  onEnd?: () => void;
};

export type UseTTSResult = {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  supported: boolean;
};

export function useTTS(opts: UseTTSOptions = {}): UseTTSResult {
  const { lang = "uz", onEnd } = opts;
  const [isMuted, setIsMuted] = useState<boolean>(readMute);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const supported =
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined";

  // Voices ba'zi browser'larda asinxron yuklanadi — preload qilamiz.
  useEffect(() => {
    if (!supported) return;
    const onVoicesChanged = () => {
      // voices ro'yxati yangilandi (mahalliy kesh); hech narsa qilmaymiz,
      // pickVoice() har speak'da qayta chaqiriladi.
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || isMuted || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const v = pickVoice(lang);
        if (v) {
          utter.voice = v;
          utter.lang = v.lang;
        } else {
          utter.lang = lang === "uz" ? "uz-UZ" : "ru-RU";
        }
        utter.rate = 0.98;
        utter.pitch = 1.0;
        utter.volume = 1.0;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => {
          setIsSpeaking(false);
          onEndRef.current?.();
        };
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [supported, isMuted, lang]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    setIsSpeaking(false);
  }, [supported]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      writeMute(next);
      if (next) {
        try {
          window.speechSynthesis?.cancel();
        } catch {
          /* ignore */
        }
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  // Component unmount'da to'xtatish — fontda overlay'ni yopgan o'yinchi
  // boshqa ekrandagi savol ovoziga aralashmasligi uchun.
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { speak, cancel, isSpeaking, isMuted, toggleMute, supported };
}
