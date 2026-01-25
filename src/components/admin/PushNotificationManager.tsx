import { useState, useEffect } from "react";
import { Bell, Send, Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  user_id: string;
  endpoint: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    display_id: string | null;
  };
}

export const PushNotificationManager = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each subscriber
      const subscribersWithProfiles = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, display_id")
            .eq("user_id", sub.user_id)
            .maybeSingle();
          return { ...sub, profile };
        })
      );

      setSubscribers(subscribersWithProfiles);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubscriber = async (id: string) => {
    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Subscriber removed");
      fetchSubscribers();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove subscriber");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error("Please fill in both title and message");
      return;
    }

    if (subscribers.length === 0) {
      toast.error("No subscribers to send notifications to");
      return;
    }

    setSending(true);

    try {
      // Send notification to all subscribers by creating notifications in DB
      // The realtime subscription in useNotifications will trigger browser notifications
      const notifications = subscribers.map((sub) => ({
        user_id: sub.user_id,
        title: notificationForm.title,
        message: notificationForm.message,
        type: "info" as const,
        action_url: "/",
      }));

      // Get unique user_ids to avoid duplicate notifications
      const uniqueUserIds = [...new Set(notifications.map((n) => n.user_id))];
      const uniqueNotifications = uniqueUserIds.map((userId) => ({
        user_id: userId,
        title: notificationForm.title,
        message: notificationForm.message,
        type: "info" as const,
        action_url: "/",
      }));

      const { error } = await supabase.from("notifications").insert(uniqueNotifications);

      if (error) throw error;

      toast.success(`Notification sent to ${uniqueUserIds.length} users`);
      setNotificationForm({ title: "", message: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send notifications");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Send Notification Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Notification title"
              value={notificationForm.title}
              onChange={(e) =>
                setNotificationForm({ ...notificationForm, title: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Notification message"
              value={notificationForm.message}
              onChange={(e) =>
                setNotificationForm({ ...notificationForm, message: e.target.value })
              }
              rows={3}
            />
          </div>
          <Button
            className="w-full gradient-primary"
            onClick={handleSendNotification}
            disabled={sending || subscribers.length === 0}
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Send to {subscribers.length} Subscriber{subscribers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Subscribers List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Push Notification Subscribers ({subscribers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No subscribers yet. Users can enable push notifications from their profile.
            </p>
          ) : (
            <div className="space-y-3">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {subscriber.profile?.full_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscriber.profile?.email || "No email"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {subscriber.profile?.display_id || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subscribed: {new Date(subscriber.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveSubscriber(subscriber.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
