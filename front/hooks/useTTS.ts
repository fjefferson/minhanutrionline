"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TTSState = "idle" | "loading" | "playing" | "error";

/** Remove marcadores Markdown para que a voz não leia "asterisco asterisco". */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const engine = process.env.NEXT_PUBLIC_TTS_ENGINE ?? "browser";

export function useTTS({ text, reportId }: { text: string; reportId: string }) {
  const [state, setState] = useState<TTSState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  /* ── Parar ── */
  const stop = useCallback(() => {
    // Browser engine
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    // OpenAI engine
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setState("idle");
  }, []);

  /* ── Browser TTS (Web Speech API) ── */
  const toggleBrowser = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("error");
      return;
    }

    if (state === "playing") {
      stop();
      return;
    }

    if (!text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setState("playing");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("error");

    window.speechSynthesis.speak(utterance);
    setState("playing");
  }, [state, stop, text]);

  /* ── OpenAI TTS (via backend) ── */
  const toggleOpenAI = useCallback(async () => {
    if (state === "playing") {
      stop();
      return;
    }

    if (!reportId) return;

    setState("loading");
    try {
      const cacheKey = `tts-${reportId}`;
      const cacheStorage = await caches.open("tts-audio");
      let blob: Blob;

      const cached = await cacheStorage.match(cacheKey);
      if (cached) {
        blob = await cached.blob();
      } else {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/glp1/tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ reportId }),
          },
        );

        if (!response.ok) throw new Error("TTS request failed");

        // Clona antes de consumir — Cache API precisa de uma response intacta
        const responseToCache = response.clone();
        await cacheStorage.put(cacheKey, responseToCache);
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");

      await audio.play();
      setState("playing");
    } catch {
      setState("error");
    }
  }, [state, stop, reportId]);

  const toggle = engine === "openai" ? toggleOpenAI : toggleBrowser;

  /* ── Cleanup ao desmontar ── */
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return { state, toggle, stop };
}
