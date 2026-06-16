import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import notificationService, { Notification } from "@/services/notificationService";
import NotificationList from "./NotificationList";

export default function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    try {
      setCount(await notificationService.unreadCount());
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    refresh();
    const unsub = notificationService.subscribe(user.id, () => {
      refresh();
    });
    return unsub;
  }, [user?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-emerald-500 text-white text-[10px]">
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0">
        <NotificationList compact onRefresh={refresh} />
      </PopoverContent>
    </Popover>
  );
}
