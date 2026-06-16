import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Megaphone,
  Users,
  Calendar,
  CreditCard,
  Wallet,
  Building2,
  UserPlus,
} from "lucide-react";
import { NotificationType } from "@/services/notificationService";

interface Pref {
  key: NotificationType;
  label: string;
  description: string;
  icon: any;
}

const TYPES: Pref[] = [
  { key: "platform_announcement", label: "Platform Announcements", description: "Product updates, news, and tips", icon: Megaphone },
  { key: "lead_update", label: "Lead Updates", description: "New enquiries and lead activity", icon: Users },
  { key: "visit_reminder", label: "Visit Reminders", description: "Upcoming site visits and confirmations", icon: Calendar },
  { key: "subscription_expiry", label: "Subscription Expiry", description: "Plan renewals and expiry alerts", icon: CreditCard },
  { key: "wallet_low_balance", label: "Wallet Low Balance", description: "Get notified when balance drops below ₹500", icon: Wallet },
  { key: "project_update", label: "Project Updates", description: "Construction progress and approvals", icon: Building2 },
  { key: "team_assignment", label: "Team Assignments", description: "Tasks assigned to your team", icon: UserPlus },
];

const STORAGE_KEY = "builder_notification_prefs";

type PrefState = Record<NotificationType, { email: boolean; push: boolean }>;

const defaultState: PrefState = TYPES.reduce((acc, t) => {
  acc[t.key] = { email: true, push: true };
  return acc;
}, {} as PrefState);

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<PrefState>(defaultState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const toggle = (k: NotificationType, channel: "email" | "push") => {
    setPrefs((p) => ({ ...p, [k]: { ...p[k], [channel]: !p[k][channel] } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      toast({ title: "Preferences saved" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden sm:grid grid-cols-[1fr_80px_80px] gap-4 text-xs text-muted-foreground font-medium pb-2 border-b">
          <span>Type</span>
          <span className="text-center">Email</span>
          <span className="text-center">In-app</span>
        </div>

        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px] gap-4 items-center py-2"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <div className="flex sm:justify-center gap-2 items-center">
                <span className="text-xs sm:hidden">Email</span>
                <Switch
                  checked={prefs[t.key].email}
                  onCheckedChange={() => toggle(t.key, "email")}
                />
              </div>
              <div className="flex sm:justify-center gap-2 items-center">
                <span className="text-xs sm:hidden">In-app</span>
                <Switch
                  checked={prefs[t.key].push}
                  onCheckedChange={() => toggle(t.key, "push")}
                />
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
