"use client";

import { useState, useEffect, useMemo } from "react";

interface AnimatedServiceCountBadgeProps {
  targetCount: number;
  initialCount: number;
  shouldAnimate: boolean;
  unitText: string;
}

export function AnimatedServiceCountBadge({
  targetCount,
  initialCount,
  shouldAnimate,
  unitText,
}: AnimatedServiceCountBadgeProps) {
  const animKey =
    shouldAnimate && targetCount > initialCount
      ? `${initialCount}->${targetCount}`
      : "";

  const [prevAnimKey, setPrevAnimKey] = useState("");
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isRolled, setIsRolled] = useState(false);
  const [isGlowActive, setIsGlowActive] = useState(false);

  // Synchronously reset animation phases during render when animKey changes
  if (animKey && animKey !== prevAnimKey) {
    setPrevAnimKey(animKey);
    setBadgeVisible(false);
    setIsRolling(false);
    setIsRolled(false);
    setIsGlowActive(false);
  }

  const diff = Math.max(1, targetCount - initialCount);

  // Generate intermediate reel steps (e.g. [8, 9] or [8, 9, 10])
  const steps = useMemo(() => {
    if (animKey) {
      const list: number[] = [];
      for (let i = initialCount; i <= targetCount; i++) {
        list.push(i);
      }
      return list;
    }
    return [targetCount];
  }, [animKey, initialCount, targetCount]);

  useEffect(() => {
    if (!animKey) {
      setBadgeVisible(false);
      setIsRolling(false);
      setIsRolled(false);
      setIsGlowActive(false);
      return;
    }

    // 1. Activate subtle card glow
    setIsGlowActive(true);

    // 2. Micro-delay (60ms) so DOM registers starting position,
    // then smoothly animate floating +1 badge rising to peak
    const tBadge = setTimeout(() => {
      setBadgeVisible(true);
    }, 60);

    // 3. Exactly at 280ms (when +1 badge reaches its apex), smoothly roll the number reel
    const tRoll = setTimeout(() => {
      setIsRolling(true);
      setIsRolled(true);
    }, 280);

    // 4. At 3400ms, gently fade out +1 badge
    const tFade = setTimeout(() => {
      setBadgeVisible(false);
    }, 3400);

    // 5. At 4000ms, settle glow back to calm state
    const tGlow = setTimeout(() => {
      setIsGlowActive(false);
    }, 4000);

    return () => {
      clearTimeout(tBadge);
      clearTimeout(tRoll);
      clearTimeout(tFade);
      clearTimeout(tGlow);
    };
  }, [animKey]);

  const isAnimating = Boolean(animKey);

  return (
    <div className="relative inline-flex items-center justify-end select-none">
      {/* Floating "+1" pill popping up with spring bounce, synced with counter */}
      {isAnimating && (
        <span
          className={`absolute -top-3.5 -right-1 z-20 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/30 tabular-nums pointer-events-none transition-all duration-300 ease-out ${
            badgeVisible
              ? "opacity-100 scale-100 -translate-y-1.5"
              : "opacity-0 scale-50 translate-y-1.5"
          }`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          +{diff}
        </span>
      )}

      {/* Main counter badge with guaranteed minimum width & tabular numbers to prevent layout shift */}
      <div
        className={`inline-flex items-center justify-center gap-1 font-mono text-base px-2.5 py-1 rounded-xl min-w-[94px] sm:min-w-[102px] select-none transition-colors duration-500 ${
          isGlowActive
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50"
            : "bg-primary/10 text-primary"
        }`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {/* Odometer-style vertical reel container with strict pixel clipping */}
        <div
          className="relative overflow-hidden h-6 min-w-[1.25rem] block tabular-nums"
          style={{
            height: "24px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div
            className="w-full flex flex-col items-center will-change-transform"
            style={{
              transform: isRolled
                ? `translateY(-${(steps.length - 1) * 24}px)`
                : "translateY(0px)",
              transition: isRolling
                ? "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)"
                : "none",
            }}
          >
            {steps.map((num, idx) => (
              <span
                key={`${num}-${idx}`}
                className="h-6 leading-6 flex items-center justify-center font-black text-base tabular-nums text-center min-w-[1.25rem] shrink-0"
                style={{
                  height: "24px",
                  lineHeight: "24px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {num}
              </span>
            ))}
          </div>
        </div>

        <span
          className="text-xs font-normal opacity-90 shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {unitText}
        </span>
      </div>
    </div>
  );
}
