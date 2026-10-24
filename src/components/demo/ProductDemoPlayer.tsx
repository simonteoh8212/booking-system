"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  QrCode,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Star,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Mobile Demo Chapters / Storyboard
// ----------------------------------------------------------------
interface DemoStep {
  id: number;
  badge: string;
  badgeZh: string;
  headlineEn: string;
  headlineZh: string;
  subEn: string;
  subZh: string;
  featuresEn: string[];
  featuresZh: string[];
  screen: "services" | "slots" | "hold" | "payment" | "confirmed";
  accentColor: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    badge: "STEP 1 • SERVICE DISCOVERY",
    badgeZh: "第 1 步 • 挑选沙龙项目",
    headlineEn: "Instant Service & Price Transparency",
    headlineZh: "透明价格与耗时，一键选择",
    subEn: "Customers browse categorized salon treatments with upfront duration and pricing.",
    subZh: "顾客可在手机端浏览按分类整理的剪发、护理与美甲项目，价格和耗时一目了然。",
    featuresEn: [
      "Categorized by Hair, Nails, Spa & Treatment",
      "Malaysia Ringgit (RM / MYR) transparent pricing",
      "High-conversion mobile card layout",
    ],
    featuresZh: [
      "按美发、美甲、头皮护理智能分类",
      "马来西亚林吉特（RM / MYR）透明计价",
      "专为单手操作优化的极简卡片界面",
    ],
    screen: "services",
    accentColor: "from-emerald-500 to-teal-400",
  },
  {
    id: 2,
    badge: "STEP 2 • CALENDAR & SLOTS",
    badgeZh: "第 2 步 • 实时日历与时段",
    headlineEn: "Real-Time Slot Picker with Zero Clashes",
    headlineZh: "智能无冲突时段引擎",
    subEn: "Live availability engine checks business hours, booked slots, and staff breaks.",
    subZh: "系统实时过滤非营业时间、员工休假与已被占用的时间，杜绝重复撞单。",
    featuresEn: [
      "15-minute smart slot intervals",
      "Automatic buffer against past times",
      "Aware of weekly business opening hours",
    ],
    featuresZh: [
      "以 15 分钟为精细度智能计算",
      "自动规避过去时段，仅展示有效未来时间",
      "严格匹配沙龙每周营业与闭店规则",
    ],
    screen: "slots",
    accentColor: "from-cyan-500 to-blue-500",
  },
  {
    id: 3,
    badge: "STEP 3 • CONCURRENCY PROTECTION",
    badgeZh: "第 3 步 • 7分钟防抢单保护",
    headlineEn: "7-Minute Anti-Conflict Hold Lock",
    headlineZh: "7分钟临时锁定，防黄牛占座",
    subEn: "PostgreSQL advisory locks instantly protect the chosen slot while customer checks out.",
    subZh: "输入资料后，数据库级互斥锁立即临时锁定该时段，超时未付款自动释放给其他顾客。",
    featuresEn: [
      "PostgreSQL pg_advisory_xact_lock concurrency defense",
      "Single-user anti-hoarding auto cleanup",
      "Live 7-minute countdown visual timer",
    ],
    featuresZh: [
      "PostgreSQL 事务锁确保千人并发绝不重单",
      "同一手机号防刷占座自动清理机制",
      "高可见度的 7 分钟倒计时保护条",
    ],
    screen: "hold",
    accentColor: "from-amber-500 to-orange-400",
  },
  {
    id: 4,
    badge: "STEP 4 • MALAYSIAN QR & VIP",
    badgeZh: "第 4 步 • DuitNow QR 与熟客特权",
    headlineEn: "DuitNow QR or Regular VIP Waiver",
    headlineZh: "扫码支付定金 或 熟客免定金",
    subEn: "Scan DuitNow QR with any bank app. Regular VIP customers enjoy 100% deposit waiver!",
    subZh: "支持马来西亚各银行与 Touch 'n Go 扫码支付定金。系统自动识别老顾客电话，免收定金一键秒过！",
    featuresEn: [
      "Dynamic National DuitNow QR with auto-filled deposit",
      "VIP Phone recognition waives deposit (RM 0.00)",
      "Tap-to-zoom official Touch 'n Go merchant QR",
    ],
    featuresZh: [
      "动态 DuitNow QR 自动预填定金金额与单号",
      "老客户白名单自动识别，RM 0 定金一键确认",
      "支持一键放大官方 Touch 'n Go 收款码",
    ],
    screen: "payment",
    accentColor: "from-pink-500 to-rose-400",
  },
  {
    id: 5,
    badge: "STEP 5 • WHATSAPP HANDSHAKE",
    badgeZh: "第 5 步 • WhatsApp 极速握手",
    headlineEn: "1-Tap WhatsApp Receipt & Status Tracker",
    headlineZh: "一键 WhatsApp 发收据与在线追踪",
    subEn: "Direct WhatsApp link opens pre-filled details to send slip. Customers track status online anytime.",
    subZh: "点击按钮自动唤起 WhatsApp 并预填预约所有详情供发送收据。更有专属单号随时在线查询。",
    featuresEn: [
      "Pre-filled wa.me message with booking reference",
      "Standalone /check-booking customer tracking portal",
      "Anti-scrape rate limiting and phone privacy masking",
    ],
    featuresZh: [
      "自动生成带单号、姓名、时段的 WhatsApp 模板",
      "提供公开 /check-booking 自助查询进度网址",
      "具备防爬虫 Honeypot 蜜罐与手机号码脱敏隐私保护",
    ],
    screen: "confirmed",
    accentColor: "from-emerald-400 to-green-500",
  },
];

export function ProductDemoPlayer() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lang, setLang] = useState<"en" | "zh">("zh");
  const [holdTimer, setHoldTimer] = useState("06:58");

  const step = DEMO_STEPS[currentStepIndex];

  // Auto-play interval (advance every 4.5 seconds)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % DEMO_STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulated countdown timer tick
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setHoldTimer((prev) => {
        const [m, s] = prev.split(":").map(Number);
        const total = m * 60 + s - 1;
        if (total <= 0) return "06:59";
        const newM = String(Math.floor(total / 60)).padStart(2, "0");
        const newS = String(total % 60).padStart(2, "0");
        return `${newM}:${newS}`;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const nextStep = () => {
    setCurrentStepIndex((prev) => (prev + 1) % DEMO_STEPS.length);
  };

  const prevStep = () => {
    setCurrentStepIndex((prev) => (prev - 1 + DEMO_STEPS.length) % DEMO_STEPS.length);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 shadow-2xl border border-slate-800 p-4 sm:p-8 lg:p-12 select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Smartphone className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              BookEase Mobile Web App
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                PWA Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive mobile showcase • Customer self-booking flow
            </p>
          </div>
        </div>

        {/* Video Control Bar & Language */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pause Auto-play</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Play Demo</span>
              </>
            )}
          </button>

          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
          >
            {lang === "en" ? "中文模式" : "English"}
          </button>
        </div>
      </div>

      {/* Main Showcase Grid: Words (Left) + 3D Mobile Device (Center/Right) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[580px]">
        {/* ======================================================== */}
        {/* LEFT COLUMN: WORDS EXPLAINING HOW IT WORKS */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Step Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-emerald-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === "zh" ? step.badgeZh : step.badge}</span>
          </div>

          {/* Big Bold Headline */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {lang === "zh" ? step.headlineZh : step.headlineEn}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              {lang === "zh" ? step.subZh : step.subEn}
            </p>
          </div>

          {/* Highlighted Feature Pills */}
          <div className="space-y-2.5 pt-2">
            {(lang === "zh" ? step.featuresZh : step.featuresEn).map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850/80 border border-slate-800 backdrop-blur-md transition-all hover:border-slate-700"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-200">{feat}</span>
              </div>
            ))}
          </div>

          {/* Step Navigation Dots & Arrows */}
          <div className="flex items-center justify-between pt-4">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {DEMO_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={cn(
                    "h-2.5 rounded-full transition-all cursor-pointer",
                    currentStepIndex === idx
                      ? "w-8 bg-emerald-400 shadow-md shadow-emerald-400/40"
                      : "w-2.5 bg-slate-700 hover:bg-slate-600"
                  )}
                  title={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevStep}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
                title="Previous step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextStep}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/30 font-bold flex items-center gap-1 text-xs"
                title="Next step"
              >
                <span>{lang === "zh" ? "下一步" : "Next"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: 3D FLOATING MOBILE DEVICE WITH REAL APP */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 flex justify-center items-center relative">
          {/* Glowing Pedestal Reflection underneath */}
          <div className="absolute -bottom-6 w-72 h-8 bg-emerald-500/30 rounded-full blur-xl pointer-events-none" />

          {/* 3D Realistic Smartphone Frame */}
          <div className="relative w-[310px] sm:w-[340px] h-[640px] bg-slate-900 rounded-[50px] border-[6px] border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-all duration-500 transform hover:scale-[1.01]">
            {/* Dynamic Island / Camera Notch */}
            <div className="absolute top-3 inset-x-0 mx-auto w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-2 h-2 rounded-full bg-blue-950/60" />
            </div>

            {/* Mobile Status Bar */}
            <div className="pt-3 px-6 h-10 bg-slate-950 flex items-center justify-between text-[11px] font-bold text-slate-400 select-none">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <div className="w-5 h-2.5 border border-slate-400 rounded-xs p-0.5 flex items-center">
                  <div className="w-full h-full bg-slate-400 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Salon App Header */}
            <div className="pt-2 pb-2.5 px-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
                  BookEase Salon
                </p>
                <h4 className="text-xs font-black text-white">Luxe Beauty & Spa</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Online
              </span>
            </div>

            {/* 4-Step Funnel Progress Bar inside phone */}
            <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNum) => {
                const currentPassed = Math.min(step.id, 4);
                const isCurrent = stepNum === currentPassed;
                const isCompleted = stepNum < currentPassed;
                return (
                  <div key={stepNum} className="flex items-center gap-1.5 flex-1">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        isCurrent
                          ? "bg-emerald-500 text-white scale-110 shadow-xs"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-500"
                      )}
                    >
                      {isCompleted ? "✓" : stepNum}
                    </div>
                    {stepNum < 4 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 rounded transition-all",
                          isCompleted ? "bg-emerald-500/40" : "bg-slate-800"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Screen Viewport with Dynamic Screens */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-950/40 text-xs">
              {/* ================= SCREEN 1: SERVICES ================= */}
              {step.screen === "services" && (
                <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-center pb-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                      Step 1 of 4
                    </span>
                    <h5 className="font-extrabold text-white text-sm">Choose Your Service</h5>
                  </div>

                  {/* Service 1 */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Express Haircut & Style</p>
                      <p className="text-[10px] text-slate-400">45 mins • Hair Styling</p>
                    </div>
                    <span className="font-bold text-slate-300">RM 45.00</span>
                  </div>

                  {/* Service 2 (Selected Target) */}
                  <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 flex items-center justify-between relative">
                    <div className="absolute -top-2 right-3 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      POPULAR
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <p className="font-bold text-white text-xs">Luxury Scalp Spa & Blow</p>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        60 mins • Intensive Care
                      </p>
                    </div>
                    <span className="font-extrabold text-emerald-400 text-sm">RM 120.00</span>
                  </div>

                  {/* Service 3 */}
                  <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Gel Manicure Spa</p>
                      <p className="text-[10px] text-slate-400">50 mins • Nails</p>
                    </div>
                    <span className="font-bold text-slate-300">RM 85.00</span>
                  </div>
                </div>
              )}

              {/* ================= SCREEN 2: SLOTS ================= */}
              {step.screen === "slots" && (
                <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-center pb-1">
                    <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">
                      Step 2 of 4
                    </span>
                    <h5 className="font-extrabold text-white text-sm">Pick Date & Time</h5>
                  </div>

                  {/* Calendar Widget */}
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                    <p className="text-[11px] font-bold text-slate-300 mb-1">October 2026</p>
                    <div className="grid grid-cols-7 gap-1 text-[10px]">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={i} className="text-slate-500 font-semibold">{d}</span>
                      ))}
                      {[20, 21, 22, 23].map((num) => (
                        <span key={num} className="text-slate-600 p-1">{num}</span>
                      ))}
                      <span className="bg-cyan-500 text-slate-950 font-black rounded-lg p-1 shadow-sm">
                        24
                      </span>
                      {[25, 26].map((num) => (
                        <span key={num} className="text-slate-400 p-1">{num}</span>
                      ))}
                    </div>
                  </div>

                  {/* Available Time Slots Grid */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1">
                      Available on Sat, 24 Oct:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="py-2 text-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                        10:00 AM
                      </div>
                      <div className="py-2 text-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                        11:30 AM
                      </div>
                      <div className="py-2 text-center rounded-lg bg-cyan-500 text-slate-950 font-extrabold border border-cyan-400 shadow-md">
                        2:00 PM (Selected)
                      </div>
                      <div className="py-2 text-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                        4:00 PM
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= SCREEN 3: HOLD ================= */}
              {step.screen === "hold" && (
                <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-center pb-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                      Step 3 of 4
                    </span>
                    <h5 className="font-extrabold text-white text-sm">Customer Details</h5>
                  </div>

                  {/* Order Summary Card */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white text-xs">Luxury Scalp Treatment</p>
                      <p className="text-[10px] text-amber-300">Sat, 24 Oct • 2:00 PM (60m)</p>
                    </div>
                    <span className="font-extrabold text-amber-400 text-sm">RM 120.00</span>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold">Customer Name</label>
                    <div className="h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg flex items-center text-xs font-bold text-white">
                      Amanda Tan
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold">WhatsApp Number</label>
                    <div className="h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg flex items-center text-xs font-mono text-emerald-400 font-bold">
                      +60 12-883 4921
                    </div>
                  </div>

                  {/* Hold Notice */}
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200">
                    🔒 Clicking continue secures a 7-minute reservation lock to prevent anyone else from taking this slot.
                  </div>
                </div>
              )}

              {/* ================= SCREEN 4: PAYMENT ================= */}
              {step.screen === "payment" && (
                <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-300 text-center">
                  {/* Timer Bar */}
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 flex items-center justify-between px-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[10px] font-bold">Temporary Hold</span>
                    </div>
                    <span className="font-mono font-black text-sm tracking-widest text-amber-300">
                      {holdTimer}
                    </span>
                  </div>

                  {/* Deposit Breakdown */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-[11px] space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">Deposit Due Now:</span>
                      <span className="text-emerald-400">RM 30.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Balance at salon:</span>
                      <span>RM 90.00</span>
                    </div>
                  </div>

                  {/* DuitNow QR Mockup */}
                  <div className="p-3 bg-white rounded-2xl inline-block shadow-lg">
                    <div className="w-28 h-28 border-2 border-dashed border-red-500/40 rounded-xl flex flex-col items-center justify-center bg-red-50 text-red-600 gap-1">
                      <QrCode className="w-14 h-14 text-pink-600" />
                      <span className="text-[9px] font-black uppercase text-pink-700">DuitNow QR</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Scan with any Bank app or Touch &apos;n Go eWallet
                  </p>
                </div>
              )}

              {/* ================= SCREEN 5: CONFIRMED ================= */}
              {step.screen === "confirmed" && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 text-center pt-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md border border-emerald-500/40">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h5 className="font-black text-white text-sm">Appointment Locked!</h5>
                    <p className="text-[10px] text-emerald-400 font-mono font-bold">
                      REF: BK-8942A
                    </p>
                  </div>

                  {/* WhatsApp Prompt */}
                  <div className="p-2.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-left text-[10px] text-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#25D366] font-bold">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Receipt Ready</span>
                    </div>
                    <p className="text-[9px] text-slate-300">
                      Tap below to open WhatsApp with pre-filled booking details to send your payment slip.
                    </p>
                  </div>

                  {/* Self-service tracking badge */}
                  <div className="text-[10px] text-slate-400">
                    Track anytime: <span className="text-emerald-400 font-bold">/check-booking</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Floating Action Button */}
            <div className="p-3 bg-slate-900 border-t border-slate-800">
              <button
                type="button"
                className={cn(
                  "w-full h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 text-white transition-all shadow-lg",
                  step.screen === "confirmed"
                    ? "bg-[#25D366] hover:bg-[#20bd5a]"
                    : "bg-emerald-600 hover:bg-emerald-500"
                )}
              >
                {step.screen === "services" && "Continue to Step 2"}
                {step.screen === "slots" && "Confirm 2:00 PM Slot"}
                {step.screen === "hold" && "Hold Slot & View Payment"}
                {step.screen === "payment" && "I Have Paid / Submit Receipt"}
                {step.screen === "confirmed" && "Open WhatsApp to Confirm"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info Bar */}
      <div className="relative z-10 mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Full production features: 7-min PostgreSQL hold, DuitNow QR, WhatsApp sync & VIP waiver</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span>Try Live Booking Funnel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
