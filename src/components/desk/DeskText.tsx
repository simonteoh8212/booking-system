"use client";

import React from "react";
import type { DeskLanguageMode } from "@/types";
import { resolveDeskText, type BilingualText } from "@/lib/desk-i18n";

interface DeskTextProps {
  text?: BilingualText;
  zh?: string;
  en?: string;
  mode?: DeskLanguageMode;
  layout?: "stack" | "inline" | "badge";
  primaryClass?: string;
  secondaryClass?: string;
  className?: string;
}

export function DeskText({
  text,
  zh,
  en,
  mode = "ONLY_EN",
  layout = "stack",
  primaryClass = "",
  secondaryClass = "text-xs text-muted-foreground font-normal",
  className = "",
}: DeskTextProps) {
  const itemZh = text ? text.zh : zh || "";
  const itemEn = text ? text.en : en || "";

  const resolved = resolveDeskText({ zh: itemZh, en: itemEn }, mode);

  if (!resolved.secondary) {
    return (
      <span suppressHydrationWarning className={`${primaryClass} ${className}`}>
        {resolved.primary}
      </span>
    );
  }

  if (layout === "inline") {
    return (
      <span suppressHydrationWarning className={`inline-flex items-baseline gap-1.5 ${className}`}>
        <span className={primaryClass}>{resolved.primary}</span>
        <span className={secondaryClass}>({resolved.secondary})</span>
      </span>
    );
  }

  if (layout === "badge") {
    return (
      <span suppressHydrationWarning className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className={primaryClass}>{resolved.primary}</span>
        <span className="opacity-70 text-[0.8em] font-normal">{resolved.secondary}</span>
      </span>
    );
  }

  // Default "stack" layout (primary prominent, secondary below)
  return (
    <div suppressHydrationWarning className={`flex flex-col leading-tight ${className}`}>
      <span className={primaryClass}>{resolved.primary}</span>
      <span className={`mt-0.5 ${secondaryClass}`}>{resolved.secondary}</span>
    </div>
  );
}
