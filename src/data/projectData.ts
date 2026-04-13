import heroImg from "@/assets/prestige-hero.jpg";
import masterPlanImg from "@/assets/prestige-masterplan.jpg";
import fp2a from "@/assets/fp-2bhk-a.jpg";
import fp2b from "@/assets/fp-2bhk-b.jpg";
import fp2c from "@/assets/fp-2bhk-c.jpg";
import fp2d from "@/assets/fp-2bhk-d.jpg";
import fp3a from "@/assets/fp-3bhk-a.jpg";
import fp3b from "@/assets/fp-3bhk-b.jpg";
import fp3c from "@/assets/fp-3bhk-c.jpg";
import fp3d from "@/assets/fp-3bhk-d.jpg";
import amenPool from "@/assets/amen-pool.jpg";
import amenClub from "@/assets/amen-clubhouse.jpg";
import amenGym from "@/assets/amen-gym.jpg";
import amenGarden from "@/assets/amen-garden.jpg";
import galTower from "@/assets/gal-tower.jpg";
import galLobby from "@/assets/gal-lobby.jpg";
import galLiving from "@/assets/gal-living.jpg";
import galKitchen from "@/assets/gal-kitchen.jpg";
import galBedroom from "@/assets/gal-bedroom.jpg";
import galKids from "@/assets/gal-kids.jpg";

export interface FloorPlan {
  name: string;
  size: string;
  facing: string;
  carpetArea: string;
  beds: number;
  baths: number;
  balconies: number;
  image: string;
  priceRange: string;
  highlights: string[];
}

export const projectData = {
  name: "Prestige Homes",
  tagline: "Where Luxury Meets Serenity",
  subtitle: "Experience unparalleled luxury living with panoramic views, world-class amenities, and bespoke architecture",
  location: "Narsingi, Hyderabad",
  heroImage: heroImg,
  masterPlanImage: masterPlanImg,
  brochureUrl: "/prestige-homes-brochure.pdf",

  liveStats: [
    { text: "18 people viewing now", color: "green", icon: "eye" },
    { text: "32 units sold this month", color: "green", icon: "trending" },
    { text: "Only 12 units left", color: "amber", icon: "alert" },
    { text: "Prices increasing in 15 days", color: "red", icon: "clock" },
  ],

  about: {
    description: "Prestige Homes is a landmark residential development in the heart of Narsingi, Hyderabad. Spanning 5.5 acres of lush greenery, it offers meticulously designed 2 & 3 BHK residences with premium finishes, smart home automation, and world-class amenities for families seeking elevated living.",
    features: [
      "Premium layouts",
      "5.5 acres campus",
      "Private gardens",
      "Smart home automation",
      "Covered parking",
      "24/7 security",
    ],
    highlights: [
      { label: "Configuration", value: "2 & 3 BHK" },
      { label: "Size Range", value: "1,250–2,200 Sft" },
      { label: "Land Area", value: "5.5 Acres" },
      { label: "Total Units", value: "480" },
      { label: "Floors", value: "G+25" },
    ],
  },

  amenities: {
    icons: [
      { name: "Swimming Pool", icon: "Waves" },
      { name: "Gymnasium", icon: "Dumbbell" },
      { name: "Clubhouse", icon: "Building2" },
      { name: "Gardens", icon: "TreePine" },
      { name: "Kids Play Area", icon: "Baby" },
      { name: "Parking", icon: "Car" },
      { name: "Security", icon: "Shield" },
      { name: "Power Backup", icon: "Zap" },
      { name: "Indoor Games", icon: "Gamepad2" },
      { name: "Community Hall", icon: "Users" },
      { name: "Jogging Track", icon: "Footprints" },
      { name: "Meditation Zone", icon: "Sparkles" },
    ],
    images: [
      { src: amenPool, label: "Infinity Pool", desc: "Temperature-controlled infinity pool with sun deck" },
      { src: amenClub, label: "Grand Clubhouse", desc: "20,000 Sft clubhouse with lounge and banquet" },
      { src: amenGym, label: "Premium Gymnasium", desc: "State-of-the-art fitness center with trainer" },
      { src: amenGarden, label: "Landscaped Gardens", desc: "Curated green spaces for tranquil living" },
    ],
  },

  // Floor plans organized by facing with 2-3 variants each
  floorPlansByFacing: {
    "East": [
      { name: "Type A Compact 2BHK", size: "1,250 Sft", facing: "East", carpetArea: "925 Sft", beds: 2, baths: 2, balconies: 1, image: fp2a, priceRange: "₹80L–1Cr", highlights: ["Morning sunlight", "Vastu compliant", "Cross ventilation"] },
      { name: "Type D Classic 3BHK", size: "1,850 Sft", facing: "East", carpetArea: "1,370 Sft", beds: 3, baths: 3, balconies: 2, image: fp3a, priceRange: "₹1.5Cr–2Cr", highlights: ["Sunrise view", "Spacious balcony", "Premium finishes"] },
      { name: "Type A1 Premium 2BHK", size: "1,300 Sft", facing: "East", carpetArea: "960 Sft", beds: 2, baths: 2, balconies: 2, image: fp2b, priceRange: "₹90L–1.1Cr", highlights: ["Corner unit", "Extra storage", "Garden view"] },
    ] as FloorPlan[],
    "West": [
      { name: "Type B Standard 2BHK", size: "1,320 Sft", facing: "West", carpetArea: "980 Sft", beds: 2, baths: 2, balconies: 2, image: fp2b, priceRange: "₹85L–1.05Cr", highlights: ["Sunset view", "Double balcony", "Open kitchen"] },
      { name: "Type E Grand 3BHK", size: "1,950 Sft", facing: "West", carpetArea: "1,445 Sft", beds: 3, baths: 3, balconies: 2, image: fp3b, priceRange: "₹1.5Cr–1.8Cr", highlights: ["Evening breeze", "Master suite", "Walk-in closet"] },
    ] as FloorPlan[],
    "North": [
      { name: "Type C Premium 2BHK", size: "1,380 Sft", facing: "North", carpetArea: "1,020 Sft", beds: 2, baths: 2, balconies: 2, image: fp2c, priceRange: "₹1Cr–1.2Cr", highlights: ["Cool breeze", "No direct sun", "Energy efficient"] },
      { name: "Type C2 Deluxe 2BHK", size: "1,400 Sft", facing: "North", carpetArea: "1,040 Sft", beds: 2, baths: 2, balconies: 2, image: fp2d, priceRange: "₹1.05Cr–1.25Cr", highlights: ["Pool facing", "Utility room", "Smart home ready"] },
      { name: "Type F Royal 3BHK", size: "2,100 Sft", facing: "North", carpetArea: "1,555 Sft", beds: 3, baths: 3, balconies: 3, image: fp3c, priceRange: "₹1.8Cr–2.2Cr", highlights: ["Panoramic view", "Servant quarter", "Italian marble"] },
    ] as FloorPlan[],
    "North-East": [
      { name: "Type C1 Premium+ 2BHK", size: "1,420 Sft", facing: "North-East", carpetArea: "1,050 Sft", beds: 2, baths: 2, balconies: 2, image: fp2d, priceRange: "₹1.1Cr–1.3Cr", highlights: ["Vastu perfect", "Morning light", "Park facing"] },
      { name: "Type F1 Imperial 3BHK", size: "2,200 Sft", facing: "North-East", carpetArea: "1,630 Sft", beds: 3, baths: 4, balconies: 3, image: fp3d, priceRange: "₹2Cr–2.5Cr", highlights: ["Premium corner", "4 bathrooms", "Sky lounge access"] },
    ] as FloorPlan[],
    "South": [
      { name: "Type B1 Comfort 2BHK", size: "1,280 Sft", facing: "South", carpetArea: "950 Sft", beds: 2, baths: 2, balconies: 1, image: fp2a, priceRange: "₹80L–95L", highlights: ["Budget friendly", "Natural light", "Compact design"] },
      { name: "Type E1 Grand+ 3BHK", size: "2,000 Sft", facing: "South", carpetArea: "1,480 Sft", beds: 3, baths: 3, balconies: 2, image: fp3b, priceRange: "₹1.6Cr–1.9Cr", highlights: ["City view", "Large living room", "Modular kitchen"] },
    ] as FloorPlan[],
    "South-East": [
      { name: "Type B2 Smart 2BHK", size: "1,350 Sft", facing: "South-East", carpetArea: "1,000 Sft", beds: 2, baths: 2, balconies: 2, image: fp2c, priceRange: "₹95L–1.15Cr", highlights: ["Balanced light", "Tech-ready", "Ventilated"] },
      { name: "Type F2 Signature 3BHK", size: "2,150 Sft", facing: "South-East", carpetArea: "1,590 Sft", beds: 3, baths: 4, balconies: 3, image: fp3d, priceRange: "₹2Cr–2.4Cr", highlights: ["Flagship unit", "Terrace garden", "Designer interiors"] },
    ] as FloorPlan[],
  },

  // Keep legacy flat structure for floor plan tabs
  floorPlans: {
    "2BHK": [
      { name: "Type A Compact", size: "1,250 Sft", facing: "East", carpetArea: "925 Sft", beds: 2, baths: 2, balconies: 1, image: fp2a, priceRange: "₹80L–1Cr", highlights: [] },
      { name: "Type B Standard", size: "1,320 Sft", facing: "West", carpetArea: "980 Sft", beds: 2, baths: 2, balconies: 2, image: fp2b, priceRange: "₹85L–1.05Cr", highlights: [] },
      { name: "Type C Premium", size: "1,380 Sft", facing: "North", carpetArea: "1,020 Sft", beds: 2, baths: 2, balconies: 2, image: fp2c, priceRange: "₹1Cr–1.2Cr", highlights: [] },
      { name: "Type C1 Premium+", size: "1,420 Sft", facing: "North-East", carpetArea: "1,050 Sft", beds: 2, baths: 2, balconies: 2, image: fp2d, priceRange: "₹1.1Cr–1.3Cr", highlights: [] },
    ] as FloorPlan[],
    "3BHK": [
      { name: "Type D Classic", size: "1,850 Sft", facing: "East", carpetArea: "1,370 Sft", beds: 3, baths: 3, balconies: 2, image: fp3a, priceRange: "₹1.5Cr–2Cr", highlights: [] },
      { name: "Type E Grand", size: "1,950 Sft", facing: "South", carpetArea: "1,445 Sft", beds: 3, baths: 3, balconies: 2, image: fp3b, priceRange: "₹1.5Cr–1.8Cr", highlights: [] },
      { name: "Type F Royal", size: "2,100 Sft", facing: "North-East", carpetArea: "1,555 Sft", beds: 3, baths: 3, balconies: 3, image: fp3c, priceRange: "₹1.8Cr–2.2Cr", highlights: [] },
      { name: "Type F1 Imperial", size: "2,200 Sft", facing: "South-East", carpetArea: "1,630 Sft", beds: 3, baths: 4, balconies: 3, image: fp3d, priceRange: "₹2Cr–2.5Cr", highlights: [] },
    ] as FloorPlan[],
  },

  gallery: [
    { src: galTower, label: "Tower Elevation" },
    { src: galLobby, label: "Grand Lobby" },
    { src: galLiving, label: "Living Room" },
    { src: galKitchen, label: "Modular Kitchen" },
    { src: galBedroom, label: "Master Bedroom" },
    { src: galKids, label: "Kids Play Area" },
  ],

  map: {
    lat: 17.3885,
    lng: 78.3365,
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15232.0!2d78.3365!3d17.3885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb956f0a0b1c31%3A0x4b1d3a3f3a3a3a3a!2sNarsingi%2C%20Hyderabad!5e0!3m2!1sen!2sin!4v1700000000000",
    mapsUrl: "https://www.google.com/maps/place/Narsingi,+Hyderabad,+Telangana/@17.3885,78.3365,15z",
    address: "Survey No. 42, Narsingi, Hyderabad, Telangana 500075",
  },

  trust: [
    { label: "Total Units", value: "480" },
    { label: "Towers", value: "4" },
    { label: "Floors", value: "G+25" },
    { label: "RERA No", value: "P02400005678" },
    { label: "Experience", value: "25+ Years" },
  ],

  timeline: [
    { year: "1998", title: "Founded", desc: "Prestige Group established with a vision for quality living" },
    { year: "2005", title: "First Landmark", desc: "Delivered first landmark project with 500+ happy families" },
    { year: "2015", title: "City-Wide Presence", desc: "Expanded to 15+ projects across Hyderabad" },
    { year: "2024", title: "Prestige Homes Launch", desc: "Launched our flagship premium residences in Narsingi" },
  ],

  contact: {
    phone: "+91 9876543210",
    whatsapp: "+91 9876543210",
    whatsappMessage: "Hi, I'm interested in Prestige Homes. Please share more details.",
    address: "Survey No. 42, Narsingi, Hyderabad, Telangana 500075",
  },

  aiBudgetRanges: ["₹80L–1Cr", "₹1Cr–1.5Cr", "₹1.5Cr–2Cr", "₹2Cr+"],
  aiFacings: ["East", "West", "North", "North-East", "South", "South-East"],
};
