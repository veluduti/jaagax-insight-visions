import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Loader2, MapPin, RefreshCw, Search, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadHyperGuestHotels } from "@/services/hospitality/hyperguestDiscoveryService";

export default function HyperGuestHotels() {
  const [search, setSearch] = useState("");
  const [liveId, setLiveId] = useState("");
  const nav = useNavigate();
  const { data = [], isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["hyperguest-hotels"], queryFn: loadHyperGuestHotels, staleTime: 300_000, retry: 1,
  });
  const hotels = data.filter(hotel => [hotel.name, hotel.location?.address, hotel.location?.city?.name, hotel.location?.country?.name]
    .filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation hotelDiscovery />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 lg:px-8">
        <Button asChild variant="ghost" className="mb-5"><Link to="/hotels"><ArrowLeft className="mr-2 h-4 w-4" />All hotels</Link></Button>
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-3xl font-bold">HyperGuest Hotels</h1><Badge variant="outline" className="mt-3">Certification test inventory</Badge></div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
        <form className="mb-6 flex max-w-lg flex-wrap items-end gap-2 rounded-lg border border-destructive/50 p-3" onSubmit={e => { e.preventDefault(); if (/^\d+$/.test(liveId.trim())) nav(`/hotels/hyperguest/${liveId.trim()}?live=1`); }}>
          <label className="flex-1 text-xs font-medium">Stage 3 live booking test — live property ID<Input inputMode="numeric" placeholder="e.g. 12345" value={liveId} onChange={e => setLiveId(e.target.value)} /></label>
          <Button type="submit" variant="destructive" disabled={!/^\d+$/.test(liveId.trim())}>Open live booking</Button>
        </form>
        <div className="relative mb-6 max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search HyperGuest hotels" placeholder="Search hotel or location" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        {isPending ? <div role="status" className="flex items-center justify-center gap-3 py-24"><Loader2 className="h-5 w-5 animate-spin" />Loading HyperGuest hotels…</div>
          : isError ? <div role="alert" className="space-y-4 py-12"><p>HyperGuest hotels could not be loaded. Please try again.</p><Button onClick={() => refetch()}>Try again</Button></div>
          : <><p className="mb-4 text-sm text-muted-foreground">{hotels.length} {hotels.length === 1 ? "hotel" : "hotels"}</p>
            {hotels.length === 0 ? <div className="py-16 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p>No hotels match your search.</p><Button variant="ghost" className="mt-3" onClick={() => setSearch("")}>Clear search</Button></div>
              : <div className="space-y-4">{hotels.map(hotel => {
                const photo = [...(hotel.images ?? []), ...(hotel.rooms ?? []).flatMap(room => room.images ?? [])].find(image => image.uri)?.uri;
                const description = hotel.descriptions?.find(d => d.language === "en_US" && d.type === "general")?.description;
                return <article key={hotel.id} className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[280px_1fr]">
                  <div className="relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-56">
                    <Building2 className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />
                    {photo && <img src={photo} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.hidden = true; }} />}
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-3 p-5">
                    <div className="flex w-full flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{hotel.name}</h2>{hotel.rating != null && <span className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-primary" />{hotel.rating}</span>}</div>
                    <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{[hotel.location?.address, hotel.location?.city?.name, hotel.location?.country?.name].filter(Boolean).join(", ") || "Location unavailable"}</p>
                    {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
                    <div className="flex flex-wrap gap-2">{(hotel.facilities ?? []).filter(f => f.type !== "room").slice(0, 6).map(f => <Badge key={f.id} variant="secondary">{f.name}</Badge>)}</div>
                    <Button asChild className="mt-auto"><Link to={`/hotels/hyperguest/${hotel.id}`}>View details & availability<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  </div>
                </article>;
              })}</div>}
          </>}
      </main>
      <Footer />
    </div>
  );
}