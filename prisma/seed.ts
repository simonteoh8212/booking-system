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

  // ── Sample services ─────────────────────────────────────────────────────────
  const services = [
    {
      name: "Swedish Massage",
      description: "A relaxing full-body massage to relieve tension and improve circulation.",
      category: "Massage",
      durationMinutes: 60,
      priceCents: 12000,
      isActive: true,
    },
    {
      name: "Deep Tissue Massage",
      description: "Targets deeper layers of muscle to release chronic tension and knots.",
      category: "Massage",
      durationMinutes: 90,
      priceCents: 16800,
      isActive: true,
    },
    {
      name: "Classic Facial",
      description: "A nourishing facial treatment to cleanse, exfoliate, and hydrate skin.",
      category: "Facial",
      durationMinutes: 60,
      priceCents: 14000,
      isActive: true,
    },
    {
      name: "Express Facial",
      description: "Quick 30-minute facial for a refreshed glow on the go.",
      category: "Facial",
      durationMinutes: 30,
      priceCents: 8000,
      isActive: true,
    },
    {
      name: "Scalp Treatment",
      description: "Therapeutic scalp massage and treatment to promote hair health.",
      category: "Hair",
      durationMinutes: 45,
      priceCents: 9500,
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
