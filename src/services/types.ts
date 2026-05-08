// Shared DTOs for the service layer.
// Kept intentionally permissive (lots of nullable fields) to mirror current DB rows.

export interface PropertyRow {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  city: string | null;
  locality: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  bhk: number | null;
  type?: string | null;
  listing_type?: string | null;
  images: any;
  amenities?: any;
  verified: boolean | null;
  trust_score: number | null;
  is_draft?: boolean | null;
  is_live?: boolean | null;
  verification_status?: string | null;
  [key: string]: any;
}

export type PropertyTier = "featured" | "basic" | "fresh" | "partial";
