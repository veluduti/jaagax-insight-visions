import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Camera, Dices, Heart, Loader2, MapPin, Plus, Sparkles, Star, Users } from "lucide-react";
import TravelShell from "@/components/travel/TravelShell";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { destinations, experiences, moods } from "@/data/travelData";
import { fromTable } from "@/lib/supabaseHelper";
import { useAuth } from "@/hooks/useAuth";
import { saveTravelItem, logTravelEvent } from "@/services/travelService";
import { toast } from "sonner";

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{children}</p>;

/* Mood → destination tags used by Inspire Me and Surprise Me */
const moodTags: Record<string, string[]> = {
  Relaxed: ["Beach", "Slow Travel", "Wellness"], Peaceful: ["Nature", "Wellness", "Slow Travel"], Adventurous: ["Nature", "Photography"],
  Romantic: ["Beach", "Luxury", "Slow Travel"], Social: ["Nightlife", "Food"], Cultural: ["Heritage", "Culture"], Spiritual: ["Heritage", "Culture"],
  Productive: ["Business"], "Family-friendly": ["Family", "Nature"], "Budget-friendly": ["Food", "Culture"], Offbeat: ["Slow Travel", "Nature"], Active: ["Nature", "Photography"],
};

function requireUser(user: unknown, navigate: (p: string) => void, path: string) {
  if (user) return true;
  toast.error("Please sign in to continue.");
  navigate(`/auth?redirect=${encodeURIComponent(path)}`);
  return false;
}

export function TravelInspire() {
  const navigate = useNavigate();
  const [mood, setMood] = useState("Peaceful");
  const [surprise, setSurprise] = useState<typeof destinations[number] | null>(null);
  const matches = useMemo(() => {
    const tags = moodTags[mood] ?? [];
    return [...destinations].map((d) => ({ d, score: d.tags.filter((t) => tags.includes(t)).length })).sort((a, b) => b.score - a.score);
  }, [mood]);
  const moodExperiences = experiences.filter((e) => matches.slice(0, 2).some((m) => m.d.slug === e.destination));
  const roll = () => { const pick = destinations[Math.floor(Math.random() * destinations.length)]; setSurprise(pick); void logTravelEvent("surprise_me", "destination", pick.slug); };

  return <TravelShell><SEO title="Inspire me — JAAGA Travel" description="Tell JAAGA how you want to feel and discover where to go." canonicalPath="/travel/inspire" />
    <main className="mx-auto max-w-7xl px-4 py-12">
      <Eyebrow>Inspire me</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">Don't pick a place yet. Pick a feeling.</h1>
      <div className="mt-8 flex flex-wrap gap-2">{moods.map((m) => <Button key={m} variant={mood === m ? "default" : "outline"} className="rounded-full" onClick={() => setMood(m)}>{m}</Button>)}</div>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {matches.slice(0, 3).map(({ d }, i) => <Link key={d.slug} to={`/travel/destinations/${d.slug}`} className={`group relative overflow-hidden rounded-2xl bg-muted ${i === 0 ? "md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"}`}>
          <img src={d.image} alt={d.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
            <Badge className="bg-background/90 text-foreground">{i === 0 ? "Best match" : "Also feels right"}</Badge>
            <h2 className={`mt-3 font-semibold ${i === 0 ? "text-4xl" : "text-2xl"}`}>{d.name}</h2>
            <p className="mt-1 opacity-90">{d.tagline}</p>
          </div>
        </Link>)}
      </section>

      {moodExperiences.length > 0 && <section className="mt-14"><Eyebrow>Moments for a {mood.toLowerCase()} trip</Eyebrow>
        <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2">{moodExperiences.map((e) => <Link key={e.slug} to={`/travel/experiences/${e.slug}`} className="w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card">
          <img src={e.image} alt="" loading="lazy" className="h-40 w-full object-cover" /><div className="p-4"><p className="text-xs text-primary">{e.city} · {e.duration}</p><h3 className="mt-1 font-semibold">{e.title}</h3></div></Link>)}</div>
      </section>}

      <section className="mt-14 grid items-center gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1fr_1fr]">
        <div><Dices className="h-10 w-10 text-primary" /><h2 className="mt-4 text-3xl font-semibold">Surprise me</h2><p className="mt-2 text-muted-foreground">Let JAAGA pick a place you might never have chosen yourself.</p>
          <div className="mt-6 flex flex-wrap gap-2"><Button size="lg" onClick={roll}><Dices />{surprise ? "Roll again" : "Surprise me"}</Button>
            {surprise && <Button size="lg" variant="outline" onClick={() => navigate(`/travel/plan?prompt=${encodeURIComponent(`Create a ${mood.toLowerCase()} ${surprise.days} trip to ${surprise.name}`)}`)}>Plan this trip<ArrowRight /></Button>}</div></div>
        {surprise ? <Link to={`/travel/destinations/${surprise.slug}`} className="relative block aspect-video overflow-hidden rounded-2xl animate-in fade-in zoom-in-95"><img src={surprise.image} alt={surprise.name} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" /><div className="absolute bottom-4 left-4 text-primary-foreground"><p className="text-3xl font-semibold">{surprise.name}</p><p className="text-sm opacity-90">{surprise.bestTime} · {surprise.days}</p></div></Link>
          : <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">Your surprise appears here</div>}
      </section>
    </main></TravelShell>;
}

type Journey = { id: string; host_id: string; title: string; destination_name: string; description: string | null; vibe: string | null; start_date: string | null; duration_days: number | null; seats: number; status: string };

export function TravelJourneys() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [journeys, setJourneys] = useState<Journey[]>([]); const [members, setMembers] = useState<{ journey_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", destination_name: "", description: "", vibe: "Social", start_date: "", duration_days: "3", seats: "6" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fromTable("travel_journeys").select("*").neq("status", "closed").order("start_date", { ascending: true, nullsFirst: false }).limit(60);
    const list = (data ?? []) as Journey[]; setJourneys(list);
    if (list.length) { const { data: m } = await fromTable("travel_journey_members").select("journey_id,user_id").in("journey_id", list.map((j) => j.id)); setMembers(m ?? []); } else setMembers([]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const count = (id: string) => members.filter((m) => m.journey_id === id).length + 1;
  const joined = (id: string) => !!user && members.some((m) => m.journey_id === id && m.user_id === user.id);

  const create = async (e: FormEvent) => {
    e.preventDefault(); if (!requireUser(user, navigate, "/travel/journeys")) return;
    if (form.title.trim().length < 3 || form.destination_name.trim().length < 2) { toast.error("Add a title and destination."); return; }
    setBusy(true);
    const { error } = await fromTable("travel_journeys").insert({ host_id: user!.id, title: form.title.trim(), destination_name: form.destination_name.trim(), description: form.description.trim() || null, vibe: form.vibe, start_date: form.start_date || null, duration_days: Number(form.duration_days) || null, seats: Math.min(40, Math.max(2, Number(form.seats) || 6)) });
    setBusy(false);
    if (error) { toast.error("Could not create the journey."); return; }
    toast.success("Your journey is open for others to join"); setOpen(false); setForm({ ...form, title: "", destination_name: "", description: "" }); void load();
  };
  const toggle = async (j: Journey) => {
    if (!requireUser(user, navigate, "/travel/journeys")) return;
    if (joined(j.id)) { await fromTable("travel_journey_members").delete().eq("journey_id", j.id).eq("user_id", user!.id); toast.success("You left the journey"); }
    else { const { error } = await fromTable("travel_journey_members").insert({ journey_id: j.id, user_id: user!.id }); if (error) { toast.error("This journey is full or closed."); return; } toast.success("You're in! See you on the road."); }
    void load();
  };

  return <TravelShell><SEO title="Join a journey — JAAGA Travel" description="Travel with people who share your vibe. Join or host a group journey." canonicalPath="/travel/journeys" />
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><Eyebrow>Travel together</Eyebrow><h1 className="mt-3 text-4xl font-semibold md:text-5xl">Join a journey</h1><p className="mt-2 max-w-xl text-muted-foreground">Find people heading somewhere you'd love to go — or open your own trip to others.</p></div>
        <Button size="lg" onClick={() => requireUser(user, navigate, "/travel/journeys") && setOpen((v) => !v)}><Plus />Host a journey</Button></div>

      {open && <form onSubmit={create} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <Input placeholder="Journey title, e.g. Monsoon weekend in Coorg" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Destination" value={form.destination_name} maxLength={80} onChange={(e) => setForm({ ...form, destination_name: e.target.value })} />
        <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <div className="grid grid-cols-3 gap-2"><Input type="number" min={1} max={30} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} aria-label="Days" /><Input type="number" min={2} max={40} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} aria-label="Group size" /><Input value={form.vibe} maxLength={30} onChange={(e) => setForm({ ...form, vibe: e.target.value })} aria-label="Vibe" /></div>
        <Textarea className="md:col-span-2" placeholder="What will the group do? Who is it for?" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <p className="text-xs text-muted-foreground md:col-span-1">Days · group size · vibe</p>
        <Button type="submit" disabled={busy} className="md:justify-self-end">{busy && <Loader2 className="animate-spin" />}Open journey</Button>
      </form>}

      {loading ? <div className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-primary" /></div>
        : journeys.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><Users className="mx-auto h-10 w-10 text-primary" /><p className="mt-3 font-semibold">No open journeys yet</p><p className="text-sm text-muted-foreground">Be the first to host one.</p></div>
        : <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{journeys.map((j) => {
          const img = destinations.find((d) => j.destination_name.toLowerCase().includes(d.name.toLowerCase()))?.image ?? destinations[0].image;
          const c = count(j.id); const full = c >= j.seats; const mine = user?.id === j.host_id;
          return <article key={j.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative h-44"><img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />{j.vibe && <Badge className="absolute left-3 top-3 bg-background/90 text-foreground">{j.vibe}</Badge>}<p className="absolute bottom-3 left-4 flex items-center gap-1 text-sm text-primary-foreground"><MapPin className="h-4 w-4" />{j.destination_name}</p></div>
            <div className="p-5"><h3 className="text-lg font-semibold">{j.title}</h3>{j.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">{j.start_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(j.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}{j.duration_days && <span>{j.duration_days} days</span>}<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c}/{j.seats} going</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (c / j.seats) * 100)}%` }} /></div>
              {mine ? <Badge variant="secondary" className="mt-4">You're hosting</Badge> : <Button className="mt-4 w-full" variant={joined(j.id) ? "outline" : "default"} disabled={full && !joined(j.id)} onClick={() => toggle(j)}>{joined(j.id) ? "Leave journey" : full ? "Journey full" : "Join journey"}</Button>}
            </div></article>;
        })}</div>}
    </main></TravelShell>;
}

type Memory = { id: string; user_id: string; title: string; notes: string | null; rating: number | null; is_public: boolean; created_at: string };

export function TravelMemories() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState<Memory[]>([]); const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(""); const [notes, setNotes] = useState(""); const [rating, setRating] = useState(5); const [isPublic, setIsPublic] = useState(true);
  const load = useCallback(async () => { setLoading(true); const { data } = await fromTable("travel_memories").select("id,user_id,title,notes,rating,is_public,created_at").order("created_at", { ascending: false }).limit(60); setItems((data ?? []).filter((m: Memory) => m.is_public || m.user_id === user?.id)); setLoading(false); }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  const post = async (e: FormEvent) => {
    e.preventDefault(); if (!requireUser(user, navigate, "/travel/memories")) return;
    if (title.trim().length < 3) { toast.error("Give your memory a title."); return; }
    const { error } = await fromTable("travel_memories").insert({ user_id: user!.id, title: title.trim().slice(0, 140), notes: notes.trim().slice(0, 2000) || null, rating, is_public: isPublic });
    if (error) { toast.error("Could not save memory."); return; }
    toast.success(isPublic ? "Memory shared" : "Memory saved privately"); setTitle(""); setNotes(""); void load();
  };
  const placeFor = (m: Memory) => destinations.find((d) => `${m.title} ${m.notes ?? ""}`.toLowerCase().includes(d.name.toLowerCase()));

  return <TravelShell><SEO title="Travel memories — JAAGA Travel" description="Remember every journey and get inspired by others." canonicalPath="/travel/memories" />
    <main className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[360px_1fr]">
      <aside className="lg:sticky lg:top-36 lg:self-start"><Eyebrow>Remember</Eyebrow><h1 className="mt-3 text-4xl font-semibold">Travel memories</h1><p className="mt-2 text-muted-foreground">Every journey leaves a story. Keep yours, and let others find their next trip through it.</p>
        <form onSubmit={post} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
          <Input placeholder="Sunrise at Palolem, Goa" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="What made it special?" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star className={`h-5 w-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />Share with the community</label>
          <Button type="submit" className="w-full"><Camera />Save memory</Button>
        </form></aside>
      <section>{loading ? <Loader2 className="mx-auto mt-20 animate-spin text-primary" /> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No memories yet — share the first one.</div>
        : <div className="columns-1 gap-5 sm:columns-2">{items.map((m) => { const place = placeFor(m); return <article key={m.id} className="mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
          {place && <img src={place.image} alt="" loading="lazy" className="h-48 w-full object-cover" />}
          <div className="p-5"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{m.title}</h3>{!m.is_public && <Badge variant="secondary">Private</Badge>}</div>
            {m.rating && <div className="mt-1 flex">{Array.from({ length: m.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />)}</div>}
            {m.notes && <p className="mt-2 text-sm text-muted-foreground">{m.notes}</p>}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              {place && <Link to={`/travel/destinations/${place.slug}`} className="flex items-center gap-1 font-medium text-primary">Go to {place.name}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div></div></article>; })}</div>}</section>
    </main></TravelShell>;
}

const communities = [
  { slug: "weekend-escapers", name: "Weekend Escapers", about: "Two days, one bag, somewhere new every weekend.", tag: "Slow Travel", dest: "coorg" },
  { slug: "food-trails", name: "Food Trail Seekers", about: "Biryani maps, street-food walks and kitchen stories.", tag: "Food", dest: "hyderabad" },
  { slug: "heritage-walkers", name: "Heritage Walkers", about: "Forts, stepwells, old cities and the people who keep them alive.", tag: "Heritage", dest: "jaipur" },
  { slug: "coast-collective", name: "Coast Collective", about: "Quiet beaches, sunsets and slow coastal mornings.", tag: "Beach", dest: "goa" },
  { slug: "solo-women", name: "Solo Women Travellers", about: "Safe routes, trusted stays and travel buddies.", tag: "Solo", dest: "goa" },
  { slug: "family-trips", name: "Family Trippers", about: "Kid-friendly plans, easy stays and gentle pace.", tag: "Family", dest: "coorg" },
];

export function TravelCommunities() {
  const { user } = useAuth(); const navigate = useNavigate(); const [joined, setJoined] = useState<string[]>([]);
  useEffect(() => { if (!user) return; void fromTable("travel_saves").select("item_id").eq("item_type", "community").then(({ data }) => setJoined((data ?? []).map((r: { item_id: string }) => r.item_id))); }, [user?.id]);
  const join = async (c: typeof communities[number]) => {
    if (!requireUser(user, navigate, "/travel/communities")) return;
    if (joined.includes(c.slug)) { await fromTable("travel_saves").delete().eq("item_type", "community").eq("item_id", c.slug); setJoined((j) => j.filter((x) => x !== c.slug)); return; }
    try { await saveTravelItem({ type: "community", id: c.slug, title: c.name, metadata: { tag: c.tag } }); setJoined((j) => [...j, c.slug]); toast.success(`Welcome to ${c.name}`); } catch { toast.error("Could not join."); }
  };
  return <TravelShell><SEO title="Travel communities — JAAGA Travel" description="Find your people: travel communities by interest." canonicalPath="/travel/communities" />
    <main className="mx-auto max-w-7xl px-4 py-12"><Eyebrow>Belong</Eyebrow><h1 className="mt-3 text-4xl font-semibold md:text-5xl">Find your travel tribe</h1><p className="mt-2 max-w-xl text-muted-foreground">Communities of people who travel the way you do.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{communities.map((c) => { const img = destinations.find((d) => d.slug === c.dest)?.image; const isIn = joined.includes(c.slug); return <article key={c.slug} className="group relative overflow-hidden rounded-2xl border border-border">
        <img src={img} alt="" loading="lazy" className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-primary-foreground"><Badge className="bg-background/90 text-foreground">{c.tag}</Badge><h2 className="mt-2 text-xl font-semibold">{c.name}</h2><p className="mt-1 text-sm opacity-90">{c.about}</p>
          <div className="mt-4 flex gap-2"><Button size="sm" variant={isIn ? "secondary" : "default"} onClick={() => join(c)}>{isIn ? <><Heart className="fill-current" />Joined</> : <><Users />Join</>}</Button><Button size="sm" variant="secondary" asChild><Link to="/travel/journeys">Group trips</Link></Button></div></div></article>; })}</div>
    </main></TravelShell>;
}

export const travelPrimaryActions = [
  { label: "Explore", path: "/travel/explore", icon: MapPin },
  { label: "Inspire me", path: "/travel/inspire", icon: Sparkles },
  { label: "Create a journey", path: "/travel/plan", icon: Plus },
  { label: "Join a journey", path: "/travel/journeys", icon: Users },
];
