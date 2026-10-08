"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, navigation finished
  useEffect(() => {
    if (isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Handle global click on links
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external, anchor links, mailto, tel, or modifier keys
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // If navigating to the same URL, don't trigger loader
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      setIsLoading(true);
      setProgress(25);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Increment progress incrementally while loading
  useEffect(() => {
    if (!isLoading) return;

    const timer1 = setTimeout(() => setProgress((p) => Math.max(p, 60)), 150);
    const timer2 = setTimeout(() => setProgress((p) => Math.max(p, 85)), 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-blue-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(59,130,246,0.7)]"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
            transition: progress === 100 ? "width 0.15s ease, opacity 0.25s 0.1s" : "width 0.3s ease-out",
          }}
        />
      </div>

      {/* Floating subtle classic spinner indicator at top right */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-[100] pointer-events-none animate-in fade-in zoom-in-90 duration-200">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border shadow-md text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Loading…</span>
          </div>
        </div>
      )}
    </>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
