import type { Metadata } from "next";
import Link from "next/link";
import { ProductDemoPlayer } from "@/components/demo/ProductDemoPlayer";
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Zap, Smartphone, Monitor } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Product Demo Video | BookEase",
  description:
    "Interactive step-by-step introduction video showing customer self-booking and salon front desk management in real-time.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Live App</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-slate-300">
              Interactive Video Showcase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 space-y-10">
        {/* Hero Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mobile Product Introduction Showcase</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Customer Self-Booking in Action
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Experience our mobile web app step-by-step — from instant service selection and 7-minute anti-conflict holds to DuitNow QR payments and automated WhatsApp confirmation.
          </p>
        </div>

        {/* The Animated Video Player */}
        <section className="w-full">
          <ProductDemoPlayer />
        </section>

        {/* Feature Cards Matrix */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">7-Minute Concurrency Hold</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              PostgreSQL advisory locks prevent double-booking. Stale unsubmitted reservations are
              automatically recycled back to other customers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">DuitNow QR & VIP Waive</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dynamic DuitNow national QR codes with auto-filled deposit amounts. Regular customer VIPs
              are recognized automatically with RM 0.00 deposit.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">0ms Live Handshake</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When front desk verifies a WhatsApp receipt and clicks Confirm, the customer&apos;s
              online tracking page updates to Confirmed in real time.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>BookEase Booking System • Interactive Demo Video</p>
      </footer>
    </div>
  );
}
