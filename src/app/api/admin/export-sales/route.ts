import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse, connection } from "next/server";
import { getOrEnsurePrimaryDepositSetting } from "@/actions/deposit";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await connection();
  const session = await verifySession();
  if (!session) {
    return new NextResponse("Unauthorized. Admin login required.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      status: "COMPLETED",
    };

    let filenameSuffix = "all_time";

    if (yearParam && monthParam) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      if (!isNaN(year) && !isNaN(month)) {
        const monthPadded = String(month).padStart(2, "0");
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        whereClause.startDatetime = {
          gte: start,
          lte: end,
        };
        filenameSuffix = `${year}_${monthPadded}`;
      }
    }

    const [bookings, depositSetting] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: true,
          service: true,
          items: {
            include: {
              service: true,
            },
          },
        },
        orderBy: { startDatetime: "desc" },
      }),
      getOrEnsurePrimaryDepositSetting(),
    ]);

    const currencySymbol = depositSetting?.currencySymbol || "RM";

    // Build CSV with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const headers = [
      "Reference Code (开单编号)",
      "Date (日期)",
      "Time (时间)",
      "Customer Name (顾客姓名)",
      "Phone Number (手机号码)",
      "Type (类型)",
      "Services (服务项目)",
      `Total Amount (${currencySymbol})`,
      "Payment Method (支付方式)",
      "Status (状态)",
      "Notes (备注)",
    ];

    const rows: string[] = [headers.map(csvEscape).join(",")];

    for (const b of bookings) {
      const dt = new Date(b.startDatetime);
      const dateStr = dt.toISOString().slice(0, 10);
      const timeStr = dt.toTimeString().slice(0, 5);

      const isWalkin = b.customer.phoneNumber.startsWith("WALKIN-");
      const typeLabel = isWalkin ? "Walk-in (散客直接开单)" : "Appointment (预约结账)";

      const serviceList =
        b.items.length > 0
          ? b.items.map((it) => it.service.name).join(", ")
          : b.service?.name || "Service";

      const totalFormatted = (b.totalPriceCents / 100).toFixed(2);

      let paymentMethod = "OTHER";
      if (b.notes?.includes("CASH")) paymentMethod = "CASH";
      else if (b.notes?.includes("DUITNOW_QR")) paymentMethod = "DUITNOW_QR";
      else if (b.notes?.includes("CARD")) paymentMethod = "CARD";

      rows.push(
        [
          b.referenceCode,
          dateStr,
          timeStr,
          b.customer.name,
          b.customer.phoneNumber,
          typeLabel,
          serviceList,
          totalFormatted,
          paymentMethod,
          b.status,
          b.notes || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const csvContent = "\uFEFF" + rows.join("\r\n");
    const filename = `salon_sales_${filenameSuffix}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[export-sales]", error);
    return new NextResponse("Failed to export sales: " + String(error), {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
