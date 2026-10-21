import { Skeleton } from "@/components/ui/skeleton";

export default function DeskLoading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-7 pb-12 animate-in fade-in duration-200">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          {/* Left Title & Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 sm:h-8 w-48 sm:w-64 rounded-xl" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36 sm:w-48 rounded-md" />
          </div>

          {/* Right Action Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-12 w-32 rounded-2xl" />
            <Skeleton className="h-12 w-20 rounded-2xl" />
            <Skeleton className="h-12 w-28 rounded-2xl" />
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-12 w-20 rounded-2xl" />
          </div>

          {/* Mobile Menu Icon */}
          <div className="flex md:hidden items-center">
            <Skeleton className="h-11 w-11 rounded-2xl" />
          </div>
        </div>

        {/* Top 3 Scoreboard Cards (Today's Sales, Yesterday's Sales, Monthly Sales) */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="border border-border/80 bg-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-xs"
            >
              {/* Card Header: Icon + Title & Right Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>

              {/* Card Body: Large Sales Amount Bar */}
              <div className="py-1">
                <Skeleton className="h-9 sm:h-10 w-full rounded-xl" />
              </div>

              {/* Card Footer: Sub-metrics */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Compact Scoreboard Pill Placeholder */}
        <div className="md:hidden">
          <div className="w-full p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-5 w-36 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>

        {/* Main Action Cards (Make Appointment & Count Sales) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[1, 2].map((card) => (
            <div
              key={card}
              className="h-40 sm:h-48 p-5 sm:p-6 rounded-2xl border-2 border-border/80 bg-card flex flex-col justify-between shadow-xs"
            >
              {/* Top Row: Square Icon on Left, Circle Button on Right */}
              <div className="flex items-start justify-between">
                <Skeleton className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl" />
                <Skeleton className="w-9 h-9 rounded-full" />
              </div>

              {/* Bottom Rows: Large Title + Subtitle */}
              <div className="space-y-2">
                <Skeleton className="h-7 sm:h-8 w-44 sm:w-56 rounded-lg" />
                <Skeleton className="h-3.5 sm:h-4 w-60 sm:w-80 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Today's Sales by Service Breakdown Card */}
        <div className="border-2 border-border/80 bg-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-6 w-48 sm:w-56 rounded-md" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>

          {/* Thin Divider Line */}
          <div className="border-b border-border/60" />

          {/* Centered Empty State Skeleton (Matching Image 2) */}
          <div className="py-8 sm:py-10 flex flex-col items-center justify-center space-y-2.5">
            <Skeleton className="h-4 w-44 sm:w-52 rounded-full" />
            <Skeleton className="h-3.5 w-64 sm:w-72 rounded-full" />
            <Skeleton className="h-3 w-48 sm:w-56 rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
}
