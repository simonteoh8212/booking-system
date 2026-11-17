import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMembersLoading() {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <Skeleton className="h-8 w-44 rounded-lg" />

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      <div className="p-3 rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <Skeleton className="sm:col-span-4 h-9 rounded-lg" />
        <Skeleton className="sm:col-span-4 h-9 rounded-lg" />
        <Skeleton className="sm:col-span-2 h-9 rounded-lg" />
        <Skeleton className="sm:col-span-2 h-9 rounded-lg" />
      </div>

      <div className="flex gap-2.5">
        <Skeleton className="flex-1 h-9 rounded-lg" />
        <Skeleton className="w-36 h-9 rounded-lg" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-1.5">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

