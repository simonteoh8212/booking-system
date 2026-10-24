"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FloatingActionBtnsProps {
  /** Optional back button handler */
  onBack?: () => void;
  /** Custom text for back button (defaults to "Back" with ArrowLeft) */
  backText?: React.ReactNode;
  /** Whether the back button is disabled */
  backDisabled?: boolean;
  /** Whether to show the back button. Defaults to true if onBack is provided */
  showBack?: boolean;

  /** Primary action button handler */
  onAction?: () => void;
  /** Text or content for primary action button */
  actionText: React.ReactNode;
  /** Whether the action button is disabled */
  actionDisabled?: boolean;
  /** Whether the action is currently submitting / loading */
  isPending?: boolean;
  /** Custom pending text/markup */
  pendingText?: React.ReactNode;
  /** Optional custom class name for the action button */
  actionClassName?: string;
  /** Optional action button variant (e.g. default, outline) */
  actionVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

  /** Optional secondary content or status banner rendered above the buttons inside the dock */
  topContent?: React.ReactNode;

  /** Custom children if full override is desired */
  children?: React.ReactNode;

  /** Extra wrapper class */
  className?: string;
}

export function FloatingActionBtns({
  onBack,
  backText,
  backDisabled = false,
  showBack,
  onAction,
  actionText,
  actionDisabled = false,
  isPending = false,
  pendingText,
  actionClassName,
  actionVariant = "default",
  topContent,
  children,
  className = "",
}: FloatingActionBtnsProps) {
  const shouldRenderBack = showBack !== undefined ? showBack : Boolean(onBack);

  return (
    <div
      className={cn(
        "fixed bottom-3 inset-x-0 z-30 max-w-md mx-auto px-4 pointer-events-none select-none",
        className
      )}
    >
      <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-lg flex flex-col gap-2 pointer-events-auto">
        {topContent && <div>{topContent}</div>}

        {children ? (
          children
        ) : (
          <div className="flex items-center gap-3 w-full">
            {shouldRenderBack && onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={backDisabled || isPending}
                className="flex-1 h-12 text-sm sm:text-base font-bold rounded-xl cursor-pointer border-border/80 bg-card hover:bg-muted transition-all"
              >
                {backText || (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant={actionVariant}
              onClick={onAction}
              disabled={actionDisabled || isPending}
              className={cn(
                "h-12 text-sm sm:text-base font-bold rounded-xl shadow-xs cursor-pointer transition-all",
                shouldRenderBack && onBack ? "flex-1" : "w-full",
                actionClassName
              )}
            >
              {isPending ? (
                pendingText || (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Please wait...
                  </>
                )
              ) : (
                actionText
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
