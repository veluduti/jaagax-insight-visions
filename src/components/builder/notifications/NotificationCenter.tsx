import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  Archive,
  Megaphone,
  Users,
  Calendar,
  CreditCard,
  Wallet,
  Building2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner"; // FIXED: Changed to sonner
import notificationService, { Notification, NotificationType } from "@/services/notificationService";

const ICONS: Record<string, any> = {
  platform_announcement: Megaphone,
  lead_update: Users,
  visit_reminder: Calendar,
  subscription_expiry: CreditCard,
  wallet_low_balance: Wallet,
  project_update: Building2,
  team_assignment: UserPlus,
};

interface Props {
  onChanged?: () => void;
  compact?: boolean;
}

export default function NotificationCenter({ onChanged, compact = false }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({
        onlyUnread: tab === "unread",
        limit: compact ? 20 : 100,
      });
      setItems(data);
    } catch (e: any) {
      toast.error("Failed to load notifications", { description: e.message }); // FIXED
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await notificationService.markAsRead(n.id);
      onChanged?.();
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead();
    await load();
    onChanged?.();
    toast.success("All notifications marked as read"); // FIXED
  };

  const handleArchive = async (id: string) => {
    await notificationService.archive(id);
    setItems((p) => p.filter((i) => i.id !== id));
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    await notificationService.remove(id);
    setItems((p) => p.filter((i) => i.id !== id));
    onChanged?.();
  };

  return (
    <div className="flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleMarkAll} className="text-xs gap-1">
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="px-3 pt-2">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className={compact ? "h-[400px]" : "h-[600px]"}>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No notifications
          </div>
        ) : (
          <div className="divide-y">
            {items.map((n) => {
              const Icon = ICONS[n.type as NotificationType] ?? Bell;
              return (
                <div
                  key={n.id}
                  className={`group flex gap-3 p-3 hover:bg-muted/50 cursor-pointer transition ${
                    !n.is_read ? "bg-emerald-500/5" : ""
                  }`}
                  onClick={() => handleClick(n)}
                >
                  <div className="mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(n.id);
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
