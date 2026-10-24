"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { resolveLabel } from "@/lib/desk-i18n";
import type { DeskLanguageMode } from "@/types";

export interface FloatingSaveBtnProps {
  /** Whether there are unsaved changes. When false, the dock animates out */
  show: boolean;
  /** Function called when user clicks Save Changes */
  onSave: () => void | Promise<void>;
  /** Optional function called when user clicks Discard */
  onDiscard?: () => void;
  /** True while the save operation is pending/in-flight */
  isPending?: boolean;
  /** Optional disabled condition (e.g. invalid form fields) */
  disabled?: boolean;
  /** Custom heading text (defaults to "Unsaved Changes" / "未保存的修改") */
  title?: string;
  /** Custom description text (defaults to "Settings changed. Save to apply changes." / "设置已修改，请保存以生效。") */
  description?: string;
  /** Custom save button text (defaults to "Save Changes" / "保存修改") */
  saveText?: string;
  /** Custom discard button text (defaults to "Discard" / "放弃") */
  discardText?: string;
  /** Language mode for bilingual translations */
  langMode?: DeskLanguageMode;
  /** Optional custom class for outer wrapper */
  className?: string;
}

export function FloatingSaveBtn({
  show,
  onSave,
  onDiscard,
  isPending = false,
  disabled = false,
  title,
  description,
  saveText,
  discardText,
  langMode = "ONLY_EN",
  className = "",
}: FloatingSaveBtnProps) {
  const displayTitle =
    title || resolveLabel({ zh: "未保存的修改", en: "Unsaved Changes" }, langMode);

  const displayDesc =
    description ||
    resolveLabel(
      { zh: "设置已修改，请保存以生效。", en: "Settings changed. Save to apply changes." },
      langMode
    );

  const displayDiscard =
    discardText || resolveLabel({ zh: "放弃", en: "Discard" }, langMode);

  const displaySave =
    saveText || resolveLabel({ zh: "保存修改", en: "Save Changes" }, langMode);

  const displaySaving = resolveLabel({ zh: "保存中…", en: "Saving..." }, langMode);

  return (
    <div
      aria-hidden={!show}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl transition-all duration-300 ease-out ${
        show
          ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
          : "translate-y-12 opacity-0 scale-95 pointer-events-none"
      } ${className}`}
    >
      <div className="bg-foreground text-background dark:bg-card dark:text-foreground dark:border dark:border-border shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 backdrop-blur-xl ring-1 ring-black/10 dark:ring-white/10">
        {/* Pulsing indicator & label text */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold truncate">{displayTitle}</p>
            <p className="text-[11px] opacity-70 hidden sm:block truncate">{displayDesc}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onDiscard && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={onDiscard}
              className="h-9 px-3 text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-background/10 dark:hover:bg-muted cursor-pointer rounded-xl text-inherit"
            >
              {displayDiscard}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isPending || disabled}
            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl font-bold bg-background text-foreground hover:bg-background/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 shadow-sm cursor-pointer gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {displaySaving}
              </>
            ) : (
              displaySave
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
