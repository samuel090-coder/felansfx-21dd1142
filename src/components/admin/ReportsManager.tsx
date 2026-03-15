import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const ReportsManager = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(100);
    setReports(data || []);

    if (data && data.length > 0) {
      const uids = [...new Set([...data.map(r => r.reporter_id), ...data.map(r => r.reported_user_id)])];
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
      if (profs) {
        const pm: Record<string, any> = {};
        profs.forEach(p => { pm[p.user_id] = p; });
        setProfiles(pm);
      }
    }
    setLoading(false);
  };

  const resolveReport = async (reportId: string, action: "resolved" | "dismissed") => {
    const notes = adminNotes[reportId] || "";
    const { error } = await supabase.from("user_reports").update({
      status: action,
      admin_notes: notes || null,
      resolved_at: new Date().toISOString(),
    }).eq("id", reportId);

    if (error) return toast.error("Failed to update report");
    toast.success(`Report ${action}`);
    loadReports();
  };

  if (loading) return <p className="text-center text-muted-foreground text-sm py-8">Loading reports...</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">User Reports</h3>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No reports yet</p>
      ) : (
        reports.map(r => {
          const reporter = profiles[r.reporter_id];
          const reported = profiles[r.reported_user_id];
          return (
            <Card key={r.id} className={r.status === "pending" ? "border-destructive/30" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={r.status === "pending" ? "destructive" : "outline"} className="text-xs">{r.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="text-muted-foreground">Reporter:</span> {reporter?.full_name || reporter?.display_id || r.reporter_id.slice(0, 8)}</p>
                  <p><span className="text-muted-foreground">Reported:</span> <span className="font-medium text-destructive">{reported?.full_name || reported?.display_id || r.reported_user_id.slice(0, 8)}</span></p>
                  <p><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{r.reason}</span></p>
                  {r.details && <p><span className="text-muted-foreground">Details:</span> {r.details}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="space-y-2 pt-2">
                    <Input
                      placeholder="Admin notes..."
                      value={adminNotes[r.id] || ""}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="text-xs h-8"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => resolveReport(r.id, "resolved")}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Action Taken
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => resolveReport(r.id, "dismissed")}>
                        <XCircle className="w-3 h-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}
                {r.admin_notes && <p className="text-[10px] text-muted-foreground">Admin: {r.admin_notes}</p>}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
