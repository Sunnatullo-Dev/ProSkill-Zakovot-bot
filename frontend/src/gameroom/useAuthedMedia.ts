/**
 * useAuthedMedia — media URL'ni hal qiladi.
 *
 * - Mutlaq http(s) URL → to'g'ridan-to'g'ri qaytaradi (auth shart emas).
 * - Nisbiy `/api/...` yo'l → autentifikatsiya headerida yuklab, Blob object URL qaytaradi.
 * - null/undefined → null qaytaradi.
 *
 * Object URL komponent unmount bo'lganda avtomatik ravishda bekor qilinadi.
 */
import { useEffect, useState } from "react";
import { fetchAuthedBlob } from "../api/client";

export type MediaState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

export function useAuthedMedia(mediaUrl: string | null | undefined): MediaState {
  const [state, setState] = useState<MediaState>(() => {
    if (!mediaUrl) return { status: "idle" };
    // Mutlaq URL — darhol tayyor
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      return { status: "ready", url: mediaUrl };
    }
    return { status: "loading" };
  });

  useEffect(() => {
    if (!mediaUrl) {
      setState({ status: "idle" });
      return;
    }

    // Mutlaq URL — auth shart emas, to'g'ridan-to'g'ri ishlatiladi
    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      setState({ status: "ready", url: mediaUrl });
      return;
    }

    // Nisbiy proxy yo'l — autentifikatsiyalangan fetch
    let objectUrl: string | null = null;
    let cancelled = false;

    setState({ status: "loading" });

    fetchAuthedBlob(mediaUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", url: objectUrl });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useAuthedMedia] Media yuklab bo'lmadi:", err);
        setState({ status: "error" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaUrl]);

  return state;
}
