import { canonicalizeCity } from "./cityNormalizer";

export const RECOMMENDATION_GROUPS = ["Must-visit", "Popular destinations", "Local experiences", "Hidden gems"] as const;
export type RecommendationGroup = typeof RECOMMENDATION_GROUPS[number];
export interface PlaceRecommendation { name: string; reason: string; group: RecommendationGroup; source?: string }
export interface DestinationGuide { center: [number, number]; places: PlaceRecommendation[] }

const highlights = (must: string[], popular: string[]): PlaceRecommendation[] => [
  ...must.map(name => ({ name, reason: "A signature landmark of this destination.", group: "Must-visit" as const })),
  ...popular.map(name => ({ name, reason: "A popular outing while exploring this destination.", group: "Popular destinations" as const })),
];

export const DESTINATION_GUIDES: Record<string, DestinationGuide> = {
  hyderabad: { center: [17.385, 78.4867], places: highlights(["Charminar", "Golconda Fort", "Salar Jung Museum"], ["Hussain Sagar Lake", "Chowmahalla Palace"]) },
  visakhapatnam: { center: [17.6868, 83.2185], places: highlights(["RK Beach", "Kailasagiri", "INS Kursura Submarine Museum"], ["Rushikonda Beach", "Simhachalam Temple"]) },
  vijayawada: { center: [16.5062, 80.648], places: highlights(["Kanaka Durga Temple", "Prakasam Barrage"], ["Undavalli Caves", "Bhavani Island"]) },
  bengaluru: { center: [12.9716, 77.5946], places: highlights(["Lalbagh Botanical Garden", "Bangalore Palace"], ["Cubbon Park", "Tipu Sultan's Summer Palace"]) },
  chennai: { center: [13.0827, 80.2707], places: highlights(["Marina Beach", "Kapaleeshwarar Temple"], ["Fort St. George", "San Thome Basilica"]) },
  mumbai: { center: [19.076, 72.8777], places: highlights(["Gateway of India", "Chhatrapati Shivaji Maharaj Terminus"], ["Marine Drive", "Elephanta Caves"]) },
  delhi: { center: [28.6139, 77.209], places: highlights(["Red Fort", "Qutub Minar", "Humayun's Tomb"], ["India Gate", "Lotus Temple"]) },
  goa: { center: [15.4909, 73.8278], places: highlights(["Basilica of Bom Jesus", "Fort Aguada"], ["Baga Beach", "Palolem Beach"]) },
  tirupati: { center: [13.6288, 79.4192], places: highlights(["Tirumala Venkateswara Temple"], ["Chandragiri Fort", "Sri Kapileswara Swamy Temple"]) },
  warangal: { center: [17.9689, 79.5941], places: highlights(["Thousand Pillar Temple", "Warangal Fort"], ["Bhadrakali Temple"]) },
};

export function destinationKey(destination: string): string {
  const parts = destination.trim().split(/[,|]/).map(s => canonicalizeCity(s));
  return parts.find(part => DESTINATION_GUIDES[part]) ?? canonicalizeCity(destination);
}

export function uniqueDestinations(destinations: string[]): string[] {
  return Array.from(new Map(destinations.filter(d => typeof d === "string" && d.trim()).map(d => [destinationKey(d), d.trim()])).values());
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function eligibleRecommendationProperty(p: { verified?: boolean | null; is_live?: boolean | null; is_draft?: boolean | null; distance_km?: number | null }, radius: number): boolean {
  return p.verified === true && p.is_live === true && p.is_draft !== true
    && (p.distance_km == null || (Number.isFinite(Number(p.distance_km)) && Number(p.distance_km) >= 0 && Number(p.distance_km) <= radius));
}