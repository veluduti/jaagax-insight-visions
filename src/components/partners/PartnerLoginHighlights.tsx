import { useQuery } from "@tanstack/react-query";
import { Building2, Globe2, Hotel, MessageSquare, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getPartnerLoginHighlights } from "@/services/hospitality/partnerLoginHighlightsService";

export default function PartnerLoginHighlights() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["partner-login-highlights"],
    queryFn: getPartnerLoginHighlights,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const count = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("en-IN");
  const metrics = [
    { icon: Building2, value: count(data?.hotelCount), label: "Hotels & Properties", tone: "property" },
    { icon: Globe2, value: count(data?.cities), label: "Cities on JAAGA X", tone: "cities" },
    { icon: MessageSquare, value: count(data?.reviewCount), label: "Guest Reviews", tone: "reviews" },
    { icon: Star, value: data?.rating != null && (data.reviewCount ?? 0) > 0 ? `${data.rating.toFixed(1)}/5` : "—", label: "Guest Rating", tone: "rating" },
  ];

  return (
    <section className="partner-login-highlights space-y-2" aria-label="JAAGA X hotels and ratings" aria-busy={isPending}>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(({ icon: Icon, value, label, tone }) => (
          <div key={label} className={`partner-login-metric partner-login-metric-${tone} flex min-h-[66px] items-center justify-center gap-2 rounded-lg border px-2 py-3`}>
            <Icon className="h-7 w-7 shrink-0" aria-hidden="true" />
            <div className="min-w-0"><p className="partner-login-metric-value text-lg font-bold leading-tight">{isPending ? "—" : value}</p><p className="partner-login-metric-label text-[10px] leading-tight">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="partner-login-hotel-strip rounded-lg border px-3 py-2">
        <h2 className="flex items-center gap-2 text-xs font-bold"><Hotel className="h-4 w-4" aria-hidden="true" /> Hotels, Resorts & Stays on JAAGA X</h2>
        {isError ? <p className="mt-2 text-xs">Hotel highlights are temporarily unavailable.</p> : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {data?.hotels.map((hotel, index) => (
              <Link key={hotel.id} to={`/hotels/${hotel.id}`} className={`partner-login-hotel-name partner-login-hotel-tone-${index} flex min-w-0 items-center gap-2 border-l pl-2 py-1`}>
                <Building2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0"><span className="block text-[11px] font-bold leading-tight break-words">{hotel.name}</span>{hotel.city && <span className="partner-login-metric-label block text-[9px] leading-tight">{hotel.city}</span>}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}