import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";

export const KYCManager = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewImage, setViewImage] = useState<string | null>(null);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("kyc_verifications")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, userId: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      await supabase
        .from("kyc_verifications")
        .update({
          status,
          admin_notes: notes[id] || null,
          verified_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: userId,
        title: status === "approved" ? "KYC Verified ✅" : "KYC Rejected ❌",
        message:
          status === "approved"
            ? "Your identity has been verified! You can now withdraw funds."
            : `Your KYC was rejected. ${notes[id] || "Please resubmit with correct documents."}`,
        type: "kyc",
      });

      toast.success(`KYC ${status}`);
      fetchRequests();
    } catch {
      toast.error("Failed to update KYC");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">KYC Verifications ({requests.length})</h2>

      {requests.length === 0 && <p className="text-muted-foreground text-sm">No KYC requests yet.</p>}

      {requests.map((req) => (
        <Card key={req.id} className="border-0 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{req.full_name}</p>
                <p className="text-xs text-muted-foreground">ID: {req.id_number} | DOB: {req.date_of_birth}</p>
                <p className="text-xs text-muted-foreground">
                  Submitted: {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                  req.status === "approved"
                    ? "bg-success/10 text-success"
                    : req.status === "rejected"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {req.status}
              </span>
            </div>

            <div className="flex gap-2">
              {req.selfie_url && (
                <Button variant="outline" size="sm" onClick={() => setViewImage(req.selfie_url)}>
                  <Eye className="w-3 h-3 mr-1" /> Selfie
                </Button>
              )}
              {req.id_document_url && (
                <Button variant="outline" size="sm" onClick={() => setViewImage(req.id_document_url)}>
                  <Eye className="w-3 h-3 mr-1" /> ID Doc
                </Button>
              )}
            </div>

            {req.status === "pending" && (
              <div className="space-y-2 pt-2 border-t">
                <Input
                  placeholder="Admin notes (optional)"
                  value={notes[req.id] || ""}
                  onChange={(e) => setNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAction(req.id, req.user_id, "approved")}
                    disabled={actionLoading === req.id}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAction(req.id, req.user_id, "rejected")}
                    disabled={actionLoading === req.id}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Image Viewer Modal */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <img src={viewImage} alt="Document" className="max-w-full max-h-[80vh] rounded-lg" />
        </div>
      )}
    </div>
  );
};
