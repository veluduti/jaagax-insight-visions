import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { askAssistant, type AssistantRole } from "@/services/hospitality/growthService";

const SAMPLES: Record<AssistantRole, string[]> = {
  owner: ["How can I get more bookings this month?", "Write a short description for my property", "How should I reply to a bad review?"],
  staff: ["Guest arrived early, room not ready — what do I do?", "What order should I clean rooms in?"],
  customer: ["How do I cancel my booking?", "What should I check at check-in?"],
  admin: ["How should I handle a refund dispute?", "What to check before approving a partner?"],
};

export default function AssistantPanel({ role, context, title = "Ask JAAGA helper" }: { role: AssistantRole; context?: string; title?: string }) {
  const [q, setQ] = useState(""); const [a, setA] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const ask = async (text = q) => {
    if (!text.trim() || busy) return;
    setQ(text); setBusy(true); setErr(""); setA("");
    try { setA(await askAssistant(role, text, context)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Card><CardContent className="space-y-2 p-3">
      <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES[role].map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">{s}</button>)}
      </div>
      <Textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question…" maxLength={1500} />
      <Button size="sm" onClick={() => ask()} disabled={busy || !q.trim()}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Ask</Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {a && <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{a}</div>}
    </CardContent></Card>
  );
}
