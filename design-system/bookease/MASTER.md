# Design System Master File — BookEase

> **LOGIC:** When building or enhancing a specific page or flow, first check `design-system/bookease/pages/[page-name].md`.
> If that page file exists, its specialized rules **override** this Master file.
> If not, strictly follow the global rules and components below.

---

**Project:** BookEase (Salon, Beauty & Wellness Booking System & POS)  
**Industry / Category:** Beauty/Spa/Wellness Service  
**Architecture / Stack:** Next.js 16 (App Router, Turbopack, Standalone), React 19, TypeScript, Tailwind CSS v4 (@theme inline OKLCH), Shadcn/Radix UI, Prisma ORM  
**Target Audience:** Modern salon & spa clients (mobile-first, frictionless booking) + Admin front-desk staff (fast POS checkout & appointment agenda)  

---

## 1. Visual Style & Theme Identity

- **Design Style:** Soft UI Evolution + Calming Modern Minimalism + Glassmorphism
- **Atmosphere:** Relaxing, trustworthy, premium, clean, high-contrast readability
- **Multi-language Support:** English (`en`) + Simplified Chinese (`zh-CN` / `zh-MY`) with Noto Sans SC fallback
- **Dials:** Variance 6/10 (Modern & Structured) | Motion 4/10 (Smooth 200–300ms transitions) | Density 6/10 (Comfortable touch targets)

---

## 2. Color Palette & Semantic Tokens

| Role | Token / CSS Variable | Light Theme (OKLCH / Hex) | Dark Theme (OKLCH / Hex) | Usage |
|------|----------------------|---------------------------|--------------------------|-------|
| **Primary** | `--color-primary` | `oklch(0.205 0 0)` / `#18181B` | `oklch(0.922 0 0)` / `#F4F4F5` | Main CTAs, prominent badges, active tabs |
| **Primary Foreground** | `--color-primary-foreground` | `oklch(0.985 0 0)` / `#FAFAFA` | `oklch(0.205 0 0)` / `#18181B` | Text on primary buttons & badges |
| **Secondary** | `--color-secondary` | `oklch(0.97 0 0)` / `#F4F4F5` | `oklch(0.269 0 0)` / `#27272A` | Sub-actions, filter pills, day badges |
| **Secondary Foreground**| `--color-secondary-foreground` | `oklch(0.205 0 0)` / `#18181B` | `oklch(0.985 0 0)` / `#FAFAFA` | Text on secondary elements |
| **Accent / Luxury** | `--color-accent` | `#FDF2F8` (Rose-50) | `#831843` (Rose-900) | Subtle highlights, promotional tags, VIP tier |
| **Accent Foreground** | `--color-accent-foreground` | `#9D174D` (Rose-800) | `#FCE7F3` (Rose-100) | Accented text, active icons |
| **Success / Confirmed**| `--color-success` | `#10B981` (Emerald-500) | `#34D399` (Emerald-400) | Confirmed appointments, paid deposits |
| **Pending / Review** | `--color-warning` | `#F59E0B` (Amber-500) | `#FBBF24` (Amber-400) | Pending deposits, waiting confirmation |
| **Destructive** | `--color-destructive` | `oklch(0.577 0.245 27.3)` | `oklch(0.704 0.191 22.2)` | Cancel booking, delete service |
| **Card / Surface** | `--color-card` | `oklch(1 0 0)` / `#FFFFFF` | `oklch(0.205 0 0)` / `#18181B` | Appointment cards, table rows, popovers |
| **Border** | `--color-border` | `oklch(0.922 0 0)` / `#E4E4E7` | `oklch(0.269 0 0)` / `#27272A` | Subtle dividers, card borders |

---

## 3. Typography Hierarchy

- **Primary Sans / Headings:** `Manrope`, `-apple-system`, `BlinkMacSystemFont`, `PingFang SC`, `Microsoft YaHei`, sans-serif
- **Multilingual Chinese:** `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`
- **Monospace / Reference Codes:** `font-mono` (`Ref #BE-XXXX`, prices, receipt IDs)

```css
/* Typography Scale */
h1 { font-size: 1.875rem; line-height: 2.25rem; font-weight: 800; letter-spacing: -0.025em; } /* 30px */
h2 { font-size: 1.375rem; line-height: 1.75rem; font-weight: 700; letter-spacing: -0.02em; }  /* 22px */
h3 { font-size: 1.125rem; line-height: 1.5rem; font-weight: 600; letter-spacing: -0.015em; } /* 18px */
body { font-size: 0.875rem; line-height: 1.25rem; font-weight: 400; }                           /* 14px */
caption / small { font-size: 0.75rem; line-height: 1rem; font-weight: 500; }                   /* 12px */
```

---

## 4. Spacing, Radii & Depth Tokens

| Token | Value | Applied To |
|-------|-------|------------|
| `--radius-sm` | `0.375rem` (6px) | Badges, small pills |
| `--radius-md` | `0.5rem` (8px) | Form inputs, select dropdowns, action buttons |
| `--radius-lg` | `0.625rem` (10px) | Default buttons, filter controls |
| `--radius-xl` | `0.875rem` (14px) | Appointment cards, service items |
| `--radius-2xl` | `1.125rem` (18px) | Main panels, summary cards, dialogs |
| `--radius-3xl` | `1.375rem` (22px) | Hero modals, bottom sheets |

### Elevation Shadows
- `shadow-xs`: Border subtle lift (`0 1px 2px rgba(0,0,0,0.04)`) for table cards & filters
- `shadow-sm`: Interactive cards and calendar items on hover
- `shadow-md`: Active popovers and dropdown contents
- `shadow-xl`: Modal sheets and confirmation dialogs with backdrop blur (`backdrop-blur-sm`)

---

## 5. Component Specifications & Heuristics

### A. Buttons & Tap Targets
- **Minimum Tap Target:** Mobile ergonomics require at least `44px × 44px` touch bounding box for buttons, tabs, and calendar date cells.
- **Hover & Active States:** `transition-all duration-200 ease-out active:scale-[0.98]`.
- **Loading Feedback:** Always show `<Loader2 className="animate-spin" />` with `disabled` state during server action mutations. Never leave users guessing if a click registered.

### B. Custom Modals & Confirmation Dialogs
- **Zero Native Popups:** Never use `window.alert()` or `window.confirm()`. Always use Radix `<Dialog>` or `<Sheet>` with:
  - Destructive actions styled in soft red (`bg-destructive/10 text-destructive border-destructive/20`).
  - Clear summary box of the entity being acted on (booking reference, customer name, service price).
  - Explicit confirmation button (`Cancel Appointment`, `Delete Service`).

### C. Status Badges
- Consistent pill badges with dot indicator:
  - `PENDING`: Amber background + pulse dot (`bg-amber-50 text-amber-700 border-amber-200`)
  - `CONFIRMED`: Blue or Emerald background (`bg-blue-50 text-blue-700 border-blue-200`)
  - `COMPLETED`: Slate background (`bg-slate-100 text-slate-800 border-slate-300`)
  - `CANCELLED` / `NO_SHOW`: Soft gray or red (`bg-rose-50 text-rose-700 border-rose-200`)

### D. Data Tables & Pagination
- Default to **10 items per page** with user selector for `5, 10, 15, 20`.
- Summary text showing `"Showing X to Y of Z bookings"`.
- Prev / Next buttons disable gracefully on bounds.
- Full row hover effect (`hover:bg-muted/40 transition-colors`).

---

## 6. Anti-Patterns to Strictly Avoid

1. ❌ **Browser Native Alerts / Confirms:** Breaks mobile PWA immersion and accessibility.
2. ❌ **Harsh Neon Colors:** Breaks the calming, premium beauty/wellness brand identity.
3. ❌ **Hidden Overflow on Mobile:** Every table must have a horizontal scroll wrapper (`overflow-x-auto`) or transform into card list below `640px`.
4. ❌ **Flash of Unstyled Content (FOUC):** Use `suppressHydrationWarning` on client/server bilingual toggles and initial mount.
5. ❌ **Cascading Foreign Key Crashes:** Always handle relational database deletes inside a Prisma transaction.
