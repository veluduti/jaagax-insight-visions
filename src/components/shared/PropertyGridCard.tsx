import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Bed, Bath, Maximize, MapPin, Shield } from "lucide-react";
import type { PropertyRow } from "@/services/types";

export interface PropertyGridCardProps {
  property: PropertyRow;
  isFavorite?: boolean;
  showFavorite?: boolean;
  badge?: { label: string; tone?: "primary" | "muted" };
  ctaLabel?: string;
  /** Pre-rendered slot below the CTA (e.g. "Why this property" link). */
  footerSlot?: React.ReactNode;
  onOpen: (p: PropertyRow) => void;
  onToggleFavorite?: (id: string) => void;
}

/**
 * Shared memoized property card used by Featured / Partial / Fresh grids.
 * Pure function of props → wrapped in React.memo so list re-renders during
 * filtering / favorite toggles only update the affected cards.
 */
function PropertyGridCardImpl({
  property,
  isFavorite = false,
  showFavorite = true,
  badge,
  ctaLabel = "View Details",
  footerSlot,
  onOpen,
  onToggleFavorite,
}: PropertyGridCardProps) {
  const hasImage = Array.isArray(property.images) && property.images[0];

  return (
    <Card
      className="card-hover overflow-hidden group cursor-pointer relative"
      onClick={() => onOpen(property)}
    >
      {hasImage ? (
        <div className="relative h-48 overflow-hidden bg-muted">
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement?.classList.add("hidden");
            }}
          />
          {badge && (
            <Badge
              className={`absolute top-3 left-3 border-0 ${
                badge.tone === "primary"
                  ? "bg-primary/90 text-primary-foreground"
                  : "bg-background/85 backdrop-blur-sm text-foreground/80"
              }`}
            >
              {badge.tone === "primary" && <Shield className="h-3 w-3 mr-1" />}
              {badge.label}
            </Badge>
          )}
          {showFavorite && onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(property.id);
              }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite ? "fill-primary text-primary" : "text-foreground"
                }`}
              />
            </button>
          )}
        </div>
      ) : null}

      <div className="p-md">
        <div className="flex items-start justify-between mb-sm gap-sm">
          <h3 className="font-semibold text-lg line-clamp-1 flex-1">{property.title}</h3>
          {property.price ? (
            <span className="text-primary font-bold text-lg whitespace-nowrap">
              ₹{(property.price / 10000000).toFixed(2)} Cr
            </span>
          ) : (
            <span className="text-foreground/50 text-sm whitespace-nowrap">Price on request</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-foreground/70 text-sm mb-md">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">
            {property.locality || "—"}, {property.city || "—"}
          </span>
        </div>

        <div className="flex items-center gap-md text-sm text-foreground/70 mb-md">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{property.bhk || property.bedrooms || "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms || "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            <span>{property.area_sqft ? `${property.area_sqft} sqft` : "—"}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-primary/40 hover:bg-primary/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(property);
          }}
        >
          {ctaLabel}
        </Button>

        {footerSlot}
      </div>
    </Card>
  );
}

export const PropertyGridCard = memo(PropertyGridCardImpl);
