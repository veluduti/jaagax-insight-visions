import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LANGUAGE_OPTIONS } from "@/lib/agentPrivacy";

/**
 * Lets the customer pick the language they want to be served in.
 * Agent assignment ranks agents who speak this language first.
 */
export default function PreferredLanguageCard() {
  const { user } = useAuth();
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setValue(data?.preferred_language || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async (lang: string) => {
    if (!user?.id) return;
    const next = value === lang ? "" : lang;
    setValue(next);
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ preferred_language: next || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Could not save language preference");
    else toast.success(next ? `Preferred language set to ${next}` : "Language preference cleared");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-4 w-4 text-primary" />
          Preferred Language
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          We assign an agent who speaks your language, so there is never a communication gap.
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <Button
              key={lang}
              type="button"
              size="sm"
              disabled={saving}
              variant={value === lang ? "default" : "outline"}
              onClick={() => save(lang)}
            >
              {lang}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
