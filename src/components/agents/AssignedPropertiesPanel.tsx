import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Bed, Bath, Maximize2, Phone, Mail,
  MessageSquare, ExternalLink, UserCheck, Sparkles, BadgeCheck,
  CalendarPlus, CheckCircle2, Clock, User as UserIcon, FileCheck2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import PropertyChat from "@/components/chat/PropertyChat";
import AgentEditPropertyDialog from "@/components/agents/AgentEditPropertyDialog";
import SectionErrorBoundary from "@/components/ui/SectionErrorBoundary";

interface AssignedTask {
  // task
  task_id?: string;
  task_status?: string;
  scheduled_visit_at?: string | null;
  // property
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  address?: string | null;
  description?: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  verification_status: string;
  submitted_by: string | null;
  agent_notes?: string | null;
  // owner
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_name?: string | null;
}

interface Props {
  agentId: string;
  agentUserId: string;
  agentName: string;
}

export default function AssignedPropertiesPanel({ agentId, agentUserId, agentName }: Props) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatTarget, setChatTarget] = useState<AssignedTask | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<AssignedTask | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

  // Submit-verification dialog state
  const [verifyTarget, setVerifyTarget] = useState<AssignedTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState("");
  const [editAgentNotes, setEditAgentNotes] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [editFullTarget, setEditFullTarget] = useState<AssignedTask | null>(null);

  useEffect(() => { load(); }, [agentId]);

  const load = async () => {
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("id, title, city, locality, address, description, price, area_sqft, bedrooms, bathrooms, bhk, type, listing_type, listed_by, rera_id, rera_document_url, pincode, furnishing, property_age, completion_stage, balconies, floor_number, total_floors, building_area_sqft, total_parking, maintenance_charges, booking_amount, price_negotiable, amenities, images, video_urls, verified, verification_status, submitted_by, agent_notes, agent_data, field_verification, original_snapshot")
      .eq("assigned_agent_id", agentId)
      .order("created_at", { ascending: false });

    const list = (props as any[]) || [];
    const propIds = list.map((p) => p.id);

    // Fetch matching agent_tasks for these properties
    const taskMap: Record<string, any> = {};
    if (propIds.length) {
      const { data: at } = await supabase
        .from("agent_tasks" as any)
        .select("id, property_id, status, metadata")
        .eq("agent_id", agentId)
        .in("property_id", propIds);
      (at || []).forEach((t: any) => { taskMap[t.property_id] = t; });
    }

    // Owners
    const ownerIds = Array.from(new Set(list.map((p) => p.submitted_by).filter(Boolean))) as string[];
    const ownersMap: Record<string, { name?: string; email?: string; phone?: string }> = {};
    if (ownerIds.length) {
      const { data: owners } = await supabase
        .from("signup_requests" as any)
        .select("user_id, full_name, email, phone")
        .in("user_id", ownerIds);
      (owners || []).forEach((o: any) => {
        ownersMap[o.user_id] = { name: o.full_name, email: o.email, phone: o.phone };
      });
    }

    setTasks(list.map((p) => {
      const t = taskMap[p.id];
      return {
        ...p,
        task_id: t?.id,
        task_status: t?.status || "pending",
        scheduled_visit_at: t?.metadata?.scheduled_visit_at || null,
        owner_name: p.submitted_by ? ownersMap[p.submitted_by]?.name || null : null,
        owner_email: p.submitted_by ? ownersMap[p.submitted_by]?.email || null : null,
        owner_phone: p.submitted_by ? ownersMap[p.submitted_by]?.phone || null : null,
      };
    }));
    setLoading(false);
  };

  const formatPrice = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${n.toLocaleString("en-IN")}`;

  const openSchedule = (t: AssignedTask) => {
    setScheduleTarget(t);
    if (t.scheduled_visit_at) {
      const d = new Date(t.scheduled_visit_at);
      setScheduleDate(d.toISOString().slice(0, 10));
      setScheduleTime(d.toTimeString().slice(0, 5));
    } else {
      setScheduleDate(""); setScheduleTime("");
    }
  };

  const saveSchedule = async () => {
    if (!scheduleTarget || !scheduleDate) { toast.error("Pick a date"); return; }
    const visitAt = new Date(`${scheduleDate}T${scheduleTime || "10:00"}`);
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    if (visitAt.getTime() < now.getTime()) {
      toast.error("Visit time must be in the future"); return;
    }
    if (visitAt.getTime() > slaDeadline.getTime()) {
      toast.error("SLA: visit must be scheduled within 48 hours");
      return;
    }
    const iso = visitAt.toISOString();
    const payload: any = {
      status: "in_progress",
      metadata: {
        scheduled_visit_at: iso,
        sla_deadline: slaDeadline.toISOString(),
        scheduled_at: now.toISOString(),
      },
      updated_at: now.toISOString(),
    };

    if (scheduleTarget.task_id) {
      await supabase.from("agent_tasks" as any).update(payload).eq("id", scheduleTarget.task_id);
    } else {
      await supabase.from("agent_tasks" as any).insert({
        agent_id: agentId,
        agent_user_id: agentUserId,
        property_id: scheduleTarget.id,
        task_type: "property_assigned",
        title: `Visit ${scheduleTarget.title}`,
        status: "in_progress",
        priority: "high",
        metadata: {
          scheduled_visit_at: iso,
          sla_deadline: slaDeadline.toISOString(),
          scheduled_at: now.toISOString(),
        },
      });
    }

    if (scheduleTarget.submitted_by) {
      await supabase.from("notifications").insert({
        user_id: scheduleTarget.submitted_by,
        type: "visit_scheduled",
        title: "Agent will visit your property",
        message: `${agentName} will visit your property "${scheduleTarget.title}" on ${visitAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
        link: `/property/${scheduleTarget.id}`,
      });
    }
    toast.success("Visit scheduled", {
      description: `Visit set for ${visitAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} • Within 48h SLA`,
    });
    setScheduleTarget(null);
    load();
  };

  const markCompleted = async (t: AssignedTask) => {
    if (!confirm("Mark this visit as completed?")) return;
    const payload: any = {
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (t.task_id) {
      await supabase.from("agent_tasks" as any).update(payload).eq("id", t.task_id);
    } else {
      await supabase.from("agent_tasks" as any).insert({
        agent_id: agentId,
        agent_user_id: agentUserId,
        property_id: t.id,
        task_type: "property_assigned",
        title: `Visit ${t.title}`,
        status: "completed",
        priority: "high",
        completed_at: new Date().toISOString(),
      });
    }
    if (t.submitted_by) {
      await supabase.from("notifications").insert({
        user_id: t.submitted_by,
        type: "visit_completed",
        title: "Agent completed property visit",
        message: `${agentName} marked the visit to "${t.title}" as completed.`,
        link: `/property/${t.id}`,
      });
    }
    toast.success("Marked as completed");
    load();
  };

  const openVerify = (t: AssignedTask) => {
    setVerifyTarget(t);
    setEditTitle(t.title || "");
    setEditPrice(String(t.price ?? ""));
    setEditArea(String(t.area_sqft ?? ""));
    setEditDescription(t.description || "");
    setEditImages(Array.isArray(t.images) ? t.images.join("\n") : "");
    setEditAgentNotes(t.agent_notes || "");
  };

  const submitVerification = async () => {
    if (!verifyTarget) return;
    if (!editAgentNotes.trim()) { toast.error("Please add agent notes from the visit"); return; }
    const priceNum = Number(editPrice);
    const areaNum = editArea ? Number(editArea) : null;
    if (!editTitle.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Title and a valid price are required");
      return;
    }
    setSubmittingVerify(true);

    const original_snapshot = {
      title: verifyTarget.title,
      price: verifyTarget.price,
      area_sqft: verifyTarget.area_sqft,
      description: verifyTarget.description,
      images: Array.isArray(verifyTarget.images) ? verifyTarget.images : [],
      snapshot_at: new Date().toISOString(),
    };
    const newImages = editImages.split(/\n+/).map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("properties")
      .update({
        title: editTitle.trim(),
        price: priceNum,
        area_sqft: areaNum,
        description: editDescription,
        images: newImages,
        agent_notes: editAgentNotes.trim(),
        original_snapshot,
        verification_status: "agent_verified_pending",
        verified: false,
        agent_submitted_at: new Date().toISOString(),
      } as any)
      .eq("id", verifyTarget.id);

    if (error) {
      setSubmittingVerify(false);
      toast.error(error.message);
      return;
    }

    // Mark task completed
    if (verifyTarget.task_id) {
      await supabase.from("agent_tasks" as any).update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", verifyTarget.task_id);
    } else {
      await supabase.from("agent_tasks" as any).insert({
        agent_id: agentId,
        agent_user_id: agentUserId,
        property_id: verifyTarget.id,
        task_type: "property_assigned",
        title: `Verify ${verifyTarget.title}`,
        status: "completed",
        priority: "high",
        completed_at: new Date().toISOString(),
      });
    }

    // Notify admins
    const { data: admins } = await supabase
      .from("user_roles" as any)
      .select("user_id")
      .eq("role", "admin");
    if (admins && admins.length) {
      await supabase.from("notifications").insert(
        admins.map((a: any) => ({
          user_id: a.user_id,
          type: "agent_verified",
          title: "Agent submitted property for final approval",
          message: `${agentName} verified "${editTitle.trim()}" and submitted it for admin approval.`,
          link: `/admin`,
        }))
      );
    }

    // Notify seller
    if (verifyTarget.submitted_by) {
      await supabase.from("notifications").insert({
        user_id: verifyTarget.submitted_by,
        type: "agent_verified",
        title: "Property submitted for final approval",
        message: `${agentName} completed the visit and submitted "${editTitle.trim()}" for admin's final approval.`,
        link: `/property/${verifyTarget.id}`,
      });
    }

    setSubmittingVerify(false);
    setVerifyTarget(null);
    toast.success("Submitted for admin approval");
    load();
  };

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "completed" ? t.task_status === "completed" : t.task_status !== "completed"
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            My Tasks — Assigned Properties
            <Badge variant="outline" className="ml-1">{filtered.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Properties assigned to you by admin. Coordinate with the seller, schedule a visit, and mark it complete.
          </p>
        </div>
        <div className="flex gap-1">
          {(["active", "completed", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="h-7 text-xs capitalize" onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No {filter} tasks</p>
            <p className="text-xs text-muted-foreground">
              When admin assigns a seller's property to you, it will appear here as a task.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {filtered.map((p, i) => {
              const img = (Array.isArray(p.images) && p.images[0]) ||
                "";
              const isCompleted = p.task_status === "completed";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative rounded-xl border bg-card hover:shadow-md transition-all p-3 ${
                    isCompleted ? "opacity-75 border-emerald-500/30" : "hover:border-emerald-500/40"
                  }`}
                >
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    {isCompleted ? (
                      <Badge className="bg-emerald-500 text-white text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
                    ) : p.scheduled_visit_at ? (
                      <Badge className="bg-blue-500 text-white text-[10px]"><Clock className="h-3 w-3 mr-1" />Visit {new Date(p.scheduled_visit_at).toLocaleDateString()}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pending Visit</Badge>
                    )}
                    {p.verified && <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600"><BadgeCheck className="h-3 w-3 mr-0.5" />Verified</Badge>}
                  </div>

                  <div className="flex gap-3">
                    <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden">
                      <img src={img} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate leading-tight">{p.title}</p>
                        <p className="text-xs font-bold text-emerald-600 shrink-0">{formatPrice(p.price)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />{p.locality}, {p.city}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        {p.bedrooms != null && <span className="flex items-center gap-0.5"><Bed className="h-2.5 w-2.5" />{p.bedrooms}</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-0.5"><Bath className="h-2.5 w-2.5" />{p.bathrooms}</span>}
                        {p.area_sqft != null && <span className="flex items-center gap-0.5"><Maximize2 className="h-2.5 w-2.5" />{p.area_sqft} sqft</span>}
                        {p.type && <span className="px-1.5 py-0.5 rounded bg-muted">{p.type}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Seller details */}
                  <div className="mt-3 p-2 rounded-lg bg-muted/40 border">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Seller Details</p>
                    <div className="flex items-center gap-2 text-xs">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{p.owner_name || "Owner"}</span>
                    </div>
                    {p.owner_phone && (
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`tel:${p.owner_phone}`} className="hover:underline">{p.owner_phone}</a>
                      </div>
                    )}
                    {p.owner_email && (
                      <div className="flex items-center gap-2 text-xs mt-0.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${p.owner_email}`} className="hover:underline truncate">{p.owner_email}</a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={!p.owner_phone}
                      onClick={() => p.owner_phone && (window.location.href = `tel:${p.owner_phone}`)}
                    >
                      <Phone className="h-3 w-3 mr-1" />Call Seller
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => openSchedule(p)}
                      disabled={isCompleted}
                    >
                      <CalendarPlus className="h-3 w-3 mr-1" />
                      {p.scheduled_visit_at ? "Reschedule" : "Schedule"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => setChatTarget(p)}
                      disabled={!p.submitted_by}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />Chat
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-[11px] col-span-2 sm:col-span-3 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setEditFullTarget(p)}
                      disabled={p.verification_status === "agent_verified_pending"}
                      title="Open full sectioned form to verify, correct, and add fields"
                    >
                      <FileCheck2 className="h-3 w-3 mr-1" />
                      {p.verification_status === "agent_verified_pending"
                        ? "Submitted for Approval"
                        : "Edit Property & Submit Verification"}
                    </Button>
                  </div>

                  <button
                    className="mt-2 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => window.open(`/property/${p.id}`, "_blank")}
                  >
                    View full property <ExternalLink className="h-3 w-3" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>

      {chatTarget && chatTarget.submitted_by && (
        <PropertyChat
          open={!!chatTarget}
          onOpenChange={(o) => !o && setChatTarget(null)}
          propertyId={chatTarget.id}
          propertyTitle={chatTarget.title}
          agentUserId={agentUserId}
          sellerUserId={chatTarget.submitted_by}
          currentUserId={agentUserId}
          counterpart={{
            name: chatTarget.owner_name || "Owner",
            phone: chatTarget.owner_phone,
            role: "seller",
          }}
        />
      )}

      <Dialog open={!!scheduleTarget} onOpenChange={(o) => !o && setScheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Visit</DialogTitle>
            <DialogDescription>
              Set a date & time to visit "{scheduleTarget?.title}". The seller will be notified instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span><strong>SLA:</strong> Visit must occur within <strong>48 hours</strong> from now (by {new Date(Date.now() + 48 * 3600 * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}).</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Date</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                max={new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Time</label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
            {scheduleDate && (
              <p className="text-[11px] text-muted-foreground">
                Visit scheduled for: <strong>{new Date(`${scheduleDate}T${scheduleTime || "10:00"}`).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleTarget(null)}>Cancel</Button>
            <Button onClick={saveSchedule} className="bg-emerald-500 hover:bg-emerald-600 text-white">Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Verification dialog */}
      <Dialog open={!!verifyTarget} onOpenChange={(o) => !o && !submittingVerify && setVerifyTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Verification</DialogTitle>
            <DialogDescription>
              Edit any fields you corrected on-site, add notes, then submit for admin's final approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Price (₹)</label>
                <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Area (sqft)</label>
                <Input type="number" value={editArea} onChange={(e) => setEditArea(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Image URLs (one per line)</label>
              <Textarea
                rows={3}
                value={editImages}
                onChange={(e) => setEditImages(e.target.value)}
                placeholder="https://...jpg"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Agent Notes <span className="text-red-500">*</span></label>
              <Textarea
                rows={3}
                value={editAgentNotes}
                onChange={(e) => setEditAgentNotes(e.target.value)}
                placeholder="On-site observations, condition, accuracy of seller's claims, etc."
              />
            </div>
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-2.5 text-[11px] text-blue-700 dark:text-blue-400">
              On submit, the property status becomes <strong>Agent Verified — Pending Admin Approval</strong>. Admin will compare your edits with the original submission.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submittingVerify} onClick={() => setVerifyTarget(null)}>Cancel</Button>
            <Button onClick={submitVerification} disabled={submittingVerify} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileCheck2 className="h-4 w-4 mr-1" />
              {submittingVerify ? "Submitting…" : "Submit Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SectionErrorBoundary title="Edit Property" description="The form encountered an issue. Try again or refresh.">
        <AgentEditPropertyDialog
          open={!!editFullTarget}
          onOpenChange={(o) => !o && setEditFullTarget(null)}
          property={editFullTarget}
          agentName={agentName}
          agentId={agentId}
          agentUserId={agentUserId}
          onSubmitted={load}
        />
      </SectionErrorBoundary>
    </Card>
  );
}
