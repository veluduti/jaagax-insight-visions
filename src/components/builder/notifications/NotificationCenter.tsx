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
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import notificationService, { Notification, NotificationType } from "@/services/notificationService";

// Icon mapping for notification types
const ICONS: Record<string, any> = {
  platform_announcement: Megaphone,
  lead_update: Users,
  visit_reminder: Calendar,
  subscription_expiry: CreditCard,
  wallet_low_balance: Wallet,
  project_update: Building2,
  team_assignment: UserPlus,
};

// Color mapping for notification types
const TYPE_COLORS: Record<string, string> = {
  platform_announcement: "bg-purple-100 text-purple-700 border-purple-200",
  lead_update: "bg-emerald-100 text-emerald-700 border-emerald-200",
  visit_reminder: "bg-amber-100 text-amber-700 border-amber-200",
  subscription_expiry: "bg-rose-100 text-rose-700 border-rose-200",
  wallet_low_balance: "bg-yellow-100 text-yellow-700 border-yellow-200",
  project_update: "bg-blue-100 text-blue-700 border-blue-200",
  team_assignment: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

// Icon color mapping
const ICON_COLORS: Record<string, string> = {
  platform_announcement: "text-purple-500",
  lead_update: "text-emerald-500",
  visit_reminder: "text-amber-500",
  subscription_expiry: "text-rose-500",
  wallet_low_balance: "text-yellow-500",
  project_update: "text-blue-500",
  team_assignment: "text-cyan-500",
};

interface Props {
  onChanged?: () => void;
  compact?: boolean;
}

export default function NotificationCenter({ onChanged, compact = false }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({
        onlyUnread: tab === "unread",
        includeArchived: tab === "archived",
        limit: compact ? 20 : 100,
      });
      setItems(data);
    } catch (e: any) {
      toast.error("Failed to load notifications", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await load();
      onChanged?.();
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await notificationService.archive(id);
      await load();
      onChanged?.();
      toast.success("Notification archived");
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.remove(id);
      await load();
      onChanged?.();
      toast.success("Notification deleted");
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  // If compact mode (for dropdown), render differently
  if (compact) {
    return (
      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs gap-1">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {items.slice(0, 5).map((n) => {
                const Icon = ICONS[n.type as NotificationType] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={`group flex gap-3 p-3 hover:bg-muted/50 cursor-pointer transition ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="mt-0.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  </div>
                );
              })}
              {items.length > 5 && (
                <div className="p-3 text-center">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/builder/notifications")}>
                    View all notifications
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Full page view
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Stay updated with all your activity</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2 border-border">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tab === "unread"
                    ? "You're all caught up! No unread notifications."
                    : tab === "archived"
                      ? "No archived notifications."
                      : "You don't have any notifications yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.type as NotificationType] ?? Bell;
                  const typeColor = TYPE_COLORS[n.type as NotificationType] ?? TYPE_COLORS.platform_announcement;
                  const iconColor = ICON_COLORS[n.type as NotificationType] ?? ICON_COLORS.platform_announcement;

                  return (
                    <div
                      key={n.id}
                      className={`group flex gap-4 p-4 hover:bg-muted/30 transition cursor-pointer ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleClick(n)}
                    >
                      {/* Icon */}
                      <div className="mt-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${typeColor}`}>
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"} text-foreground`}>
                                {n.title}
                              </p>
                              <Badge variant="outline" className={typeColor}>
                                {n.type.replace("_", " ")}
                              </Badge>
                              {!n.is_read && (
                                <Badge className="bg-primary text-primary-foreground text-[10px]">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            {!n.is_read && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(n.id);
                                }}
                                title="Mark as read"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!n.is_archived && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(n.id);
                                }}
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(n.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
