"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { BilingualText } from "@/lib/desk-i18n";

export interface FloatingNavItem {
  id: string;
  href?: string;
  label: BilingualText;
  exact?: boolean;
  badgeCount?: number;
  avatarUrl?: string;
  onClick?: () => void;
}

interface FloatingBottomNavProps {
  items: FloatingNavItem[];
  activeId: string;
  isZh: boolean;
}

function TabIcon({
  id,
  active,
  avatarUrl,
}: {
  id: string;
  active: boolean;
  avatarUrl?: string;
}) {
  if (id === "more" && avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          "h-7 w-7 rounded-full object-cover border-[1.5px] border-white transition-transform duration-200",
          active ? "scale-105" : "opacity-90"
        )}
      />
    );
  }

  const colorClass = active ? "text-[#FFFFFF]" : "text-[#E4E6EB]";

  switch (id) {
    case "desk":
      return active ? (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="currentColor" aria-hidden="true">
          <path d="M4.5 3A1.5 1.5 0 0 0 3 4.5v2.25a3.75 3.75 0 0 0 6.53 2.51 3.74 3.74 0 0 0 4.94 0A3.75 3.75 0 0 0 21 6.75V4.5A1.5 1.5 0 0 0 19.5 3h-15ZM4.5 11.9a5.23 5.23 0 0 1-.75-.06V19.5A1.5 1.5 0 0 0 5.25 21h4.5v-5.25a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5V21h4.5a1.5 1.5 0 0 0 1.5-1.5v-7.66a5.23 5.23 0 0 1-.75.06 5.23 5.23 0 0 1-3.75-1.58 5.24 5.24 0 0 1-7.5 0A5.23 5.23 0 0 1 4.5 11.9Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l1.5-5h15L21 9" />
          <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
          <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
          <path d="M10 21v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
        </svg>
      );

    case "dashboard":
      return active ? (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="currentColor" aria-hidden="true">
          <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 0 0 1.061 1.06l8.69-8.69Z" />
          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      );

    case "bookings":
      return active ? (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="currentColor" aria-hidden="true">
          <path d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );

    case "members":
      return active ? (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="currentColor" aria-hidden="true">
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.866 0-7 2.239-7 5v1.5A1.5 1.5 0 0 0 3.5 21h11a1.5 1.5 0 0 0 1.5-1.5V18c0-2.761-3.134-5-7-5Zm7.5-2.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm1.25 2.13c2.49.49 4.25 2.19 4.25 4.37v2.5a1.5 1.5 0 0 1-1.5 1.5h-3.12c.08-.32.12-.66.12-1V18c0-2.18-.79-4.14-2.08-5.56.75.08 1.55.12 2.33.19Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "more":
    default:
      return active ? (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2.5" />
          <rect x="13" y="3" width="8" height="8" rx="2.5" />
          <rect x="3" y="13" width="8" height="8" rx="2.5" />
          <rect x="13" y="13" width="8" height="8" rx="2.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={cn("h-5.5 w-5.5", colorClass)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </svg>
      );
  }
}

export function FloatingBottomNav({
  items,
  activeId,
  isZh,
}: FloatingBottomNavProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const prevActiveIdRef = useRef<string>(activeId);
  const [pillRect, setPillRect] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });
  const [isGliding, setIsGliding] = useState(false);

  // Smooth vertical settling when scrolling or when mobile browser toolbar resizes viewport
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [viewportShiftY, setViewportShiftY] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 12) {
        setIsScrolledDown(false);
      } else if (y > lastY + 6) {
        setIsScrolledDown(true);
      } else if (y < lastY - 6) {
        setIsScrolledDown(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prevBottom = vv.offsetTop + vv.height;
    let rafId = 0;

    const onResize = () => {
      const nextBottom = vv.offsetTop + vv.height;
      const delta = nextBottom - prevBottom;
      prevBottom = nextBottom;
      if (Math.abs(delta) > 2 && Math.abs(delta) < 160) {
        // Counter-shift by the viewport delta on the current frame, then glide to 0
        setViewportShiftY(-delta);
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = requestAnimationFrame(() => setViewportShiftY(0));
        });
      }
    };

    vv.addEventListener("resize", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useLayoutEffect(() => {
    const activeEl = itemRefs.current[activeId];
    if (!activeEl) return;

    const updateRect = () => {
      const el = itemRefs.current[activeId];
      if (!el) return;
      setPillRect({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    };

    const changedTab = prevActiveIdRef.current !== activeId;
    prevActiveIdRef.current = activeId;

    updateRect();

    let stretchTimer: ReturnType<typeof setTimeout> | null = null;
    if (changedTab) {
      setIsGliding(true);
      stretchTimer = setTimeout(() => setIsGliding(false), 120);
    }

    const ro = new ResizeObserver(updateRect);
    if (trackRef.current) ro.observe(trackRef.current);

    return () => {
      ro.disconnect();
      if (stretchTimer) clearTimeout(stretchTimer);
    };
  }, [activeId, items.length]);

  const verticalOffset = viewportShiftY !== 0 ? viewportShiftY : isScrolledDown ? 6 : 0;

  return (
    <div
      className="md:hidden fixed inset-x-4 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 pointer-events-none"
      style={{
        transform: `translate3d(0, ${verticalOffset}px, 0)`,
        transition:
          viewportShiftY !== 0
            ? "none"
            : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <nav
        aria-label="Primary mobile navigation"
        className="pointer-events-auto mx-auto max-w-md rounded-full bg-[#242526]/95 backdrop-blur-md border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.38)] p-[6px]"
      >
        <div ref={trackRef} className="relative flex items-center justify-between gap-1">
          {/* Single Shared Sliding Active Pill */}
          {pillRect.ready && (
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 rounded-full bg-[#3A3B3C] pointer-events-none"
              style={{
                width: `${pillRect.width}px`,
                transform: `translate3d(${pillRect.left}px, 0, 0) scaleX(${
                  isGliding ? 1.07 : 1
                })`,
                transition:
                  "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          )}

          {items.map((item) => {
            const active = item.id === activeId;
            const labelText = isZh ? item.label.zh : item.label.en;
            const badge = item.badgeCount && item.badgeCount > 0 ? item.badgeCount : 0;

            const inner = (
              <>
                <span className="relative inline-flex items-center justify-center transition-transform duration-150 active:scale-95">
                  <TabIcon id={item.id} active={active} avatarUrl={item.avatarUrl} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E41E3F] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#242526] tabular-nums">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="sr-only">{labelText}</span>
              </>
            );

            const sharedClass =
              "relative z-10 flex-1 min-h-[44px] min-w-[52px] flex items-center justify-center rounded-full cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={item.onClick}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                  aria-label={labelText}
                  aria-current={active ? "page" : undefined}
                  className={sharedClass}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
                onClick={item.onClick}
                aria-label={labelText}
                aria-expanded={active}
                className={sharedClass}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
