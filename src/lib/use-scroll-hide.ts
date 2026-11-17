"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollHideOptions {
  /** Key (such as active route or tab ID) that resets visibility to shown on change. */
  resetKey: string;
  /** Downward cumulative scroll delta (px) required before hiding. Default: 12 */
  hideThreshold?: number;
  /** Upward cumulative scroll delta (px) required before revealing. Default: 30 */
  revealThreshold?: number;
  /** Top-of-page scrollY lock (px) where bar is always visible. Default: 16 */
  topLockPx?: number;
}

/**
 * Tracks window scroll direction with hysteresis and overscroll safeguards
 * using requestAnimationFrame batching.
 */
export function useScrollHide({
  resetKey,
  hideThreshold = 12,
  revealThreshold = 30,
  topLockPx = 16,
}: UseScrollHideOptions): boolean {
  const [scrollState, setScrollState] = useState<{
    key: string;
    hidden: boolean;
  }>({ key: resetKey, hidden: false });

  const lastYRef = useRef(0);
  const downDeltaRef = useRef(0);
  const upDeltaRef = useRef(0);
  const lastDirRef = useRef<"up" | "down" | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const resetKeyRef = useRef(resetKey);

  useEffect(() => {
    resetKeyRef.current = resetKey;
    lastYRef.current = Math.max(0, window.scrollY || 0);
    downDeltaRef.current = 0;
    upDeltaRef.current = 0;
    lastDirRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    lastYRef.current = Math.max(0, window.scrollY || 0);

    const evaluateScroll = () => {
      rafIdRef.current = null;

      const rawY = window.scrollY || window.pageYOffset || 0;
      const docEl = document.documentElement;
      const maxScroll = Math.max(0, docEl.scrollHeight - window.innerHeight);

      // 1. Top-of-page lock (also guards rubber-band overscroll bounce at top)
      if (rawY <= topLockPx) {
        downDeltaRef.current = 0;
        upDeltaRef.current = 0;
        lastDirRef.current = null;
        lastYRef.current = Math.max(0, rawY);
        setScrollState((prev) =>
          prev.key === resetKeyRef.current && !prev.hidden
            ? prev
            : { key: resetKeyRef.current, hidden: false }
        );
        return;
      }

      // 2. Bottom-of-page guard: ignore downward overscroll past maxScroll
      if (rawY >= maxScroll) {
        lastYRef.current = maxScroll;
        return;
      }

      const currentY = Math.min(Math.max(0, rawY), maxScroll);
      const delta = currentY - lastYRef.current;
      lastYRef.current = currentY;

      if (delta === 0) return;

      if (delta > 0) {
        // Scrolling down
        if (lastDirRef.current !== "down") {
          upDeltaRef.current = 0;
          lastDirRef.current = "down";
        }
        downDeltaRef.current += delta;

        if (downDeltaRef.current >= hideThreshold) {
          setScrollState((prev) =>
            prev.key === resetKeyRef.current && prev.hidden
              ? prev
              : { key: resetKeyRef.current, hidden: true }
          );
        }
      } else {
        // Scrolling up
        if (lastDirRef.current !== "up") {
          downDeltaRef.current = 0;
          lastDirRef.current = "up";
        }
        upDeltaRef.current += Math.abs(delta);

        if (upDeltaRef.current >= revealThreshold) {
          setScrollState((prev) =>
            prev.key === resetKeyRef.current && !prev.hidden
              ? prev
              : { key: resetKeyRef.current, hidden: false }
          );
        }
      }
    };

    const onScroll = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(evaluateScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [hideThreshold, revealThreshold, topLockPx]);

  // Immediately visible whenever active tab/route key changes
  return scrollState.key === resetKey ? scrollState.hidden : false;
}
