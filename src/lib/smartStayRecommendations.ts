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

const LOCAL_PICKS: Record<string, [string, string, string, string, string, string]> = {
  hyderabad: ["Laad Bazaar bangle browsing", "Traditional lac bangles and old-city market culture beside Charminar.", "https://www.incredibleindia.gov.in/en/telangana/hyderabad/the-best-places-to-shop-in-hyderabad-for-every-budget", "Paigah Tombs", "Intricate marble latticework and distinctive historic architecture.", "https://www.incredibleindia.gov.in/en/telangana/hyderabad/paigah-tombs"],
  visakhapatnam: ["Rushikonda beach stroll", "Golden sands and coastal scenery along Vizag's shoreline.", "https://www.incredibleindia.gov.in/en/andhra-pradesh/visakhapatnam/discovering-the-unspoiled-beauty-of-visakhapatnam", "Bavikonda Buddhist Complex", "Hilltop monastery remains, stupas and historic rainwater wells outside Vizag.", "https://www.incredibleindia.gov.in/en/andhra-pradesh/visakhapatnam/bavikonda-buddhist-complex"],
  vijayawada: ["Bhavani Island boat outing", "Krishna River views and an island walk; check boat operations before visiting.", "https://www.incredibleindia.gov.in/en/andhra-pradesh/machilipatnam/bhavani-island", "Undavalli Caves", "Rock-cut architecture and a monumental reclining Vishnu sculpture near Vijayawada.", "https://www.incredibleindia.gov.in/en/andhra-pradesh/guntur/undavalli-caves"],
  bengaluru: ["KR Market browsing", "A lively introduction to Bengaluru's wholesale market culture.", "https://karnatakatourism.org/en/destinations/bengaluru", "Kundana Betta", "A hill-fort excursion near Devanahalli, outside central Bengaluru.", "https://www.incredibleindia.gov.in/en/karnataka/bengaluru/the-garden-city"],
  chennai: ["Mylapore temple walk", "Living neighbourhood heritage around Kapaleeshwarar Temple.", "https://www.incredibleindia.gov.in/en/trips/trip-listing/chennai-chronicles", "DakshinaChitra Heritage Museum", "Traditional South Indian houses, crafts and architecture in Muttukadu, outside Chennai.", "https://www.incredibleindia.gov.in/en/tamil-nadu/chennai/dakshinachitra-museum"],
  mumbai: ["Mumbai street-food tasting", "Discover everyday food culture through vada pav and pav bhaji.", "https://www.incredibleindia.gov.in/en/trips/trip-listing/mumbai-cultural-safari", "Kanheri Caves", "Buddhist rock-cut halls and sculptures in Sanjay Gandhi National Park.", "https://www.incredibleindia.gov.in/en/maharashtra/mumbai/kanheri-caves"],
  delhi: ["Chandni Chowk bazaar walk", "Explore Old Delhi's historic trading lanes and market culture.", "https://www.incredibleindia.gov.in/en/delhi/delhi/chandni-chowk", "Mehrauli Archaeological Park", "Layered historic monuments including Balban's Tomb and Jamali Kamali Mosque.", "https://www.incredibleindia.gov.in/en/delhi/delhi/mehrauli-archaeological-park"],
  goa: ["Fontainhas neighbourhood walk", "Colourful houses, narrow lanes and galleries in Panaji.", "https://goa-tourism.com/popular-destination/experience-fontainhas/", "Arvalem Caves", "An early rock-cut cave complex with historic inscriptions.", "https://www.goa.gov.in/places/arvalem-caves/"],
  tirupati: ["Shilparamam craft browsing", "Discover traditional pottery, textiles and artisan woodwork.", "https://tourism.ap.gov.in/assets/img/Brochures/Tirupati%20Places.pdf", "Chandragiri Fort", "A former Vijayanagara capital and historic palaces near Tirupati.", "https://tourism.ap.gov.in/assets/img/Brochures/Tirupati%20Places.pdf"],
  warangal: ["Bhadrakali Temple visit", "Experience a living devotional landmark between Warangal and Hanumakonda.", "https://hanumakonda.telangana.gov.in/places-of-interest/", "Padmakshi Temple", "A hilltop shrine and distinctive four-faced granite pillar in Hanumakonda.", "https://tourism.telangana.gov.in/attractions/padmakshi-temple"],
};

for (const [key, [local, localReason, localSource, hidden, hiddenReason, hiddenSource]] of Object.entries(LOCAL_PICKS)) {
  const guide = DESTINATION_GUIDES[key];
  if (!guide) continue;
  guide.places = guide.places.filter(p => p.name !== hidden);
  guide.places.push(
    { name: local, reason: localReason, source: localSource, group: "Local experiences" },
    { name: hidden, reason: hiddenReason, source: hiddenSource, group: "Hidden gems" },
  );
}

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