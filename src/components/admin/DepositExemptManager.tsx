"use client";

import { useState, useTransition } from "react";
import {
  getDepositExemptCustomers,
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
  User,
  FileText,
} from "lucide-react";

interface DepositExemptManagerProps {
  initialCustomers?: DepositExemptCustomerDto[];
}

export function DepositExemptManager({
  initialCustomers = [],
}: DepositExemptManagerProps) {
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Handle Verify Phone Number
  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
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
    }
  }

  // Handle Add Customer
  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!newPhone.trim()) {
      setActionError("Please enter a phone number.");
      return;
    }

    startTransition(async () => {
      const res = await addDepositExemptCustomer({
        phoneNumber: newPhone,
        name: newName,
        note: newNote,
      });

      if (res.success) {
        setCustomers((prev) => {
          const filtered = prev.filter((c) => c.phoneNumber !== res.data.phoneNumber);
          return [res.data, ...filtered];
        });
        setNewPhone("");
        setNewName("");
        setNewNote("");
        setActionSuccess(`Added ${res.data.phoneNumber} to deposit exemption list!`);
        setTimeout(() => setActionSuccess(null), 3500);

        // Update verify result if verifying the same number
        if (verifyResult?.normalizedPhone === res.data.phoneNumber) {
          setVerifyResult({
            tested: true,
            isExempt: true,
            customer: res.data,
            normalizedPhone: res.data.phoneNumber,
          });
        }
      } else {
        setActionError(res.error);
      }
    });
  }

  // Handle Remove Customer
  function handleRemove(id: string, phone: string) {
    if (!confirm(`Remove ${phone} from deposit exemption? Normal deposits will apply.`)) {
      return;
    }

    startTransition(async () => {
      const res = await removeDepositExemptCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        if (verifyResult?.customer?.id === id) {
          setVerifyResult(null);
        }
      }
    });
  }

  // Handle Toggle Status
  function handleToggle(id: string, currentStatus: boolean) {
    startTransition(async () => {
      const res = await toggleDepositExemptCustomer(id, !currentStatus);
      if (res.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: res.data.isActive } : c))
        );
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
                Regular Customer Exemption / 熟客免付定金名单
              </CardTitle>
              <CardDescription className="text-xs">
                Exclude trusted or VIP phone numbers from paying the online booking deposit
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs font-bold">
            {customers.filter((c) => c.isActive).length} Exempt Numbers
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Module 1: Live Phone Number Verification Tool */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Search className="h-4 w-4 text-primary" />
            <span>Verify Phone Number / 检查号码是否免定金</span>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter phone number (e.g. 0123456789 or 6012...)"
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
                  Verifying…
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Verify Number / 验证
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
                      <span className="font-bold">✅ EXEMPT / 免付定金</span>
                      <span className="font-mono text-xs bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        {verifyResult.normalizedPhone}
                      </span>
                    </div>
                    <p className="text-xs">
                      {verifyResult.customer?.name
                        ? `Customer: ${verifyResult.customer.name}. `
                        : ""}
                      This phone number is verified in the regular customer list. Deposit will be{" "}
                      <strong>waived automatically</strong> when booking online.
                    </p>
                    {verifyResult.customer?.note && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Note: {verifyResult.customer.note}
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
                        <span className="font-bold">Normal Customer / 须付定金</span>
                        <span className="font-mono text-xs bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                          {verifyResult.normalizedPhone}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 text-muted-foreground">
                        Not in the regular customer list. Standard deposit applies to this number.
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
                    + Add to Exempt List
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
            <span>Add Regular Customer / 添加熟客免定金</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="exemptPhone" className="text-xs">
                Phone Number <span className="text-destructive">*</span>
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
                Customer Name (Optional)
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
                Note / Remark (Optional)
              </Label>
              <Input
                id="exemptNote"
                placeholder="e.g. VIP regular since 2023"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-10 mt-1 rounded-xl text-sm"
              />
            </div>
          </div>

          {actionError && (
            <p className="text-xs font-bold text-destructive">{actionError}</p>
          )}
          {actionSuccess && (
            <p className="text-xs font-bold text-emerald-600">{actionSuccess}</p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isPending || !newPhone.trim()}
              className="h-10 px-5 rounded-xl font-bold gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Save to Exemption List / 保存免定金
            </Button>
          </div>
        </form>

        {/* Module 3: List & Management */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Label className="text-sm font-bold text-foreground">
              Exempt Regular Customers List ({customers.length})
            </Label>
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search phone or name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs rounded-xl"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-2xl text-muted-foreground space-y-1">
              <UserCheck className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-bold">No regular customer numbers added yet</p>
              <p className="text-xs">
                Add phone numbers above to let your regular customers book online without paying a deposit.
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
                        {c.isActive ? "Exempt Active" : "Paused"}
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
                      {c.isActive ? "Pause Exemption" : "Resume Exemption"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(c.id, c.phoneNumber)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                      title="Delete"
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
