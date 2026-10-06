import goaImage from "@/assets/travel/goa.jpg";
import jaipurImage from "@/assets/travel/jaipur.jpg";
import hyderabadImage from "@/assets/travel/hyderabad.jpg";
import coorgImage from "@/assets/travel/coorg.jpg";

export type TravelDestination = {
  slug: string; name: string; state: string; tagline: string; image: string;
  tags: string[]; bestTime: string; days: string; areas: string[]; fit: number;
};

export type TravelExperience = {
  slug: string; title: string; destination: string; city: string; category: string;
  duration: string; bestTime: string; bestFor: string[]; description: string; image: string; fit: number;
};

export const destinations: TravelDestination[] = [
  { slug: "goa", name: "Goa", state: "Goa", tagline: "Find the quieter side of the coast.", image: goaImage, tags: ["Beach", "Food", "Slow Travel", "Nightlife"], bestTime: "November – February", days: "3–5 days", areas: ["Assagao", "Fontainhas", "Palolem", "Mandrem"], fit: 94 },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan", tagline: "Living heritage, craft and colour.", image: jaipurImage, tags: ["Heritage", "Culture", "Luxury", "Photography"], bestTime: "October – March", days: "2–4 days", areas: ["Amer", "C-Scheme", "Bani Park", "Old City"], fit: 89 },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", tagline: "Explore the city through flavour and history.", image: hyderabadImage, tags: ["Food", "Heritage", "Business", "Culture"], bestTime: "October – February", days: "2–4 days", areas: ["Old City", "Banjara Hills", "Jubilee Hills", "Madhapur"], fit: 96 },
  { slug: "coorg", name: "Coorg", state: "Karnataka", tagline: "Slow mornings among coffee and mist.", image: coorgImage, tags: ["Nature", "Wellness", "Family", "Photography"], bestTime: "October – May", days: "2–3 days", areas: ["Madikeri", "Siddapura", "Virajpet", "Kushalnagar"], fit: 92 },
];

export const experiences: TravelExperience[] = [
  { slug: "old-city-food-walk", title: "Old City food after dusk", destination: "hyderabad", city: "Hyderabad", category: "Food", duration: "3 hours", bestTime: "Evening", bestFor: ["Food lovers", "Friends", "Culture"], description: "Follow a locally curated trail through time-tested kitchens and stories around the Old City.", image: hyderabadImage, fit: 97 },
  { slug: "fontainhas-morning", title: "A slow morning in Fontainhas", destination: "goa", city: "Goa", category: "Culture", duration: "2 hours", bestTime: "Morning", bestFor: ["Couples", "Photography", "Slow travel"], description: "Walk Goa’s Latin quarter before the streets get busy, with cafés and local architecture along the way.", image: goaImage, fit: 93 },
  { slug: "amer-craft-trail", title: "Amer heritage and craft trail", destination: "jaipur", city: "Jaipur", category: "Heritage", duration: "Half day", bestTime: "Morning", bestFor: ["Families", "Culture", "Photography"], description: "Pair the fort with nearby workshops for a richer view of Jaipur’s living craft traditions.", image: jaipurImage, fit: 90 },
  { slug: "coffee-estate-walk", title: "Coffee estate walk in the mist", destination: "coorg", city: "Coorg", category: "Nature", duration: "2.5 hours", bestTime: "Morning", bestFor: ["Families", "Nature", "Wellness"], description: "A gentle guided walk through coffee, pepper and forest edges with time to slow down.", image: coorgImage, fit: 95 },
];

export const interests = ["Beach", "Nature", "Mountains", "Heritage", "Culture", "Food", "Adventure", "Wellness", "Spiritual", "Romantic", "Family", "Photography", "Hidden Gems", "Slow Travel", "Property Discovery"];
export const moods = ["Relaxed", "Peaceful", "Adventurous", "Romantic", "Social", "Cultural", "Spiritual", "Productive", "Family-friendly", "Budget-friendly", "Offbeat", "Active"];

export const getDestination = (slug?: string) => destinations.find((item) => item.slug === slug);
export const getExperience = (slug?: string) => experiences.find((item) => item.slug === slug);
