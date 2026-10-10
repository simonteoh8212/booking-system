"use client";

import { useState } from "react";
import type { DeskLanguageMode } from "@/types";
import { DESK_LANGUAGE_OPTIONS } from "@/lib/desk-i18n";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";

interface DeskLanguageSwitcherProps {
  currentMode: DeskLanguageMode;
  onLanguageChange: (mode: DeskLanguageMode) => void;
}

export function DeskLanguageSwitcher({
  currentMode,
  onLanguageChange,
}: DeskLanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeOption =
    DESK_LANGUAGE_OPTIONS.find((o) => o.id === currentMode) ||
    DESK_LANGUAGE_OPTIONS[0];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 px-3 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-muted shadow-xs transition-all cursor-pointer"
        title="Change Display Language / 切换语言"
      >
        <span className="text-base">{activeOption.flag}</span>
        <span className="font-extrabold">{activeOption.label.split(" ")[0]}</span>
        <Globe className="h-4 w-4 ml-0.5 text-muted-foreground opacity-70" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-14 z-50 w-72 p-2 bg-card border-2 shadow-2xl rounded-2xl space-y-1.5 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-bold text-foreground">
                Desk Language / 柜台语言模式
              </p>
              <p className="text-[11px] text-muted-foreground">
                Select display language or priority
              </p>
            </div>

            {DESK_LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentMode;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onLanguageChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-start justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{opt.flag}</span>
                      <span className="text-sm font-extrabold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {opt.subLabel}
                    </p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary mt-1" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
