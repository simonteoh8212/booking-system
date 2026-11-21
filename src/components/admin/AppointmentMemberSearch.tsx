"use client";

import { useState, useRef, useEffect } from "react";
import { lookupMembersForCheckout } from "@/actions/members";
import { formatPrice } from "@/lib/utils";
import type { MemberDto, ServiceDto } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X, Wallet, Ticket, UserCheck } from "lucide-react";

interface AppointmentMemberSearchProps {
  selectedMember: MemberDto | null;
  onSelectMember: (member: MemberDto) => void;
  onClearMember: () => void;
  services: ServiceDto[];
  onQuickSelectService?: (serviceId: string) => void;
  currencySymbol?: string;
  isZh?: boolean;
}

export function AppointmentMemberSearch({
  selectedMember,
  onSelectMember,
  onClearMember,
  services,
  onQuickSelectService,
  currencySymbol = "RM",
  isZh = false,
}: AppointmentMemberSearchProps) {
  const t = (en: string, zh: string) => (isZh ? zh : en);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = val.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await lookupMembersForCheckout(trimmed);
        if (res.success) {
          setResults(res.data);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 250);
  }

  function handlePick(member: MemberDto) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setIsSearching(false);
    onSelectMember(member);
  }

  if (selectedMember) {
    return (
      <div className="p-3 rounded-xl border border-primary/35 bg-primary/5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="font-bold text-sm text-foreground truncate">
                {selectedMember.name}
              </span>
              {selectedMember.isMember && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4.5 border-primary/30 text-primary shrink-0"
                >
                  {t("Member", "会员")}
                </Badge>
              )}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              {selectedMember.phoneNumber}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearMember}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            <span>{t("Change", "更换")}</span>
          </Button>
        </div>

        {(selectedMember.creditBalanceCents > 0 ||
          selectedMember.activePackages.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {selectedMember.creditBalanceCents > 0 && (
              <Badge
                variant="outline"
                className="text-[11px] h-6 px-2 font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
              >
                <Wallet className="h-3 w-3" />
                <span>
                  {t("Credit", "余额")}:{" "}
                  {formatPrice(selectedMember.creditBalanceCents, currencySymbol)}
                </span>
              </Badge>
            )}

            {selectedMember.activePackages.map((pkg) => {
              const eligibleService = services.find((s) =>
                pkg.serviceIds.includes(s.id)
              );
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    if (eligibleService && onQuickSelectService) {
                      onQuickSelectService(eligibleService.id);
                    }
                  }}
                  title={
                    eligibleService
                      ? t(
                          `Select ${eligibleService.name}`,
                          `选择 ${eligibleService.name}`
                        )
                      : undefined
                  }
                  className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border border-primary/30 bg-background text-primary ${
                    eligibleService && onQuickSelectService
                      ? "hover:bg-primary/10 cursor-pointer"
                      : ""
                  }`}
                >
                  <Ticket className="h-3 w-3 shrink-0" />
                  <span>
                    {pkg.name} ({pkg.remainingSessions} {t("left", "次")})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          type="search"
          enterKeyHint="search"
          placeholder={t(
            "Search member by name or phone…",
            "搜索会员姓名或手机号…"
          )}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="h-11 sm:h-10 pl-9 pr-9 text-base sm:text-sm rounded-xl bg-muted/30"
        />
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
        ) : (
          query && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={t("Clear search", "清除搜索")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-border bg-popover shadow-md divide-y divide-border max-h-48 overflow-y-auto">
          {results.map((m) => {
            const totalPromoSessions = m.activePackages.reduce(
              (sum, p) => sum + p.remainingSessions,
              0
            );
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePick(m)}
                className="w-full min-h-11 px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/50 text-left transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {m.name}
                    </span>
                    {m.isMember && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary shrink-0"
                      >
                        {t("Member", "会员")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {m.phoneNumber}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {m.creditBalanceCents > 0 && (
                    <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(m.creditBalanceCents, currencySymbol)}
                    </span>
                  )}
                  {totalPromoSessions > 0 && (
                    <span className="text-[11px] font-medium text-primary">
                      {totalPromoSessions} {t("promo left", "次配套")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hasSearched && !isSearching && results.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">
          {t(
            "No member found — fill Name & Phone below as a new customer.",
            "未找到会员 — 可直接在下方填写姓名和手机号预约。"
          )}
        </p>
      )}
    </div>
  );
}
