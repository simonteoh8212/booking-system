import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Sales KPI Cards Skeleton (Today, Yesterday, Monthly) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((card) => (
          <div
            key={card}
            className="border border-border/80 bg-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            <div className="py-1">
              <Skeleton className="h-9 sm:h-10 w-44 rounded-xl" />
            </div>

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

      {/* Appointment Agenda Header & View Skeleton */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 sm:w-64 rounded-md" />
          <Skeleton className="h-3.5 w-40 sm:w-56 rounded-md" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-52 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>

        {/* Agenda Appointments / Calendar Card Skeleton */}
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b flex justify-between items-center">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>

          <div className="grid grid-cols-7 border-b bg-muted/40 py-2.5 px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-12 mx-auto" />
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y border-b">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[75px] sm:min-h-[96px] p-2 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-4 rounded" />
                  {i % 5 === 0 && <Skeleton className="w-5 h-5 rounded-full" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
