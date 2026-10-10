"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { verifyDeskOwnerPin } from "@/actions/desk";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Lock, Delete, Loader2, AlertCircle } from "lucide-react";
import type { DeskLanguageMode } from "@/types";
import { DESK_DICT, resolveDeskText } from "@/lib/desk-i18n";
import { DeskText } from "./DeskText";

interface DeskPinUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  languageMode: DeskLanguageMode;
  onSuccess: () => void;
}

export function DeskPinUnlockDialog({
  open,
  onOpenChange,
  languageMode,
  onSuccess,
}: DeskPinUnlockDialogProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setIsShaking(false);
    }
  }, [open]);

  // Subtle haptic feedback for physical feel
  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  }, []);

  const submitPin = useCallback(
    (pinCode: string) => {
      startTransition(async () => {
        const result = await verifyDeskOwnerPin(pinCode);
        if (result.success) {
          try {
            sessionStorage.setItem("desk_finance_unlocked", "true");
          } catch {}
          onOpenChange(false);
          onSuccess();
        } else {
          setError(
            result.error ||
              resolveDeskText(DESK_DICT.financialReport.pinError, languageMode).primary
          );
          setIsShaking(true);
          if (typeof window !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([30, 50, 30]);
            } catch {}
          }
          setTimeout(() => {
            setIsShaking(false);
            setPin("");
          }, 500);
        }
      });
    },
    [languageMode, onOpenChange, onSuccess]
  );

  const handleNumberInput = useCallback(
    (num: string) => {
      if (isPending) return;
      setError(null);

      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const nextPin = prev + num;
        if (nextPin.length === 4) {
          // Micro delay (60ms) to allow the 4th dot spring animation to render smoothly
          setTimeout(() => {
            submitPin(nextPin);
          }, 60);
        }
        return nextPin;
      });
    },
    [isPending, submitPin]
  );

  const handleDelete = useCallback(() => {
    if (isPending) return;
    triggerHaptic();
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isPending, triggerHaptic]);

  const handleClear = useCallback(() => {
    if (isPending) return;
    triggerHaptic();
    setError(null);
    setPin("");
  }, [isPending, triggerHaptic]);

  // Physical keyboard listener for instant typing
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (isPending) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        triggerHaptic();
        setActiveKey(e.key);
        handleNumberInput(e.key);
        setTimeout(() => setActiveKey(null), 100);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, triggerHaptic, handleNumberInput, handleDelete, handleClear]);

  const buttons = [
    { num: "1", sub: "" },
    { num: "2", sub: "ABC" },
    { num: "3", sub: "DEF" },
    { num: "4", sub: "GHI" },
    { num: "5", sub: "JKL" },
    { num: "6", sub: "MNO" },
    { num: "7", sub: "PQRS" },
    { num: "8", sub: "TUV" },
    { num: "9", sub: "WXYZ" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] sm:max-w-[360px] p-6 select-none touch-manipulation">
        <style jsx>{`
          @keyframes iosShake {
            0%,
            100% {
              transform: translateX(0);
            }
            15%,
            55%,
            85% {
              transform: translateX(-14px);
            }
            35%,
            75% {
              transform: translateX(14px);
            }
          }
          .ios-shake {
            animation: iosShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
          }
          @keyframes dotPop {
            0% {
              transform: scale(0.65);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.3);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          .dot-pop {
            animation: dotPop 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .ios-key-btn {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
        `}</style>

        <DialogHeader className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center mx-auto mb-1 border border-border/80">
            <Lock className="h-6 w-6 text-foreground" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            <DeskText
              text={DESK_DICT.financialReport.pinModalTitle}
              mode={languageMode}
              layout="inline"
            />
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            <DeskText
              text={DESK_DICT.financialReport.pinModalSubtitle}
              mode={languageMode}
              layout="inline"
            />
          </DialogDescription>
        </DialogHeader>

        {/* 4 PIN Dots (iPhone style with smooth pop animation) */}
        <div className="py-2 flex flex-col items-center gap-2">
          <div
            className={`flex items-center justify-center gap-5 my-2 transition-transform ${
              isShaking ? "ios-shake text-destructive" : ""
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              const isLatest = pin.length - 1 === idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? isLatest
                        ? "dot-pop bg-foreground shadow-sm"
                        : "bg-foreground scale-100 shadow-xs"
                      : "border-2 border-muted-foreground/35 bg-transparent scale-95"
                  }`}
                />
              );
            })}
          </div>

          {/* Error / Loading feedback */}
          <div className="h-6 flex items-center justify-center">
            {isPending ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Verifying PIN…</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive animate-in fade-in duration-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          {/* iPhone Numeric Keypad (Instant zero-delay pointer response) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-3.5 w-full max-w-[260px] pt-1">
            {buttons.map((btn) => {
              const isPressed = activeKey === btn.num;
              return (
                <button
                  key={btn.num}
                  type="button"
                  disabled={isPending}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    triggerHaptic();
                    setActiveKey(btn.num);
                    handleNumberInput(btn.num);
                  }}
                  onPointerUp={() => setActiveKey(null)}
                  onPointerLeave={() => setActiveKey(null)}
                  onPointerCancel={() => setActiveKey(null)}
                  className={`ios-key-btn w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 shadow-xs flex flex-col items-center justify-center transition-all duration-75 cursor-pointer select-none focus:outline-hidden ${
                    isPressed
                      ? "scale-92 bg-foreground/20 border-foreground/30 shadow-inner"
                      : "active:scale-92 active:bg-foreground/20"
                  }`}
                >
                  <span className="text-2xl font-bold text-foreground leading-none tracking-tight">
                    {btn.num}
                  </span>
                  {btn.sub && (
                    <span className="text-[9px] font-bold text-muted-foreground tracking-[0.16em] mt-0.5">
                      {btn.sub}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Bottom Row: Clear, 0, Delete */}
            <button
              type="button"
              disabled={isPending || pin.length === 0}
              onPointerDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              className="ios-key-btn w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-foreground active:scale-92 transition-all cursor-pointer disabled:opacity-20 select-none"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={isPending}
              onPointerDown={(e) => {
                e.preventDefault();
                triggerHaptic();
                setActiveKey("0");
                handleNumberInput("0");
              }}
              onPointerUp={() => setActiveKey(null)}
              onPointerLeave={() => setActiveKey(null)}
              onPointerCancel={() => setActiveKey(null)}
              className={`ios-key-btn w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 shadow-xs flex flex-col items-center justify-center transition-all duration-75 cursor-pointer select-none focus:outline-hidden ${
                activeKey === "0"
                  ? "scale-92 bg-foreground/20 border-foreground/30 shadow-inner"
                  : "active:scale-92 active:bg-foreground/20"
              }`}
            >
              <span className="text-2xl font-bold text-foreground leading-none tracking-tight">
                0
              </span>
            </button>

            <button
              type="button"
              disabled={isPending || pin.length === 0}
              onPointerDown={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="ios-key-btn w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-92 transition-all cursor-pointer disabled:opacity-20 select-none"
              title="Delete digit"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
