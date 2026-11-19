"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  getMembers,
  getMemberDetail,
  quickCreateMember,
  updateMember,
  deleteMember,
  reloadMemberCredit,
  getPromoPackages,
  createPromoPackage,
  updatePromoPackage,
  deletePromoPackage,
  assignPromoToMember,
  adjustMemberPackageSession,
  adjustMemberCredit,
  verifyMemberCreditTally,
  getMemberCreditSummary,
  type CreditTallyReport,
  type MemberCreditSummary,
} from "@/actions/members";
import { buildMemberCreditWhatsAppUrl } from "@/lib/whatsapp";
import { formatPrice, generateIdempotencyKey } from "@/lib/utils";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Users,
  UserPlus,
  Search,
  Wallet,
  Ticket,
  Pencil,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Loader2,
  ShoppingBag,
  Scissors,
  ChevronRight,
  X,
  ShieldCheck,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import type {
  DeskLanguageMode,
  MemberDto,
  MemberDetailDto,
  PromoPackageDto,
  ServiceDto,
} from "@/types";

const PACKAGE_STATUS_ZH: Record<string, string> = {
  ACTIVE: "使用中",
  COMPLETED: "已用完",
  EXPIRED: "已过期",
  CANCELLED: "已取消",
};

interface MemberManagerProps {
  initialMembers: MemberDto[];
  initialPromos: PromoPackageDto[];
  services: ServiceDto[];
  currencySymbol?: string;
  initialLanguage?: DeskLanguageMode;
  initialSummary?: MemberCreditSummary;
}

export function MemberManager({
  initialMembers,
  initialPromos,
  services,
  currencySymbol = "RM",
  initialLanguage = "ONLY_EN",
  initialSummary,
}: MemberManagerProps) {
  const { langMode } = useDeskLanguage(initialLanguage);
  const isZh = langMode === "ONLY_ZH";
  const dateLocale = isZh ? zhCN : enUS;
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "PROMOS">("MEMBERS");
  const [members, setMembers] = useState<MemberDto[]>(initialMembers);
  const [creditSummary, setCreditSummary] = useState<MemberCreditSummary>(() => {
    if (initialSummary) return initialSummary;
    const onlyMembers = initialMembers.filter((m) => m.isMember);
    return {
      totalMembers: onlyMembers.length,
      membersWithCreditCount: initialMembers.filter((m) => m.creditBalanceCents > 0).length,
      totalOutstandingCreditCents: initialMembers.reduce(
        (sum, m) => sum + m.creditBalanceCents,
        0
      ),
      totalRemainingSessions: initialMembers.reduce(
        (sum, m) =>
          sum + m.activePackages.reduce((ps, p) => ps + p.remainingSessions, 0),
        0
      ),
    };
  });
  const [promos, setPromos] = useState<PromoPackageDto[]>(initialPromos);
  const [searchQuery, setSearchQuery] = useState("");
  const [includeNonMembers, setIncludeNonMembers] = useState(false);
  const [mobileQuickAddOpen, setMobileQuickAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (focusScrollTimerRef.current) clearTimeout(focusScrollTimerRef.current);
      viewportCleanupRef.current?.();
    };
  }, []);

  function alignSearchIntoView(behavior: ScrollBehavior) {
    const el = searchSectionRef.current;
    if (!el || typeof window === "undefined") return;
    // Sticky mobile header is 48px (h-12); leave 8px breathing room below it.
    const headerOffset = 56;
    const rect = el.getBoundingClientRect();
    const targetTop = Math.max(0, window.scrollY + rect.top - headerOffset);
    window.scrollTo({ top: targetTop, behavior });
  }

  function handleSearchFocus() {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    if (focusScrollTimerRef.current) {
      clearTimeout(focusScrollTimerRef.current);
      focusScrollTimerRef.current = null;
    }
    viewportCleanupRef.current?.();
    viewportCleanupRef.current = null;

    // Move view immediately toward the search bar
    alignSearchIntoView("smooth");

    // Re-align after the mobile soft keyboard finishes opening & resizing visualViewport
    const vv = window.visualViewport;
    let alignedByViewport = false;
    if (vv) {
      const onViewportResize = () => {
        alignedByViewport = true;
        alignSearchIntoView("smooth");
        vv.removeEventListener("resize", onViewportResize);
        viewportCleanupRef.current = null;
      };
      vv.addEventListener("resize", onViewportResize, { once: true });
      viewportCleanupRef.current = () => vv.removeEventListener("resize", onViewportResize);
    }

    focusScrollTimerRef.current = setTimeout(() => {
      if (!alignedByViewport) {
        alignSearchIntoView("smooth");
      }
      viewportCleanupRef.current?.();
      viewportCleanupRef.current = null;
      focusScrollTimerRef.current = null;
    }, 320);
  }

  // Quick Create Member
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickNotes, setQuickNotes] = useState("");

  // Edit / Delete Member
  const [editMemberTarget, setEditMemberTarget] = useState<MemberDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<MemberDto | null>(null);

  // Reload Credit
  const [reloadTarget, setReloadTarget] = useState<MemberDto | null>(null);
  const [reloadAmountStr, setReloadAmountStr] = useState("288");
  const [bonusCreditStr, setBonusCreditStr] = useState("0");
  const [freeBonusServiceIds, setFreeBonusServiceIds] = useState<string[]>([]);
  const [freeBonusSessions] = useState(1);
  const [redeemFreeBonusNow, setRedeemFreeBonusNow] = useState(true);
  const [reloadPaymentMethod, setReloadPaymentMethod] = useState<
    "CASH" | "DUITNOW_QR" | "CARD"
  >("DUITNOW_QR");
  const [reloadNotes, setReloadNotes] = useState("");
  const reloadIdempotencyKeyRef = useRef<string | null>(null);
  const isSubmittingReloadRef = useRef(false);

  // Assign Promo
  const [assignTarget, setAssignTarget] = useState<MemberDto | null>(null);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [assignPaymentMethod, setAssignPaymentMethod] = useState<
    "CASH" | "DUITNOW_QR" | "CARD" | "CREDIT"
  >("DUITNOW_QR");
  const [deductFirstSessionNow, setDeductFirstSessionNow] = useState(false);
  const [assignNotes, setAssignNotes] = useState("");
  const assignIdempotencyKeyRef = useRef<string | null>(null);
  const isSubmittingAssignRef = useRef(false);

  // Manual Credit Adjustment
  const [adjustTarget, setAdjustTarget] = useState<MemberDto | null>(null);
  const [adjustDirection, setAdjustDirection] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustAmountStr, setAdjustAmountStr] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const adjustIdempotencyKeyRef = useRef<string | null>(null);
  const isSubmittingAdjustRef = useRef(false);

  // Post-Reload WhatsApp Receipt & Tally Check
  const [lastReloadReceipt, setLastReloadReceipt] = useState<{
    name: string;
    phone: string;
    addedCents: number;
    newBalanceCents: number;
  } | null>(null);
  const [tallyReport, setTallyReport] = useState<CreditTallyReport | null>(null);
  const [isCheckingTally, setIsCheckingTally] = useState(false);

  // Slide-over Member Detail Drawer
  const [detailTarget, setDetailTarget] = useState<MemberDetailDto | null>(null);
  const [detailTab, setDetailTab] = useState<"PACKAGES" | "HISTORY" | "LEDGER">(
    "PACKAGES"
  );
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Promo Template Dialog
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editPromoTarget, setEditPromoTarget] = useState<PromoPackageDto | null>(null);
  const [promoName, setPromoName] = useState("");
  const [promoDesc, setPromoDesc] = useState("");
  const [promoPriceStr, setPromoPriceStr] = useState("288.00");
  const [promoSessions, setPromoSessions] = useState(10);
  const [promoServiceIds, setPromoServiceIds] = useState<string[]>([]);
  const [promoValidityMonths, setPromoValidityMonths] = useState<string>("");
  const [promoIsActive, setPromoIsActive] = useState(true);

  const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

  function refreshMembers(q = searchQuery, incNon = includeNonMembers) {
    startTransition(async () => {
      const [res, sumRes] = await Promise.all([
        getMembers(q, incNon),
        getMemberCreditSummary(),
      ]);
      if (res.success) setMembers(res.data);
      if (sumRes.success) setCreditSummary(sumRes.data);
    });
  }

  async function refreshOpenDetail(customerId: string) {
    const res = await getMemberDetail(customerId);
    if (res.success) setDetailTarget(res.data);
  }

  function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      toast.error(isZh ? "请填写姓名和手机号" : "Name and phone number required");
      return;
    }

    startTransition(async () => {
      const res = await quickCreateMember({
        name: quickName,
        phoneNumber: quickPhone,
        notes: quickNotes,
      });
      if (res.success) {
        toast.success(isZh ? `已保存会员 ${res.data.name}` : `${res.data.name} saved`);
        setQuickName("");
        setQuickPhone("");
        setQuickNotes("");
        setMobileQuickAddOpen(false);
        refreshMembers();
      } else {
        toast.error(res.error);
      }
    });
  }

  function openReloadModal(member: MemberDto) {
    reloadIdempotencyKeyRef.current = generateIdempotencyKey();
    isSubmittingReloadRef.current = false;
    setReloadTarget(member);
    setReloadAmountStr("288");
    setBonusCreditStr("0");
    setFreeBonusServiceIds([]);
    setRedeemFreeBonusNow(true);
    setReloadPaymentMethod("DUITNOW_QR");
    setReloadNotes("");
  }

  function toggleFreeBonusService(serviceId: string) {
    setFreeBonusServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  function handleConfirmReload() {
    if (!reloadTarget || isSubmittingReloadRef.current) return;
    const reloadCents = Math.round((parseFloat(reloadAmountStr) || 0) * 100);
    const bonusCents = Math.round((parseFloat(bonusCreditStr) || 0) * 100);

    if (reloadCents <= 0) {
      toast.error(isZh ? "充值金额必须大于 0" : "Amount must be greater than 0");
      return;
    }

    isSubmittingReloadRef.current = true;
    const key = reloadIdempotencyKeyRef.current || generateIdempotencyKey();
    reloadIdempotencyKeyRef.current = key;

    startTransition(async () => {
      try {
        const res = await reloadMemberCredit({
          customerId: reloadTarget.id,
          reloadAmountCents: reloadCents,
          bonusCreditCents: bonusCents,
          freeBonusServiceIds,
          freeBonusSessions,
          redeemFreeBonusNow,
          paymentMethod: reloadPaymentMethod,
          notes: reloadNotes,
          idempotencyKey: key,
        });

        if (res.success) {
          toast.success(
            isZh
              ? `已充值 ${formatPrice(reloadCents, currencySymbol)}`
              : `Reloaded ${formatPrice(reloadCents, currencySymbol)}`
          );
          const targetId = reloadTarget.id;
          const totalAdded = reloadCents + Math.max(0, bonusCents);
          setLastReloadReceipt({
            name: reloadTarget.name,
            phone: reloadTarget.phoneNumber,
            addedCents: totalAdded,
            newBalanceCents: res.data.newBalanceCents,
          });
          setReloadTarget(null);
          reloadIdempotencyKeyRef.current = null;
          refreshMembers();
          if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
        } else {
          toast.error(res.error);
        }
      } finally {
        isSubmittingReloadRef.current = false;
      }
    });
  }

  function openAssignPromoModal(member: MemberDto) {
    const activePromos = promos.filter((p) => p.isActive);
    assignIdempotencyKeyRef.current = generateIdempotencyKey();
    isSubmittingAssignRef.current = false;
    setAssignTarget(member);
    setSelectedPromoId(activePromos[0]?.id || promos[0]?.id || "");
    setAssignPaymentMethod("DUITNOW_QR");
    setDeductFirstSessionNow(false);
    setAssignNotes("");
  }

  function handleConfirmAssignPromo() {
    if (!assignTarget || !selectedPromoId || isSubmittingAssignRef.current) return;
    isSubmittingAssignRef.current = true;
    const key = assignIdempotencyKeyRef.current || generateIdempotencyKey();
    assignIdempotencyKeyRef.current = key;

    startTransition(async () => {
      try {
        const res = await assignPromoToMember({
          customerId: assignTarget.id,
          promoPackageId: selectedPromoId,
          paymentMethod: assignPaymentMethod,
          deductFirstSessionNow,
          notes: assignNotes,
          idempotencyKey: key,
        });

        if (res.success) {
          toast.success(
            isZh ? `已绑定配套：${res.data.name}` : `${res.data.name} assigned`
          );
          const targetId = assignTarget.id;
          setAssignTarget(null);
          assignIdempotencyKeyRef.current = null;
          refreshMembers();
          if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
        } else {
          toast.error(res.error);
        }
      } finally {
        isSubmittingAssignRef.current = false;
      }
    });
  }

  function handleAdjustSession(
    memberPackageId: string,
    customerId: string,
    delta: -1 | 1,
    pkgName: string
  ) {
    startTransition(async () => {
      const res = await adjustMemberPackageSession({ memberPackageId, delta });
      if (res.success) {
        toast.success(
          `${pkgName}: ${res.data.remainingSessions}/${res.data.totalSessions}`
        );
        refreshMembers();
        if (detailTarget?.id === customerId) await refreshOpenDetail(customerId);
      } else {
        toast.error(res.error);
      }
    });
  }

  function openAdjustCreditModal(member: MemberDto) {
    adjustIdempotencyKeyRef.current = generateIdempotencyKey();
    isSubmittingAdjustRef.current = false;
    setAdjustTarget(member);
    setAdjustDirection("ADD");
    setAdjustAmountStr("");
    setAdjustReason("");
  }

  function handleConfirmAdjustCredit() {
    if (!adjustTarget || isSubmittingAdjustRef.current) return;
    const rawCents = Math.round((parseFloat(adjustAmountStr) || 0) * 100);
    if (rawCents <= 0) {
      toast.error(isZh ? "调整金额必须大于 0" : "Adjustment amount must be greater than 0");
      return;
    }
    if (adjustReason.trim().length < 2) {
      toast.error(isZh ? "请填写调整原因" : "Please enter a reason");
      return;
    }

    const deltaCents = adjustDirection === "DEDUCT" ? -rawCents : rawCents;
    isSubmittingAdjustRef.current = true;
    const key = adjustIdempotencyKeyRef.current || generateIdempotencyKey();
    adjustIdempotencyKeyRef.current = key;

    startTransition(async () => {
      try {
        const res = await adjustMemberCredit({
          customerId: adjustTarget.id,
          deltaCents,
          reason: adjustReason,
          idempotencyKey: key,
        });
        if (res.success) {
          toast.success(
            isZh
              ? `余额已调整，最新余额 ${formatPrice(res.data.newBalanceCents, currencySymbol)}`
              : `Credit adjusted · Balance ${formatPrice(res.data.newBalanceCents, currencySymbol)}`
          );
          const targetId = adjustTarget.id;
          setAdjustTarget(null);
          adjustIdempotencyKeyRef.current = null;
          refreshMembers();
          if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
        } else {
          toast.error(res.error);
        }
      } finally {
        isSubmittingAdjustRef.current = false;
      }
    });
  }

  async function handleRunTallyCheck() {
    setIsCheckingTally(true);
    try {
      const res = await verifyMemberCreditTally();
      if (res.success) {
        setTallyReport(res.data);
        if (res.data.mismatchedCount === 0) {
          toast.success(
            isZh
              ? `已核对 ${res.data.checkedCount} 位会员，账目 100% 吻合`
              : `Checked ${res.data.checkedCount} members — all credits tally`
          );
        } else {
          toast.error(
            isZh
              ? `发现 ${res.data.mismatchedCount} 位会员余额与账本不一致`
              : `Found ${res.data.mismatchedCount} mismatch(es)`
          );
        }
      } else {
        toast.error(res.error);
      }
    } finally {
      setIsCheckingTally(false);
    }
  }

  async function openMemberDetail(memberId: string) {
    setLoadingDetailId(memberId);
    try {
      const res = await getMemberDetail(memberId);
      if (res.success) {
        setDetailTarget(res.data);
        setDetailTab("PACKAGES");
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoadingDetailId(null);
    }
  }

  function openEditMember(m: MemberDto) {
    setEditMemberTarget(m);
    setEditName(m.name);
    setEditPhone(m.phoneNumber);
    setEditNotes(m.notes || "");
  }

  function handleSaveEditMember() {
    if (!editMemberTarget) return;
    startTransition(async () => {
      const res = await updateMember(editMemberTarget.id, {
        name: editName,
        phoneNumber: editPhone,
        notes: editNotes,
      });
      if (res.success) {
        toast.success(isZh ? "会员资料已更新" : "Member updated");
        const targetId = editMemberTarget.id;
        setEditMemberTarget(null);
        refreshMembers();
        if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleConfirmDeleteMember() {
    if (!deleteMemberTarget) return;
    startTransition(async () => {
      const res = await deleteMember(deleteMemberTarget.id);
      if (res.success) {
        toast.success(isZh ? "已移除会员" : "Member removed");
        if (detailTarget?.id === deleteMemberTarget.id) setDetailTarget(null);
        setDeleteMemberTarget(null);
        refreshMembers();
      } else {
        toast.error(res.error);
      }
    });
  }

  function openCreatePromo() {
    setEditPromoTarget(null);
    const defaultCut = services.find(
      (s) => s.name.includes("剪") || s.name.toLowerCase().includes("cut")
    );
    setPromoName(isZh ? "10次剪发配套" : "10x Hair Cut");
    setPromoDesc("");
    setPromoPriceStr("288.00");
    setPromoSessions(10);
    setPromoServiceIds(
      defaultCut ? [defaultCut.id] : services[0] ? [services[0].id] : []
    );
    setPromoValidityMonths("");
    setPromoIsActive(true);
    setPromoDialogOpen(true);
  }

  function openEditPromo(p: PromoPackageDto) {
    setEditPromoTarget(p);
    setPromoName(p.name);
    setPromoDesc(p.description || "");
    setPromoPriceStr((p.priceCents / 100).toFixed(2));
    setPromoSessions(p.totalSessions);
    setPromoServiceIds(p.serviceIds || []);
    setPromoValidityMonths(p.validityMonths ? String(p.validityMonths) : "");
    setPromoIsActive(p.isActive);
    setPromoDialogOpen(true);
  }

  function togglePromoServiceId(id: string) {
    setPromoServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSavePromo() {
    const priceCents = Math.round((parseFloat(promoPriceStr) || 0) * 100);
    const validity = promoValidityMonths ? parseInt(promoValidityMonths, 10) : null;

    startTransition(async () => {
      const res = editPromoTarget
        ? await updatePromoPackage(editPromoTarget.id, {
            name: promoName,
            description: promoDesc,
            priceCents,
            totalSessions: promoSessions,
            serviceIds: promoServiceIds,
            validityMonths: validity,
            isActive: promoIsActive,
          })
        : await createPromoPackage({
            name: promoName,
            description: promoDesc,
            priceCents,
            totalSessions: promoSessions,
            serviceIds: promoServiceIds,
            validityMonths: validity,
            isActive: promoIsActive,
          });

      if (res.success) {
        toast.success(
          editPromoTarget
            ? isZh
              ? "配套已更新"
              : "Promo updated"
            : isZh
            ? "配套已创建"
            : "Promo created"
        );
        setPromoDialogOpen(false);
        const listRes = await getPromoPackages();
        if (listRes.success) setPromos(listRes.data);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDeletePromo(id: string) {
    startTransition(async () => {
      const res = await deletePromoPackage(id);
      if (res.success) {
        toast.success(isZh ? "配套已删除" : "Promo deleted");
        setPromos((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        {isZh ? "会员与配套" : "Members & Promos"}
      </h1>

      {/* Shop-Wide Member Credit & Package KPI Strip */}
      <div className="rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isZh ? "会员未消费储值总额" : "Total Outstanding Credit"}
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-primary">
            {formatPrice(creditSummary.totalOutstandingCreditCents, currencySymbol)}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {isZh
              ? `${creditSummary.membersWithCreditCount} 位会员仍有余额`
              : `${creditSummary.membersWithCreditCount} members with credit`}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isZh ? "活跃会员数" : "Active Members"}
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {creditSummary.totalMembers}
          </div>
          <span className="text-xs text-muted-foreground">
            {isZh ? "已登记会员账户" : "Registered member profiles"}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isZh ? "配套剩余总次数" : "Remaining Promo Sessions"}
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {creditSummary.totalRemainingSessions}
          </div>
          <span className="text-xs text-muted-foreground">
            {isZh ? "有效配套可核销次数" : "Active package sessions"}
          </span>
        </div>
      </div>

      {/* Top Bar: Segmented Tabs + Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("MEMBERS")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === "MEMBERS"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>{isZh ? "会员列表" : "Members"}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {members.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PROMOS")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === "PROMOS"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>{isZh ? "配套方案" : "Promos"}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {promos.length}
            </span>
          </button>
        </div>

        {activeTab === "MEMBERS" ? (
          <Button
            type="button"
            size="sm"
            variant={mobileQuickAddOpen ? "secondary" : "default"}
            onClick={() => setMobileQuickAddOpen((prev) => !prev)}
            className="sm:hidden rounded-lg font-semibold gap-1.5 cursor-pointer"
          >
            {mobileQuickAddOpen ? (
              <>
                <X className="h-4 w-4" />
                <span>{isZh ? "收起" : "Close"}</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>{isZh ? "新增会员" : "Add Member"}</span>
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={openCreatePromo}
            className="rounded-lg font-semibold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isZh ? "新建配套" : "New Promo"}</span>
          </Button>
        )}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: MEMBERS                                                    */}
      {/* ================================================================= */}
      {activeTab === "MEMBERS" && (
        <div className="flex flex-col gap-4">
          {/* Inline Quick-Add Strip (collapsed on mobile by default, top on desktop) */}
          <form
            onSubmit={handleQuickCreate}
            className={`sm:order-1 p-3 rounded-xl border border-border bg-card grid-cols-1 sm:grid-cols-12 gap-2.5 ${
              mobileQuickAddOpen ? "grid" : "hidden sm:grid"
            }`}
          >
            <div className="sm:col-span-4">
              <Input
                placeholder={isZh ? "手机号 (如 0123456789)" : "Phone (e.g. 0123456789)"}
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                className="h-9 rounded-lg text-base sm:text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                placeholder={isZh ? "会员姓名" : "Member Name"}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="h-9 rounded-lg text-base sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                placeholder={isZh ? "备注" : "Note"}
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="h-9 rounded-lg text-base sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="w-full h-9 rounded-lg font-semibold gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span>{isZh ? "添加" : "Add"}</span>
              </Button>
            </div>
          </form>

          {/* Search & Toggle (first on mobile, aligns below sticky top header on focus) */}
          <div
            ref={searchSectionRef}
            className="sm:order-2 scroll-mt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                ref={searchInputRef}
                enterKeyHint="search"
                placeholder={isZh ? "搜索会员姓名或手机号..." : "Search name or phone..."}
                value={searchQuery}
                onFocus={handleSearchFocus}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  refreshMembers(val, includeNonMembers);
                }}
                className="pl-9 pr-9 h-10 sm:h-9 rounded-lg text-base sm:text-sm bg-card"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={isZh ? "清除搜索" : "Clear search"}
                  onClick={() => {
                    setSearchQuery("");
                    refreshMembers("", includeNonMembers);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none px-3 h-9 rounded-lg border border-border bg-card">
              <input
                type="checkbox"
                checked={includeNonMembers}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIncludeNonMembers(next);
                  refreshMembers(searchQuery, next);
                }}
                className="h-3.5 w-3.5 rounded"
              />
              <span>{isZh ? "包含散客" : "Include walk-ins"}</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunTallyCheck}
              disabled={isCheckingTally}
              className="h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer bg-card"
            >
              {isCheckingTally ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{isZh ? "核对账目" : "Tally Check"}</span>
            </Button>
          </div>

          {lastReloadReceipt && !lastReloadReceipt.phone.startsWith("WALKIN-") && (
            <div className="sm:order-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-foreground tabular-nums">
                {isZh
                  ? `${lastReloadReceipt.name} 充值成功 +${formatPrice(lastReloadReceipt.addedCents, currencySymbol)} · 最新余额 ${formatPrice(lastReloadReceipt.newBalanceCents, currencySymbol)}`
                  : `${lastReloadReceipt.name} reloaded +${formatPrice(lastReloadReceipt.addedCents, currencySymbol)} · Balance ${formatPrice(lastReloadReceipt.newBalanceCents, currencySymbol)}`}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={buildMemberCreditWhatsAppUrl({
                    customerName: lastReloadReceipt.name,
                    customerPhone: lastReloadReceipt.phone,
                    action: "RELOAD",
                    amountCents: lastReloadReceipt.addedCents,
                    newBalanceCents: lastReloadReceipt.newBalanceCents,
                    currencySymbol,
                    language: isZh ? "zh" : "en",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{isZh ? "发送 WhatsApp 凭证" : "Send WhatsApp Receipt"}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLastReloadReceipt(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {tallyReport && (
            <div
              className={`sm:order-2 p-3 rounded-xl border text-xs space-y-2 ${
                tallyReport.mismatchedCount === 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck
                    className={`h-4 w-4 shrink-0 ${
                      tallyReport.mismatchedCount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  />
                  <span>
                    {tallyReport.mismatchedCount === 0
                      ? isZh
                        ? `账目核对完成：全部 ${tallyReport.checkedCount} 位会员储值与明细账单 100% 一致`
                        : `Tally Passed: All ${tallyReport.checkedCount} member balances match the ledger (0 mismatches)`
                      : isZh
                      ? `发现 ${tallyReport.mismatchedCount} 笔余额差异（共核对 ${tallyReport.checkedCount} 位）`
                      : `Found ${tallyReport.mismatchedCount} mismatch(es) out of ${tallyReport.checkedCount} accounts`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTallyReport(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Close tally report"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {tallyReport.mismatches.length > 0 && (
                <div className="space-y-1 pt-1">
                  {tallyReport.mismatches.map((m) => (
                    <button
                      key={m.customerId}
                      type="button"
                      onClick={() => openMemberDetail(m.customerId)}
                      className="w-full text-left p-2 rounded-lg bg-card border border-border flex items-center justify-between gap-2 hover:bg-muted/40 cursor-pointer tabular-nums"
                    >
                      <span className="font-semibold">
                        {m.name} ({m.phoneNumber})
                      </span>
                      <span className="font-mono text-destructive">
                        {isZh ? "余额" : "Stored"}:{" "}
                        {formatPrice(m.storedBalanceCents, currencySymbol)} vs{" "}
                        {isZh ? "账本" : "Ledger"}:{" "}
                        {formatPrice(m.ledgerSumCents, currencySymbol)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Table / List */}
          {members.length === 0 ? (
            <div className="sm:order-3 text-center py-14 border border-border rounded-xl bg-card text-muted-foreground space-y-1.5">
              <Users className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-foreground">
                {isZh ? "暂无会员记录" : "No members yet"}
              </p>
            </div>
          ) : (
            <div className="sm:order-3 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {/* Desktop Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">{isZh ? "会员" : "Member"}</div>
                <div className="col-span-2 text-right">{isZh ? "储值余额" : "Credit"}</div>
                <div className="col-span-3">{isZh ? "有效配套" : "Active Promos"}</div>
                <div className="col-span-3 text-right">{isZh ? "操作" : "Actions"}</div>
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => openMemberDetail(member.id)}
                  className="p-4 md:grid md:grid-cols-12 md:items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  {/* Name & Phone */}
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemberDetail(member.id);
                        }}
                        className="font-semibold text-sm text-foreground hover:text-primary truncate cursor-pointer text-left"
                      >
                        {member.name}
                      </button>
                      {!member.isMember && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {isZh ? "散客" : "Walk-in"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 tabular-nums">
                      <span className="font-mono">{member.phoneNumber}</span>
                      <span>·</span>
                      <span>
                        {isZh
                          ? `${member.totalVisitsCount} 次到店`
                          : `${member.totalVisitsCount} visits`}
                      </span>
                    </div>
                  </div>

                  {/* Credit Balance */}
                  <div className="md:col-span-2 md:text-right mt-2 md:mt-0">
                    <span className="font-mono font-bold text-sm tabular-nums text-primary">
                      {formatPrice(member.creditBalanceCents, currencySymbol)}
                    </span>
                  </div>

                  {/* Active Promos */}
                  <div className="md:col-span-3 flex flex-wrap gap-1.5 mt-2 md:mt-0">
                    {member.activePackages.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      member.activePackages.map((pkg) => (
                        <span
                          key={pkg.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium"
                        >
                          <span className="truncate max-w-[120px]">{pkg.name}</span>
                          <span className="font-mono font-bold tabular-nums">
                            {pkg.remainingSessions}/{pkg.totalSessions}
                          </span>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-3 flex items-center md:justify-end gap-1.5 mt-3 md:mt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReloadModal(member);
                      }}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                    >
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                      <span>{isZh ? "充值" : "Reload"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignPromoModal(member);
                      }}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>{isZh ? "绑配套" : "Promo"}</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMemberDetail(member.id);
                      }}
                      disabled={loadingDetailId === member.id}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={isZh ? "会员详情" : "Member details"}
                    >
                      {loadingDetailId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: PROMO TEMPLATES                                            */}
      {/* ================================================================= */}
      {activeTab === "PROMOS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {promos.length === 0 ? (
            <div className="md:col-span-2 text-center py-14 border border-border rounded-xl bg-card text-muted-foreground space-y-3">
              <Ticket className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-foreground">
                {isZh ? "暂无配套方案" : "No promos yet"}
              </p>
              <Button size="sm" onClick={openCreatePromo} className="rounded-lg gap-1.5">
                <Plus className="h-4 w-4" />
                <span>{isZh ? "新建配套" : "Create Promo"}</span>
              </Button>
            </div>
          ) : (
            promos.map((promo) => {
              const eligibleNames = promo.serviceIds
                .map((id) => serviceNameMap.get(id))
                .filter(Boolean);
              return (
                <div
                  key={promo.id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {promo.name}
                        </h3>
                        {!promo.isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            {isZh ? "已停用" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {eligibleNames.map((n, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-base tabular-nums text-primary">
                        {formatPrice(promo.priceCents, currencySymbol)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {isZh ? `${promo.totalSessions} 次` : `${promo.totalSessions} sessions`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border text-xs text-muted-foreground">
                    <span>
                      {promo.validityMonths
                        ? isZh
                          ? `有效期 ${promo.validityMonths} 个月`
                          : `${promo.validityMonths} months validity`
                        : isZh
                        ? "永久有效"
                        : "No expiry"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditPromo(promo)}
                        className="h-7 w-7 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePromo(promo.id)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SLIDE-OVER MEMBER DETAIL DRAWER (<Sheet>)                         */}
      {/* ================================================================= */}
      <Sheet open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden"
        >
          {detailTarget && (
            <>
              <SheetHeader className="p-5 border-b border-border text-left space-y-3">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <div>
                    <SheetTitle className="text-lg font-bold">
                      {detailTarget.name}
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs tabular-nums">
                      {detailTarget.phoneNumber} ·{" "}
                      {isZh
                        ? `${detailTarget.totalVisitsCount} 次到店`
                        : `${detailTarget.totalVisitsCount} visits`}{" "}
                      ·{" "}
                      {isZh
                        ? `累计消费 ${formatPrice(detailTarget.totalSpentCents, currencySymbol)}`
                        : `${formatPrice(detailTarget.totalSpentCents, currencySymbol)} spent`}
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => openEditMember(detailTarget)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => setDeleteMemberTarget(detailTarget)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Wallet Strip & Quick Actions */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/60 border border-border">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isZh ? "储值余额" : "Credit Balance"}
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-primary">
                      {formatPrice(detailTarget.creditBalanceCents, currencySymbol)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => openReloadModal(detailTarget)}
                      className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {isZh ? "充值" : "Reload"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignPromoModal(detailTarget)}
                      className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {isZh ? "绑定配套" : "Bind Promo"}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openAdjustCreditModal(detailTarget)}
                      className="h-8 w-8 rounded-lg cursor-pointer"
                      title={isZh ? "手动调账" : "Adjust Credit"}
                      aria-label={isZh ? "手动调账" : "Adjust Credit"}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    {!detailTarget.phoneNumber.startsWith("WALKIN-") && (
                      <a
                        href={buildMemberCreditWhatsAppUrl({
                          customerName: detailTarget.name,
                          customerPhone: detailTarget.phoneNumber,
                          action: "BALANCE",
                          newBalanceCents: detailTarget.creditBalanceCents,
                          currencySymbol,
                          language: isZh ? "zh" : "en",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                        title={isZh ? "WhatsApp 发送余额" : "Send Balance on WhatsApp"}
                        aria-label={isZh ? "WhatsApp 发送余额" : "Send Balance on WhatsApp"}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex items-center gap-1 border-b border-border -mb-5 pt-1">
                  {(
                    [
                      {
                        id: "PACKAGES",
                        label: `${isZh ? "配套" : "Promos"} (${detailTarget.allPackages.length})`,
                      },
                      {
                        id: "HISTORY",
                        label: `${isZh ? "消费记录" : "History"} (${detailTarget.purchaseHistory.length})`,
                      },
                      {
                        id: "LEDGER",
                        label: `${isZh ? "明细账单" : "Ledger"} (${detailTarget.transactions.length})`,
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                        detailTab === t.id
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {detailTab === "PACKAGES" && (
                  <>
                    {detailTarget.allPackages.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-10">
                        {isZh ? "暂无配套" : "No promo packages"}
                      </p>
                    ) : (
                      detailTarget.allPackages.map((pkg) => {
                        const svcNames = pkg.serviceIds
                          .map((id) => serviceNameMap.get(id))
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <div
                            key={pkg.id}
                            className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                  {pkg.name}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {isZh
                                    ? PACKAGE_STATUS_ZH[pkg.status] || pkg.status
                                    : pkg.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {svcNames || (isZh ? "全部服务" : "All")}
                              </div>
                              <div className="text-[11px] text-muted-foreground tabular-nums">
                                {format(
                                  new Date(pkg.createdAt),
                                  isZh ? "yyyy年M月d日" : "d MMM yyyy",
                                  { locale: dateLocale }
                                )}
                                {pkg.expiresAt
                                  ? isZh
                                    ? ` · 有效期至 ${format(new Date(pkg.expiresAt), "yyyy年M月d日", { locale: dateLocale })}`
                                    : ` · Exp ${format(new Date(pkg.expiresAt), "d MMM yyyy", { locale: dateLocale })}`
                                  : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-bold text-sm tabular-nums mr-1">
                                {pkg.remainingSessions}/{pkg.totalSessions}
                              </span>
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={isPending || pkg.remainingSessions < 1}
                                onClick={() =>
                                  handleAdjustSession(
                                    pkg.id,
                                    detailTarget.id,
                                    -1,
                                    pkg.name
                                  )
                                }
                                className="h-7 w-7 cursor-pointer"
                                title={isZh ? "核销 1 次" : "Deduct 1"}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={
                                  isPending ||
                                  pkg.remainingSessions >= pkg.totalSessions
                                }
                                onClick={() =>
                                  handleAdjustSession(
                                    pkg.id,
                                    detailTarget.id,
                                    1,
                                    pkg.name
                                  )
                                }
                                className="h-7 w-7 cursor-pointer"
                                title={isZh ? "退回 1 次" : "Restore 1"}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {detailTab === "HISTORY" && (
                  <>
                    {detailTarget.purchaseHistory.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-10">
                        {isZh ? "暂无消费记录" : "No purchase history"}
                      </p>
                    ) : (
                      detailTarget.purchaseHistory.map((visit) => (
                        <div
                          key={visit.id}
                          className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div className="flex items-center gap-2 tabular-nums">
                              <span className="font-mono font-semibold text-foreground">
                                {visit.referenceCode}
                              </span>
                              <span className="text-muted-foreground">
                                {format(
                                  new Date(visit.dateIso),
                                  isZh ? "M月d日 HH:mm" : "d MMM, h:mm a",
                                  { locale: dateLocale }
                                )}
                              </span>
                            </div>
                            <span className="font-mono font-bold tabular-nums">
                              {formatPrice(visit.totalCashPaidCents, currencySymbol)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {visit.items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between"
                              >
                                <span className="flex items-center gap-1.5">
                                  {it.itemType === "PRODUCT" ? (
                                    <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <Scissors className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span>{it.serviceName}</span>
                                  {it.memberPackageName && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {isZh ? "配套" : "Promo"}
                                    </Badge>
                                  )}
                                </span>
                                <span className="font-mono tabular-nums text-muted-foreground">
                                  {it.memberPackageId
                                    ? "0.00"
                                    : formatPrice(it.priceCents, currencySymbol)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {detailTab === "LEDGER" && (
                  <>
                    {detailTarget.transactions.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-10">
                        {isZh ? "暂无余额变动" : "No transactions"}
                      </p>
                    ) : (
                      detailTarget.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {tx.description}
                            </div>
                            <div className="text-[11px] text-muted-foreground tabular-nums">
                              {format(
                                new Date(tx.createdAt),
                                isZh ? "yyyy年M月d日 HH:mm" : "d MMM yyyy, h:mm a",
                                { locale: dateLocale }
                              )}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0 space-y-0.5">
                            {tx.creditChangeCents !== 0 && (
                              <>
                                <div
                                  className={`font-bold ${
                                    tx.creditChangeCents > 0
                                      ? "text-primary"
                                      : "text-foreground"
                                  }`}
                                >
                                  {tx.creditChangeCents > 0 ? "+" : ""}
                                  {formatPrice(tx.creditChangeCents, currencySymbol)}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {isZh ? "余额 " : "Bal "}
                                  {formatPrice(tx.balanceAfterCents, currencySymbol)}
                                </div>
                              </>
                            )}
                            {tx.sessionsChange !== 0 && (
                              <>
                                <div className="font-semibold text-foreground">
                                  {tx.sessionsChange > 0
                                    ? `+${tx.sessionsChange}`
                                    : tx.sessionsChange}{" "}
                                  {isZh ? "次" : "sess"}
                                </div>
                                {tx.sessionsAfter !== null && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {isZh
                                      ? `剩 ${tx.sessionsAfter} 次`
                                      : `${tx.sessionsAfter} left`}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ================================================================= */}
      {/* DIALOG: RELOAD CREDIT                                             */}
      {/* ================================================================= */}
      <Dialog open={!!reloadTarget} onOpenChange={(o) => !o && setReloadTarget(null)}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isZh ? "会员充值" : "Reload Credit"} — {reloadTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-xs tabular-nums">
              {isZh ? "当前余额：" : "Current balance: "}
              {formatPrice(reloadTarget?.creditBalanceCents || 0, currencySymbol)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isZh ? `充值金额 (${currencySymbol})` : `Amount (${currencySymbol})`}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {["100", "288", "388", "500"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setReloadAmountStr(amt)}
                    className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                      reloadAmountStr === amt
                        ? "border-primary bg-accent text-accent-foreground"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    {currencySymbol} {amt}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={reloadAmountStr}
                onChange={(e) => setReloadAmountStr(e.target.value)}
                className="font-mono font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? `赠送储值 (${currencySymbol})` : `Bonus Credit (${currencySymbol})`}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={bonusCreditStr}
                onChange={(e) => setBonusCreditStr(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <Label className="text-xs font-semibold">
                {isZh ? "赠送免费服务" : "Free Bonus Service"}
              </Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                {services
                  .filter((s) => s.type !== "PRODUCT")
                  .map((s) => {
                    const checked = freeBonusServiceIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer ${
                          checked ? "border-primary bg-accent font-medium" : "bg-card"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFreeBonusService(s.id)}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
              </div>
              {freeBonusServiceIds.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-medium pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redeemFreeBonusNow}
                    onChange={(e) => setRedeemFreeBonusNow(e.target.checked)}
                  />
                  <span>{isZh ? "今天立即核销使用" : "Redeem immediately today"}</span>
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isZh ? "支付方式" : "Payment"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["DUITNOW_QR", "CASH", "CARD"] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setReloadPaymentMethod(pm)}
                    className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      reloadPaymentMethod === pm
                        ? "border-primary bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {pm === "DUITNOW_QR"
                      ? isZh
                        ? "扫码"
                        : "QR"
                      : pm === "CASH"
                      ? isZh
                        ? "现金"
                        : "Cash"
                      : isZh
                      ? "刷卡"
                      : "Card"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              value={reloadNotes}
              onChange={(e) => setReloadNotes(e.target.value)}
              placeholder={isZh ? "备注（选填）" : "Note (optional)"}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReloadTarget(null)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button onClick={handleConfirmReload} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isZh ? "确认充值" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: BIND PROMO                                                */}
      {/* ================================================================= */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {isZh ? "绑定配套" : "Bind Promo"} — {assignTarget?.name}
            </DialogTitle>
          </DialogHeader>

          {promos.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isZh ? "尚未创建配套方案" : "No promos created yet"}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setAssignTarget(null);
                  setActiveTab("PROMOS");
                  openCreatePromo();
                }}
              >
                {isZh ? "新建配套" : "Create Promo"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {promos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPromoId(p.id)}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                      selectedPromoId === p.id
                        ? "border-primary bg-accent"
                        : "bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {isZh ? `${p.totalSessions} 次` : `${p.totalSessions} sessions`}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm tabular-nums">
                      {formatPrice(p.priceCents, currencySymbol)}
                    </span>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFirstSessionNow}
                  onChange={(e) => setDeductFirstSessionNow(e.target.checked)}
                />
                <span>
                  {isZh ? "今天同时核销第 1 次" : "Deduct 1st session today"}
                </span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {(["DUITNOW_QR", "CASH", "CARD", "CREDIT"] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setAssignPaymentMethod(pm)}
                    className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      assignPaymentMethod === pm
                        ? "border-primary bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {pm === "DUITNOW_QR"
                      ? isZh
                        ? "扫码"
                        : "QR"
                      : pm === "CASH"
                      ? isZh
                        ? "现金"
                        : "Cash"
                      : pm === "CARD"
                      ? isZh
                        ? "刷卡"
                        : "Card"
                      : isZh
                      ? "储值扣款"
                      : "Credit"}
                  </button>
                ))}
              </div>

              <Input
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder={isZh ? "备注（选填）" : "Note (optional)"}
                className="text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            {promos.length > 0 && (
              <Button
                onClick={handleConfirmAssignPromo}
                disabled={isPending || !selectedPromoId}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isZh ? "确认绑定" : "Confirm"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: PROMO TEMPLATE CREATE / EDIT                              */}
      {/* ================================================================= */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editPromoTarget
                ? isZh
                  ? "编辑配套"
                  : "Edit Promo"
                : isZh
                ? "新建配套"
                : "New Promo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? "配套名称 *" : "Name *"}
              </Label>
              <Input
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                placeholder={isZh ? "10次剪发配套" : "10x Hair Cut"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {isZh ? `售价 (${currencySymbol}) *` : `Price (${currencySymbol}) *`}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={promoPriceStr}
                  onChange={(e) => setPromoPriceStr(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {isZh ? "可用次数 *" : "Sessions *"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={promoSessions}
                  onChange={(e) => setPromoSessions(parseInt(e.target.value, 10) || 1)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? "适用服务 *" : "Eligible Services *"}
              </Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {services.map((s) => {
                  const checked = promoServiceIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                        checked ? "border-primary bg-accent font-medium" : "bg-card"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePromoServiceId(s.id)}
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? "有效期" : "Validity"}
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: isZh ? "永久有效" : "No expiry", val: "" },
                  { label: isZh ? "6 个月" : "6 mo", val: "6" },
                  { label: isZh ? "12 个月" : "12 mo", val: "12" },
                  { label: isZh ? "24 个月" : "24 mo", val: "24" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setPromoValidityMonths(opt.val)}
                    className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      promoValidityMonths === opt.val
                        ? "border-primary bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button onClick={handleSavePromo} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isZh ? "保存" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOGS: EDIT / DELETE MEMBER                                     */}
      {/* ================================================================= */}
      <Dialog
        open={!!editMemberTarget}
        onOpenChange={(o) => !o && setEditMemberTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{isZh ? "编辑会员资料" : "Edit Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{isZh ? "姓名" : "Name"}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isZh ? "手机号" : "Phone"}</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isZh ? "备注" : "Note"}</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberTarget(null)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button onClick={handleSaveEditMember} disabled={isPending}>
              {isZh ? "保存" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!adjustTarget}
        onOpenChange={(o) => !o && setAdjustTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {isZh ? "储值手动调账" : "Adjust Credit"} — {adjustTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-xs tabular-nums">
              {isZh ? "当前余额：" : "Current balance: "}
              {formatPrice(adjustTarget?.creditBalanceCents || 0, currencySymbol)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustDirection("ADD")}
                className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  adjustDirection === "ADD"
                    ? "border-primary bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {isZh ? "+ 增加 / 退还" : "+ Add / Refund"}
              </button>
              <button
                type="button"
                onClick={() => setAdjustDirection("DEDUCT")}
                className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  adjustDirection === "DEDUCT"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {isZh ? "- 扣减 / 冲正" : "- Deduct / Reverse"}
              </button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? `金额 (${currencySymbol}) *` : `Amount (${currencySymbol}) *`}
              </Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={adjustAmountStr}
                onChange={(e) => setAdjustAmountStr(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {isZh ? "调账原因 *" : "Reason *"}
              </Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={isZh ? "例如：充值输入错误冲正" : "e.g. Correct reload typo"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button onClick={handleConfirmAdjustCredit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isZh ? "确认调账" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteMemberTarget}
        onOpenChange={(o) => !o && setDeleteMemberTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {isZh ? "移除会员" : "Remove Member"}
            </DialogTitle>
            <DialogDescription className="text-xs space-y-1.5">
              {isZh ? (
                <>
                  确定取消 {deleteMemberTarget?.name} 的会员资格吗？所有历史账单与交易记录将完整保留。
                  {(deleteMemberTarget?.creditBalanceCents ?? 0) > 0 && (
                    <span className="block font-semibold text-destructive">
                      该会员仍有储值余额，需先结清或扣除后才能移除。
                    </span>
                  )}
                </>
              ) : (
                <>
                  Deactivate membership for {deleteMemberTarget?.name}? Historical ledger and sales records remain preserved.
                  {(deleteMemberTarget?.creditBalanceCents ?? 0) > 0 && (
                    <span className="block font-semibold text-destructive">
                      This member still has credit balance and cannot be removed until settled.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMemberTarget(null)}>
              {isZh ? "取消" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMember}
              disabled={isPending}
            >
              {isZh ? "确认移除" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
