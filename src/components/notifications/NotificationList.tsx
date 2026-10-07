import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { notificationDestination, notificationIsRead } from "@/lib/notificationDestination";
import { toast } from "sonner";
import { 
  CheckCheck, 
  Calendar, 
  Car, 
  User, 
  AlertCircle,
  Bell
} from "lucide-react";

interface NotificationListProps {
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate?: () => void;
}

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}: NotificationListProps) => {
  const navigate = useNavigate();
  const openNotification = (notification: any) => {
    if (!notificationIsRead(notification)) onMarkAsRead(notification.id);
    const destination = notificationDestination(notification);
    if (destination) { onNavigate?.(); navigate(destination); }
    else toast.message(notification.title, { description: notification.message });
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'agent': return User;
      case 'vehicle': return Car;
      case 'alert': return AlertCircle;
      default: return Bell;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {notifications.some(n => !notificationIsRead(n)) && (
          <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="divide-y">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
               <Button
                key={notification.id}
                 variant="ghost"
                 className={`block w-full h-auto whitespace-normal rounded-none text-left p-4 hover:bg-secondary/50 transition-colors ${
                   !notificationIsRead(notification) ? 'bg-primary/5' : ''
                }`}
                 onClick={() => openNotification(notification)}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${
                     !notificationIsRead(notification) ? 'bg-primary/20' : 'bg-secondary'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                       {!notificationIsRead(notification) && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                       {Number.isNaN(new Date(notification.created_at).getTime()) ? "" : formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
