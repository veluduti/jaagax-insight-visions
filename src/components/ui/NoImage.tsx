import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoImageProps {
  className?: string;
  label?: string;
}

/**
 * Placeholder shown when a property/project has no uploaded image.
 * Per product rule: NEVER substitute a stock/Unsplash photo for missing media.
 */
export const NoImage = ({ className, label = "No image uploaded" }: NoImageProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center w-full h-full bg-muted text-muted-foreground gap-1 p-2",
      className
    )}
  >
    <ImageOff className="h-6 w-6 opacity-60" />
    <span className="text-[11px] text-center leading-tight">{label}</span>
  </div>
);

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  wrapperClassName?: string;
  placeholderLabel?: string;
}

/**
 * Drop-in <img loading="lazy" decoding="async" /> replacement: if `src` is empty/null OR fails to load,
 * shows the NoImage placeholder instead of any default photo.
 */
export const SafeImage = ({ src, alt, className, wrapperClassName, placeholderLabel, ...rest }: SafeImageProps) => {
  const hasSrc = typeof src === "string" && src.trim().length > 0;
  if (!hasSrc) {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <NoImage className={className} label={placeholderLabel} />
      </div>
    );
  }
  return (
    <img
      {...rest}
      src={src as string}
      alt={alt}
      className={className}
      onError={(e) = loading="lazy" decoding="async" /> {
        const target = e.currentTarget;
        const parent = target.parentElement;
        if (parent) {
          target.style.display = "none";
          // Avoid duplicating the placeholder on repeated errors
          if (!parent.querySelector("[data-no-image]")) {
            const ph = document.createElement("div");
            ph.setAttribute("data-no-image", "true");
            ph.className = "absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground text-[11px] gap-1";
            ph.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-60"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg><span>${placeholderLabel ?? "No image uploaded"}</span>`;
          }
        }
      }}
    />
  );
};

export default NoImage;
