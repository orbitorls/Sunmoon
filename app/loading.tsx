import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" aria-busy="true" aria-label="กำลังโหลดหน้านี้">
      <div className="border-b border-slate-200 bg-white">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}
