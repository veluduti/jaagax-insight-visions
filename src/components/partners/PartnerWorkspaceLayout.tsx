import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { PartnerWorkspaceContext } from "@/contexts/PartnerWorkspaceContext";
import { listManagedHotels, type ManagedHotel } from "@/services/hospitality/partnerDashboardService";
import { partnerWorkspaceNav } from "@/config/partnerWorkspaceNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Menu, Search, X, Loader2, LogOut, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./partner-workspace.css";
import PropertyPhoto from "./PropertyPhoto";

export default function PartnerWorkspaceLayout() {
  const ctx = usePartnerHotel();
  const { user } = useAuth();
  const [hotels, setHotels] = useState<ManagedHotel[]>([]);
  const [selected, setSelected] = useState<string | null>(() => localStorage.getItem("partner_active_property"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const load = useCallback(async () => {
    if (!ctx.userId) return;
    try { setError(""); setHotels(await listManagedHotels(ctx.userId)); }
    catch { setError("Could not load your properties. Please try again."); }
    finally { setLoading(false); }
  }, [ctx.userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const match=location.pathname.match(/^\/partners\/properties\/([^/]+)$/);
    if(match && hotels.some(h=>h.id===match[1])) {localStorage.setItem("partner_active_property",match[1]);setSelected(match[1]);}
  },[location.pathname,hotels]);
  useEffect(() => {
    const refresh = () => { void load(); };
    const select = () => { setSelected(localStorage.getItem("partner_active_property")); };
    window.addEventListener("partner-property-updated", refresh);
    window.addEventListener("partner-property-selected", select);
    return () => { window.removeEventListener("partner-property-updated", refresh); window.removeEventListener("partner-property-selected", select); };
  }, [load]);
  const hotel = hotels.find(h => h.id === selected) ?? hotels.find(h => h.id === ctx.hotelId) ?? hotels[0];
  const choose = (id:string) => { if (!hotels.some(h=>h.id===id)) return; localStorage.setItem("partner_active_property",id); setSelected(id); };
  const value = {...ctx,hotelId:hotel?.id ?? null, hotelName:hotel?.name ?? ctx.hotelName};
  const matches = partnerWorkspaceNav.flatMap(item => [item,...(item.children ?? [])]).filter(item=>item.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="partner-workspace">
    <header className="pw-header">
      <Button variant="ghost" size="icon" className="pw-mobile-trigger" aria-label={open ? "Close sidebar" : "Open sidebar"} onClick={()=>setOpen(!open)}>{open ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}</Button>
      <Link to="/" className="pw-brand">JAAGA <span>X</span></Link>
      <strong className="pw-header-title text-sm">Hotel Partner Dashboard</strong>
      <select aria-label="Active property" value={hotel?.id ?? ""} onChange={e=>choose(e.target.value)}>
        {!hotels.length && <option value="">Your property</option>}{hotels.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <form className="ml-auto relative" onSubmit={e=>{e.preventDefault();if(matches[0] && search.trim()) navigate(matches[0].to);}}>
        <Input aria-label="Search dashboard modules" placeholder="Search modules…" value={search} onChange={e=>setSearch(e.target.value)} />
        {search && <div className="absolute right-0 top-9 w-64 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">{matches.length ? matches.slice(0,8).map((m,i)=><Link className="block p-2 text-xs hover:bg-accent" key={m.label+i} to={m.to} onClick={()=>setSearch("")}>{m.label}</Link>) : <p className="p-2 text-xs">No matching modules</p>}</div>}
      </form>
      <Link to="/partners/inbox" aria-label="Guest messages"><Bell className="h-5 w-5"/></Link>
      <span className="hidden xl:block text-xs">{user?.user_metadata?.full_name || "Hotel Manager"}</span>
      <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={async()=>{const {error}=await supabase.auth.signOut();if(error) toast.error("Could not sign out"); else navigate("/partners/login");}}><LogOut className="h-4 w-4"/></Button>
    </header>
    <div className="pw-layout">
      <aside className={`pw-sidebar ${open ? "is-open" : ""}`}>
        <div className="pw-property-mini">{hotel?.images?.[0] && <div className="w-12 shrink-0"><PropertyPhoto src={hotel.images[0]} alt={hotel.name}/></div>}<div className="min-w-0"><strong className="block text-xs truncate">{hotel?.name ?? "Your property"}</strong><p className="text-[10px] mt-1">Hotel ID: {hotel?.id.slice(0,8) ?? "—"}</p><span className="pw-success inline-block mt-1">{hotel?.is_active ? "Live" : "Not published"}</span></div></div>
        <nav aria-label="Hotel management">{partnerWorkspaceNav.map(item => item.children ? <details key={item.label} open><summary><item.icon/>{item.label}</summary>{item.children.map(child=><NavLink key={child.label} to={child.to} className={()=>location.pathname+location.search===child.to?"active":""}>{child.label}</NavLink>)}</details> : <NavLink key={item.label} to={item.to} end><item.icon/>{item.label}</NavLink>)}</nav>
        <div className="mt-auto border-t border-border/30 pt-3"><HelpCircle className="h-5 w-5 ml-2"/><strong className="block text-sm px-2 mt-1">Need Help?</strong><Link to="/contact">Contact Jaaga</Link></div>
      </aside>
      <main className="pw-content">
        {ctx.loading || loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div> : error ? <div role="alert" className="py-16 text-center"><p>{error}</p><Button onClick={load} className="mt-4">Retry</Button></div> : !hotel ? <div className="py-20 text-center"><h1 className="text-xl font-semibold">No managed properties</h1><Link to="/partners/portfolio" className="text-primary underline">Manage your properties</Link></div> : <PartnerWorkspaceContext.Provider value={value}><Outlet key={hotel.id}/></PartnerWorkspaceContext.Provider>}
      </main>
    </div>
  </div>;
}