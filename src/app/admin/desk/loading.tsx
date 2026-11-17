import { Skeleton } from "@/components/ui/skeleton";

export default function DeskLoading() {
  return (
    <div className="space-y-5 pb-12 max-w-4xl mx-auto animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      <div className="hidden md:grid rounded-xl border border-border bg-card grid-cols-3 divide-x divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 space-y-2.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-36 sm:h-40 p-6 rounded-xl border border-border bg-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-11 h-11 rounded-lg" />
              <Skeleton className="w-5 h-5 rounded" />
            </div>
            <Skeleton className="h-7 w-40 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
