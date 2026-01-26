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

      // Deduplicate by user_id (keep only the most recent subscription per user)
      const uniqueByUser = new Map<string, typeof data[0]>();
      for (const sub of data || []) {
        if (!uniqueByUser.has(sub.user_id)) {
          uniqueByUser.set(sub.user_id, sub);
        }
      }
      const uniqueData = [...uniqueByUser.values()];

      // Fetch profiles for each unique subscriber
      const subscribersWithProfiles = await Promise.all(
        uniqueData.map(async (sub) => {
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

  const handleRemoveSubscriber = async (id: string, userId: string) => {
    try {
      // Remove ALL subscriptions for this user (clean up duplicates)
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("All subscriptions for this user removed");
      fetchSubscribers();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove subscriber");
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      // Get all subscriptions grouped by user
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Find duplicates (keep only the most recent per user)
      const userLatest = new Map<string, string>();
      const toDelete: string[] = [];

      for (const sub of data || []) {
        if (!userLatest.has(sub.user_id)) {
          userLatest.set(sub.user_id, sub.id);
        } else {
          // This is a duplicate, mark for deletion
          toDelete.push(sub.id);
        }
      }

      if (toDelete.length > 0) {
        const { error: delError } = await supabase
          .from("push_subscriptions")
          .delete()
          .in("id", toDelete);

        if (delError) throw delError;

        toast.success(`Removed ${toDelete.length} duplicate subscription(s)`);
        fetchSubscribers();
      } else {
        toast.info("No duplicates found");
      }
    } catch (error: any) {
      toast.error(error.message || "Cleanup failed");
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
      // Call the send-push edge function to send real push notifications
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title: notificationForm.title,
          message: notificationForm.message,
          url: "/notifications",
        },
      });

      if (error) throw error;

      const result = data as { sent: number; total: number; failed: number; expired?: number };
      
      if (result.failed > 0 && result.sent === 0) {
        toast.warning(
          `Push failed to ${result.failed} subscriber(s). They may need to refresh their subscription in Profile settings.`,
          { duration: 6000 }
        );
      } else if (result.expired && result.expired > 0) {
        toast.info(`Cleaned up ${result.expired} expired subscription(s)`);
      }
      
      toast.success(`Push notification sent to ${result.sent} of ${result.total} subscribers`);
      setNotificationForm({ title: "", message: "" });
    } catch (error: any) {
      console.error("Push notification error:", error);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Push Notification Subscribers ({subscribers.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupDuplicates}
          >
            Cleanup Duplicates
          </Button>
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
                    onClick={() => handleRemoveSubscriber(subscriber.id, subscriber.user_id)}
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
