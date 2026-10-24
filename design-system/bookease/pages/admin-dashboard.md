# Page Design Spec: Admin Dashboard & Agenda

> **Inherits from:** `design-system/bookease/MASTER.md`

## 1. Page Purpose & Layout
The Admin Dashboard (`/admin`) gives salon managers an instant pulse on daily performance (KPIs) and operational schedule (Agenda & Calendar).

### Section Order:
1. **Sales Overview Cards:** Today, Yesterday, and Monthly Revenue + Completed Client Counts.
2. **Appointment Agenda Header:** Title, bilingual subtitle, toolbar with Day/Month navigation, Date picker popover, Today button, and `[Agenda View | Calendar]` toggle switch.
3. **Calendar View (Monthly Grid):**
   - 7-column grid (Sunday - Saturday) with day numbers.
   - Badge counter on dates with appointments (e.g., `3` on Oct 24).
   - Blue active ring on selected date.
   - **Click-to-Scroll Interaction:** Clicking any day cell smoothly scrolls down to the appointment drawer below with `scroll-mt-20` offset for the sticky header.
4. **Selected Day Agenda Drawer:**
   - Header with appointment date, total count badge, and a **"Top"** shortcut button to return to the calendar.
   - Individual `AgendaCard` items displaying appointment time, service name, customer phone, price/deposit status, and quick status actions.
   - Empty state with calming icon when no appointments are scheduled.

## 2. Interaction Specifications
- **Motion:** `scrollIntoView({ behavior: "smooth", block: "start" })` on day cell click.
- **Elevation:** Month calendar grid has subtle borders (`border-border/80`) and day hover highlight (`hover:bg-muted/30`).
- **Responsive:** On screens `< 640px`, days of week abbreviations shorten (`Sun, Mon, Tue`), and day cells shrink cleanly without breaking the grid.
