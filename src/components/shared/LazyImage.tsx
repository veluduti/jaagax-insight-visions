import { memo, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  /** Aspect ratio class while loading to prevent layout shift. */
  wrapperClassName?: string;
  /** Whether to fade in once loaded (default true). */
  fadeIn?: boolean;
  /** Mark the image as above-the-fold to disable lazy loading. */
  eager?: boolean;
}

const DEFAULT_FALLBACK = "";

/**
 * Drop-in <img loading="lazy" decoding="async" /> replacement that:
 *  - lazy-loads via native loading="lazy"
 *  - decodes asynchronously off the main thread
 *  - fades in once loaded
 *  - falls back to a global Unsplash image on error
 *  - is memoized to avoid re-renders when parent state changes
 *
 * Usage: <LazyImage src={url} alt="..." className="w-full h-48 object-cover" />
 */
const LazyImageBase = ({
  src,
  alt,
  fallback = DEFAULT_FALLBACK,
  wrapperClassName,
  fadeIn = true,
  eager = false,
  className,
  onLoad,
  onError,
  ...rest
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(e);
  };
  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (!errored) setErrored(true);
    onError?.(e);
  };

  const finalSrc = errored ? fallback : src || fallback;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        fadeIn && "transition-opacity duration-300",
        fadeIn && !loaded && "opacity-0",
        fadeIn && loaded && "opacity-100",
        className,
      )}
      {...rest}
    />
  );
};

export const LazyImage = memo(LazyImageBase);
export default LazyImage;
