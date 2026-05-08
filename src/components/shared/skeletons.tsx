import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Single stat tile placeholder. */
export const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

/** Row of summary stats. */
export const StatsGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

/** Property / project / hotel card grid placeholder. */
export const CardGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full mt-2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/** List row placeholder (visits, bookings, notifications…). */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Chart/analytics block placeholder. */
export const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton style={{ height }} className="w-full" />
    </CardContent>
  </Card>
);

/** AI section placeholder — used while AI/recommendation calls resolve. */
export const AISectionSkeleton = ({ height = 180 }: { height?: number }) => (
  <section className="py-8 px-4">
    <div className="container mx-auto space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height }} className="w-full rounded-lg" />
        ))}
      </div>
    </div>
  </section>
);
