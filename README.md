# Booking System 📅

A modern, high-performance appointment booking system built for service-based businesses (spas, salons, clinics, fitness studios). Features real-time slot locking, DuitNow / Touch 'n Go QR payments, WhatsApp receipt confirmation, dynamic business hours, and customer self-service status tracking.

---

## ⚡ Command Reference Cheat Sheet

### Database & Prisma Commands

| Command | When to Run It? | What It Does |
| :--- | :--- | :--- |
| **`npx prisma db push`**<br>`npm run db:push` | • **Whenever you edit `prisma/schema.prisma`** (added, renamed, or deleted a field/table).<br>• **When connecting a new database** for a new client from scratch. | Syncs your `schema.prisma` directly into PostgreSQL and automatically updates Prisma Client. |
| **`npx prisma generate`**<br>`npm run db:generate` | • **When your IDE / TypeScript red-underlines** Prisma types after pulling git updates.<br>• Run automatically by `build` and `postinstall`. | Rebuilds TypeScript types in `node_modules/@prisma/client` for full autocomplete. |
| **`npm run db:seed`** | • **Initial setup for a new client / database** to populate the admin account (`admin123`), default business operating hours, and sample services. | Runs `prisma/seed.ts` with upserts (safe to run multiple times). |
| **`npm run db:reset`** | • **In development ONLY** when you want to wipe all bookings, customers, and test data and re-seed from scratch. | Clears all tables and re-seeds initial data. ⚠️ *Destructive! Do not run on production.* |
| **`npx prisma studio`**<br>`npm run db:studio` | • **Whenever you want a visual GUI** to view, search, edit, or delete database records directly in your browser. | Opens Prisma Studio web UI at `http://localhost:5555`. |

---

### Application Commands

| Command | When to Run It? | What It Does |
| :--- | :--- | :--- |
| **`npm run dev`** | • **During local development**. | Starts the Next.js development server at `http://localhost:3000`. |
| **`npm run build`** | • **Before deploying to production** (e.g. Vercel) or to verify there are zero TypeScript/Turbopack errors. | Runs `prisma generate` followed by `next build`. |
| **`npm run start`** | • **After `npm run build`** to run the production build locally. | Serves the optimized production build on `http://localhost:3000`. |
| **`npm run lint`** | • **To check code quality and style**. | Runs Next.js ESLint checks. |

---

## 🚀 Setting Up for a New Client (Step-by-Step)

When setting up this booking system for a new client:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure `.env`
Duplicate `.env.example` to `.env` (or update `.env`) and adjust for the client:

```env
# 1. PostgreSQL Database URL (e.g. Supabase connection pooler or direct URI)
DATABASE_URL="postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 2. Admin Authentication
JWT_SECRET="generate-a-secure-random-string"
ADMIN_SEED_PASSWORD="ClientPassword123"

# 3. Client Business Information
NEXT_PUBLIC_BUSINESS_NAME="Serenity Wellness Spa"
NEXT_PUBLIC_MERCHANT_WHATSAPP="60123456789"
NEXT_PUBLIC_PAYMENT_QR_URL="https://your-domain.com/tng-qr.jpg"

# 4. Custom Booking Reference Prefix
# e.g. "SPA" -> SPA-8F29A, "SALON" -> SALON-3M9WZ, "CLINIC" -> CLINIC-7K3WE
NEXT_PUBLIC_BOOKING_REF_PREFIX="SPA"

# 5. Business Operating Hours (24-hour format: 9 = 9:00 AM, 19 = 7:00 PM)
NEXT_PUBLIC_OPERATING_HOUR_START="9"
NEXT_PUBLIC_OPERATING_HOUR_END="19"

# Closed days: comma-separated numbers (0=Sun, 1=Mon, ..., 6=Sat). Leave empty "" if open daily.
NEXT_PUBLIC_CLOSED_DAYS="0"

# Friendly display text for after-hours notices
NEXT_PUBLIC_OPERATING_DAYS_DESCRIPTION="Mon – Sat"
NEXT_PUBLIC_OPERATING_HOURS_DISPLAY="9:00 AM – 7:00 PM"
```

### Step 3: Sync PostgreSQL Database
Run this to create all tables and relationships in the new PostgreSQL database:
```bash
npx prisma db push
```

### Step 4: Seed Initial Admin & Services
```bash
npm run db:seed
```

### Step 5: Start Developing or Deploy
```bash
npm run dev
```
- Customer Booking: `http://localhost:3000`
- Status Tracker: `http://localhost:3000/check-booking`
- Admin Dashboard: `http://localhost:3000/admin` (Login with `admin` / your configured seed password)

---

## 🔒 How Booking Reservation & Locking Works

This system uses a **Two-Stage Hold & Lock Architecture** to eliminate double-booking race conditions while preventing abandoned carts from indefinitely holding slots:

```
Customer selects slot & details
       │
       ▼
[Stage 1: 7-Minute Temporary Hold]
• Customer clicks "Hold Slot & Pay"
• Transaction lock (pg_advisory_xact_lock) serializes requests
• Database creates PENDING booking (receiptSubmittedAt: null)
• 7-minute live countdown timer starts
• If timer hits 00:00 without payment receipt, slot is auto-released
       │
       ▼
[Stage 2: Permanent Reservation Lock]
• Customer transfers via QR code and clicks "I've Paid — Send Receipt"
• Database stamps `receiptSubmittedAt = NOW()`
• Slot is PERMANENTLY LOCKED — no one else can take or overlap this slot
• WhatsApp opens with pre-filled details to send proof of payment
       │
       ▼
[Stage 3: Admin Review & Confirmation]
• Admin verifies receipt in bank/eWallet
• Admin approves in /admin/bookings (`status: CONFIRMED`)
• Customer can check live status at /check-booking
```

---

## 🌙 Non-Operating Hours Handling

When customers book outside business hours (e.g., at 11:00 PM or on Sunday):
- **Step 4 (Payment Instructions)** displays an informational advisory before payment so customers know staff is off-duty.
- **Booking Confirmation** confirms that their slot is safely secured and will be reviewed and confirmed when business reopens (e.g., at 9:00 AM on the next business day).
- All times and schedules are anchored to Malaysian local time (`Asia/Kuala_Lumpur` UTC+8).

---

## 🔎 Customer Self-Service Tracker (`/check-booking`)

Customers can check the status of their appointment at any time without needing to log in:
- Search by **Booking Reference Code** (e.g. `BK-8F29A` or `SPA-XXXXX`) or **Phone Number**.
- Displays real-time status:
  - 🟣 **Slot Locked — Awaiting Payment Verification**
  - 🟢 **Booking Confirmed**
  - 🟠 **Temporary Hold (Unpaid)**
  - 🔴 **Cancelled / Expired**
- Direct button to contact the shop via WhatsApp with the reference code pre-filled.
