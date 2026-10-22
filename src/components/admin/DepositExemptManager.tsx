"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  addDepositExemptCustomer,
  removeDepositExemptCustomer,
  toggleDepositExemptCustomer,
  verifyPhoneNumberExemption,
} from "@/actions/deposit-exempt";
import type { DepositExemptCustomerDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useDeskLanguage } from "@/lib/use-desk-language";
import { resolveLabel } from "@/lib/desk-i18n";

interface DepositExemptManagerProps {
  initialCustomers?: DepositExemptCustomerDto[];
}

export function DepositExemptManager({
  initialCustomers = [],
}: DepositExemptManagerProps) {
  const { langMode } = useDeskLanguage();
  const [customers, setCustomers] = useState<DepositExemptCustomerDto[]>(initialCustomers);
  const [isPending, startTransition] = useTransition();

  // Verification state
  const [verifyPhoneInput, setVerifyPhoneInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    isExempt: boolean;
    customer: DepositExemptCustomerDto | null;
    normalizedPhone: string;
  } | null>(null);

  // Add form state
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyPhoneInput.trim()) return;

    setIsVerifying(true);
    setVerifyResult(null);

    const res = await verifyPhoneNumberExemption(verifyPhoneInput);
    setIsVerifying(false);

    if (res.success) {
      setVerifyResult({
        tested: true,
        isExempt: res.data.isExempt,
        customer: res.data.customer,
        normalizedPhone: res.data.normalizedPhone,
      });
    } else {
      toast.error(res.error || "Failed to verify phone number.");
    }
  }

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);

    if (!newPhone.trim()) {
      setActionError(
        resolveLabel({ zh: "请输入有效手机号", en: "Phone number is required." }, langMode)
      );
      return;
    }

    startTransition(async () => {
      const res = await addDepositExemptCustomer({
        phoneNumber: newPhone,
        name: newName || undefined,
        note: newNote || undefined,
      });
      if (res.success) {
        setCustomers((prev) => [res.data, ...prev]);
        setNewPhone("");
        setNewName("");
        setNewNote("");
        toast.success(
          resolveLabel({ zh: "熟客免定金号码添加成功！", en: "Exempt customer added successfully!" }, langMode)
        );
      } else {
        setActionError(res.error || "Failed to add regular customer.");
        toast.error(res.error || "Failed to add regular customer.");
      }
    });
  }

  function handleRemove(id: string, phone: string) {
    if (
      !confirm(
        resolveLabel(
          {
            zh: `确定要将 ${phone} 从免定金名单中移除吗？`,
            en: `Remove ${phone} from exemption list?`,
          },
          langMode
        )
      )
    )
      return;

    startTransition(async () => {
      const res = await removeDepositExemptCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        toast.success(
          resolveLabel({ zh: "已移除该号码。", en: "Customer removed." }, langMode)
        );
      } else {
        toast.error(res.error || "Failed to remove customer.");
      }
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const res = await toggleDepositExemptCustomer(id, !currentActive);
      if (res.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: res.data.isActive } : c))
        );
        toast.success(
          res.data.isActive
            ? resolveLabel({ zh: "已启用免定金特权。", en: "Exemption activated." }, langMode)
            : resolveLabel({ zh: "已暂停免定金特权。", en: "Exemption paused." }, langMode)
        );
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    });
  }

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.phoneNumber.includes(q) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.note && c.note.toLowerCase().includes(q))
    );
  });

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {resolveLabel({ zh: "熟客免付定金名单", en: "Regular Customer Exemption" }, langMode)}
              </CardTitle>
              <CardDescription className="text-xs">
                {resolveLabel(
                  {
                    zh: "将信任的老顾客或 VIP 电话录入白名单，顾客在线预约时将自动免除定金",
                    en: "Exclude trusted or VIP phone numbers from paying the online booking deposit",
                  },
                  langMode
                )}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs font-bold">
            {resolveLabel(
              {
                zh: `${customers.filter((c) => c.isActive).length} 个生效号码`,
                en: `${customers.filter((c) => c.isActive).length} Exempt Numbers`,
              },
              langMode
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Module 1: Live Phone Number Verification Tool */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Search className="h-4 w-4 text-primary" />
            <span>{resolveLabel({ zh: "检查号码是否免定金", en: "Verify Phone Number" }, langMode)}</span>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={resolveLabel({ zh: "输入手机号（如 0123456789）", en: "Enter phone number (e.g. 0123456789)" }, langMode)}
                value={verifyPhoneInput}
                onChange={(e) => {
                  setVerifyPhoneInput(e.target.value);
                  setVerifyResult(null);
                }}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={isVerifying || !verifyPhoneInput.trim()}
              className="h-11 px-5 rounded-xl font-bold cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {resolveLabel({ zh: "正在验证…", en: "Verifying…" }, langMode)}
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  {resolveLabel({ zh: "验证号码", en: "Verify Number" }, langMode)}
                </>
              )}
            </Button>
          </form>

          {/* Verification Result Banner */}
          {verifyResult && (
            <div className="pt-1 animate-in fade-in">
              {verifyResult.isExempt ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        {resolveLabel({ zh: "✅ 已在白名单（免付定金）", en: "✅ EXEMPT (Deposit Waived)" }, langMode)}
                      </span>
                      <span className="font-mono text-xs bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        {verifyResult.normalizedPhone}
                      </span>
                    </div>
                    <p className="text-xs">
                      {verifyResult.customer?.name
                        ? `${resolveLabel({ zh: "顾客姓名：", en: "Customer: " }, langMode)}${verifyResult.customer.name}。`
                        : ""}
                      {resolveLabel(
                        {
                          zh: "该号码已被登记为熟客白名单，在线预约时系统将自动跳过定金支付。",
                          en: "This phone number is verified in the regular customer list. Deposit will be waived automatically when booking online.",
                        },
                        langMode
                      )}
                    </p>
                    {verifyResult.customer?.note && (
                      <p className="text-[11px] text-muted-foreground italic">
                        {resolveLabel({ zh: "备注：", en: "Note: " }, langMode)}
                        {verifyResult.customer.note}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {resolveLabel({ zh: "普通顾客（须付定金）", en: "Standard Customer (Deposit Required)" }, langMode)}
                        </span>
                        <span className="font-mono text-xs bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                          {verifyResult.normalizedPhone}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 text-muted-foreground">
                        {resolveLabel(
                          {
                            zh: "尚未加入熟客免付定金名单，该号码预约时将按标准流程收取定金。",
                            en: "Not in the regular customer list. Standard deposit applies to this number.",
                          },
                          langMode
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewPhone(verifyResult.normalizedPhone);
                      setNewName("");
                      setNewNote("Regular Customer");
                    }}
                    className="h-8 text-xs font-bold border-amber-500/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 shrink-0 cursor-pointer"
                  >
                    + {resolveLabel({ zh: "加入免定金名单", en: "Add to Exempt List" }, langMode)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Module 2: Add New Exempt Customer */}
        <form onSubmit={handleAddCustomer} className="p-4 rounded-2xl border bg-card space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Plus className="h-4 w-4 text-primary" />
            <span>{resolveLabel({ zh: "添加熟客免定金", en: "Add Regular Customer" }, langMode)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="exemptPhone" className="text-xs">
                {resolveLabel({ zh: "手机号", en: "Phone Number" }, langMode)}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exemptPhone"
                placeholder="e.g. 0123456789"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-10 mt-1 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label htmlFor="exemptName" className="text-xs">
                {resolveLabel({ zh: "顾客姓名（选填）", en: "Customer Name (Optional)" }, langMode)}
              </Label>
              <Input
                id="exemptName"
                placeholder="e.g. Sarah Tan"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 mt-1 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label htmlFor="exemptNote" className="text-xs">
                {resolveLabel({ zh: "备注说明（选填）", en: "Note / Remark (Optional)" }, langMode)}
              </Label>
              <Input
                id="exemptNote"
                placeholder="e.g. VIP regular"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-10 mt-1 rounded-xl text-sm"
              />
            </div>
          </div>

          {actionError && (
            <p className="text-xs font-bold text-destructive">{actionError}</p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isPending || !newPhone.trim()}
              className="h-10 px-5 rounded-xl font-bold gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {resolveLabel({ zh: "保存免定金名单", en: "Save to Exemption List" }, langMode)}
            </Button>
          </div>
        </form>

        {/* Module 3: List & Management */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Label className="text-sm font-bold text-foreground">
              {resolveLabel({ zh: `已录入熟客名单 (${customers.length})`, en: `Exempt Regular Customers List (${customers.length})` }, langMode)}
            </Label>
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={resolveLabel({ zh: "搜索手机号或姓名…", en: "Search phone or name…" }, langMode)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs rounded-xl"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-2xl text-muted-foreground space-y-1">
              <UserCheck className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-bold">
                {resolveLabel({ zh: "暂无熟客免定金号码", en: "No regular customer numbers added yet" }, langMode)}
              </p>
              <p className="text-xs">
                {resolveLabel(
                  {
                    zh: "可在上方输入框添加电话号码，让老顾客在线预约时无需支付定金。",
                    en: "Add phone numbers above to let your regular customers book online without paying a deposit.",
                  },
                  langMode
                )}
              </p>
            </div>
          ) : (
            <div className="border rounded-2xl divide-y overflow-hidden bg-card">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-base text-foreground">
                        {c.phoneNumber}
                      </span>
                      {c.name && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {c.name}
                        </span>
                      )}
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {c.isActive
                          ? resolveLabel({ zh: "已生效", en: "Active" }, langMode)
                          : resolveLabel({ zh: "已暂停", en: "Paused" }, langMode)}
                      </Badge>
                    </div>
                    {c.note && (
                      <p className="text-xs text-muted-foreground font-medium">
                        {c.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(c.id, c.isActive)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {c.isActive
                        ? resolveLabel({ zh: "暂停免定金", en: "Pause Exemption" }, langMode)
                        : resolveLabel({ zh: "恢复免定金", en: "Resume Exemption" }, langMode)}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(c.id, c.phoneNumber)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                      title={resolveLabel({ zh: "删除", en: "Delete" }, langMode)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
