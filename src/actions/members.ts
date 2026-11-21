"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { normalizePhoneNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  MemberDto,
  MemberDetailDto,
  MemberPackageDto,
  MemberTransactionDto,
  MemberPurchaseHistoryItemDto,
  PromoPackageDto,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMemberPackageDto(p: any): MemberPackageDto {
  const isExpired =
    p.expiresAt && new Date(p.expiresAt).getTime() < Date.now() && p.status === "ACTIVE";
  return {
    id: p.id,
    customerId: p.customerId,
    promoPackageId: p.promoPackageId ?? null,
    name: p.name,
    serviceIds: p.serviceIds || [],
    totalSessions: p.totalSessions,
    remainingSessions: p.remainingSessions,
    pricePaidCents: p.pricePaidCents ?? 0,
    paymentMethod: p.paymentMethod ?? null,
    expiresAt: p.expiresAt ? new Date(p.expiresAt).toISOString() : null,
    status: isExpired ? "EXPIRED" : p.status,
    notes: p.notes ?? null,
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMemberTransactionDto(t: any): MemberTransactionDto {
  return {
    id: t.id,
    customerId: t.customerId,
    memberPackageId: t.memberPackageId ?? null,
    bookingId: t.bookingId ?? null,
    type: t.type,
    creditChangeCents: t.creditChangeCents,
    balanceAfterCents: t.balanceAfterCents,
    sessionsChange: t.sessionsChange,
    sessionsAfter: t.sessionsAfter ?? null,
    cashPaidCents: t.cashPaidCents,
    paymentMethod: t.paymentMethod ?? null,
    description: t.description,
    createdAt: new Date(t.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPromoPackageDto(p: any): PromoPackageDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    priceCents: p.priceCents,
    totalSessions: p.totalSessions,
    serviceIds: p.serviceIds || [],
    validityMonths: p.validityMonths ?? null,
    isActive: p.isActive,
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

function revalidateMemberPaths() {
  revalidatePath("/admin/members");
  revalidatePath("/admin/desk");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

// ----------------------------------------------------------------
// 1. List Members (Server-side paginated with search & active promos)
// ----------------------------------------------------------------
export interface PaginatedMembersResult {
  members: MemberDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getMembers(options?: {
  search?: string;
  includeNonMembers?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<PaginatedMembersResult>> {
  await requireAdmin();
  try {
    const q = (options?.search || "").trim();
    const includeNonMembers = Boolean(options?.includeNonMembers);
    const pageSize = Math.min(100, Math.max(1, Math.floor(options?.pageSize ?? 25)));
    const requestedPage = Math.max(1, Math.floor(options?.page ?? 1));

    const where: Prisma.CustomerWhereInput = {};

    if (!includeNonMembers && !q) {
      where.isMember = true;
    }

    if (q) {
      const normalizedQ = normalizePhoneNumber(q);
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q } },
        ...(normalizedQ && normalizedQ !== q && normalizedQ.length >= 3
          ? [{ phoneNumber: { contains: normalizedQ } }]
          : []),
      ];
    }

    // Also exclude anonymous walk-ins ("WALKIN-...") unless they were converted
    where.NOT = {
      AND: [{ phoneNumber: { startsWith: "WALKIN-" } }, { isMember: false }],
    };

    const total = await prisma.customer.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);

    const customers = await prisma.customer.findMany({
      where,
      include: {
        memberPackages: {
          where: {
            status: "ACTIVE",
            remainingSessions: { gt: 0 },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ isMember: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const customerIds = customers.map((c) => c.id);
    const [bookingStats, memberTxStats] = customerIds.length
      ? await Promise.all([
          prisma.booking.groupBy({
            by: ["customerId"],
            where: {
              customerId: { in: customerIds },
              status: "COMPLETED",
            },
            _count: { _all: true },
            _sum: { totalPriceCents: true },
          }),
          prisma.memberTransaction.groupBy({
            by: ["customerId"],
            where: {
              customerId: { in: customerIds },
              cashPaidCents: { gt: 0 },
            },
            _sum: { cashPaidCents: true },
          }),
        ])
      : [[], []];

    const bookingMap = new Map(
      bookingStats.map((row) => [
        row.customerId,
        {
          count: row._count._all,
          spentCents: row._sum.totalPriceCents ?? 0,
        },
      ])
    );
    const txMap = new Map(
      memberTxStats.map((row) => [row.customerId, row._sum.cashPaidCents ?? 0])
    );

    const members: MemberDto[] = customers.map((c) => {
      const activePackages = c.memberPackages.map(toMemberPackageDto);
      const bStat = bookingMap.get(c.id);
      const reloadAndPackageSpent = txMap.get(c.id) ?? 0;

      return {
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        isMember: c.isMember,
        creditBalanceCents: c.creditBalanceCents,
        notes: c.notes,
        memberSince: c.memberSince ? c.memberSince.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        activePackages,
        totalVisitsCount: bStat?.count ?? 0,
        totalSpentCents: (bStat?.spentCents ?? 0) + reloadAndPackageSpent,
      };
    });

    return {
      success: true,
      data: {
        members,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error("[getMembers]", error);
    return { success: false, error: "Failed to load members." };
  }
}

// ----------------------------------------------------------------
// 2. Fast Member Lookup for POS Desk Checkout (by phone or name)
// ----------------------------------------------------------------
export async function lookupMembersForCheckout(
  query: string
): Promise<ActionResult<MemberDto[]>> {
  await requireAdmin();
  try {
    const q = query.trim();
    if (!q) return { success: true, data: [] };
    const normalizedQ = normalizePhoneNumber(q);

    const customers = await prisma.customer.findMany({
      where: {
        NOT: { phoneNumber: { startsWith: "WALKIN-" } },
        OR: [
          { phoneNumber: { contains: q } },
          ...(normalizedQ && normalizedQ !== q && normalizedQ.length >= 3
            ? [{ phoneNumber: { contains: normalizedQ } }]
            : []),
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        memberPackages: {
          orderBy: { createdAt: "desc" },
        },
        bookings: {
          where: { status: "COMPLETED" },
          select: { totalPriceCents: true },
        },
        memberTransactions: {
          where: { cashPaidCents: { gt: 0 } },
          select: { cashPaidCents: true },
        },
      },
      orderBy: [{ isMember: "desc" }, { updatedAt: "desc" }],
      take: 10,
    });

    const data: MemberDto[] = customers.map((c) => {
      const pkgs = c.memberPackages.map(toMemberPackageDto);
      const activePackages = pkgs.filter(
        (p) => p.status === "ACTIVE" && p.remainingSessions > 0
      );
      return {
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        isMember: c.isMember,
        creditBalanceCents: c.creditBalanceCents,
        notes: c.notes,
        memberSince: c.memberSince ? c.memberSince.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        activePackages,
        totalVisitsCount: c.bookings.length,
        totalSpentCents:
          c.bookings.reduce((s, b) => s + b.totalPriceCents, 0) +
          c.memberTransactions.reduce((s, t) => s + t.cashPaidCents, 0),
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("[lookupMembersForCheckout]", error);
    return { success: false, error: "Failed to lookup member." };
  }
}

// ----------------------------------------------------------------
// 3. Get Full Member Detail (Packages + Transactions + Purchase History)
// ----------------------------------------------------------------
export async function getMemberDetail(
  customerId: string
): Promise<ActionResult<MemberDetailDto>> {
  await requireAdmin();
  try {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        memberPackages: {
          orderBy: { createdAt: "desc" },
        },
        memberTransactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        bookings: {
          where: { status: { not: "CANCELLED" } },
          include: {
            service: true,
            items: {
              include: {
                service: true,
                memberPackage: true,
              },
            },
          },
          orderBy: { startDatetime: "desc" },
          take: 100,
        },
      },
    });

    if (!c) {
      return { success: false, error: "Member not found." };
    }

    const allPackages = c.memberPackages.map(toMemberPackageDto);
    const activePackages = allPackages.filter(
      (p) => p.status === "ACTIVE" && p.remainingSessions > 0
    );
    const transactions = c.memberTransactions.map(toMemberTransactionDto);

    const purchaseHistory: MemberPurchaseHistoryItemDto[] = c.bookings.map((b) => {
      const items =
        b.items && b.items.length > 0
          ? b.items.map((it) => ({
              id: it.id,
              serviceId: it.serviceId,
              serviceName: it.service.name,
              itemType: it.service.type || "SERVICE",
              priceCents: it.priceCents,
              originalPriceCents: it.originalPriceCents ?? null,
              memberPackageId: it.memberPackageId ?? null,
              memberPackageName: it.memberPackage?.name ?? null,
            }))
          : [
              {
                id: b.id,
                serviceId: b.serviceId,
                serviceName: b.service.name,
                itemType: b.service.type || "SERVICE",
                priceCents: b.totalPriceCents,
                originalPriceCents: null,
                memberPackageId: null,
                memberPackageName: null,
              },
            ];

      return {
        id: b.id,
        referenceCode: b.referenceCode,
        dateIso: b.startDatetime.toISOString(),
        status: b.status,
        totalCashPaidCents: b.totalPriceCents,
        creditUsedCents: b.creditUsedCents ?? 0,
        promoDiscountCents: b.promoDiscountCents ?? 0,
        notes: b.notes,
        items,
      };
    });

    const completedBookings = c.bookings.filter((b) => b.status === "COMPLETED");
    const bookingSpent = completedBookings.reduce((s, b) => s + b.totalPriceCents, 0);
    const txSpent = c.memberTransactions.reduce((s, t) => s + t.cashPaidCents, 0);

    return {
      success: true,
      data: {
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        isMember: c.isMember,
        creditBalanceCents: c.creditBalanceCents,
        notes: c.notes,
        memberSince: c.memberSince ? c.memberSince.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        activePackages,
        totalVisitsCount: completedBookings.length,
        totalSpentCents: bookingSpent + txSpent,
        allPackages,
        transactions,
        purchaseHistory,
      },
    };
  } catch (error) {
    console.error("[getMemberDetail]", error);
    return { success: false, error: "Failed to load member details." };
  }
}

function getPhoneLookupVariants(cleanPhone: string): string[] {
  const variants = new Set<string>([cleanPhone]);
  if (cleanPhone.startsWith("0") && cleanPhone.length >= 10) {
    variants.add(cleanPhone.slice(1));
  }
  return Array.from(variants);
}

// ----------------------------------------------------------------
// 4. Quick Create / Upsert Member (Phone + Name)
// ----------------------------------------------------------------
export async function quickCreateMember(input: {
  name: string;
  phoneNumber: string;
  notes?: string;
}): Promise<ActionResult<MemberDto>> {
  await requireAdmin();
  try {
    const cleanName = input.name.trim();
    const cleanPhone = normalizePhoneNumber(input.phoneNumber);

    if (!cleanName) {
      return { success: false, error: "Member name is required." };
    }
    if (!cleanPhone || cleanPhone.length < 6) {
      return { success: false, error: "Valid phone number is required." };
    }

    const existing = await prisma.customer.findFirst({
      where: { phoneNumber: { in: getPhoneLookupVariants(cleanPhone) } },
    });

    if (existing?.isMember) {
      return {
        success: false,
        error: `Phone number ${cleanPhone} is already registered to ${existing.name}.`,
      };
    }

    const customer = await prisma.customer.upsert({
      where: { phoneNumber: existing?.phoneNumber ?? cleanPhone },
      update: {
        name: cleanName,
        phoneNumber: cleanPhone,
        isMember: true,
        memberSince: existing?.memberSince || new Date(),
        notes: input.notes !== undefined ? input.notes.trim() || null : existing?.notes,
      },
      create: {
        name: cleanName,
        phoneNumber: cleanPhone,
        isMember: true,
        memberSince: new Date(),
        notes: input.notes?.trim() || null,
      },
      include: {
        memberPackages: true,
        bookings: {
          where: { status: "COMPLETED" },
          select: { totalPriceCents: true },
        },
        memberTransactions: {
          where: { cashPaidCents: { gt: 0 } },
          select: { cashPaidCents: true },
        },
      },
    });

    revalidateMemberPaths();

    const activePackages = customer.memberPackages
      .map(toMemberPackageDto)
      .filter((p) => p.status === "ACTIVE" && p.remainingSessions > 0);

    return {
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        isMember: customer.isMember,
        creditBalanceCents: customer.creditBalanceCents,
        notes: customer.notes,
        memberSince: customer.memberSince ? customer.memberSince.toISOString() : null,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        activePackages,
        totalVisitsCount: customer.bookings.length,
        totalSpentCents:
          customer.bookings.reduce((s, b) => s + b.totalPriceCents, 0) +
          customer.memberTransactions.reduce((s, t) => s + t.cashPaidCents, 0),
      },
    };
  } catch (error) {
    console.error("[quickCreateMember]", error);
    return { success: false, error: "Failed to create member." };
  }
}

// ----------------------------------------------------------------
// 5. Update Member Info (CRUD)
// ----------------------------------------------------------------
export async function updateMember(
  id: string,
  input: { name: string; phoneNumber: string; notes?: string }
): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    const cleanName = input.name.trim();
    const cleanPhone = normalizePhoneNumber(input.phoneNumber);
    if (!cleanName || !cleanPhone || cleanPhone.length < 6) {
      return { success: false, error: "Valid name and phone number are required." };
    }

    const duplicate = await prisma.customer.findFirst({
      where: {
        phoneNumber: { in: getPhoneLookupVariants(cleanPhone) },
        id: { not: id },
      },
    });
    if (duplicate) {
      return {
        success: false,
        error: "Another customer already has this phone number.",
      };
    }

    await prisma.customer.update({
      where: { id },
      data: {
        name: cleanName,
        phoneNumber: cleanPhone,
        isMember: true,
        notes: input.notes?.trim() || null,
      },
    });

    revalidateMemberPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateMember]", error);
    return { success: false, error: "Failed to update member." };
  }
}

// ----------------------------------------------------------------
// 6. Archive / Remove Member (Append-only ledger preserved)
// ----------------------------------------------------------------
export async function deleteMember(id: string): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findUnique({
          where: { id },
          include: {
            memberPackages: {
              where: { status: "ACTIVE", remainingSessions: { gt: 0 } },
              select: { id: true, name: true, remainingSessions: true },
            },
          },
        });
        if (!customer) throw new Error("Member not found.");

        if (customer.creditBalanceCents > 0) {
          throw new Error(
            "Cannot remove member while credit balance is greater than 0. Please settle or clear the balance first."
          );
        }

        if (customer.memberPackages.length > 0) {
          throw new Error(
            "Cannot remove member with remaining promo package sessions. Please settle or exhaust sessions first."
          );
        }

        // Preserve all MemberTransaction, MemberPackage, and Booking records for audit integrity
        await tx.customer.update({
          where: { id },
          data: { isMember: false, memberSince: null },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateMemberPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteMember]", error);
    const msg = error instanceof Error ? error.message : "Failed to remove member.";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------
// 7. Reload Member Credit (+ Optional Bonus Credit & Free Service Session)
//    Counts cashPaidCents in Today's Sales on the day they pay!
// ----------------------------------------------------------------
export async function reloadMemberCredit(input: {
  customerId: string;
  reloadAmountCents: number; // e.g. 28800 (RM288)
  bonusCreditCents?: number; // e.g. 0 or 2000 (RM20 bonus credit)
  freeBonusServiceIds?: string[]; // e.g. [hairCutServiceId] ("Reload 288 get free haircut")
  freeBonusSessions?: number; // default 1
  redeemFreeBonusNow?: boolean; // true = deduct the free haircut immediately today!
  paymentMethod: "CASH" | "DUITNOW_QR" | "CARD";
  notes?: string;
  idempotencyKey?: string;
}): Promise<ActionResult<{ newBalanceCents: number }>> {
  await requireAdmin();
  const idempotencyKey = input.idempotencyKey?.trim() || null;

  try {
    const {
      customerId,
      reloadAmountCents,
      bonusCreditCents = 0,
      freeBonusServiceIds = [],
      freeBonusSessions = 1,
      redeemFreeBonusNow = false,
      paymentMethod,
      notes,
    } = input;

    if (reloadAmountCents <= 0) {
      return { success: false, error: "Reload amount must be greater than RM 0." };
    }

    const totalCreditAdded = reloadAmountCents + Math.max(0, bonusCreditCents);

    const result = await prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existingTx = await tx.memberTransaction.findUnique({
            where: { idempotencyKey },
          });
          if (existingTx) {
            return { newBalanceCents: existingTx.balanceAfterCents };
          }
        }

        const existing = await tx.customer.findUnique({ where: { id: customerId } });
        if (!existing) throw new Error("Member not found.");

        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: {
            isMember: true,
            memberSince: existing.memberSince || new Date(),
            creditBalanceCents: { increment: totalCreditAdded },
          },
        });
        const newBalanceCents = updatedCustomer.creditBalanceCents;

        let bonusDesc = "";
        let createdPkgId: string | null = null;

        if (freeBonusServiceIds.length > 0 && freeBonusSessions > 0) {
          const services = await tx.service.findMany({
            where: { id: { in: freeBonusServiceIds } },
          });
          const svcNames = services.map((s) => s.name).join(" / ") || "Free Service";
          const initialRemaining = redeemFreeBonusNow
            ? Math.max(0, freeBonusSessions - 1)
            : freeBonusSessions;

          const bonusPkg = await tx.memberPackage.create({
            data: {
              customerId,
              name: `Free Bonus: ${svcNames}`,
              serviceIds: freeBonusServiceIds,
              totalSessions: freeBonusSessions,
              remainingSessions: initialRemaining,
              pricePaidCents: 0,
              paymentMethod: "BONUS",
              status: initialRemaining === 0 ? "COMPLETED" : "ACTIVE",
              notes: redeemFreeBonusNow
                ? "Granted on Credit Reload & redeemed immediately"
                : "Granted on Credit Reload",
            },
          });
          createdPkgId = bonusPkg.id;
          bonusDesc = redeemFreeBonusNow
            ? ` + Free ${svcNames} (Redeemed Today)`
            : ` + Free ${freeBonusSessions}x ${svcNames}`;
        }

        const rmReload = (reloadAmountCents / 100).toFixed(2);
        const rmBonus =
          bonusCreditCents > 0 ? ` (+RM ${(bonusCreditCents / 100).toFixed(2)} bonus)` : "";

        await tx.memberTransaction.create({
          data: {
            customerId,
            memberPackageId: createdPkgId,
            idempotencyKey,
            type: "CREDIT_RELOAD",
            creditChangeCents: totalCreditAdded,
            balanceAfterCents: newBalanceCents,
            sessionsChange:
              freeBonusServiceIds.length > 0
                ? redeemFreeBonusNow
                  ? Math.max(0, freeBonusSessions - 1)
                  : freeBonusSessions
                : 0,
            cashPaidCents: reloadAmountCents, // Counted in Today's Sales today!
            paymentMethod,
            description: `Reloaded RM ${rmReload}${rmBonus}${bonusDesc}${
              notes ? ` — ${notes}` : ""
            }`,
          },
        });

        return { newBalanceCents };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateMemberPaths();
    return { success: true, data: result };
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingTx = await prisma.memberTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return { success: true, data: { newBalanceCents: existingTx.balanceAfterCents } };
      }
    }
    console.error("[reloadMemberCredit]", error);
    const msg = error instanceof Error ? error.message : "Failed to reload credit.";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------
// 8. Promo Package Templates CRUD (e.g. "RM288 for 10x Hair Cut")
// ----------------------------------------------------------------
export async function getPromoPackages(): Promise<ActionResult<PromoPackageDto[]>> {
  await requireAdmin();
  try {
    const promos = await prisma.promoPackage.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, data: promos.map(toPromoPackageDto) };
  } catch (error) {
    console.error("[getPromoPackages]", error);
    return { success: false, error: "Failed to load promo packages." };
  }
}

export async function createPromoPackage(input: {
  name: string;
  description?: string;
  priceCents: number;
  totalSessions: number;
  serviceIds: string[];
  validityMonths?: number | null;
  isActive?: boolean;
}): Promise<ActionResult<PromoPackageDto>> {
  await requireAdmin();
  try {
    if (!input.name.trim()) {
      return { success: false, error: "Promo name is required." };
    }
    if (input.totalSessions < 1) {
      return { success: false, error: "Total sessions must be at least 1." };
    }
    if (!input.serviceIds || input.serviceIds.length === 0) {
      return { success: false, error: "Select at least one eligible service." };
    }

    const promo = await prisma.promoPackage.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: Math.max(0, input.priceCents),
        totalSessions: input.totalSessions,
        serviceIds: input.serviceIds,
        validityMonths:
          input.validityMonths && input.validityMonths > 0
            ? input.validityMonths
            : null,
        isActive: input.isActive ?? true,
      },
    });

    revalidateMemberPaths();
    return { success: true, data: toPromoPackageDto(promo) };
  } catch (error) {
    console.error("[createPromoPackage]", error);
    return { success: false, error: "Failed to create promo package." };
  }
}

export async function updatePromoPackage(
  id: string,
  input: {
    name: string;
    description?: string;
    priceCents: number;
    totalSessions: number;
    serviceIds: string[];
    validityMonths?: number | null;
    isActive?: boolean;
  }
): Promise<ActionResult<PromoPackageDto>> {
  await requireAdmin();
  try {
    if (!input.name.trim()) {
      return { success: false, error: "Promo name is required." };
    }
    if (input.totalSessions < 1) {
      return { success: false, error: "Total sessions must be at least 1." };
    }
    if (!input.serviceIds || input.serviceIds.length === 0) {
      return { success: false, error: "Select at least one eligible service." };
    }

    const promo = await prisma.promoPackage.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceCents: Math.max(0, input.priceCents),
        totalSessions: input.totalSessions,
        serviceIds: input.serviceIds,
        validityMonths:
          input.validityMonths && input.validityMonths > 0
            ? input.validityMonths
            : null,
        isActive: input.isActive ?? true,
      },
    });

    revalidateMemberPaths();
    return { success: true, data: toPromoPackageDto(promo) };
  } catch (error) {
    console.error("[updatePromoPackage]", error);
    return { success: false, error: "Failed to update promo package." };
  }
}

export async function deletePromoPackage(id: string): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    await prisma.promoPackage.delete({ where: { id } });
    revalidateMemberPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deletePromoPackage]", error);
    return { success: false, error: "Failed to delete promo package." };
  }
}

// ----------------------------------------------------------------
// 9. Sell / Assign Promo Package to a Member
//    Counts cashPaidCents in Today's Sales on the day they buy!
// ----------------------------------------------------------------
export async function assignPromoToMember(input: {
  customerId: string;
  promoPackageId: string;
  paymentMethod: "CASH" | "DUITNOW_QR" | "CARD" | "CREDIT";
  deductFirstSessionNow?: boolean; // Optional: deduct 1st session immediately on purchase
  notes?: string;
  idempotencyKey?: string;
}): Promise<ActionResult<MemberPackageDto>> {
  await requireAdmin();
  const idempotencyKey = input.idempotencyKey?.trim() || null;

  try {
    const {
      customerId,
      promoPackageId,
      paymentMethod,
      deductFirstSessionNow = false,
      notes,
    } = input;

    const pkg = await prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existingTx = await tx.memberTransaction.findUnique({
            where: { idempotencyKey },
            include: { memberPackage: true },
          });
          if (existingTx?.memberPackage) {
            return existingTx.memberPackage;
          }
        }

        const [customer, promo] = await Promise.all([
          tx.customer.findUnique({ where: { id: customerId } }),
          tx.promoPackage.findUnique({ where: { id: promoPackageId } }),
        ]);

        if (!customer) throw new Error("Member not found.");
        if (!promo) throw new Error("Promo package not found.");

        let newCreditBalance = customer.creditBalanceCents;
        if (paymentMethod === "CREDIT" && promo.priceCents > 0) {
          const updatedCount = await tx.customer.updateMany({
            where: {
              id: customerId,
              creditBalanceCents: { gte: promo.priceCents },
            },
            data: {
              isMember: true,
              memberSince: customer.memberSince || new Date(),
              creditBalanceCents: { decrement: promo.priceCents },
            },
          });
          if (updatedCount.count === 0) {
            throw new Error("Insufficient member credit balance to buy this promo.");
          }
          const refreshed = await tx.customer.findUnique({ where: { id: customerId } });
          newCreditBalance =
            refreshed?.creditBalanceCents ??
            Math.max(0, customer.creditBalanceCents - promo.priceCents);
        } else {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              isMember: true,
              memberSince: customer.memberSince || new Date(),
            },
          });
        }

        let expiresAt: Date | null = null;
        if (promo.validityMonths && promo.validityMonths > 0) {
          expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + promo.validityMonths);
        }

        const initialRemaining = deductFirstSessionNow
          ? Math.max(0, promo.totalSessions - 1)
          : promo.totalSessions;

        const createdPkg = await tx.memberPackage.create({
          data: {
            customerId,
            promoPackageId: promo.id,
            name: promo.name,
            serviceIds: promo.serviceIds,
            totalSessions: promo.totalSessions,
            remainingSessions: initialRemaining,
            pricePaidCents: promo.priceCents,
            paymentMethod,
            expiresAt,
            status: initialRemaining === 0 ? "COMPLETED" : "ACTIVE",
            notes: notes?.trim() || null,
          },
        });

        // Cash paid today (0 if bought using pre-existing credit to prevent double-counting)
        const cashPaidCents = paymentMethod === "CREDIT" ? 0 : promo.priceCents;

        await tx.memberTransaction.create({
          data: {
            customerId,
            memberPackageId: createdPkg.id,
            idempotencyKey,
            type: "PACKAGE_PURCHASE",
            creditChangeCents: paymentMethod === "CREDIT" ? -promo.priceCents : 0,
            balanceAfterCents: newCreditBalance,
            sessionsChange: initialRemaining,
            sessionsAfter: initialRemaining,
            cashPaidCents,
            paymentMethod,
            description: `Purchased Promo: ${promo.name} (${
              deductFirstSessionNow
                ? `1 used today, ${initialRemaining}/${promo.totalSessions} left`
                : `${promo.totalSessions} sessions`
            })${notes ? ` — ${notes}` : ""}`,
          },
        });

        return createdPkg;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateMemberPaths();
    return { success: true, data: toMemberPackageDto(pkg) };
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingTx = await prisma.memberTransaction.findUnique({
        where: { idempotencyKey },
        include: { memberPackage: true },
      });
      if (existingTx?.memberPackage) {
        return { success: true, data: toMemberPackageDto(existingTx.memberPackage) };
      }
    }
    console.error("[assignPromoToMember]", error);
    const msg = error instanceof Error ? error.message : "Failed to assign promo.";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------
// 10. Manual Deduct / Refund 1 Session on a Member's Package
// ----------------------------------------------------------------
export async function adjustMemberPackageSession(input: {
  memberPackageId: string;
  delta: -1 | 1; // -1 = deduct 1 session, +1 = refund/restore 1 session
  reason?: string;
}): Promise<ActionResult<MemberPackageDto>> {
  await requireAdmin();
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const pkg = await tx.memberPackage.findUnique({
          where: { id: input.memberPackageId },
          include: { customer: true },
        });
        if (!pkg) throw new Error("Member package not found.");

        const guardWhere =
          input.delta < 0
            ? { id: pkg.id, remainingSessions: { gte: 1 } }
            : { id: pkg.id, remainingSessions: { lt: pkg.totalSessions } };

        const changed = await tx.memberPackage.updateMany({
          where: guardWhere,
          data: {
            remainingSessions: { increment: input.delta },
          },
        });
        if (changed.count === 0) {
          throw new Error(
            input.delta < 0
              ? "No remaining sessions left on this package."
              : "Cannot exceed total sessions of this package."
          );
        }

        const freshPkg = await tx.memberPackage.findUnique({ where: { id: pkg.id } });
        const nextRemaining =
          freshPkg?.remainingSessions ?? Math.max(0, pkg.remainingSessions + input.delta);
        const nextStatus = nextRemaining === 0 ? "COMPLETED" : "ACTIVE";

        const updatedPkg = await tx.memberPackage.update({
          where: { id: pkg.id },
          data: { status: nextStatus },
        });

        await tx.memberTransaction.create({
          data: {
            customerId: pkg.customerId,
            memberPackageId: pkg.id,
            type: input.delta < 0 ? "PACKAGE_DEDUCT" : "MANUAL_ADJUST",
            creditChangeCents: 0,
            balanceAfterCents: pkg.customer.creditBalanceCents,
            sessionsChange: input.delta,
            sessionsAfter: nextRemaining,
            cashPaidCents: 0,
            paymentMethod: "PROMO",
            description:
              input.delta < 0
                ? `Redeemed 1 session from ${pkg.name} (${nextRemaining}/${pkg.totalSessions} left)${
                    input.reason ? ` — ${input.reason}` : ""
                  }`
                : `Restored +1 session to ${pkg.name} (${nextRemaining}/${pkg.totalSessions} left)${
                    input.reason ? ` — ${input.reason}` : ""
                  }`,
          },
        });

        return updatedPkg;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateMemberPaths();
    return { success: true, data: toMemberPackageDto(updated) };
  } catch (error) {
    console.error("[adjustMemberPackageSession]", error);
    const msg = error instanceof Error ? error.message : "Failed to update session.";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------
// 11. Manual Credit Adjustment / Refund (Append-only MANUAL_ADJUST)
// ----------------------------------------------------------------
export async function adjustMemberCredit(input: {
  customerId: string;
  deltaCents: number; // positive = add/refund, negative = deduct/reverse
  reason: string;
  idempotencyKey?: string;
}): Promise<ActionResult<{ newBalanceCents: number }>> {
  await requireAdmin();
  const idempotencyKey = input.idempotencyKey?.trim() || null;

  try {
    const cleanReason = input.reason.trim();
    if (cleanReason.length < 2) {
      return { success: false, error: "Please enter a brief reason for this adjustment." };
    }
    if (!Number.isInteger(input.deltaCents) || input.deltaCents === 0) {
      return { success: false, error: "Adjustment amount must be non-zero." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existingTx = await tx.memberTransaction.findUnique({
            where: { idempotencyKey },
          });
          if (existingTx) {
            return { newBalanceCents: existingTx.balanceAfterCents };
          }
        }

        const existing = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!existing) throw new Error("Member not found.");

        let newBalanceCents = existing.creditBalanceCents;
        if (input.deltaCents < 0) {
          const absDelta = Math.abs(input.deltaCents);
          const updated = await tx.customer.updateMany({
            where: {
              id: input.customerId,
              creditBalanceCents: { gte: absDelta },
            },
            data: {
              creditBalanceCents: { decrement: absDelta },
            },
          });
          if (updated.count === 0) {
            throw new Error("Insufficient credit balance for this deduction.");
          }
          const refreshed = await tx.customer.findUnique({
            where: { id: input.customerId },
            select: { creditBalanceCents: true },
          });
          newBalanceCents =
            refreshed?.creditBalanceCents ?? Math.max(0, existing.creditBalanceCents - absDelta);
        } else {
          const updated = await tx.customer.update({
            where: { id: input.customerId },
            data: {
              isMember: true,
              memberSince: existing.memberSince || new Date(),
              creditBalanceCents: { increment: input.deltaCents },
            },
          });
          newBalanceCents = updated.creditBalanceCents;
        }

        const signPrefix = input.deltaCents > 0 ? "+" : "-";
        const rmAmt = (Math.abs(input.deltaCents) / 100).toFixed(2);

        await tx.memberTransaction.create({
          data: {
            customerId: input.customerId,
            idempotencyKey,
            type: "MANUAL_ADJUST",
            creditChangeCents: input.deltaCents,
            balanceAfterCents: newBalanceCents,
            sessionsChange: 0,
            cashPaidCents: 0,
            paymentMethod: "MANUAL",
            description: `Manual Adjust (${signPrefix}RM ${rmAmt}): ${cleanReason}`,
          },
        });

        return { newBalanceCents };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidateMemberPaths();
    return { success: true, data: result };
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingTx = await prisma.memberTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return { success: true, data: { newBalanceCents: existingTx.balanceAfterCents } };
      }
    }
    console.error("[adjustMemberCredit]", error);
    const msg = error instanceof Error ? error.message : "Failed to adjust credit.";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------
// 12. Ledger Reconciliation / Credit Tally Check
// ----------------------------------------------------------------
export interface CreditTallyMismatch {
  customerId: string;
  name: string;
  phoneNumber: string;
  storedBalanceCents: number;
  ledgerSumCents: number;
  diffCents: number;
}

export interface CreditTallyReport {
  checkedCount: number;
  mismatchedCount: number;
  mismatches: CreditTallyMismatch[];
  checkedAtIso: string;
}

export async function verifyMemberCreditTally(): Promise<ActionResult<CreditTallyReport>> {
  await requireAdmin();
  try {
    const [customers, sums] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { isMember: true },
            { creditBalanceCents: { not: 0 } },
            { memberTransactions: { some: {} } },
          ],
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          creditBalanceCents: true,
        },
      }),
      prisma.memberTransaction.groupBy({
        by: ["customerId"],
        _sum: { creditChangeCents: true },
      }),
    ]);

    const sumMap = new Map(
      sums.map((row) => [row.customerId, row._sum.creditChangeCents ?? 0])
    );

    const mismatches: CreditTallyMismatch[] = [];
    for (const c of customers) {
      const ledgerSumCents = sumMap.get(c.id) ?? 0;
      if (c.creditBalanceCents !== ledgerSumCents) {
        mismatches.push({
          customerId: c.id,
          name: c.name,
          phoneNumber: c.phoneNumber,
          storedBalanceCents: c.creditBalanceCents,
          ledgerSumCents,
          diffCents: c.creditBalanceCents - ledgerSumCents,
        });
      }
    }

    return {
      success: true,
      data: {
        checkedCount: customers.length,
        mismatchedCount: mismatches.length,
        mismatches,
        checkedAtIso: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[verifyMemberCreditTally]", error);
    return { success: false, error: "Failed to run credit tally check." };
  }
}

// ----------------------------------------------------------------
// 13. Shop-Wide Outstanding Member Credit & Package Summary
// ----------------------------------------------------------------
export interface MemberCreditSummary {
  totalMembers: number;
  membersWithCreditCount: number;
  totalOutstandingCreditCents: number;
  totalRemainingSessions: number;
}

export async function getMemberCreditSummary(): Promise<ActionResult<MemberCreditSummary>> {
  await requireAdmin();
  try {
    const [totalMembers, creditAgg, pkgAgg] = await Promise.all([
      prisma.customer.count({ where: { isMember: true } }),
      prisma.customer.aggregate({
        where: { creditBalanceCents: { gt: 0 } },
        _sum: { creditBalanceCents: true },
        _count: { _all: true },
      }),
      prisma.memberPackage.aggregate({
        where: { status: "ACTIVE", remainingSessions: { gt: 0 } },
        _sum: { remainingSessions: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalMembers,
        membersWithCreditCount: creditAgg._count._all,
        totalOutstandingCreditCents: creditAgg._sum.creditBalanceCents ?? 0,
        totalRemainingSessions: pkgAgg._sum.remainingSessions ?? 0,
      },
    };
  } catch (error) {
    console.error("[getMemberCreditSummary]", error);
    return { success: false, error: "Failed to load member credit summary." };
  }
}
