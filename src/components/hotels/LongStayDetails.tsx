import { customerView } from "@/config/accommodationTypes";
import { Badge } from "@/components/ui/badge";
import { BedDouble, ShieldCheck, Sparkles } from "lucide-react";

export interface LongStayDetailRoom {
  id: string;
  room_type: string;
  accommodation_kind?: string | null;
  stay_unit?: string | null;
  attributes?: Record<string, unknown> | null;
  weekly_price?: number | null;
  monthly_price?: number | null;
  description?: string | null;
  amenities?: unknown;
  cancellation_policy?: string | null;
  max_occupancy?: number | null;
}

/** Shares the partner field definitions with customer details; never invents missing facilities or policies. */
export default function LongStayDetails({ room, businessTypes, compact = false }: {
  room: LongStayDetailRoom; businessTypes?: string[]; compact?: boolean;
}) {
  const { kind } = customerView(room, businessTypes);
  const attrs = room.attributes || {};
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const field of kind.fields) {
    const raw = attrs[field.key];
    if (raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && !raw.length)) continue;
    if (field.key === "advance_amount" && !String(attrs.advance_mode || "").toLowerCase().startsWith("fixed")) continue;
    const value = typeof raw === "boolean" ? (raw ? "Yes" : "No")
      : Array.isArray(raw) ? raw.join(", ")
      : field.label.includes("₹") ? `₹${Number(raw).toLocaleString("en-IN")}`
      : String(raw);
    const section = field.section || "Accommodation details";
    const rows = groups.get(section) || [];
    rows.push({ label: field.label.replace(/\s*₹/g, ""), value });
    groups.set(section, rows);
  }
  const amenities = Array.isArray(room.amenities) ? room.amenities.filter((v): v is string => typeof v === "string")
    : room.amenities && typeof room.amenities === "object" ? Object.entries(room.amenities).filter(([, v]) => !!v).map(([k]) => k) : [];
  return (
    <div className={`space-y-4 text-foreground ${compact ? "text-xs" : "text-sm"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary"><BedDouble className="mr-1 h-3.5 w-3.5" />{kind.label}</Badge>
        <span className="text-muted-foreground">Rent per {kind.unit === "bed" ? "bed" : "room"}</span>
      </div>
      {room.description && <p className="whitespace-pre-wrap break-words leading-relaxed text-muted-foreground">{room.description}</p>}
      {[...groups].map(([section, rows]) => (
        <section key={section} className="space-y-2 border-t border-border pt-3">
          <h3 className="font-semibold">{section}</h3>
          <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {rows.map(({ label, value }) => <div key={label} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium">{value}</dd>
            </div>)}
          </dl>
        </section>
      ))}
      {amenities.length > 0 && <section className="space-y-2 border-t border-border pt-3">
        <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />Additional amenities</h3>
        <div className="flex flex-wrap gap-2">{amenities.map((a) => <Badge key={a} variant="outline" className="whitespace-normal">{a}</Badge>)}</div>
      </section>}
      {room.cancellation_policy && <section className="space-y-1 border-t border-border pt-3">
        <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Cancellation policy</h3>
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{room.cancellation_policy}</p>
      </section>}
      {!groups.size && <p className="text-muted-foreground">Additional accommodation details have not been provided by the property.</p>}
    </div>
  );
}