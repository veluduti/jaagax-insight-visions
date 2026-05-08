import { memo, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyMapWrapperProps {
  children: ReactNode;
  /** Approximate map height for the placeholder. */
  height?: string;
  className?: string;
  /** Distance before viewport at which to hydrate the map. */
  rootMargin?: string;
}

/**
 * Defers Mapbox initialization until the map container nears the viewport.
 * Mapbox is heavy (~1.2MB JS + WebGL context) — keeping it off the critical
 * path dramatically improves first-paint on dashboards/detail pages.
 *
 * Wrap any map component:
 *   <LazyMapWrapper height="400px"><PropertyMap .../></LazyMapWrapper>
 */
const LazyMapWrapperBase = ({
  children,
  height = "400px",
  className,
  rootMargin = "300px",
}: LazyMapWrapperProps) => {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin });
  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      {inView ? children : <Skeleton className="w-full rounded-xl" style={{ height }} />}
    </div>
  );
};

export const LazyMapWrapper = memo(LazyMapWrapperBase);
export default LazyMapWrapper;
