"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import type { ActionResult, ServiceDto } from "@/types";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  type: true,
  durationMinutes: true,
  priceCents: true,
  isActive: true,
} as const;

const getAllServicesCached = unstable_cache(
  async (): Promise<ServiceDto[]> => {
    return prisma.service.findMany({
      select: SERVICE_SELECT,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },
  ["services-all"],
  { tags: ["services"], revalidate: 300 }
);

const getActiveServicesCached = unstable_cache(
  async (): Promise<ServiceDto[]> => {
    return prisma.service.findMany({
      where: { isActive: true },
      select: SERVICE_SELECT,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },
  ["services-active"],
  { tags: ["services"], revalidate: 300 }
);

// ----------------------------------------------------------------
// List all services
// ----------------------------------------------------------------
export async function getServices(): Promise<ActionResult<ServiceDto[]>> {
  try {
    const services = await getAllServicesCached();
    return { success: true, data: services };
  } catch {
    return { success: false, error: "Failed to load services." };
  }
}

// ----------------------------------------------------------------
// List active services only (public)
// ----------------------------------------------------------------
export async function getActiveServices(): Promise<ActionResult<ServiceDto[]>> {
  try {
    const services = await getActiveServicesCached();
    return { success: true, data: services };
  } catch {
    return { success: false, error: "Failed to load services." };
  }
}

// ----------------------------------------------------------------
// Create service (admin)
// ----------------------------------------------------------------
interface ServiceInput {
  name: string;
  description?: string;
  category?: string;
  type?: string; // "SERVICE" | "PRODUCT"
  durationMinutes: number;
  priceCents: number;
  isActive?: boolean;
}

export async function createService(
  input: ServiceInput
): Promise<ActionResult<ServiceDto>> {
  await requireAdmin();
  try {
    const service = await prisma.service.create({ data: input });
    updateTag("services");
    revalidatePath("/admin/services");
    revalidatePath("/admin/desk");
    return { success: true, data: service };
  } catch {
    return { success: false, error: "Failed to create service." };
  }
}

// ----------------------------------------------------------------
// Update service (admin)
// ----------------------------------------------------------------
export async function updateService(
  id: string,
  input: Partial<ServiceInput>
): Promise<ActionResult<ServiceDto>> {
  await requireAdmin();
  try {
    const service = await prisma.service.update({ where: { id }, data: input });
    updateTag("services");
    revalidatePath("/admin/services");
    revalidatePath("/admin/desk");
    return { success: true, data: service };
  } catch {
    return { success: false, error: "Failed to update service." };
  }
}

// ----------------------------------------------------------------
// Delete service (admin)
// ----------------------------------------------------------------
export async function deleteService(id: string): Promise<ActionResult<void>> {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated booking items first (foreign key constraint)
      await tx.bookingItem.deleteMany({ where: { serviceId: id } });
      // 2. Delete any bookings referencing this service directly
      await tx.booking.deleteMany({ where: { serviceId: id } });
      // 3. Delete the service itself
      await tx.service.delete({ where: { id } });
    });

    updateTag("services");
    revalidatePath("/admin/services");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/desk");
    revalidatePath("/admin");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteService]", error);
    const msg = error instanceof Error ? error.message : "Failed to delete service.";
    return { success: false, error: msg };
  }
}
