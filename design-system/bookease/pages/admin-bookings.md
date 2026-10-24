# Page Design Spec: Bookings Management

> **Inherits from:** `design-system/bookease/MASTER.md`

## 1. Page Purpose & Layout
The Bookings Manager (`/admin/bookings`) is the central hub for reviewing, confirming, and updating customer appointments.

### Component Structure:
1. **Header & Status Tabs:**
   - Tabs with live counts: `All`, `Pending Review`, `Confirmed`, `Completed`, `Cancelled`.
   - Amber pulse badge on `Pending Review` to immediately draw attention to unconfirmed customer bookings.
2. **Search & Filter Bar:**
   - Real-time customer name / phone search input with clear icon.
3. **Interactive Data Table:**
   - **Columns:** Reference Code, Date & Time, Customer Details, Service & Duration, Payment / Deposit Status, Actions.
   - **Inline Actions:**
     - 1-click **Confirm** button for pending bookings.
     - Direct WhatsApp link button pre-filled with booking details.
     - Status selector dropdown (`CONFIRMED`, `COMPLETED`, `NO_SHOW`, `CANCELLED`).
     - Custom modal trigger for booking cancellation.
4. **Pagination Controls:**
   - Default: **10 items per page**.
   - Per page selector: dropdown allowing selection of **5, 10, 15, 20**.
   - Summary indicator: `Showing X to Y of Z bookings`.
   - Prev / Next buttons + numeric page pills with active highlight.

## 2. Accessibility & UX
- Keyboard-accessible pagination and select controls.
- Micro-loading indicator (`Loader2`) during status updates.
- Optimistic state update: status changes reflect instantly in the table.
