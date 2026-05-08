import { type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface LazyMountProps {
  /** Rendered only after the placeholder scrolls into view. */
  children: ReactNode;
  /** Shown while waiting (e.g. <Skeleton />). Reserves layout space. */
  fallback?: ReactNode;
  /** Distance before viewport at which to mount. Default 200px. */
  rootMargin?: string;
  /** Optional min-height for the placeholder so the layout doesn't jump. */
  minHeight?: number | string;
  className?: string;
}

/**
 * Defers mounting non-critical dashboard widgets until they near the viewport.
 * Pair with React.lazy() for code-split widgets to avoid downloading their
 * JS bundle on initial paint.
 */
export const LazyMount = ({
  children,
  fallback = null,
  rootMargin = "200px",
  minHeight,
  className,
}: LazyMountProps) => {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin });
  return (
    <div ref={ref} className={className} style={minHeight ? { minHeight } : undefined}>
      {inView ? children : fallback}
    </div>
  );
};
