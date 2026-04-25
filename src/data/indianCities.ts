// Curated list of major Indian cities for autocomplete search.
// Ordered with most-popular cities first so they surface as defaults.
export const POPULAR_CITIES = [
  "Hyderabad",
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
];

export const INDIAN_CITIES: string[] = [
  // Tier 1
  "Hyderabad", "Bangalore", "Mumbai", "Delhi", "Pune", "Chennai", "Kolkata", "Ahmedabad",
  "Gurgaon", "Noida", "Greater Noida", "Faridabad", "Ghaziabad",
  // Tier 2
  "Vijayawada", "Visakhapatnam", "Guntur", "Tirupati", "Nellore", "Rajahmundry", "Kakinada",
  "Warangal", "Karimnagar", "Nizamabad",
  "Mysore", "Mangalore", "Hubli", "Belgaum", "Davangere",
  "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode",
  "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam",
  "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Navi Mumbai", "Kalyan", "Vasai",
  "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar",
  "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner",
  "Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Meerut", "Bareilly", "Aligarh", "Moradabad",
  "Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain",
  "Patna", "Gaya", "Bhagalpur", "Muzaffarpur",
  "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro",
  "Bhubaneswar", "Cuttack", "Rourkela", "Puri",
  "Raipur", "Bilaspur", "Durg",
  "Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala",
  "Dehradun", "Haridwar", "Rishikesh",
  "Shimla", "Manali",
  "Srinagar", "Jammu",
  "Guwahati", "Shillong", "Imphal", "Agartala", "Aizawl", "Kohima", "Itanagar",
  "Panaji", "Margao",
  "Puducherry",
  "Siliguri", "Asansol", "Durgapur", "Howrah",
  "Tiruvannamalai", "Hosur", "Anantapur", "Kurnool", "Kadapa",
];

// Dedupe while preserving order
const seen = new Set<string>();
export const ALL_INDIAN_CITIES = INDIAN_CITIES.filter((c) => {
  const k = c.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
