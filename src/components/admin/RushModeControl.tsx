"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getRushModeStatus,
  enableRushMode,
  disableRushMode,
  type RushModeStatus,
} from "@/actions/emergency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Zap, Flame, Loader2, Play, Check, Clock } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface RushModeControlProps {
  langMode?: "ONLY_ZH" | "ONLY_EN" | "BILINGUAL_ZH_FIRST" | "BILINGUAL_EN_FIRST";
  compact?: boolean;
}

export function RushModeControl({
  langMode = "BILINGUAL_ZH_FIRST",
  compact = false,
}: RushModeControlProps) {
  const [status, setStatus] = useState<RushModeStatus>({
    isActive: false,
    expiresAt: null,
    reason: null,
    minutesRemaining: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isZh = langMode === "ONLY_ZH" || langMode === "BILINGUAL_ZH_FIRST";

  async function refreshStatus() {
    const res = await getRushModeStatus();
    if (res.success) {
      setStatus(res.data);
    }
  }

  useEffect(() => {
    refreshStatus();
    // Refresh status every 30 seconds to update remaining minutes
    const timer = setInterval(refreshStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  function handleEnable(minutes: number, label: string) {
    startTransition(async () => {
      const res = await enableRushMode(minutes, label);
      if (res.success) {
        setStatus(res.data);
        setIsOpen(false);
        toast.success(
          isZh
            ? `已启动高峰客满模式！线上预约暂停 ${minutes} 分钟`
            : `Rush Mode active! Online bookings paused for ${minutes} mins`
        );
      } else {
        toast.error(res.error || "Failed to enable Rush Mode");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const res = await disableRushMode();
      if (res.success) {
        setStatus({
          isActive: false,
          expiresAt: null,
          reason: null,
          minutesRemaining: 0,
        });
        setIsOpen(false);
        toast.success(
          isZh ? "已恢复线上正常预约！" : "Rush Mode deactivated. Online booking resumed!"
        );
      } else {
        toast.error(res.error || "Failed to disable Rush Mode");
      }
    });
  }

  // Calculate minutes until end of business day (e.g. 7 PM = 19:00)
  function getRestOfTodayMinutes(): number {
    const now = new Date();
    const close = new Date(now);
    close.setHours(20, 0, 0, 0); // Default to 8 PM
    const diff = Math.round((close.getTime() - now.getTime()) / (60 * 1000));
    return Math.max(60, diff);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          status.isActive ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-3 rounded-xl border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer animate-pulse"
              title="Rush Mode active — click to manage"
            >
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span suppressHydrationWarning>
                {isZh ? "客满暂停中" : "Rush Mode"} ({status.minutesRemaining}m)
              </span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              title="Temporarily pause online bookings for walk-in rush"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className={compact ? "hidden md:inline" : "inline"} suppressHydrationWarning>
                {isZh ? "高峰客满" : "Rush Mode"}
              </span>
            </Button>
          )
        }
      />

      <PopoverContent className="w-72 p-3.5 rounded-2xl shadow-lg border" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b">
            <div className="flex items-center gap-1.5">
              {status.isActive ? (
                <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
              ) : (
                <Zap className="h-4 w-4 text-amber-500" />
              )}
              <h4 className="font-bold text-xs text-foreground">
                {isZh ? "高峰客满模式 (Rush Mode)" : "Peak Rush Hour Mode"}
              </h4>
            </div>
            <Badge
              variant={status.isActive ? "default" : "secondary"}
              className={`text-[10px] px-1.5 py-0 ${status.isActive ? "bg-amber-600" : ""}`}
            >
              {status.isActive ? (isZh ? "已暂停线上" : "Active") : (isZh ? "正常接单" : "Normal")}
            </Badge>
          </div>

          {status.isActive ? (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {isZh ? "线上预约已暂停至：" : "Paused until:"}{" "}
                    {status.expiresAt ? format(new Date(status.expiresAt), "h:mm a") : ""}
                  </span>
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                  {isZh
                    ? `剩余约 ${status.minutesRemaining} 分钟。到期后系统将自动恢复接单。`
                    : `~${status.minutesRemaining} mins remaining. Will auto-resume on expiry.`}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleDisable}
                disabled={isPending}
                className="w-full h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                <span>{isZh ? "立即恢复线上接单" : "Resume Online Booking Now"}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground leading-snug">
                {isZh
                  ? "现场散客过多或椅子全满？一键临时暂停线上预约，避免客户撞单："
                  : "Shop full with walk-ins? Temporarily pause online bookings to prevent clashes:"}
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { minutes: 60, labelZh: "暂停 1 小时", labelEn: "Pause 1 Hour" },
                  { minutes: 120, labelZh: "暂停 2 小时", labelEn: "Pause 2 Hours" },
                  { minutes: 180, labelZh: "暂停 3 小时", labelEn: "Pause 3 Hours" },
                  {
                    minutes: getRestOfTodayMinutes(),
                    labelZh: "暂停至今日结束",
                    labelEn: "Rest of Today",
                  },
                ].map((opt) => (
                  <Button
                    key={opt.minutes}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleEnable(opt.minutes, isZh ? opt.labelZh : opt.labelEn)}
                    className="h-8 text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500/40 rounded-lg cursor-pointer"
                  >
                    {isZh ? opt.labelZh : opt.labelEn}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
