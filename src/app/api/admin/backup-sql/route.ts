import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse, connection } from "next/server";

function sqlEscapeString(val: string): string {
  return "'" + val.replace(/'/g, "''") + "'";
}

function sqlValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return sqlEscapeString(val.toISOString());
  return sqlEscapeString(String(val));
}

function buildInsertStatement(
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  conflictKey: string = "id"
): string {
  if (rows.length === 0) {
    return `-- Table: ${table} (0 records)\n`;
  }

  const colsStr = columns.map((c) => `"${c}"`).join(", ");
  const updateCols = columns
    .filter((c) => c !== conflictKey)
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");

  const lines: string[] = [];
  lines.push(`-- Table: ${table} (${rows.length} records)`);

  // Batch in chunks of 50 to keep individual statements clean
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const valueTuples = chunk.map((r) => {
      const vals = columns.map((col) => {
        const val = r[col];
        // Cast enum for booking status if applicable
        if (table === "bookings" && col === "status" && typeof val === "string") {
          return `${sqlEscapeString(val)}::"BookingStatus"`;
        }
        return sqlValue(val);
      });
      return `  (${vals.join(", ")})`;
    });

    lines.push(
      `INSERT INTO "${table}" (${colsStr})\nVALUES\n${valueTuples.join(",\n")}\nON CONFLICT ("${conflictKey}") DO UPDATE SET\n  ${updateCols};`
    );
  }

  lines.push("");
  return lines.join("\n");
}

export async function GET() {
  await connection();
  const session = await verifySession();
  if (!session) {
    return new NextResponse("Unauthorized. Admin login required.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const [
      services,
      schedules,
      blockouts,
      customers,
      bookings,
      bookingItems,
      adminUsers,
      depositSettings,
      exemptCustomers,
      expenses,
    ] = await Promise.all([
      prisma.service.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.businessSchedule.findMany({ orderBy: { dayOfWeek: "asc" } }),
      prisma.timeBlockout.findMany({ orderBy: { startDatetime: "asc" } }),
      prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.booking.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.bookingItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.depositSetting.findMany({ orderBy: { id: "asc" } }),
      prisma.depositExemptCustomer.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.expense.findMany({ orderBy: { date: "asc" } }),
    ]);

    const totalRecords =
      services.length +
      schedules.length +
      blockouts.length +
      customers.length +
      bookings.length +
      bookingItems.length +
      adminUsers.length +
      depositSettings.length +
      exemptCustomers.length +
      expenses.length;

    const nowIso = new Date().toISOString();
    const dateStamp = nowIso.slice(0, 10);
    const timeStamp = nowIso.slice(11, 19).replace(/:/g, "");
    const filename = `salon_backup_${dateStamp}_${timeStamp}.sql`;

    const sqlHeader = [
      `-- =========================================================================`,
      `-- Booking System Database Full Backup (.sql)`,
      `-- Generated at : ${nowIso}`,
      `-- Exported by  : ${session.username}`,
      `-- Total Records: ${totalRecords} across 10 tables`,
      `-- Format       : PostgreSQL Standard SQL (Compatible with Supabase / Neon / pgAdmin)`,
      `-- =========================================================================`,
      ``,
      `-- Set client encoding and transaction`,
      `SET client_encoding = 'UTF8';`,
      `SET standard_conforming_strings = on;`,
      ``,
      `BEGIN;`,
      ``,
    ].join("\n");

    const sqlParts: string[] = [sqlHeader];

    // 1. Services
    sqlParts.push(
      buildInsertStatement(
        "services",
        ["id", "name", "description", "category", "durationMinutes", "priceCents", "isActive", "createdAt", "updatedAt"],
        services as unknown as Record<string, unknown>[]
      )
    );

    // 2. Business Schedules
    sqlParts.push(
      buildInsertStatement(
        "business_schedules",
        ["id", "dayOfWeek", "openTime", "closeTime", "isClosed"],
        schedules as unknown as Record<string, unknown>[]
      )
    );

    // 3. Time Blockouts
    sqlParts.push(
      buildInsertStatement(
        "time_blockouts",
        ["id", "startDatetime", "endDatetime", "reason", "createdAt"],
        blockouts as unknown as Record<string, unknown>[]
      )
    );

    // 4. Customers
    sqlParts.push(
      buildInsertStatement(
        "customers",
        ["id", "name", "phoneNumber", "createdAt", "updatedAt"],
        customers as unknown as Record<string, unknown>[]
      )
    );

    // 5. Bookings
    sqlParts.push(
      buildInsertStatement(
        "bookings",
        [
          "id",
          "referenceCode",
          "customerId",
          "serviceId",
          "startDatetime",
          "endDatetime",
          "totalPriceCents",
          "depositDueCents",
          "balanceDueCents",
          "status",
          "notes",
          "receiptSubmittedAt",
          "createdAt",
          "updatedAt",
        ],
        bookings as unknown as Record<string, unknown>[]
      )
    );

    // 6. Booking Items
    sqlParts.push(
      buildInsertStatement(
        "booking_items",
        ["id", "bookingId", "serviceId", "priceCents", "createdAt"],
        bookingItems as unknown as Record<string, unknown>[]
      )
    );

    // 7. Admin Users
    sqlParts.push(
      buildInsertStatement(
        "admin_users",
        ["id", "username", "passwordHash", "pinCode", "createdAt"],
        adminUsers as unknown as Record<string, unknown>[]
      )
    );

    // 8. Deposit Settings
    sqlParts.push(
      buildInsertStatement(
        "deposit_settings",
        [
          "id",
          "isEnabled",
          "type",
          "amountCents",
          "percentage",
          "duitnowPayload",
          "qrImageUrl",
          "recipientName",
          "currency",
          "currencySymbol",
          "deskLanguage",
          "showTodaySales",
          "showYesterdaySales",
          "showMonthlySales",
          "showServiceBreakdown",
          "showMakeAppointment",
          "showWalkIn",
          "showBookedCheckout",
          "updatedAt",
        ],
        depositSettings as unknown as Record<string, unknown>[]
      )
    );

    // 9. Deposit Exempt Customers
    sqlParts.push(
      buildInsertStatement(
        "deposit_exempt_customers",
        ["id", "phoneNumber", "name", "note", "isActive", "createdAt", "updatedAt"],
        exemptCustomers as unknown as Record<string, unknown>[]
      )
    );

    // 10. Expenses
    sqlParts.push(
      buildInsertStatement(
        "expenses",
        ["id", "title", "category", "amountCents", "date", "notes", "createdAt", "updatedAt"],
        expenses as unknown as Record<string, unknown>[]
      )
    );

    sqlParts.push(
      `COMMIT;`,
      ``,
      `-- =========================================================================`,
      `-- Backup completed successfully (${totalRecords} records preserved).`,
      `-- =========================================================================\n`
    );

    const fullSql = sqlParts.join("\n");

    return new NextResponse(fullSql, {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[backup-sql]", error);
    return new NextResponse("Failed to generate database backup: " + String(error), {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
