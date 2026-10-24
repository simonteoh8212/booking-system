# Page Design Spec: Customer Booking Flow

> **Inherits from:** `design-system/bookease/MASTER.md`

## 1. Page Purpose & Layout
The public booking flow (`/`) allows salon clients to select services, choose available time slots, enter their details, and submit deposit receipts.

### Multi-Step Journey:
1. **Step 1: Service Selection:**
   - Visual service cards with clear duration (e.g. `60 mins`), price, and description.
   - Category filter pills at the top (`All`, `Hair`, `Facial`, `Nails`, `Massage`).
   - Radio / checkbox selection with subtle rose border highlight when selected.
2. **Step 2: Date & Time Slot Picker:**
   - Interactive calendar with blocked past dates and off-days.
   - Time slot pill grid (e.g. `10:00 AM`, `11:30 AM`, `2:00 PM`) showing available vs booked status.
   - Large tap targets (`min-h-[44px]`) optimized for mobile touch.
3. **Step 3: Customer Details & Preferences:**
   - Name, phone number with country code, optional notes.
   - Floating label or crisp field styling with inline validation.
4. **Step 4: Deposit Confirmation & Receipt Upload:**
   - Deposit amount calculation (`RM XX.XX`) and payment QR code / bank transfer details.
   - Drag-and-drop or camera file upload for payment receipt with live image preview.
5. **Step 5: Booking Confirmed Screen:**
   - Celebration checkmark animation.
   - Reference code badge with 1-click copy.
   - "Add to Calendar" / "Save Reference" prompt.

## 2. Design Heuristics
- **Mobile-First:** 85%+ of salon bookings occur on mobile devices.
- **Zero Friction:** No account creation required for initial booking.
- **Calming Aesthetics:** Soft warm background (`bg-background`), clean cards with soft shadows, subtle micro-animations.
