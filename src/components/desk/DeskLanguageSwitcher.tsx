"use client";

import { useState } from "react";
import type { DeskLanguageMode } from "@/types";
import { DESK_LANGUAGE_OPTIONS, normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/FlagIcon";
import { Check } from "lucide-react";

interface DeskLanguageSwitcherProps {
  currentMode: DeskLanguageMode;
  onLanguageChange: (mode: DeskLanguageMode) => void;
}

export function DeskLanguageSwitcher({
  currentMode,
  onLanguageChange,
}: DeskLanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalized = normalizeDeskLanguageMode(currentMode);

  const activeOption =
    DESK_LANGUAGE_OPTIONS.find((o) => o.id === normalized) ||
    DESK_LANGUAGE_OPTIONS[0];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3 rounded-xl border font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-muted cursor-pointer"
        title="Language"
        aria-label="Language"
      >
        <FlagIcon country={activeOption.country} />
        <span>{activeOption.label}</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-44 p-1.5 bg-card border border-border shadow-lg rounded-xl space-y-0.5">
            {DESK_LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = opt.id === normalized;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onLanguageChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FlagIcon country={opt.country} />
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
