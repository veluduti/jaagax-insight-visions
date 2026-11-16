import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Layers, Building2, BedDouble, TrendingUp, Coins, Search, MoreVertical, Pencil, Plus, ArrowLeftRight, Trash2, ExternalLink, Settings, Users, Tag, BarChart3, History, Info, CheckCircle2, MapPin, Star, Loader2, UserPlus, Upload, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { portfolioMetrics, propertyState, type PortfolioData } from "@/services/hospitality/portfolioService";
import { loadGroups, loadGroupActivity, saveGroup, deleteGroup, assignHotels, applyCommon, addGroupMember, removeGroupMember, uploadGroupLogo, GROUP_ROLES, GROUP_ROLE_LABEL, GROUP_ROLE_SCOPE, type PropertyGroup, type GroupRole, type GroupSettings, type GroupMember } from "@/services/hospitality/propertyGroupsService";

const compactMoney = (n: number, c = "INR") => c === "INR" ? (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`) : new Intl.NumberFormat("en", { style: "currency", currency: c, notation: "compact" }).format(n);
const when = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const typeLabel: Record<string, string> = { hotel_chain: "Hotel Chain", brand: "Brand", region: "Region", property_type: "Property Type", other: "Other" };
type Tab = "properties" | "settings" | "access" | "branding" | "reporting" | "activity";
type Editor = { id: string | null; name: string; gstin: string; s: GroupSettings };

export default function PropertyGroups({ userId, data, refresh }: { userId: string; data: PortfolioData; refresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PropertyGroup[] | null>(null), [activity, setActivity] = useState<Awaited<ReturnType<typeof loadGroupActivity>>>([]);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [q, setQ] = useState(""), [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<string>(""), [tab, setTab] = useState<Tab>("properties"), [checked, setChecked] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null), [addOpen, setAddOpen] = useState(false), [moveOpen, setMoveOpen] = useState(false), [moveTo, setMoveTo] = useState("");
  const [pick, setPick] = useState<string[]>([]), [memberOpen, setMemberOpen] = useState(false), [mEmail, setMEmail] = useState(""), [mRole, setMRole] = useState<GroupRole>("group_admin");
  const [draft, setDraft] = useState<GroupSettings | null>(null), [source, setSource] = useState(""), [showAllAct, setShowAllAct] = useState(false);

  const load = useCallback(async () => {
    try { setErr(""); const g = await loadGroups(data.account.id); setGroups(g); setActivity(await loadGroupActivity(g.map(x => x.id))); setSel(s => g.some(x => x.id === s) ? s : (g.find(x => x.group_settings.primary) ?? g[0])?.id ?? ""); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not load groups"); }
  }, [data.account.id]);
  useEffect(() => { void load(); }, [load, data]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); await refresh(); await load(); return true; } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); return false; } finally { setBusy(false); } };

  const metrics = useMemo(() => portfolioMetrics(data, 30), [data]);
  const byHotel = useMemo(() => new Map(metrics.map(m => [m.hotel.id, m])), [metrics]);
  const roomsOf = (ids: string[]) => ids.reduce((s, id) => s + (byHotel.get(id)?.capacity ?? 0), 0);
  const hotelsOf = (gid: string) => data.hotels.filter(h => h.business_id === gid);
  const group = groups?.find(g => g.id === sel) ?? null;
  const gHotels = group ? hotelsOf(group.id) : [];
  useEffect(() => { setChecked([]); setDraft(group ? { ...group.group_settings } : null); setSource(gHotels[0]?.id ?? ""); }, [sel, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => {
    const cap = metrics.reduce((s, m) => s + m.capacity * 30, 0), occ = metrics.reduce((s, m) => s + m.roomNights, 0);
    const inr = metrics.filter(m => m.currency === "INR").reduce((s, m) => s + (m.revenue ?? 0), 0);
    return { groups: groups?.length ?? 0, props: data.hotels.length, rooms: metrics.reduce((s, m) => s + m.capacity, 0), occ: cap ? Math.round(occ / cap * 100) : null, rev: inr };
  }, [metrics, groups, data.hotels.length]);

  const list = (groups ?? []).filter(g => (filter === "all" || g.group_settings.status === filter || (filter === "primary" && g.group_settings.primary)) && g.legal_name.toLowerCase().includes(q.trim().toLowerCase()));
  const newEditor = (g?: PropertyGroup): Editor => ({ id: g?.id ?? null, name: g?.legal_name ?? "", gstin: g?.gstin ?? "", s: g ? { ...g.group_settings } : { code: "", group_type: "hotel_chain", description: "", logo_url: "", status: "active", primary: !(groups?.length), visibility: "private", reporting: "consolidated", rate_control: "property", master_amenities: false, common_policies: false, default_commission: 15, members: [] } });
  const go = (id: string, to: string) => { localStorage.setItem("partner_active_property", id); window.dispatchEvent(new Event("partner-property-selected")); navigate(to); };
  const ownerName = data.account.display_name;
  const ungrouped = data.hotels.filter(h => h.business_id !== group?.id);

  if (err) return <div className="pw-panel"><p className="text-destructive">{err}</p><Button className="mt-3" onClick={() => void load()}>Retry</Button></div>;
  if (!groups) return <div className="py-24 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  const settingRow = (label: string, key: keyof GroupSettings, opts: [string, string][], disabled = false) => <div className="pg-setting"><span>{label}</span><select aria-label={label} className="mp-select" disabled={disabled || !draft} value={String(draft?.[key] ?? "")} onChange={e => draft && setDraft({ ...draft, [key]: typeof draft[key] === "boolean" ? e.target.value === "true" : typeof draft[key] === "number" ? Number(e.target.value) : e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
  const settingsForm = (readOnly: boolean) => <>
    {settingRow("Group Visibility", "visibility", [["private", "Private (Owner & Team)"], ["team", "Team Members Only"], ["public", "Public Brand Page"]], readOnly)}
    {settingRow("Reporting", "reporting", [["consolidated", "Consolidated (Group Level)"], ["property", "Property Wise"]], readOnly)}
    {settingRow("Rate & Inventory Control", "rate_control", [["property", "Property Wise (Independent)"], ["group", "Group Managed"]], readOnly)}
    {settingRow("Master Amenities", "master_amenities", [["true", "Enabled (Share Common)"], ["false", "Disabled"]], readOnly)}
    {settingRow("Common Policies", "common_policies", [["true", "Enabled (Apply to All)"], ["false", "Disabled"]], readOnly)}
    {settingRow("Default Commission", "default_commission", Array.from({ length: 31 }, (_, i) => [String(i), `${i}%`] as [string, string]), readOnly)}
  </>;
  const saveDraft = () => group && draft && run(() => saveGroup(userId, data.account.id, group.id, { legal_name: group.legal_name, gstin: group.gstin ?? "", settings: draft }, groups), "Group settings saved");
  const recent = activity.filter(a => !group || a.entity_id === group.id);

  return <div className="pg-page space-y-4">
    <div className="pw-heading pg-hero"><div><p className="pg-crumb">Multi-Property › Property Groups</p><h1>Property Groups</h1><p>Organize your properties into groups for better management, reporting, permissions, and brand control.</p></div><Button onClick={() => setEditor(newEditor())}><Plus className="h-4 w-4 mr-1" />Create Property Group</Button></div>
    <div className="mp-kpis">{[[Layers, "Total Groups", kpi.groups], [Building2, "Total Properties", kpi.props], [BedDouble, "Total Rooms", kpi.rooms.toLocaleString("en-IN")], [TrendingUp, "Avg. Occupancy", kpi.occ === null ? "—" : `${kpi.occ}%`], [Coins, "Total Revenue (30 Days)", compactMoney(kpi.rev)]].map(([I, l, v]: any) => <div key={l} className="pw-panel pg-kpi"><I /><div><small>{l}</small><strong>{v}</strong></div></div>)}</div>

    <div className="pg-top">
      <section className="pw-panel"><h2 className="pg-h2">Property Groups ({groups.length})</h2>
        <div className="flex gap-2 my-3"><div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search groups" className="pl-8" placeholder="Search groups..." value={q} onChange={e => setQ(e.target.value)} /></div><select aria-label="Filter groups" className="mp-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All Groups</option><option value="active">Active</option><option value="draft">Draft</option><option value="primary">Primary</option></select></div>
        <div className="space-y-2">{list.map(g => { const hs = hotelsOf(g.id), img = g.group_settings.logo_url || (hs.find(h => (h as any).images?.length) as any)?.images?.[0]; return <div key={g.id} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setSel(g.id)} onClick={() => setSel(g.id)} className={`pg-group ${g.id === sel ? "is-active" : ""}`}>
          {img ? <img src={img} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="pg-thumb"><Building2 /></span>}
          <div className="min-w-0 flex-1"><strong className="truncate">{g.legal_name}{g.group_settings.primary && <em className="pg-chip pg-chip-purple">Primary</em>}</strong><small>{hs.length} Properties • {roomsOf(hs.map(h => h.id))} Rooms</small></div>
          <span className={`pg-chip ${g.group_settings.status === "active" ? "pg-chip-green" : "pg-chip-amber"}`}>{g.group_settings.status === "active" ? "Active" : "Draft"}</span>
          <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${g.legal_name}`} onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setEditor(newEditor(g))}>Edit group</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void run(() => saveGroup(userId, data.account.id, g.id, { legal_name: g.legal_name, gstin: g.gstin ?? "", settings: { primary: true } }, groups), "Primary group updated")}>Set as primary</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void run(() => saveGroup(userId, data.account.id, g.id, { legal_name: g.legal_name, gstin: g.gstin ?? "", settings: { status: g.group_settings.status === "active" ? "draft" : "active" } }, groups), "Status updated")}>{g.group_settings.status === "active" ? "Mark as draft" : "Activate"}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => { if (window.confirm(`Delete ${g.legal_name}? Its properties must be moved first.`)) void run(() => deleteGroup(userId, data.account.id, g.id), "Group deleted"); }}>Delete group</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu></div>; })}
          {!list.length && <p className="pw-empty">{groups.length ? "No groups match your search." : "No property groups yet. Create one to start organising properties."}</p>}</div>
      </section>

      <section className="pw-panel"><h2 className="pg-h2">Group Details</h2>{group ? <>
        <div className="pg-detail-head"><Building2 className="text-primary h-9 w-9" /><div className="flex-1 min-w-0"><h3>{group.legal_name} <span className={`pg-chip ${group.group_settings.status === "active" ? "pg-chip-green" : "pg-chip-amber"}`}>{group.group_settings.status === "active" ? "Active" : "Draft"}</span></h3><p>{group.group_settings.description || "No description yet."}</p></div><Button size="sm" variant="outline" onClick={() => setEditor(newEditor(group))}><Pencil className="h-3.5 w-3.5 mr-1" />Edit Group</Button></div>
        <div className="pg-facts">{[["Group Code", group.group_settings.code || "—"], ["Group Type", typeLabel[group.group_settings.group_type]], ["Parent Group", "—"], ["Created On", new Date(group.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })], ["Properties", gHotels.length], ["Total Rooms", roomsOf(gHotels.map(h => h.id))]].map(([l, v]) => <div key={l as string}><small>{l}</small><strong>{v}</strong></div>)}</div>
        <div className="pg-desc"><div><Label>Description</Label><div className="pg-box">{group.group_settings.description || <span className="text-muted-foreground">Add a description in Edit Group.</span>}<small>{group.group_settings.description.length} / 250</small></div></div><div><Label>Group Logo</Label><div className="pg-box pg-logo">{group.group_settings.logo_url ? <img src={group.group_settings.logo_url} alt={`${group.legal_name} logo`} /> : <span className="text-muted-foreground text-xs">No logo</span>}<Button size="icon" className="pg-logo-edit" aria-label="Change group logo" onClick={() => setTab("branding")}><Pencil className="h-3 w-3" /></Button></div></div></div>
      </> : <p className="pw-empty">Select or create a group to see its details.</p>}</section>
    </div>

    {group && <>
      <div className="pg-tabs" role="tablist">{([["properties", Building2, `Properties in Group (${gHotels.length})`], ["settings", Settings, "Group Settings"], ["access", Users, "Access & Permissions"], ["branding", Tag, "Branding"], ["reporting", BarChart3, "Reporting"], ["activity", History, "Activity Log"]] as const).map(([k, I, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}><I />{l}</button>)}</div>

      <section className="pw-panel">
        {tab === "properties" && <><div className="mp-section-heading"><h2 className="pg-h2">Properties in {group.legal_name}</h2><div className="flex gap-2 flex-wrap"><Button size="sm" variant="outline" onClick={() => { setPick([]); setAddOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />Add Properties</Button><Button size="sm" variant="outline" disabled={!checked.length} onClick={() => { setMoveTo(""); setMoveOpen(true); }}><ArrowLeftRight className="h-3.5 w-3.5 mr-1" />Move Properties</Button><Button size="sm" variant="outline" className="text-destructive" disabled={!checked.length || busy} onClick={() => { if (window.confirm(`Remove ${checked.length} propert${checked.length > 1 ? "ies" : "y"} from ${group.legal_name}?`)) void run(() => assignHotels(userId, checked, null, group.id, gHotels.filter(h => checked.includes(h.id)).map(h => h.name)), "Removed from group"); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Remove</Button></div></div>
          <div className="overflow-x-auto"><table className="pg-table"><thead><tr><th><Checkbox aria-label="Select all" checked={!!gHotels.length && checked.length === gHotels.length} onCheckedChange={v => setChecked(v ? gHotels.map(h => h.id) : [])} /></th><th>Property Name</th><th>Location</th><th>Property Type</th><th>Star Rating</th><th>Rooms</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {gHotels.map(h => { const st = propertyState(h), x: any = h; return <tr key={h.id}><td><Checkbox aria-label={`Select ${h.name}`} checked={checked.includes(h.id)} onCheckedChange={v => setChecked(c => v ? [...c, h.id] : c.filter(i => i !== h.id))} /></td>
              <td><div className="flex items-center gap-2">{x.images?.[0] ? <img className="pg-row-img" src={x.images[0]} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="pg-row-img pg-thumb"><Building2 /></span>}<strong>{h.name}</strong></div></td>
              <td><MapPin className="inline h-3.5 w-3.5 text-primary mr-1" />{[x.locality, h.city].filter(Boolean).join(", ") || "—"}</td>
              <td className="capitalize">{(h.business_types?.[0] ?? "hotel").replace(/_/g, " ")}</td>
              <td>{x.star_rating ? <><Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-1" />{x.star_rating}</> : "—"}</td>
              <td>{byHotel.get(h.id)?.capacity ?? 0}</td>
              <td><span className={`pg-chip ${st === "active" ? "pg-chip-green" : st === "review" ? "pg-chip-purple" : "pg-chip-amber"}`}>{st === "active" ? <><CheckCircle2 className="h-3 w-3" />Published</> : st === "review" ? "In Review" : st === "archived" ? "Archived" : "Draft"}</span></td>
              <td className="whitespace-nowrap"><Button size="icon" variant="ghost" aria-label={`Edit ${h.name}`} onClick={() => go(h.id, "/partners/workspace/basic")}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Open ${h.name} page`} disabled={st !== "active"} onClick={() => window.open(`/hotels/${h.id}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`More for ${h.name}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => go(h.id, "/partners/dashboard")}>Open dashboard</DropdownMenuItem><DropdownMenuItem onClick={() => go(h.id, "/partners/rooms")}>Rooms & inventory</DropdownMenuItem><DropdownMenuItem onClick={() => { setChecked([h.id]); setMoveTo(""); setMoveOpen(true); }}>Move to another group</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => void run(() => assignHotels(userId, [h.id], null, group.id, [h.name]), "Removed from group")}>Remove from group</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>; })}
            {!gHotels.length && <tr><td colSpan={8} className="pw-empty">No properties in this group yet. Use Add Properties.</td></tr>}</tbody></table></div></>}

        {tab === "settings" && <div className="max-w-2xl"><h2 className="pg-h2 mb-3">Group Settings</h2>{settingsForm(false)}
          {(draft?.master_amenities || draft?.common_policies) && <div className="pg-apply"><Label htmlFor="pg-source">Copy {[draft.master_amenities && "amenities", draft.common_policies && "policies"].filter(Boolean).join(" & ")} from</Label><div className="flex gap-2"><select id="pg-source" className="mp-select flex-1" value={source} onChange={e => setSource(e.target.value)}>{gHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select><Button variant="outline" disabled={busy || gHotels.length < 2} onClick={() => { if (window.confirm("Replace the other group properties' settings with this property's?")) void run(() => applyCommon(userId, group.id, source, data, { amenities: !!draft.master_amenities, policies: !!draft.common_policies }), "Applied to group properties"); }}>Apply to all properties</Button></div></div>}
          <Button className="mt-4" disabled={busy} onClick={() => void saveDraft()}>Save Settings</Button></div>}

        {tab === "access" && <AccessTable group={group} owner={ownerName} onAdd={() => { setMEmail(""); setMRole("group_admin"); setMemberOpen(true); }} onRemove={m => { if (window.confirm(`Remove ${m.name}? They lose access to this group's properties.`)) void run(() => removeGroupMember(userId, data.account.id, group, gHotels.map(h => h.id), m), "Member removed"); }} />}

        {tab === "branding" && <BrandingForm key={group.id} group={group} userId={userId} busy={busy} onSave={(name, gstin, s) => void run(() => saveGroup(userId, data.account.id, group.id, { legal_name: name, gstin, settings: s }, groups), "Branding saved")} />}

        {tab === "reporting" && <><h2 className="pg-h2 mb-3">Reporting — last 30 days</h2><div className="overflow-x-auto"><table className="pg-table"><thead><tr><th>Property</th><th>Rooms</th><th>Bookings</th><th>Occupancy</th><th>Revenue</th><th>Rating</th></tr></thead><tbody>{gHotels.map(h => { const m = byHotel.get(h.id); return <tr key={h.id}><td><strong>{h.name}</strong></td><td>{m?.capacity ?? 0}</td><td>{m?.bookings ?? 0}</td><td>{m?.averageOccupancy == null ? "—" : `${Math.round(m.averageOccupancy)}%`}</td><td>{m?.revenue == null ? "Mixed currency" : compactMoney(m.revenue, m.currency ?? "INR")}</td><td>{m?.rating ? `${m.rating.toFixed(1)} (${m.reviewCount})` : "—"}</td></tr>; })}
          {group.group_settings.reporting === "consolidated" && gHotels.length > 0 && (() => { const ms = gHotels.map(h => byHotel.get(h.id)!).filter(Boolean), cap = ms.reduce((s, m) => s + m.availableNights, 0); return <tr className="font-semibold"><td>Group total</td><td>{ms.reduce((s, m) => s + m.capacity, 0)}</td><td>{ms.reduce((s, m) => s + m.bookings, 0)}</td><td>{cap ? `${Math.round(ms.reduce((s, m) => s + m.roomNights, 0) / cap * 100)}%` : "—"}</td><td>{compactMoney(ms.filter(m => m.currency === "INR").reduce((s, m) => s + (m.revenue ?? 0), 0))} (INR)</td><td /></tr>; })()}
          {!gHotels.length && <tr><td colSpan={6} className="pw-empty">Add properties to see group reports.</td></tr>}</tbody></table></div><p className="text-xs text-muted-foreground mt-2">Revenue is confirmed booking value; other currencies are kept separate.</p></>}

        {tab === "activity" && <ActivityList items={recent} owner={ownerName} userId={userId} />}
      </section>

      <div className="pg-bottom">
        <section className="pw-panel"><div className="mp-section-heading"><h2 className="pg-h2"><Settings className="h-5 w-5" />Group Settings</h2><Button size="sm" variant="outline" onClick={() => setTab("settings")}>Edit</Button></div>{settingsForm(true)}</section>
        <section className="pw-panel"><AccessTable compact group={group} owner={ownerName} onAdd={() => { setTab("access"); setMEmail(""); setMRole("group_admin"); setMemberOpen(true); }} /></section>
      </div>
    </>}

    <div className="pg-bottom">
      <section className="pw-panel"><div className="mp-section-heading"><h2 className="pg-h2"><History className="h-5 w-5" />Recent Group Activity</h2>{recent.length > 3 && <Button size="sm" variant="ghost" className="text-primary" onClick={() => setShowAllAct(!showAllAct)}>{showAllAct ? "Show Less" : <>View All Activity <ChevronsRight className="h-3.5 w-3.5" /></>}</Button>}</div><ActivityList items={recent.slice(0, showAllAct ? undefined : 3)} owner={ownerName} userId={userId} /></section>
      <section className="pw-panel pg-about"><h2 className="pg-h2"><Info className="h-5 w-5" />About Property Groups</h2><p className="font-medium mt-2">Property Groups help you:</p><ul>{["Organize multiple properties (e.g., brand, region, property type)", "Manage common settings, policies and amenities", "Assign team members and permissions at group level", "View consolidated performance and reports", "Maintain brand consistency across properties"].map(t => <li key={t}><CheckCircle2 />{t}</li>)}</ul></section>
    </div>

    <Dialog open={!!editor} onOpenChange={v => !v && setEditor(null)}><DialogContent className="partner-workspace min-h-0 max-w-lg"><DialogHeader><DialogTitle>{editor?.id ? "Edit Property Group" : "Create Property Group"}</DialogTitle></DialogHeader>{editor && <form className="space-y-3" onSubmit={async e => { e.preventDefault(); const ok = await run(async () => { const id = await saveGroup(userId, data.account.id, editor.id, { legal_name: editor.name, gstin: editor.gstin, settings: editor.s }, groups); setSel(id); }, editor.id ? "Group updated" : "Group created"); if (ok) setEditor(null); }}>
      <div><Label htmlFor="pg-name">Group name</Label><Input id="pg-name" required minLength={2} maxLength={160} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="pg-code">Group code</Label><Input id="pg-code" maxLength={12} placeholder="Auto" value={editor.s.code} onChange={e => setEditor({ ...editor, s: { ...editor.s, code: e.target.value.toUpperCase() } })} /></div><div><Label htmlFor="pg-type">Group type</Label><select id="pg-type" className="mp-select w-full" value={editor.s.group_type} onChange={e => setEditor({ ...editor, s: { ...editor.s, group_type: e.target.value as any } })}>{Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
      <div><Label htmlFor="pg-desc">Description</Label><Textarea id="pg-desc" maxLength={250} value={editor.s.description} onChange={e => setEditor({ ...editor, s: { ...editor.s, description: e.target.value } })} /><small className="text-muted-foreground">{editor.s.description.length} / 250</small></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="pg-status">Status</Label><select id="pg-status" className="mp-select w-full" value={editor.s.status} onChange={e => setEditor({ ...editor, s: { ...editor.s, status: e.target.value as any } })}><option value="active">Active</option><option value="draft">Draft</option></select></div><div><Label htmlFor="pg-gst">GSTIN (optional)</Label><Input id="pg-gst" maxLength={15} value={editor.gstin} onChange={e => setEditor({ ...editor, gstin: e.target.value.toUpperCase() })} /></div></div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={editor.s.primary} onCheckedChange={v => setEditor({ ...editor, s: { ...editor.s, primary: !!v } })} />Primary group</label>
      <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Group"}</Button></DialogFooter></form>}</DialogContent></Dialog>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="partner-workspace min-h-0 max-w-lg"><DialogHeader><DialogTitle>Add properties to {group?.legal_name}</DialogTitle></DialogHeader><div className="max-h-80 overflow-auto space-y-2">{ungrouped.map(h => <label key={h.id} className="flex items-center gap-2 text-sm border rounded p-2"><Checkbox checked={pick.includes(h.id)} onCheckedChange={v => setPick(p => v ? [...p, h.id] : p.filter(i => i !== h.id))} /><span className="flex-1">{h.name} <small className="text-muted-foreground">· {h.city}</small></span><small className="text-muted-foreground">{groups.find(g => g.id === h.business_id)?.legal_name ?? "Ungrouped"}</small></label>)}{!ungrouped.length && <p className="pw-empty">All your properties are already in this group.</p>}</div><DialogFooter><Button disabled={!pick.length || busy || !group} onClick={async () => { if (group && await run(() => assignHotels(userId, pick, group.id, null, data.hotels.filter(h => pick.includes(h.id)).map(h => h.name)), "Properties added")) setAddOpen(false); }}>Add {pick.length || ""} Properties</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={moveOpen} onOpenChange={setMoveOpen}><DialogContent className="partner-workspace min-h-0 max-w-md"><DialogHeader><DialogTitle>Move {checked.length} propert{checked.length === 1 ? "y" : "ies"}</DialogTitle></DialogHeader><Label htmlFor="pg-move">Destination group</Label><select id="pg-move" className="mp-select w-full" value={moveTo} onChange={e => setMoveTo(e.target.value)}><option value="">Choose a group…</option>{groups.filter(g => g.id !== group?.id).map(g => <option key={g.id} value={g.id}>{g.legal_name}</option>)}</select><DialogFooter><Button disabled={!moveTo || busy || !group} onClick={async () => { if (group && await run(() => assignHotels(userId, checked, moveTo, group.id, data.hotels.filter(h => checked.includes(h.id)).map(h => h.name)), "Properties moved")) setMoveOpen(false); }}>Move Properties</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={memberOpen} onOpenChange={setMemberOpen}><DialogContent className="partner-workspace min-h-0 max-w-md"><DialogHeader><DialogTitle>Add group team member</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (group && await run(() => addGroupMember(userId, data.account.id, group, gHotels.map(h => h.id), mEmail, mRole), "Member added")) setMemberOpen(false); }}><div><Label htmlFor="pg-memail">Email of a JAAGA X user</Label><Input id="pg-memail" type="email" required value={mEmail} onChange={e => setMEmail(e.target.value)} /></div><div><Label htmlFor="pg-mrole">Role</Label><select id="pg-mrole" className="mp-select w-full" value={mRole} onChange={e => setMRole(e.target.value as GroupRole)}>{GROUP_ROLES.map(r => <option key={r} value={r}>{GROUP_ROLE_LABEL[r]} — {GROUP_ROLE_SCOPE[r]}</option>)}</select></div><p className="text-xs text-muted-foreground">They get access to all {gHotels.length} properties in this group through their hotel team membership.</p><DialogFooter><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add Member"}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function AccessTable({ group, owner, onAdd, onRemove, compact }: { group: PropertyGroup; owner: string; onAdd: () => void; onRemove?: (m: GroupMember) => void; compact?: boolean }) {
  const cls: Record<string, string> = { group_owner: "pg-chip-purple", group_admin: "pg-chip-blue", revenue_manager: "pg-chip-amber", operations_manager: "pg-chip-green" };
  return <><div className="mp-section-heading"><h2 className="pg-h2"><Users className="h-5 w-5" />Access & Permissions <span className="font-normal text-sm">(Group Level)</span></h2><Button size="sm" variant="outline" onClick={onAdd}><UserPlus className="h-3.5 w-3.5 mr-1" />Manage Access</Button></div>
    <div className="overflow-x-auto"><table className="pg-table"><thead><tr><th>User / Role</th><th>Role</th><th>Access Scope</th>{!compact && <th />}</tr></thead><tbody>
      <tr><td><strong>{owner} (You)</strong></td><td><span className={`pg-chip ${cls.group_owner}`}>Group Owner</span></td><td>All Groups & Properties</td>{!compact && <td />}</tr>
      {(group.group_settings.members as GroupMember[]).map(m => <tr key={m.user_id}><td><strong>{m.name}</strong>{!compact && <small className="block text-muted-foreground">{m.email}</small>}</td><td><span className={`pg-chip ${cls[m.role]}`}>{GROUP_ROLE_LABEL[m.role]}</span></td><td>{group.legal_name} ({GROUP_ROLE_SCOPE[m.role]})</td>{!compact && <td><Button size="sm" variant="ghost" className="text-destructive" onClick={() => onRemove?.(m)}>Remove</Button></td>}</tr>)}
    </tbody></table></div>{!group.group_settings.members.length && <p className="text-xs text-muted-foreground mt-2">No team members yet.</p>}</>;
}

function BrandingForm({ group, userId, busy, onSave }: { group: PropertyGroup; userId: string; busy: boolean; onSave: (name: string, gstin: string, s: Partial<GroupSettings>) => void }) {
  const [name, setName] = useState(group.legal_name), [desc, setDesc] = useState(group.group_settings.description), [logo, setLogo] = useState(group.group_settings.logo_url), [up, setUp] = useState(false);
  return <form className="grid gap-4 md:grid-cols-[1fr_220px]" onSubmit={e => { e.preventDefault(); onSave(name, group.gstin ?? "", { description: desc, logo_url: logo }); }}>
    <div className="space-y-3"><div><Label htmlFor="br-name">Display name</Label><Input id="br-name" required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} /></div><div><Label htmlFor="br-desc">Description</Label><Textarea id="br-desc" maxLength={250} rows={4} value={desc} onChange={e => setDesc(e.target.value)} /><small className="text-muted-foreground">{desc.length} / 250</small></div><Button type="submit" disabled={busy || up}>Save Branding</Button></div>
    <div><Label>Group Logo</Label><div className="pg-box pg-logo">{logo ? <img src={logo} alt="Group logo" /> : <span className="text-xs text-muted-foreground">No logo</span>}</div><div className="flex gap-2 mt-2"><Button type="button" variant="outline" size="sm" asChild><label className="cursor-pointer">{up ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUp(true); try { setLogo(await uploadGroupLogo(userId, f)); toast.success("Logo uploaded — save to apply"); } catch (x) { toast.error(x instanceof Error ? x.message : "Upload failed"); } finally { setUp(false); e.target.value = ""; } }} /></label></Button>{logo && <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}>Remove</Button>}</div></div>
  </form>;
}

function ActivityList({ items, owner, userId }: { items: { id: string; action: string; created_at: string; actor_id: string }[]; owner: string; userId: string }) {
  if (!items.length) return <p className="pw-empty">No group activity yet.</p>;
  return <ul className="pg-activity">{items.map(a => <li key={a.id}><span><Users /></span><div><strong>{a.action}</strong><small>By {a.actor_id === userId ? owner : "Team member"} • {when(a.created_at)}</small></div></li>)}</ul>;
}
