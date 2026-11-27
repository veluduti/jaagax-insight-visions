import { MapPin } from "lucide-react";
import type { PortalProperty } from "./usePortal";
import { typeLabel } from "./usePortal";
export default function PortalShell({ p, title, children }: { p: PortalProperty; title: string; children: React.ReactNode }) {
  return <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-b from-violet-200 via-violet-100 to-white overflow-hidden">
    {p.image && <img src={p.image} alt="" className="absolute inset-x-0 bottom-0 h-1/2 w-full object-cover opacity-60" onError={e => (e.currentTarget.style.display = "none")} />}
    <div className="relative w-full max-w-md">
      <div className="text-center mb-5">
        <div className="text-4xl font-black tracking-tight text-slate-900">JAAGA <span className="text-emerald-500">X</span></div>
        <div className="text-xs text-slate-600 -mt-1">Stays</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Property Access Portal</h1>
        <p className="mt-1 font-medium text-slate-800">{p.name}</p>
        <p className="text-sm text-slate-600 flex items-center justify-center gap-1"><MapPin className="h-4 w-4" />{[p.locality, p.city].filter(Boolean).join(", ")} · {typeLabel(p.business_types)}{p.property_reference ? ` · ${p.property_reference}` : ""}</p>
      </div>
      <div className="rounded-2xl bg-white/95 shadow-xl p-6 space-y-4"><h2 className="text-lg font-semibold text-center">{title}</h2>{children}
        <p className="text-xs text-center text-muted-foreground">Access is restricted to authorised staff members only.</p></div>
    </div>
  </div>;
}
