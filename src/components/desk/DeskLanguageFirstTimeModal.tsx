"use client";

import { DESK_LANGUAGE_OPTIONS } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";
import { Globe, Check, Sparkles } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <Globe className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Welcome to Salon Desk / 欢迎使用前台系统
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Please choose your preferred language layout
            <br />
            请选择您的收银前台语言偏好（之后可随时在顶部更改）
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {DESK_LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.id === currentMode;
            const isRecommended = opt.id === "BILINGUAL_ZH_FIRST";

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-[0.98] ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/80 hover:border-primary/60 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{opt.flag}</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                        {opt.label}
                      </p>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          Recommended / 推荐
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.subLabel}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted">
                        Preview: <strong className="text-foreground">{opt.previewPrimary}</strong>
                        {opt.previewSecondary ? ` · ${opt.previewSecondary}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center pt-1 border-t">
          <p className="text-[11px] text-muted-foreground">
            You can always toggle this anytime using the globe button in the top navigation bar.
          </p>
        </div>
      </div>
    </div>
  );
}
