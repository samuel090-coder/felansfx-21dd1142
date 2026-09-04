import { useState, useEffect } from "react";
import { Bell, Send, Users, Trash2, RefreshCw, AlertTriangle, CheckCircle, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface DeviceRow {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  last_seen_at: string;
}

interface Subscriber {
  user_id: string;
  devices: number;
  latest: string;
  profile?: { full_name: string | null; email: string | null; display_id: string | null } | null;
}

interface DeliveryLog {
  id: string;
  user_id: string;
  title: string | null;
  status_code: number | null;
  error: string | null;
  is_gone: boolean;
  created_at: string;
}

export const PushNotificationManager = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fcmStatus, setFcmStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [form, setForm] = useState({ title: "", message: "" });

  useEffect(() => {
    fetchSubscribers();
    fetchDeliveryLogs();
    checkFcm();
  }, []);

  const checkFcm = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-notifications", {
        body: { action: "status" },
      });
      setFcmStatus(!error && data?.configured ? "valid" : "invalid");
    } catch {
      setFcmStatus("invalid");
    } finally {
      setChecking(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("fcm_tokens")
        .select("id, user_id, token, platform, created_at, last_seen_at")
        .order("last_seen_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as DeviceRow[];
      setDeviceCount(rows.length);

      const byUser = new Map<string, Subscriber>();
      for (const r of rows) {
        const existing = byUser.get(r.user_id);
        if (existing) existing.devices += 1;
        else byUser.set(r.user_id, { user_id: r.user_id, devices: 1, latest: r.last_seen_at });
      }

      const userIds = [...byUser.keys()];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, display_id")
          .in("user_id", userIds);
        for (const p of profiles || []) {
          const s = byUser.get(p.user_id);
          if (s) s.profile = p;
        }
      }
      setSubscribers([...byUser.values()]);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryLogs = async () => {
    const { data } = await supabase
      .from("push_delivery_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setDeliveryLogs((data || []) as DeliveryLog[]);
  };

  const handleRemoveSubscriber = async (userId: string) => {
    const { error } = await supabase.from("fcm_tokens").delete().eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Devices removed for this user");
    fetchSubscribers();
  };

  const handleSend = async () => {
    if (!form.title || !form.message) return toast.error("Please fill in both title and message");
    if (deviceCount === 0) return toast.error("No devices to send to");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { title: form.title, message: form.message, url: "/notifications" },
      });
      if (error) throw error;
      const r = data as { sent: number; total: number; failed: number; expired?: number };
      setTimeout(fetchDeliveryLogs, 1500);
      if (r.expired) {
        toast.info(`Removed ${r.expired} stale device(s)`);
        fetchSubscribers();
      }
      toast.success(`Sent to ${r.sent} of ${r.total} device(s)`);
      setForm({ title: "", message: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
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
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            {checking ? (
              <LoadingSpinner size="sm" />
            ) : fcmStatus === "valid" ? (
              <CheckCircle className="w-4 h-4 text-primary" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            Firebase Cloud Messaging: {fcmStatus === "valid" ? "Connected" : fcmStatus === "invalid" ? "Not configured" : "Checking..."}
            <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={checkFcm}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        {fcmStatus === "invalid" && (
          <CardContent className="pt-0">
            <p className="text-xs text-destructive">
              The Firebase connection is missing. Reconnect it from the project's connectors.
            </p>
          </CardContent>
        )}
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5" /> Send Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Notification title"
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Notification message"
              maxLength={1000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
            />
          </div>
          <Button
            className="w-full gradient-primary"
            onClick={handleSend}
            disabled={sending || deviceCount === 0 || fcmStatus !== "valid"}
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Send to {subscribers.length} user{subscribers.length !== 1 ? "s" : ""} ({deviceCount} device{deviceCount !== 1 ? "s" : ""})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {deliveryLogs.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Recent Delivery Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deliveryLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className={`text-xs p-2 rounded ${
                    log.status_code === 200 || log.status_code === 201
                      ? "bg-primary/10 text-primary"
                      : log.is_gone
                      ? "bg-accent/40 text-accent-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{log.title || "Notification"}</span>
                    <span className="shrink-0">Status: {log.status_code ?? "N/A"}</span>
                  </div>
                  {log.error && <p className="mt-1 opacity-80 break-words">{log.error}</p>}
                  <p className="opacity-60">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" /> Subscribed Users ({subscribers.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSubscribers}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No devices registered yet. Users can enable push notifications from their profile.
            </p>
          ) : (
            <div className="space-y-3">
              {subscribers.map((s) => (
                <div key={s.user_id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.profile?.full_name || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.profile?.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">ID: {s.profile?.display_id || "N/A"}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> {s.devices} device{s.devices !== 1 ? "s" : ""} · seen {new Date(s.latest).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemoveSubscriber(s.user_id)}
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
