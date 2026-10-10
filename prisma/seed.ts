import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: {
      username: "admin",
      passwordHash,
    },
  });
  console.log(`✅ Admin user created/updated (username: admin)`);

  // ── Business schedule (Mon-Sat 9am-7pm, Sun closed) ────────────────────────
  const schedule = [
    { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isClosed: true },  // Sun
    { dayOfWeek: 1, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Mon
    { dayOfWeek: 2, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Tue
    { dayOfWeek: 3, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Wed
    { dayOfWeek: 4, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Thu
    { dayOfWeek: 5, openTime: "09:00", closeTime: "19:00", isClosed: false }, // Fri
    { dayOfWeek: 6, openTime: "10:00", closeTime: "17:00", isClosed: false }, // Sat
  ];

  for (const s of schedule) {
    await prisma.businessSchedule.upsert({
      where: { dayOfWeek: s.dayOfWeek },
      update: s,
      create: s,
    });
  }
  console.log("✅ Business schedule seeded");

  // ── Sample services (Salon) ────────────────────────────────────────────────
  const services = [
    {
      name: "剪 (Hair Cut)",
      description: "Professional cut and styling.",
      category: "Hair",
      durationMinutes: 30,
      priceCents: 3500, // RM 35.00
      isActive: true,
    },
    {
      name: "洗 (Wash)",
      description: "Shampoo wash and blow dry.",
      category: "Hair",
      durationMinutes: 20,
      priceCents: 2500, // RM 25.00
      isActive: true,
    },
    {
      name: "染色 (Hair Color)",
      description: "Full hair coloring or tinting.",
      category: "Hair",
      durationMinutes: 90,
      priceCents: 15000, // RM 150.00
      isActive: true,
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: s });
    }
  }
  console.log("✅ Sample services seeded");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
