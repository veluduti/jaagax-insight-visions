import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface Prefs {
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  whatsapp_phone: string | null;
  sms_phone: string | null;
  email_address: string | null;
}

const defaults: Prefs = {
  whatsapp_enabled: false,
  sms_enabled: false,
  email_enabled: true,
  whatsapp_phone: "",
  sms_phone: "",
  email_address: "",
};

export default function AlertChannelsSettings({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const sb: any = supabase;
      const { data } = await sb.from("alert_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (data) setPrefs({ ...defaults, ...data });
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb.from("alert_preferences").upsert(
      {
        user_id: userId,
        ...prefs,
        whatsapp_phone: prefs.whatsapp_phone || null,
        sms_phone: prefs.sms_phone || null,
        email_address: prefs.email_address || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Alert preferences saved");
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-emerald-500" /> Alert Channels
        </CardTitle>
        <CardDescription>Choose how we send you property and account updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* In-app */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Mobile Notifications</p>
              <p className="text-xs text-muted-foreground">In-app bell (always on)</p>
            </div>
          </div>
          <Switch checked disabled />
        </div>

        {/* WhatsApp */}
        <div className="p-3 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Instant alerts via Twilio</p>
              </div>
            </div>
            <Switch
              checked={prefs.whatsapp_enabled}
              onCheckedChange={(v) => setPrefs({ ...prefs, whatsapp_enabled: v })}
            />
          </div>
          {prefs.whatsapp_enabled && (
            <Input
              placeholder="+91 9XXXXXXXXX"
              value={prefs.whatsapp_phone || ""}
              onChange={(e) => setPrefs({ ...prefs, whatsapp_phone: e.target.value })}
            />
          )}
        </div>

        {/* SMS */}
        <div className="p-3 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">SMS</p>
                <p className="text-xs text-muted-foreground">Text alerts via Twilio</p>
              </div>
            </div>
            <Switch checked={prefs.sms_enabled} onCheckedChange={(v) => setPrefs({ ...prefs, sms_enabled: v })} />
          </div>
          {prefs.sms_enabled && (
            <Input
              placeholder="+91 9XXXXXXXXX"
              value={prefs.sms_phone || ""}
              onChange={(e) => setPrefs({ ...prefs, sms_phone: e.target.value })}
            />
          )}
        </div>

        {/* Email */}
        <div className="p-3 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Daily digest & important updates</p>
              </div>
            </div>
            <Switch checked={prefs.email_enabled} onCheckedChange={(v) => setPrefs({ ...prefs, email_enabled: v })} />
          </div>
          {prefs.email_enabled && (
            <Input
              type="email"
              placeholder="you@example.com"
              value={prefs.email_address || ""}
              onChange={(e) => setPrefs({ ...prefs, email_address: e.target.value })}
            />
          )}
        </div>

        <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full">
          {saving ? "Saving…" : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
