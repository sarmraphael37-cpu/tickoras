import { EventCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function AttendeeLoading() {
  return (
    <div className="space-y-7">
      <div className="border-b border-line pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
