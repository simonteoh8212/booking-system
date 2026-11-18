"use client";

import { useState, useEffect, useCallback } from "react";
import { normalizeDeskLanguageMode } from "./desk-i18n";
import type { DeskLanguageMode } from "@/types";

const COOKIE_NAME = "app_desk_language";
const STORAGE_KEY = "app_desk_language";

export function getSavedDeskLanguage(): "ONLY_EN" | "ONLY_ZH" {
  if (typeof window === "undefined") return "ONLY_EN";
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) return normalizeDeskLanguageMode(val);
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (match?.[1]) return normalizeDeskLanguageMode(match[1]);
  } catch {}
  return "ONLY_EN";
}

export function saveDeskLanguage(mode: DeskLanguageMode): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeDeskLanguageMode(mode);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
    document.cookie = `${COOKIE_NAME}=${normalized}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("desk_language_changed", { detail: normalized }));
  } catch {}
}

export function useDeskLanguage(initialMode?: DeskLanguageMode) {
  const [langMode, setLangModeState] = useState<DeskLanguageMode>(() =>
    normalizeDeskLanguageMode(initialMode)
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
        setLangModeState(normalizeDeskLanguageMode(String(event.detail)));
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
    const normalized = normalizeDeskLanguageMode(newMode);
    setLangModeState(normalized);
    saveDeskLanguage(normalized);
  }, []);

  return { langMode, setLangMode: changeLanguage, mounted };
}
