"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import {
  getEmergencyDayBookings,
  blockDayForEmergency,
  unblockDayEmergency,
  batchCancelEmergencyBookings,
  type EmergencyDayBookingItem,
} from "@/actions/emergency";
import { buildEmergencyApologyWhatsAppUrl } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

interface EmergencyClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  langMode?: "ONLY_ZH" | "ONLY_EN" | "BILINGUAL_ZH_FIRST" | "BILINGUAL_EN_FIRST";
  currencySymbol?: string;
}

const COMMON_REASONS = [
  { zh: "发型师突发急病 / 身体不适", en: "Stylist Sudden Illness / Sick Leave" },
  { zh: "店内紧急停电 / 停水检修", en: "Power or Water Supply Outage" },
  { zh: "店铺设备突发故障急需抢修", en: "Emergency Equipment Maintenance" },
  { zh: "恶劣暴雨天气 / 交通受阻", en: "Severe Weather / Transport Disruption" },
];

export function EmergencyClosureModal({
  isOpen,
  onClose,
  langMode = "BILINGUAL_ZH_FIRST",
  currencySymbol = "RM",
}: EmergencyClosureModalProps) {
  const isZh = langMode === "ONLY_ZH" || langMode === "BILINGUAL_ZH_FIRST";

  // Selected date (default today formatted as YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });

  const [selectedReason, setSelectedReason] = useState<string>(
    isZh ? COMMON_REASONS[0].zh : COMMON_REASONS[0].en
  );
  const [customReason, setCustomReason] = useState<string>("");

  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [bookings, setBookings] = useState<EmergencyDayBookingItem[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [showConfirmCancelAll, setShowConfirmCancelAll] = useState(false);
  const [, startTransition] = useTransition();

  const effectiveReason = customReason.trim() || selectedReason;

  // Load affected bookings whenever date changes or modal opens
  async function loadData(date: string) {
    setIsLoading(true);
    try {
      const res = await getEmergencyDayBookings(date);
      if (res.success) {
        setBookings(res.data.bookings);
        setIsDayBlocked(res.data.isDayBlocked);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Handle blocking / unblocking the day
  async function handleToggleBlockDay() {
    startTransition(async () => {
      if (isDayBlocked) {
        const res = await unblockDayEmergency(selectedDate);
        if (res.success) {
          setIsDayBlocked(false);
          toast.success(isZh ? "已解除闭店限制，恢复该日预约" : "Day unblocked. Online bookings restored.");
        }
      } else {
        const res = await blockDayForEmergency(selectedDate, effectiveReason);
        if (res.success) {
          setIsDayBlocked(true);
          toast.success(
            isZh
              ? "已封锁该日预约！线上顾客无法再选择该日任何时段"
              : "Day blocked! Online bookings for this date are now paused."
          );
        }
      }
    });
  }

  // Handle WhatsApp individual launch
  function handleSendWhatsApp(b: EmergencyDayBookingItem) {
    const url = buildEmergencyApologyWhatsAppUrl({
      customerName: b.customerName,
      customerPhone: b.phoneNumber,
      referenceCode: b.referenceCode,
      serviceName: b.serviceName,
      startDatetime: b.startDatetime,
      depositDueCents: b.depositDueCents,
      reason: effectiveReason,
      language: isZh ? "zh" : "en",
    });

    // Mark as notified in local UI state
    setNotifiedIds((prev) => new Set(prev).add(b.id));

    // Open WhatsApp in new window/tab
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Copy all customer phone numbers
  function handleCopyAllNumbers() {
    const phones = bookings.map((b) => b.phoneNumber).join(", ");
    navigator.clipboard.writeText(phones);
    setCopiedAll(true);
    toast.success(isZh ? "已复制所有顾客电话号码" : "Copied all phone numbers to clipboard");
    setTimeout(() => setCopiedAll(false), 2000);
  }

  // Copy standard apology message template
  function handleCopyTemplate() {
    const sample = buildEmergencyApologyWhatsAppUrl({
      customerName: isZh ? "顾客" : "Customer",
      customerPhone: "0123456789",
      referenceCode: "BK-XXXX",
      serviceName: isZh ? "预约项目" : "Service",
      startDatetime: new Date(),
      depositDueCents: 1000,
      reason: effectiveReason,
      language: isZh ? "zh" : "en",
    });

    const parsedText = decodeURIComponent(sample.split("text=")[1] || "");
    navigator.clipboard.writeText(parsedText);
    setCopiedTemplate(true);
    toast.success(isZh ? "已复制道歉与改约消息模板" : "Copied apology message template");
    setTimeout(() => setCopiedTemplate(false), 2000);
  }

  // Batch cancel all remaining active bookings for this date
  async function handleBatchCancelAll() {
    setIsCancellingAll(true);
    try {
      const ids = bookings.map((b) => b.id);
      const res = await batchCancelEmergencyBookings(ids, effectiveReason);
      if (res.success) {
        toast.success(
          isZh
            ? `已批量取消 ${res.data.cancelledCount} 笔预约记录！`
            : `Cancelled ${res.data.cancelledCount} booking(s)`
        );
        setShowConfirmCancelAll(false);
        loadData(selectedDate);
      }
    } finally {
      setIsCancellingAll(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {isZh ? "突发闭店 / 紧急批量改约通知" : "Emergency Closure & Mass Reschedule"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {isZh
              ? "用于发型师突发病假、停电停水或店内意外事件。一键封锁当日线上排期，并快速通过 WhatsApp 逐一通知顾客改约。"
              : "Quickly manage staff sick leave, outages, or sudden shop emergencies. Block remaining slots and notify affected customers on WhatsApp."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Step 1: Select Affected Date */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {isZh ? "1. 选择受影响日期" : "1. Select Affected Date"}
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { labelZh: "今天 (Today)", labelEn: "Today", date: format(new Date(), "yyyy-MM-dd") },
                {
                  labelZh: "明天 (Tomorrow)",
                  labelEn: "Tomorrow",
                  date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
                },
              ].map((opt) => (
                <Button
                  key={opt.date}
                  type="button"
                  size="sm"
                  variant={selectedDate === opt.date ? "default" : "outline"}
                  onClick={() => setSelectedDate(opt.date)}
                  className="h-8 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isZh ? opt.labelZh : opt.labelEn}
                </Button>
              ))}
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-38 h-8 text-xs font-semibold rounded-xl bg-card"
              />
            </div>
          </div>

          {/* Step 2: Select Emergency Reason */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              {isZh ? "2. 突发原因 (会自动填入顾客致歉通知)" : "2. Reason (Pre-filled into customer messages)"}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_REASONS.map((r) => {
                const text = isZh ? r.zh : r.en;
                const isSelected = selectedReason === text && !customReason;
                return (
                  <button
                    key={r.en}
                    type="button"
                    onClick={() => {
                      setSelectedReason(text);
                      setCustomReason("");
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/80 bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
            <Input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={isZh ? "或输入其他自定义原因..." : "Or type a custom reason..."}
              className="h-9 text-xs rounded-xl bg-card"
            />
          </div>

          {/* Step 3: Block Day Switch */}
          <div className="p-3.5 rounded-2xl border bg-muted/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{isZh ? "封锁该日所有线上预约时段" : "Block all online slots for this date"}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isZh
                  ? "开启后，线上客户无法再预定该日的任何剩余时段。"
                  : "Prevents new online customers from booking any remaining slots on this day."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isDayBlocked ? "destructive" : "default"}
              onClick={handleToggleBlockDay}
              className="h-8 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
            >
              {isDayBlocked
                ? (isZh ? "已封锁 (点击解除)" : "Blocked (Click to unblock)")
                : (isZh ? "立即封锁排期" : "Block This Day")}
            </Button>
          </div>

          {/* Step 4: Affected Bookings List & WhatsApp Dispatch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  {isZh ? "3. 受影响预约清单" : "3. Affected Bookings"}
                </Label>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {bookings.length} {isZh ? "笔预约" : "bookings"}
                </Badge>
              </div>

              {bookings.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAllNumbers}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg gap-1 cursor-pointer"
                  >
                    {copiedAll ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{isZh ? "复制所有电话" : "Copy Phones"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyTemplate}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg gap-1 cursor-pointer"
                  >
                    {copiedTemplate ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{isZh ? "复制致歉文案" : "Copy Template"}</span>
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isZh ? "正在加载预约…" : "Loading bookings…"}</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed text-center text-muted-foreground space-y-1">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto opacity-70" />
                <p className="text-xs font-bold text-foreground">
                  {isZh ? "该日期无待处理的活跃预约！" : "No active bookings on this date!"}
                </p>
                <p className="text-[11px]">
                  {isZh ? "您可以放心封锁该日排期，无需担心影响已有顾客。" : "You can safely block the day without affecting existing clients."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bookings.map((b) => {
                  const isNotified = notifiedIds.has(b.id);
                  const timeFormatted = format(new Date(b.startDatetime), "h:mm a");

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                        isNotified ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {b.referenceCode}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">
                            {b.customerName}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({b.phoneNumber})
                          </span>
                          {isNotified && (
                            <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 h-4 flex items-center gap-0.5">
                              <Check className="h-2.5 w-2.5" />
                              <span>{isZh ? "已发送通知" : "Notified"}</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <Clock className="h-3 w-3" />
                            {timeFormatted}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <Scissors className="h-3 w-3" />
                            {b.serviceName}
                          </span>
                          <span>
                            {b.depositDueCents && b.depositDueCents > 0
                              ? `${isZh ? "定金" : "Deposit"}: ${formatPrice(b.depositDueCents, currencySymbol)}`
                              : isZh ? "免定金" : "No Deposit"}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSendWhatsApp(b)}
                        className={`h-8 px-3 rounded-xl font-bold text-xs shrink-0 gap-1.5 cursor-pointer ${
                          isNotified
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        }`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 fill-current" />
                        <span>{isNotified ? (isZh ? "再次打开" : "Re-open") : "WhatsApp"}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          {bookings.length > 0 && (
            <div>
              {showConfirmCancelAll ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isCancellingAll}
                    onClick={handleBatchCancelAll}
                    className="h-8 text-xs font-bold rounded-xl"
                  >
                    {isCancellingAll && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {isZh ? "确认全部作废" : "Confirm Cancel All"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirmCancelAll(false)}
                    className="h-8 text-xs"
                  >
                    {isZh ? "返回" : "Back"}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirmCancelAll(true)}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {isZh ? "⚠️ 批量作废所有预约记录" : "⚠️ Batch cancel all bookings"}
                </Button>
              )}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-bold rounded-xl"
          >
            {isZh ? "完成并退出" : "Done / Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
