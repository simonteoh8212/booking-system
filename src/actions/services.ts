"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import type { ActionResult, ServiceDto } from "@/types";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------------------
// List all services
// ----------------------------------------------------------------
export async function getServices(): Promise<ActionResult<ServiceDto[]>> {
  try {
    const services = await prisma.service.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
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
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
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
    revalidatePath("/admin/services");
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
    revalidatePath("/admin/services");
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
    await prisma.service.delete({ where: { id } });
    revalidatePath("/admin/services");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete service." };
  }
}
