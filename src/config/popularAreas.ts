/**
 * Well-known areas per city, used only to seed hotel-search autocomplete so
 * users can pick an area even before partner hotels list there. Real hotel
 * localities from the database are always merged in and ranked first.
 */
export const POPULAR_AREAS: Record<string, string[]> = {
  Hyderabad: ["HITEC City", "Gachibowli", "Madhapur", "Banjara Hills", "Jubilee Hills", "Secunderabad", "Begumpet", "Kondapur", "Kukatpally", "Ameerpet", "Shamshabad", "Charminar"],
  Bangalore: ["Koramangala", "Indiranagar", "Whitefield", "MG Road", "Electronic City", "HSR Layout", "Marathahalli", "Hebbal"],
  Mumbai: ["Andheri", "Bandra", "Juhu", "Colaba", "Powai", "Lower Parel", "BKC"],
  Chennai: ["T Nagar", "Anna Nagar", "Adyar", "Guindy", "OMR", "Nungambakkam"],
  Delhi: ["Connaught Place", "Karol Bagh", "Paharganj", "Aerocity", "Saket", "Hauz Khas"],
  Pune: ["Hinjewadi", "Koregaon Park", "Viman Nagar", "Kharadi", "Baner", "Shivaji Nagar"],
  Vijayawada: ["Benz Circle", "MG Road", "Governorpet", "Labbipet", "Gunadala"],
  Visakhapatnam: ["Beach Road", "RK Beach", "Dwaraka Nagar", "MVP Colony", "Rushikonda", "Siripuram"],
  Goa: ["Calangute", "Baga", "Panaji", "Candolim", "Anjuna", "Colva"],
};
