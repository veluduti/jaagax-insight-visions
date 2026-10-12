import { MapPin, ExternalLink } from "lucide-react";

const PLACES: Record<string, string[]> = {
  hyderabad: ["Charminar", "Golconda Fort", "Ramoji Film City", "Hussain Sagar Lake", "Salar Jung Museum", "Chowmahalla Palace", "Birla Mandir", "Qutb Shahi Tombs"],
  visakhapatnam: ["RK Beach", "Kailasagiri", "Submarine Museum (INS Kursura)", "Rushikonda Beach", "Borra Caves", "Araku Valley", "Simhachalam Temple", "Yarada Beach"],
  vijayawada: ["Kanaka Durga Temple", "Prakasam Barrage", "Undavalli Caves", "Bhavani Island", "Mangalagiri Temple", "Gandhi Hill"],
  bengaluru: ["Lalbagh Botanical Garden", "Bangalore Palace", "Cubbon Park", "ISKCON Temple", "Nandi Hills", "Tipu Sultan's Summer Palace"],
  chennai: ["Marina Beach", "Kapaleeshwarar Temple", "Fort St. George", "Mahabalipuram", "San Thome Basilica", "DakshinaChitra"],
  mumbai: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Chhatrapati Shivaji Terminus", "Juhu Beach", "Siddhivinayak Temple"],
  delhi: ["Red Fort", "Qutub Minar", "India Gate", "Humayun's Tomb", "Lotus Temple", "Akshardham Temple"],
  goa: ["Baga Beach", "Basilica of Bom Jesus", "Fort Aguada", "Dudhsagar Falls", "Anjuna Flea Market", "Palolem Beach"],
  tirupati: ["Tirumala Venkateswara Temple", "Sri Kalahasti Temple", "Talakona Waterfalls", "Chandragiri Fort"],
  warangal: ["Thousand Pillar Temple", "Warangal Fort", "Ramappa Temple", "Bhadrakali Temple"],
};
const ALIAS: Record<string, string> = { vizag: "visakhapatnam", bangalore: "bengaluru", "new delhi": "delhi", hyderbad: "hyderabad", secunderabad: "hyderabad" };

const placesFor = (city: string) => {
  const k = city.trim().toLowerCase();
  return PLACES[ALIAS[k] ?? k] ?? [];
};
const mapUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default function FamousPlaces({ destinations }: { destinations: string[] }) {
  const cities = Array.from(new Set(destinations.filter(Boolean).map((d) => d.trim())));
  if (!cities.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <h3 className="mb-2 text-sm font-semibold">Famous places to visit near your stay</h3>
      <div className="space-y-3">
        {cities.map((c) => {
          const list = placesFor(c);
          return (
            <div key={c}>
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><MapPin className="h-3 w-3" />{c}</div>
              <div className="flex flex-wrap gap-2">
                {list.length ? list.map((p) => (
                  <a key={p} href={mapUrl(`${p}, ${c}`)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary">
                    {p}<ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )) : (
                  <a href={mapUrl(`tourist attractions in ${c}`)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary">
                    See top attractions in {c}<ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
