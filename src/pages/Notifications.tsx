import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, CheckCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const Notifications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success/10 text-success border-success/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-info/10 text-info border-info/20";
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No notifications yet</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  You will receive notifications for deposits, analyses, and more
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-200px)]">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                            !notification.is_read
                              ? "bg-primary"
                              : "bg-transparent"
                          }`}
                        />
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">
                              {notification.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getTypeStyles(
                                notification.type
                              )}`}
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Notifications;
