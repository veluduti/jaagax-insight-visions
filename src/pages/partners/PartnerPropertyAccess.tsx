import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle2, MapPin, Star, ArrowRight, Copy, QrCode, Share2, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { supabase } from "@/integrations/supabase/client";
import { portalSlug, roleName } from "@/config/staffRoles";
import { propertyQrUrl } from "@/lib/propertyQr";

const db = supabase as any;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

export default function PartnerPropertyAccess() {
  const { hotelId } = usePartnerHotel();
  const q = useQuery({
    queryKey: ["property-access", hotelId], enabled: !!hotelId,
    queryFn: async () => {
      const [h, e, r, roles] = await Promise.all([
        db.from("partner_hotels").select("id,name,city,locality,state,property_reference,images,is_active,property_type_name").eq("id", hotelId).single(),
        db.from("hotel_employees").select("id,full_name,designation,roles,status").eq("hotel_id", hotelId).neq("status", "exited").order("created_at"),
        db.from("hotel_reviews").select("rating").eq("hotel_id", hotelId),
        db.from("hotel_staff_roles").select("key,name").eq("hotel_id", hotelId),
      ]);
      if (h.error) throw h.error;
      const ratings = (r.data ?? []).map((x: any) => Number(x.rating)).filter((n: number) => n > 0);
      return { hotel: h.data, employees: e.data ?? [], roles: roles.data ?? [], avg: ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null, count: ratings.length };
    },
  });
  if (q.isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (q.error || !q.data?.hotel) return <p className="py-16 text-center text-muted-foreground">Could not load this property.</p>;
  const { hotel, employees, roles, avg, count } = q.data;
  const accessUrl = `${window.location.origin}/property/${portalSlug(hotel)}/login`;
  const img = Array.isArray(hotel.images) ? hotel.images[0] : null;
  const place = [hotel.locality, hotel.city, hotel.state].filter(Boolean).join(", ");
  const copy = () => { navigator.clipboard.writeText(accessUrl); toast.success("Link copied"); };
  const download = () => {
    const c = document.querySelector<HTMLCanvasElement>("#property-access-qr canvas"); if (!c) return;
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `${portalSlug(hotel)}-access-qr.png`; a.click();
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${hotel.name} staff access`, url: accessUrl }); } catch { /* cancelled */ } } else copy();
  };
  const card = "rounded-2xl border border-primary/15 bg-card p-5 shadow-sm";
  return (
    <div className="space-y-4 max-w-5xl">
      {hotel.is_active ? (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-900"><CheckCircle2 className="h-6 w-6 text-emerald-600" />Property is Live! Your {hotel.property_type_name || "property"} is now visible on Jaaga Stays.</div>
      ) : (
        <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900">This property is not live yet. Staff access still works once employees are added.</div>
      )}
      <div className={`${card} flex flex-col sm:flex-row sm:items-center gap-5`}>
        {img && <img src={img} alt={hotel.name} className="h-28 w-full sm:w-48 rounded-xl object-cover" />}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl font-bold">{hotel.name}</h1>{hotel.is_active && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">● Live</span>}</div>
          {place && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{place}</p>}
          {avg !== null && <p className="flex items-center gap-1.5 text-sm"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{avg.toFixed(1)} ({count} reviews)</p>}
        </div>
        <Link to={`/p/${hotel.property_reference || hotel.id}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">View Property <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className={card}>
            <h2 className="text-lg font-bold">Property Access & Team</h2>
            <p className="text-sm text-muted-foreground">Share access with your staff and manage property operations</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <h3 className="font-semibold">Property Access Link</h3>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2"><span className="truncate text-sm flex-1">{accessUrl}</span><button onClick={copy} className="rounded-md bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"><Copy className="inline h-3 w-3 mr-1" />Copy</button></div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><QrCode className="h-4 w-4" />Download QR</button>
                  <button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><Share2 className="h-4 w-4" />Share Link</button>
                </div>
              </div>
              <div id="property-access-qr" className="self-center"><QRCodeCanvas value={accessUrl} size={112} level="M" /></div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4 text-sm"><Lightbulb className="h-6 w-6 text-primary shrink-0" />Once you share this link or QR code, your team can securely access {hotel.name} using their assigned credentials.</div>
          {hotel.property_reference && <p className="text-xs text-muted-foreground">Public property QR: {propertyQrUrl(hotel.property_reference)}</p>}
        </div>
        <div className={card}>
          <div className="flex items-center justify-between"><h2 className="font-bold">Team Members ({employees.length})</h2><Link to="/partners/hr?tab=employees" className="text-sm font-semibold text-primary">Manage →</Link></div>
          {employees.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No team members yet. <Link to="/partners/hr?tab=employees" className="text-primary underline">Add employees</Link></p> : (
            <ul className="mt-3 space-y-3 max-h-80 overflow-y-auto">
              {employees.map((e: any) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(e.full_name || "?")}</span>
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{e.full_name}</div><div className="text-xs text-muted-foreground truncate">{e.designation || (e.roles ?? []).map((k: string) => roleName(k, roles)).join(", ") || "Staff"}</div></div>
                  <span title={e.status} className={`h-2.5 w-2.5 rounded-full ${e.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
