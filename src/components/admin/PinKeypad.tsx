"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { adminPinLogin } from "@/actions/auth";
import { Loader2, Delete, Lock, AlertCircle } from "lucide-react";

interface PinKeypadProps {
  onSuccessRedirect?: string;
  onSwitchToPassword?: () => void;
  compact?: boolean;
}

export function PinKeypad({
  onSuccessRedirect = "/admin/desk",
  onSwitchToPassword,
  compact = false,
}: PinKeypadProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        const result = await adminPinLogin(pinCode);
        if (result.success) {
          window.location.href = onSuccessRedirect;
        } else {
          setError(result.error || "Incorrect PIN code / 密码错误");
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
    [onSuccessRedirect]
  );

  const handleNumberInput = useCallback(
    (num: string) => {
      if (isPending) return;
      setError(null);

      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const nextPin = prev + num;
        if (nextPin.length === 4) {
          // Micro delay (60ms) to allow the 4th dot spring animation to render smoothly before locking
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

  // Physical keyboard listener for instant typing on desktop/laptop
  useEffect(() => {
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
  }, [handleNumberInput, handleDelete, handleClear, isPending, triggerHaptic]);

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
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto select-none touch-manipulation">
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

      {/* Icon & Title */}
      <div className={`text-center ${compact ? "space-y-0.5 mb-2" : "space-y-1 sm:space-y-1.5 mb-3 sm:mb-4"}`}>
        <div className={`inline-flex items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ${
          compact ? "w-9 h-9 mb-0.5" : "w-11 h-11 sm:w-12 sm:h-12 mb-1"
        }`}>
          <Lock className={compact ? "h-4.5 w-4.5" : "h-5 w-5 sm:h-6 sm:w-6"} />
        </div>
        <h1 className={`font-black tracking-tight text-foreground ${
          compact ? "text-lg leading-tight" : "text-xl sm:text-2xl"
        }`}>
          Enter Passcode
        </h1>
        <p className={`text-muted-foreground font-medium ${
          compact ? "text-[11px] leading-tight" : "text-xs sm:text-sm"
        }`}>
          Touch your 4-digit PIN to open Salon Desk
        </p>
      </div>

      {/* 4 PIN Dots (iPhone style with smooth pop animation) */}
      <div
        className={`flex items-center justify-center transition-transform ${
          compact ? "gap-3.5 my-1.5" : "gap-4 sm:gap-5 my-2 sm:my-2.5"
        } ${isShaking ? "ios-shake text-destructive" : ""}`}
      >
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = pin.length > idx;
          const isLatest = pin.length - 1 === idx;
          return (
            <div
              key={idx}
              className={`rounded-full transition-all duration-150 ${
                compact ? "w-3 h-3" : "w-3 sm:w-3.5 h-3 sm:h-3.5"
              } ${
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
      <div className={`flex items-center justify-center ${compact ? "h-5 mb-1.5" : "h-6 sm:h-7 mb-2 sm:mb-3"}`}>
        {isPending ? (
          <div className="flex items-center gap-1.5 text-primary font-semibold text-xs animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Unlocking Desk…
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-destructive font-semibold text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            Default PIN: 1234
          </span>
        )}
      </div>

      {/* iPhone Numeric Keypad (Instant zero-delay response) */}
      <div className={`grid grid-cols-3 w-full mx-auto ${
        compact ? "gap-2.5 max-w-[225px] mb-2" : "gap-3 sm:gap-3.5 max-w-[245px] sm:max-w-[260px] mb-3 sm:mb-4"
      }`}>
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
              className={`ios-key-btn rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 backdrop-blur-md shadow-xs flex flex-col items-center justify-center transition-all duration-75 cursor-pointer select-none focus:outline-hidden ${
                compact ? "w-[60px] h-[60px]" : "w-[66px] h-[66px] sm:w-[72px] sm:h-[72px]"
              } ${
                isPressed
                  ? "scale-92 bg-foreground/20 border-foreground/30 shadow-inner"
                  : "active:scale-92 active:bg-foreground/20"
              }`}
            >
              <span className={`font-semibold text-foreground leading-none tracking-tight ${
                compact ? "text-xl" : "text-xl sm:text-2xl"
              }`}>
                {btn.num}
              </span>
              {btn.sub && (
                <span className="text-[8px] font-bold text-muted-foreground tracking-[0.14em] mt-0.5">
                  {btn.sub}
                </span>
              )}
            </button>
          );
        })}

        {/* Bottom row: Clear, 0, Delete */}
        <button
          type="button"
          disabled={isPending || pin.length === 0}
          onPointerDown={(e) => {
            e.preventDefault();
            handleClear();
          }}
          className={`ios-key-btn rounded-full flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-92 transition-all cursor-pointer disabled:opacity-20 select-none ${
            compact ? "w-[60px] h-[60px]" : "w-[66px] h-[66px] sm:w-[72px] sm:h-[72px]"
          }`}
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
          className={`ios-key-btn rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 backdrop-blur-md shadow-xs flex flex-col items-center justify-center transition-all duration-75 cursor-pointer select-none focus:outline-hidden ${
            compact ? "w-[60px] h-[60px]" : "w-[66px] h-[66px] sm:w-[72px] sm:h-[72px]"
          } ${
            activeKey === "0"
              ? "scale-92 bg-foreground/20 border-foreground/30 shadow-inner"
              : "active:scale-92 active:bg-foreground/20"
          }`}
        >
          <span className={`font-semibold text-foreground leading-none tracking-tight ${
            compact ? "text-xl" : "text-xl sm:text-2xl"
          }`}>
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
          className={`ios-key-btn rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-92 transition-all cursor-pointer disabled:opacity-20 select-none ${
            compact ? "w-[60px] h-[60px]" : "w-[66px] h-[66px] sm:w-[72px] sm:h-[72px]"
          }`}
          title="Delete digit"
        >
          <Delete className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      </div>

      {/* Switch to password fallback */}
      {onSwitchToPassword && (
        <button
          type="button"
          onClick={onSwitchToPassword}
          className="text-[11px] text-primary/80 hover:text-primary hover:underline font-semibold py-1 px-3 cursor-pointer transition-colors"
        >
          Use Username & Password instead
        </button>
      )}
    </div>
  );
}
