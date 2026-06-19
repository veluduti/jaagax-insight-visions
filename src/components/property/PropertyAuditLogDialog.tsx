import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Entry = {
  id: number;
  action: string | null;
  from_status: string | null;
  to_status: string | null;
  field_changes: any;
  metadata: any;
  actor_id: string | null;
  created_at: string;
  actor_name?: string;
};

interface Props {
  propertyId: string;
  propertyTitle?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function PropertyAuditLogDialog({ propertyId, propertyTitle, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Entry[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase.from as any)("property_audit_log")
          .select("id, action, from_status, to_status, field_changes, metadata, actor_id, created_at")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const list: Entry[] = data || [];
        const actorIds = Array.from(new Set(list.map((r) => r.actor_id).filter(Boolean))) as string[];
        if (actorIds.length) {
          const { data: profs } = await (supabase.from as any)("profiles")
            .select("id, name").in("id", actorIds);
          const map: Record<string, string> = {};
          (profs || []).forEach((p: any) => { map[p.id] = p.name; });
          list.forEach((r) => { if (r.actor_id) r.actor_name = map[r.actor_id]; });
        }
        if (!cancelled) setRows(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, propertyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Audit log
            {propertyTitle && <span className="text-sm font-normal text-muted-foreground truncate">· {propertyTitle}</span>}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit entries yet.</div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <ol className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="border border-border rounded-md p-3 bg-muted/30">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">{r.action || "update"}</Badge>
                    {r.from_status && r.to_status && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="font-medium text-foreground">{r.from_status}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">{r.to_status}</span>
                      </span>
                    )}
                    <span className="ml-auto text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actor: {r.actor_name || r.actor_id?.slice(0, 8) || "system"}
                  </div>
                  {r.field_changes && Object.keys(r.field_changes).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-primary">Field changes</summary>
                      <pre className="mt-1 text-[11px] bg-background p-2 rounded overflow-auto max-h-48 border border-border">
                        {JSON.stringify(r.field_changes, null, 2)}
                      </pre>
                    </details>
                  )}
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer text-primary">Metadata</summary>
                      <pre className="mt-1 text-[11px] bg-background p-2 rounded overflow-auto max-h-48 border border-border">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
