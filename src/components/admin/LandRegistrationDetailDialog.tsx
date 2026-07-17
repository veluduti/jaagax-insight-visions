import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ExternalLink, MapPin, Ruler, User, Phone, Mail, Calendar, Droplets, Trees, Zap, Home } from "lucide-react";

interface Props {
  registrationId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

async function signedUrl(url: string): Promise<string> {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const bucketMatch = url.match(/^([^/]+)\/(.+)$/);
  const bucket = bucketMatch ? bucketMatch[1] : "nl-land";
  const path = bucketMatch ? bucketMatch[2] : url.replace(/^\/+/, "");
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
  return data?.signedUrl || url;
}

function Field({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value)
    ? value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
    : typeof value === "object"
    ? JSON.stringify(value, null, 2)
    : String(value);
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{display}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
        <Icon className="h-4 w-4 text-emerald-500" />
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function LandRegistrationDetailDialog({ registrationId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [reg, setReg] = useState<any>(null);
  const [uploads, setUploads] = useState<Array<{ id: string; kind: string; file_url: string; file_name?: string; signed?: string }>>([]);
  const [conversation, setConversation] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !registrationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb: any = supabase;
      const [{ data: regData }, { data: ups }, { data: convo }] = await Promise.all([
        sb.from("nl_land_registrations").select("*").eq("id", registrationId).maybeSingle(),
        sb.from("nl_land_uploads").select("*").eq("registration_id", registrationId).order("created_at"),
        sb.from("nl_land_conversations").select("*").eq("registration_id", registrationId).order("created_at"),
      ]);
      if (cancelled) return;
      setReg(regData);
      const signedUps = await Promise.all(
        (ups || []).map(async (u: any) => ({ ...u, signed: await signedUrl(u.file_url) })),
      );
      if (cancelled) return;
      setUploads(signedUps);
      setConversation(convo || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, registrationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Land Registration Details</DialogTitle>
          <DialogDescription>
            Complete submission by the land owner including all AI-collected data and uploaded documents.
          </DialogDescription>
        </DialogHeader>

        {loading || !reg ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{reg.status}</Badge>
              {reg.assigned_admin_role && <Badge variant="outline">→ {reg.assigned_admin_role.replace("_", " ")}</Badge>}
              <span className="text-xs text-muted-foreground">
                Submitted: {reg.submitted_at ? new Date(reg.submitted_at).toLocaleString() : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Completion: {reg.completion_pct}%</span>
            </div>

            <Section title="Owner" icon={User}>
              <Field label="Name" value={reg.owner_name} />
              <Field label="Phone" value={reg.owner_phone} />
              <Field label="Email" value={reg.owner_email} />
            </Section>

            <Section title="Location" icon={MapPin}>
              <Field label="Village" value={reg.village} />
              <Field label="Mandal" value={reg.mandal} />
              <Field label="District" value={reg.district} />
              <Field label="State" value={reg.state} />
              <Field label="Country" value={reg.country} />
              <Field label="Latitude" value={reg.latitude} />
              <Field label="Longitude" value={reg.longitude} />
              {reg.google_map_url && (
                <Field
                  label="Map link"
                  value={
                    <a href={reg.google_map_url} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                      Open in Google Maps
                    </a>
                  }
                />
              )}
            </Section>

            <Section title="Land Details" icon={Ruler}>
              <Field label="Total area" value={reg.total_area ? `${reg.total_area} ${reg.area_unit || ""}` : null} />
              <Field label="Survey numbers" value={reg.survey_numbers} />
              <Field label="Soil" value={reg.soil} />
              <Field label="Terrain" value={reg.terrain} />
              <Field label="Current status" value={reg.current_status} />
              <Field label="Available from" value={reg.available_from} />
              <Field label="Current crop" value={reg.current_crop} />
              <Field label="Last crop" value={reg.last_crop} />
              <Field label="Crop history" value={reg.crop_history} />
              <Field label="Lease reason" value={reg.lease_reason} />
            </Section>

            <Section title="Water & Infrastructure" icon={Droplets}>
              <Field label="Water sources" value={reg.water_sources} />
              <Field label="Water availability" value={reg.water_availability} />
              <Field label="Borewell count" value={reg.borewell_count} />
              <Field label="Infrastructure" value={reg.infrastructure} />
              <Field label="Road access" value={reg.road_access} />
              <Field label="Electricity" value={reg.electricity} />
              <Field label="Vehicle access" value={reg.vehicle_access} />
            </Section>

            <Section title="Environment & Nearby" icon={Trees}>
              <Field label="Local environment" value={reg.local_environment} />
              <Field label="Nearby attractions" value={reg.nearby_attractions} />
              <Field label="Nearby facilities" value={reg.nearby_facilities} />
            </Section>

            <Section title="Suitability & Project" icon={Home}>
              <Field label="Farming readiness" value={reg.farming_readiness} />
              <Field label="Suitable for" value={reg.suitable_for} />
              <Field label="Opportunity ratings" value={reg.opportunity_ratings} />
              <Field label="School activities" value={reg.school_activities} />
              <Field label="Stay accommodation" value={reg.stay_accommodation} />
              <Field label="Stay facilities" value={reg.stay_facilities} />
              <Field label="Stay experience" value={reg.stay_experience} />
              <Field label="Project tenure" value={reg.project_tenure} />
              <Field label="Project duration" value={reg.project_duration} />
              <Field label="Project age" value={reg.project_age} />
            </Section>

            <Section title={`Documents & Photos (${uploads.length})`} icon={FileText}>
              {uploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {uploads.map((u) => {
                    const isImg = /\.(png|jpe?g|webp|gif|avif)$/i.test(u.file_url) || /image/i.test(u.kind);
                    return (
                      <a
                        key={u.id}
                        href={u.signed}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-lg border hover:border-emerald-500/60 overflow-hidden bg-muted/30"
                      >
                        {isImg ? (
                          <img src={u.signed} alt={u.file_name || u.kind} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center bg-muted">
                            <FileText className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-2 text-xs">
                          <div className="font-medium truncate flex items-center gap-1">
                            {u.kind} <ExternalLink className="h-3 w-3 opacity-60 ml-auto" />
                          </div>
                          {u.file_name && <div className="text-muted-foreground truncate">{u.file_name}</div>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </Section>

            {reg.extra && Object.keys(reg.extra || {}).length > 0 && (
              <Section title="Extra AI-Collected Data" icon={FileText}>
                <pre className="text-xs bg-muted/40 rounded p-3 overflow-x-auto">
                  {JSON.stringify(reg.extra, null, 2)}
                </pre>
              </Section>
            )}

            {conversation.length > 0 && (
              <Section title={`AI Conversation Summary (${conversation.length} messages)`} icon={FileText}>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conversation.map((m: any) => (
                    <div key={m.id} className="text-xs">
                      <span className="font-semibold capitalize">{m.role || "msg"}:</span>{" "}
                      <span className="text-muted-foreground">{m.content || m.message || JSON.stringify(m)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
