"use client";

import { DESK_LANGUAGE_OPTIONS, normalizeDeskLanguageMode } from "@/lib/desk-i18n";
import { FlagIcon } from "@/components/FlagIcon";
import type { DeskLanguageMode } from "@/types";
import { Globe, Check } from "lucide-react";

interface DeskLanguageFirstTimeModalProps {
  open: boolean;
  currentMode: DeskLanguageMode;
  onSelect: (mode: DeskLanguageMode) => void;
}

export function DeskLanguageFirstTimeModal({
  open,
  currentMode,
  onSelect,
}: DeskLanguageFirstTimeModalProps) {
  if (!open) return null;
  const normalized = normalizeDeskLanguageMode(currentMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Globe className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Choose Language / 选择语言
          </h2>
        </div>

        <div className="space-y-2.5">
          {DESK_LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.id === normalized;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FlagIcon country={opt.country} className="h-4 w-6" />
                  <span className="font-semibold text-sm">{opt.label}</span>
                </div>

                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
