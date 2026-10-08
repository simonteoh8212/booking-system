"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { BookingStep, ServiceDto, BookingConfirmation } from "@/types";

// ----------------------------------------------------------------
// State shape
// ----------------------------------------------------------------
interface CustomerDetails {
  name: string;
  phoneNumber: string;
  notes: string;
}

interface BookingState {
  // Navigation
  currentStep: BookingStep;

  // Step 1 – service selection
  selectedService: ServiceDto | null;

  // Step 2 – date & time selection
  selectedDate: Date | null;
  selectedSlotStart: string | null; // ISO string
  selectedSlotEnd: string | null;   // ISO string

  // Step 3 – customer details
  customerDetails: CustomerDetails;

  // Step 4 – pending hold & confirmation
  pendingHold: BookingConfirmation | null;
  confirmation: BookingConfirmation | null;

  // Loading/error feedback
  isSubmitting: boolean;
  submitError: string | null;
}

// ----------------------------------------------------------------
// Actions shape
// ----------------------------------------------------------------
interface BookingActions {
  // Step navigation
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1
  selectService: (service: ServiceDto) => void;

  // Step 2
  selectDate: (date: Date) => void;
  selectSlot: (startIso: string, endIso: string) => void;

  // Step 3
  updateCustomerDetails: (details: Partial<CustomerDetails>) => void;

  // Step 4
  setPendingHold: (hold: BookingConfirmation | null) => void;
  setConfirmation: (confirmation: BookingConfirmation | null) => void;

  // Submit state
  setSubmitting: (value: boolean) => void;
  setSubmitError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

// ----------------------------------------------------------------
// Initial state
// ----------------------------------------------------------------
const initialState: BookingState = {
  currentStep: 1,
  selectedService: null,
  selectedDate: null,
  selectedSlotStart: null,
  selectedSlotEnd: null,
  customerDetails: {
    name: "",
    phoneNumber: "",
    notes: "",
  },
  pendingHold: null,
  confirmation: null,
  isSubmitting: false,
  submitError: null,
};

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------
export const useBookingStore = create<BookingState & BookingActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      goToStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const current = get().currentStep;
        if (current < 4) set({ currentStep: (current + 1) as BookingStep });
      },

      prevStep: () => {
        const current = get().currentStep;
        if (current > 1) set({ currentStep: (current - 1) as BookingStep });
      },

      selectService: (service) =>
        set({
          selectedService: service,
          // Reset downstream selections when service changes
          selectedDate: null,
          selectedSlotStart: null,
          selectedSlotEnd: null,
          pendingHold: null,
        }),

      selectDate: (date) =>
        set({
          selectedDate: date,
          // Reset slot when date changes
          selectedSlotStart: null,
          selectedSlotEnd: null,
          pendingHold: null,
        }),

      selectSlot: (startIso, endIso) =>
        set({ selectedSlotStart: startIso, selectedSlotEnd: endIso, pendingHold: null }),

      updateCustomerDetails: (details) =>
        set((state) => ({
          customerDetails: { ...state.customerDetails, ...details },
        })),

      setPendingHold: (pendingHold) => set({ pendingHold }),

      setConfirmation: (confirmation) => set({ confirmation }),

      setSubmitting: (value) => set({ isSubmitting: value }),

      setSubmitError: (error) => set({ submitError: error }),

      reset: () => set(initialState),
    }),
    { name: "booking-store" }
  )
);
