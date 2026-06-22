import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  agentId: string;
  agentName?: string | null;
  propertyId: string;
  buyerId: string;
  bookingId?: string | null;
  /** Compact inline trigger style. */
  variant?: "button" | "inline";
  onSubmitted?: () => void;
}

interface ExistingRating {
  id: string;
  rating: number;
  comment: string | null;
}

/**
 * Lets the property owner rate the verification agent. Persists to agent_ratings;
 * trigger `trg_recalc_agent_rating` auto-updates the agent's avg rating ranking.
 */
export default function RateAgentDialog({
  agentId, agentName, propertyId, buyerId, bookingId = null,
  variant = "button", onSubmitted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<ExistingRating | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchExisting = async () => {
      let q: any = (supabase.from as any)("agent_ratings")
        .select("id, rating, comment")
        .eq("buyer_id", buyerId)
        .eq("agent_id", agentId)
        .eq("property_id", propertyId)
        .limit(1);
      const { data } = await q;
      if (cancelled) return;
      const row = (data || [])[0] || null;
      if (row) {
        setExisting(row);
        setStars(row.rating);
        setComment(row.comment || "");
      }
      setLoaded(true);
    };
    if (agentId && buyerId && propertyId) fetchExisting();
    return () => { cancelled = true; };
  }, [agentId, buyerId, propertyId]);

  const submit = async () => {
    if (stars < 1) {
      toast({ title: "Pick a star rating", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        agent_id: agentId,
        buyer_id: buyerId,
        property_id: propertyId,
        booking_id: bookingId,
        rating: stars,
        comment: comment.trim() || null,
        review: comment.trim() || null,
      };
      let error: any = null;
      if (existing) {
        ({ error } = await (supabase.from as any)("agent_ratings")
          .update({ rating: stars, comment: comment.trim() || null, review: comment.trim() || null })
          .eq("id", existing.id));
      } else {
        const { data, error: insErr } = await (supabase.from as any)("agent_ratings")
          .insert(payload).select("id, rating, comment").maybeSingle();
        error = insErr;
        if (data) setExisting(data);
      }
      if (error) throw error;
      toast({ title: existing ? "Rating updated" : "Thanks for rating!", description: "Agent ranking refreshed." });
      setOpen(false);
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: "Couldn't save rating", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const trigger = variant === "inline" ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i}
          className={`h-3.5 w-3.5 ${existing && i <= existing.rating ? "fill-amber-400 text-amber-400" : "text-amber-400/50"}`}
        />
      ))}
      <span>{existing ? `Your rating: ${existing.rating}/5 · Edit` : "Rate agent"}</span>
    </button>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-xs">
      <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" />
      {existing ? `Your rating: ${existing.rating}/5` : "Rate agent"}
    </Button>
  );

  return (
    <>
      {loaded ? trigger : <span className="text-xs text-muted-foreground">…</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {agentName || "your agent"}</DialogTitle>
            <DialogDescription>
              How was the verification experience? Your rating updates the agent's ranking.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-1 py-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(i)}
                className="p-1"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    i <= (hover || stars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share details (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {existing ? "Update rating" : "Submit rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
