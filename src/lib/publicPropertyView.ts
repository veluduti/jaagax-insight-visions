/**
 * Public listing rule:
 *   Agent/Builder edit -> agent_data -> admin approves -> final_data -> UI
 *
 * Frontend public surfaces MUST render from `final_data` only.
 * Top-level columns (title, city, price, images, etc.) are kept as a
 * **last-resort fallback** so legacy approved rows that pre-date the
 * final_data pipeline still display — but anything you can read from
 * `final_data` wins.
 *
 * Never read `agent_data` or `seller_data` here — those are draft buckets.
 */

type AnyObj = Record<string, any>;

const pick = (obj: AnyObj | null | undefined, keys: string[]): any => {
  if (!obj) return undefined;
  for (const k of keys) {
    // dot-path support: "basic_information.title"
    const parts = k.split(".");
    let cur: any = obj;
    for (const p of parts) {
      if (cur == null) { cur = undefined; break; }
      cur = cur[p];
    }
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return undefined;
};

export interface PublicPropertyView {
  id: string;
  title: string;
  description?: string;
  city?: string;
  locality?: string;
  address?: string;
  price?: number;
  area_sqft?: number;
  bhk?: number;
  bedrooms?: number;
  bathrooms?: number;
  type?: string;
  listing_type?: string;
  furnishing?: string;
  images: string[];
  video_urls: string[];
  amenities: string[];
  latitude?: number;
  longitude?: number;
  rera_id?: string;
  trust_score?: number;
  verified?: boolean;
  is_live?: boolean;
  is_featured?: boolean;
  expiry_date?: string | null;
  // Pass-through everything else for components that still need raw row
  _raw: AnyObj;
}

/**
 * Convert a `properties` row into a public-facing view that reads from
 * `final_data` first, falling back to legacy top-level columns when the
 * approval pipeline hasn't yet populated `final_data`.
 */
export function getPublicPropertyView(row: AnyObj | null | undefined): PublicPropertyView | null {
  if (!row || !row.id) return null;
  const fd: AnyObj = row.final_data ?? {};

  // final_data may be flat OR namespaced (basic_information / location / pricing / media...).
  // The agent edit form uses dot paths like "basic_information.title", "location.city",
  // "pricing.price", "media.images". Try both shapes.

  return {
    id: row.id,
    title: pick(fd, ["title", "basic_information.title"]) ?? row.title ?? "Untitled",
    description: pick(fd, ["description", "basic_information.description"]) ?? row.description,
    city: pick(fd, ["city", "location.city"]) ?? row.city,
    locality: pick(fd, ["locality", "location.locality"]) ?? row.locality,
    address: pick(fd, ["address", "location.address"]) ?? row.address,
    price: pick(fd, ["price", "pricing.price"]) ?? row.price,
    area_sqft: pick(fd, ["area_sqft", "basic_information.area_sqft"]) ?? row.area_sqft,
    bhk: pick(fd, ["bhk", "basic_information.bhk"]) ?? row.bhk,
    bedrooms: pick(fd, ["bedrooms", "basic_information.bedrooms"]) ?? row.bedrooms,
    bathrooms: pick(fd, ["bathrooms", "basic_information.bathrooms"]) ?? row.bathrooms,
    type: pick(fd, ["type", "basic_information.type"]) ?? row.type,
    listing_type: pick(fd, ["listing_type", "basic_information.listing_type"]) ?? row.listing_type,
    furnishing: pick(fd, ["furnishing", "basic_information.furnishing"]) ?? row.furnishing,
    images: pick(fd, ["images", "media.images"]) ?? row.images ?? [],
    video_urls: pick(fd, ["video_urls", "media.video_urls"]) ?? row.video_urls ?? [],
    amenities: pick(fd, ["amenities"]) ?? row.amenities ?? [],
    latitude: pick(fd, ["latitude", "location.latitude"]) ?? row.latitude,
    longitude: pick(fd, ["longitude", "location.longitude"]) ?? row.longitude,
    rera_id: pick(fd, ["rera_id"]) ?? row.rera_id,
    trust_score: row.trust_score,
    verified: row.verified,
    is_live: row.is_live,
    is_featured: row.is_featured,
    expiry_date: row.expiry_date,
    _raw: row,
  };
}
