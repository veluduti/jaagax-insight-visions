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
    { text: "18 people viewing now", color: "green" },
    { text: "32 units sold this month", color: "green" },
    { text: "Only 12 units left", color: "amber" },
    { text: "Prices increasing in 15 days", color: "red" },
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

  floorPlans: {
    "2BHK": [
      { name: "Type A Compact", size: "1,250 Sft", facing: "East", carpetArea: "925 Sft", beds: 2, baths: 2, balconies: 1, image: fp2a },
      { name: "Type B Standard", size: "1,320 Sft", facing: "West", carpetArea: "980 Sft", beds: 2, baths: 2, balconies: 2, image: fp2b },
      { name: "Type C Premium", size: "1,380 Sft", facing: "North", carpetArea: "1,020 Sft", beds: 2, baths: 2, balconies: 2, image: fp2c },
      { name: "Type C1 Premium+", size: "1,420 Sft", facing: "North-East", carpetArea: "1,050 Sft", beds: 2, baths: 2, balconies: 2, image: fp2d },
    ] as FloorPlan[],
    "3BHK": [
      { name: "Type D Classic", size: "1,850 Sft", facing: "East", carpetArea: "1,370 Sft", beds: 3, baths: 3, balconies: 2, image: fp3a },
      { name: "Type E Grand", size: "1,950 Sft", facing: "South", carpetArea: "1,445 Sft", beds: 3, baths: 3, balconies: 2, image: fp3b },
      { name: "Type F Royal", size: "2,100 Sft", facing: "North-East", carpetArea: "1,555 Sft", beds: 3, baths: 3, balconies: 3, image: fp3c },
      { name: "Type F1 Imperial", size: "2,200 Sft", facing: "South-East", carpetArea: "1,630 Sft", beds: 3, baths: 4, balconies: 3, image: fp3d },
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
