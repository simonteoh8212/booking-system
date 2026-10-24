"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeskLanguageMode } from "@/types";

const COOKIE_NAME = "app_desk_language";
const STORAGE_KEY = "app_desk_language";

export function getSavedDeskLanguage(): DeskLanguageMode {
  if (typeof window === "undefined") return "ONLY_EN";
  try {
    const val = localStorage.getItem(STORAGE_KEY) as DeskLanguageMode | null;
    if (val && ["BILINGUAL_ZH_FIRST", "BILINGUAL_EN_FIRST", "ONLY_ZH", "ONLY_EN"].includes(val)) {
      return val;
    }
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (match && ["BILINGUAL_ZH_FIRST", "BILINGUAL_EN_FIRST", "ONLY_ZH", "ONLY_EN"].includes(match[1])) {
      return match[1] as DeskLanguageMode;
    }
  } catch {}
  return "ONLY_EN";
}

export function saveDeskLanguage(mode: DeskLanguageMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    document.cookie = `${COOKIE_NAME}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("desk_language_changed", { detail: mode }));
  } catch {}
}

export function useDeskLanguage(initialMode?: DeskLanguageMode) {
  const [langMode, setLangModeState] = useState<DeskLanguageMode>(
    initialMode || "ONLY_EN"
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Client-side synchronization on mount
    const saved = getSavedDeskLanguage();
    if (saved) {
      setLangModeState(saved);
    }

    function handleSync(event?: Event) {
      if (event instanceof CustomEvent && event.detail) {
        setLangModeState(event.detail as DeskLanguageMode);
        return;
      }
      const updated = getSavedDeskLanguage();
      if (updated) {
        setLangModeState(updated);
      }
    }

    window.addEventListener("storage", handleSync);
    window.addEventListener("desk_language_changed", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("desk_language_changed", handleSync);
    };
  }, []);

  const changeLanguage = useCallback((newMode: DeskLanguageMode) => {
    setLangModeState(newMode);
    saveDeskLanguage(newMode);
  }, []);

  return { langMode, setLangMode: changeLanguage, mounted };
}
