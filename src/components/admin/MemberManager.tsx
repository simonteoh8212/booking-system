"use client";

import { useState, useTransition } from "react";
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
} from "@/actions/members";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
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
} from "lucide-react";
import type {
  MemberDto,
  MemberDetailDto,
  PromoPackageDto,
  ServiceDto,
} from "@/types";

interface MemberManagerProps {
  initialMembers: MemberDto[];
  initialPromos: PromoPackageDto[];
  services: ServiceDto[];
  currencySymbol?: string;
}

export function MemberManager({
  initialMembers,
  initialPromos,
  services,
  currencySymbol = "RM",
}: MemberManagerProps) {
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "PROMOS">("MEMBERS");
  const [members, setMembers] = useState<MemberDto[]>(initialMembers);
  const [promos, setPromos] = useState<PromoPackageDto[]>(initialPromos);
  const [searchQuery, setSearchQuery] = useState("");
  const [includeNonMembers, setIncludeNonMembers] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  // Assign Promo
  const [assignTarget, setAssignTarget] = useState<MemberDto | null>(null);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [assignPaymentMethod, setAssignPaymentMethod] = useState<
    "CASH" | "DUITNOW_QR" | "CARD" | "CREDIT"
  >("DUITNOW_QR");
  const [deductFirstSessionNow, setDeductFirstSessionNow] = useState(false);
  const [assignNotes, setAssignNotes] = useState("");

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
      const res = await getMembers(q, incNon);
      if (res.success) setMembers(res.data);
    });
  }

  async function refreshOpenDetail(customerId: string) {
    const res = await getMemberDetail(customerId);
    if (res.success) setDetailTarget(res.data);
  }

  function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      toast.error("Name and phone number required");
      return;
    }

    startTransition(async () => {
      const res = await quickCreateMember({
        name: quickName,
        phoneNumber: quickPhone,
        notes: quickNotes,
      });
      if (res.success) {
        toast.success(`${res.data.name} saved`);
        setQuickName("");
        setQuickPhone("");
        setQuickNotes("");
        refreshMembers();
      } else {
        toast.error(res.error);
      }
    });
  }

  function openReloadModal(member: MemberDto) {
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
    if (!reloadTarget) return;
    const reloadCents = Math.round((parseFloat(reloadAmountStr) || 0) * 100);
    const bonusCents = Math.round((parseFloat(bonusCreditStr) || 0) * 100);

    if (reloadCents <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    startTransition(async () => {
      const res = await reloadMemberCredit({
        customerId: reloadTarget.id,
        reloadAmountCents: reloadCents,
        bonusCreditCents: bonusCents,
        freeBonusServiceIds,
        freeBonusSessions,
        redeemFreeBonusNow,
        paymentMethod: reloadPaymentMethod,
        notes: reloadNotes,
      });

      if (res.success) {
        toast.success(`Reloaded ${formatPrice(reloadCents, currencySymbol)}`);
        const targetId = reloadTarget.id;
        setReloadTarget(null);
        refreshMembers();
        if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
      } else {
        toast.error(res.error);
      }
    });
  }

  function openAssignPromoModal(member: MemberDto) {
    const activePromos = promos.filter((p) => p.isActive);
    setAssignTarget(member);
    setSelectedPromoId(activePromos[0]?.id || promos[0]?.id || "");
    setAssignPaymentMethod("DUITNOW_QR");
    setDeductFirstSessionNow(false);
    setAssignNotes("");
  }

  function handleConfirmAssignPromo() {
    if (!assignTarget || !selectedPromoId) return;
    startTransition(async () => {
      const res = await assignPromoToMember({
        customerId: assignTarget.id,
        promoPackageId: selectedPromoId,
        paymentMethod: assignPaymentMethod,
        deductFirstSessionNow,
        notes: assignNotes,
      });

      if (res.success) {
        toast.success(`${res.data.name} assigned`);
        const targetId = assignTarget.id;
        setAssignTarget(null);
        refreshMembers();
        if (detailTarget?.id === targetId) await refreshOpenDetail(targetId);
      } else {
        toast.error(res.error);
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
        toast.success("Member updated");
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
        toast.success("Member removed");
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
    setPromoName("10x Hair Cut");
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
        toast.success(editPromoTarget ? "Promo updated" : "Promo created");
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
        toast.success("Promo deleted");
        setPromos((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
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
            <span>Members</span>
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
            <span>Promos</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {promos.length}
            </span>
          </button>
        </div>

        {activeTab === "PROMOS" && (
          <Button
            size="sm"
            onClick={openCreatePromo}
            className="rounded-lg font-semibold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Promo</span>
          </Button>
        )}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: MEMBERS                                                    */}
      {/* ================================================================= */}
      {activeTab === "MEMBERS" && (
        <div className="space-y-4">
          {/* Inline Quick-Add Strip */}
          <form
            onSubmit={handleQuickCreate}
            className="p-3 rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            <div className="sm:col-span-4">
              <Input
                placeholder="Phone (e.g. 0123456789)"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                placeholder="Member Name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                placeholder="Note"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="h-9 rounded-lg text-sm"
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
                <span>Add</span>
              </Button>
            </div>
          </form>

          {/* Search & Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  refreshMembers(val, includeNonMembers);
                }}
                className="pl-9 h-9 rounded-lg text-sm bg-card"
              />
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
              <span>Include walk-ins</span>
            </label>
          </div>

          {/* Members Table / List */}
          {members.length === 0 ? (
            <div className="text-center py-14 border border-border rounded-xl bg-card text-muted-foreground space-y-1.5">
              <Users className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-foreground">No members yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {/* Desktop Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">Member</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-3">Active Promos</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 md:grid md:grid-cols-12 md:items-center gap-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Name & Phone */}
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openMemberDetail(member.id)}
                        className="font-semibold text-sm text-foreground hover:text-primary truncate cursor-pointer text-left"
                      >
                        {member.name}
                      </button>
                      {!member.isMember && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Walk-in
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 tabular-nums">
                      <span className="font-mono">{member.phoneNumber}</span>
                      <span>·</span>
                      <span>{member.totalVisitsCount} visits</span>
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
                      onClick={() => openReloadModal(member)}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                    >
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                      <span>Reload</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignPromoModal(member)}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>Promo</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openMemberDetail(member.id)}
                      disabled={loadingDetailId === member.id}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Member details"
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
              <p className="text-sm font-semibold text-foreground">No promos yet</p>
              <Button size="sm" onClick={openCreatePromo} className="rounded-lg gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Create Promo</span>
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
                            Inactive
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
                        {promo.totalSessions} sessions
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border text-xs text-muted-foreground">
                    <span>
                      {promo.validityMonths
                        ? `${promo.validityMonths} months validity`
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
                      {detailTarget.phoneNumber} · {detailTarget.totalVisitsCount} visits ·{" "}
                      {formatPrice(detailTarget.totalSpentCents, currencySymbol)} spent
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
                      Credit Balance
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-primary">
                      {formatPrice(detailTarget.creditBalanceCents, currencySymbol)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => openReloadModal(detailTarget)}
                      className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Reload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignPromoModal(detailTarget)}
                      className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Bind Promo
                    </Button>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex items-center gap-1 border-b border-border -mb-5 pt-1">
                  {(
                    [
                      { id: "PACKAGES", label: `Promos (${detailTarget.allPackages.length})` },
                      {
                        id: "HISTORY",
                        label: `History (${detailTarget.purchaseHistory.length})`,
                      },
                      { id: "LEDGER", label: `Ledger (${detailTarget.transactions.length})` },
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
                        No promo packages
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
                                  {pkg.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {svcNames || "All"}
                              </div>
                              <div className="text-[11px] text-muted-foreground tabular-nums">
                                {format(new Date(pkg.createdAt), "d MMM yyyy")}
                                {pkg.expiresAt
                                  ? ` · Exp ${format(new Date(pkg.expiresAt), "d MMM yyyy")}`
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
                                title="Deduct 1"
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
                                title="Restore 1"
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
                        No purchase history
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
                                {format(new Date(visit.dateIso), "d MMM, h:mm a")}
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
                                      Promo
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
                        No transactions
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
                              {format(new Date(tx.createdAt), "d MMM yyyy, h:mm a")}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            {tx.creditChangeCents !== 0 && (
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
                            )}
                            {tx.sessionsChange !== 0 && (
                              <div className="font-semibold text-foreground">
                                {tx.sessionsChange > 0
                                  ? `+${tx.sessionsChange}`
                                  : tx.sessionsChange}{" "}
                                sess
                              </div>
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
            <DialogTitle>Reload Credit — {reloadTarget?.name}</DialogTitle>
            <DialogDescription className="text-xs tabular-nums">
              Current balance:{" "}
              {formatPrice(reloadTarget?.creditBalanceCents || 0, currencySymbol)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount ({currencySymbol})</Label>
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
                Bonus Credit ({currencySymbol})
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
              <Label className="text-xs font-semibold">Free Bonus Service</Label>
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
                  <span>Redeem immediately today</span>
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment</Label>
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
                    {pm === "DUITNOW_QR" ? "QR" : pm === "CASH" ? "Cash" : "Card"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              value={reloadNotes}
              onChange={(e) => setReloadNotes(e.target.value)}
              placeholder="Note (optional)"
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReloadTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReload} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
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
            <DialogTitle>Bind Promo — {assignTarget?.name}</DialogTitle>
          </DialogHeader>

          {promos.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No promos created yet</p>
              <Button
                size="sm"
                onClick={() => {
                  setAssignTarget(null);
                  setActiveTab("PROMOS");
                  openCreatePromo();
                }}
              >
                Create Promo
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
                        {p.totalSessions} sessions
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
                <span>Deduct 1st session today</span>
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
                      ? "QR"
                      : pm === "CASH"
                      ? "Cash"
                      : pm === "CARD"
                      ? "Card"
                      : "Credit"}
                  </button>
                ))}
              </div>

              <Input
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Note (optional)"
                className="text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            {promos.length > 0 && (
              <Button
                onClick={handleConfirmAssignPromo}
                disabled={isPending || !selectedPromoId}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm
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
            <DialogTitle>{editPromoTarget ? "Edit Promo" : "New Promo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                placeholder="10x Hair Cut"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Price ({currencySymbol}) *
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
                <Label className="text-xs font-semibold">Sessions *</Label>
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
              <Label className="text-xs font-semibold">Eligible Services *</Label>
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
              <Label className="text-xs font-semibold">Validity</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "No expiry", val: "" },
                  { label: "6 mo", val: "6" },
                  { label: "12 mo", val: "12" },
                  { label: "24 mo", val: "24" },
                ].map((opt) => (
                  <button
                    key={opt.label}
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
              Cancel
            </Button>
            <Button onClick={handleSavePromo} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
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
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditMember} disabled={isPending}>
              Save
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
            <DialogTitle className="text-destructive">Remove Member</DialogTitle>
            <DialogDescription className="text-xs">
              Remove {deleteMemberTarget?.name}? Completed sales records remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMemberTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMember}
              disabled={isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
