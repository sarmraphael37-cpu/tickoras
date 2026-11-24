import { SiteHeader } from "@/components/site-header";
import { Skeleton, EventCardSkeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-cream">
          <div className="container-page py-12">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-6 h-12 w-2/3 max-w-xl" />
            <Skeleton className="mt-3 h-4 w-80" />
          </div>
        </section>
        <section className="container-page py-10">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
