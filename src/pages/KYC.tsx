import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle, Camera } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/ui/loading-spinner";

const KYC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchKYC = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setKycStatus(data);
      if (data) {
        setFullName(data.full_name || "");
        setIdNumber(data.id_number || "");
        setDateOfBirth(data.date_of_birth || "");
      }
      setLoading(false);
    };
    if (user) fetchKYC();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !fullName || !idNumber || !dateOfBirth) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      let selfieUrl = kycStatus?.selfie_url || null;
      let idDocUrl = kycStatus?.id_document_url || null;

      if (selfieFile) {
        selfieUrl = await uploadFile("uploads", `kyc/${user.id}/selfie_${Date.now()}`, selfieFile);
      }
      if (idDocFile) {
        idDocUrl = await uploadFile("uploads", `kyc/${user.id}/id_${Date.now()}`, idDocFile);
      }

      if (!selfieUrl || !idDocUrl) {
        toast.error("Please upload both a selfie and ID document");
        setSubmitting(false);
        return;
      }

      if (kycStatus) {
        await supabase
          .from("kyc_verifications")
          .update({
            full_name: fullName,
            id_number: idNumber,
            date_of_birth: dateOfBirth,
            selfie_url: selfieUrl,
            id_document_url: idDocUrl,
            status: "pending",
            admin_notes: null,
          })
          .eq("user_id", user.id);
      } else {
        await supabase.from("kyc_verifications").insert({
          user_id: user.id,
          full_name: fullName,
          id_number: idNumber,
          date_of_birth: dateOfBirth,
          selfie_url: selfieUrl,
          id_document_url: idDocUrl,
          status: "pending",
        });
      }

      toast.success("KYC submitted for review!");
      const { data } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setKycStatus(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <LoadingScreen />;
  if (!user) return null;

  const isVerified = kycStatus?.status === "approved";
  const isPending = kycStatus?.status === "pending";
  const isRejected = kycStatus?.status === "rejected";

  return (
    <AppLayout>
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-semibold">Identity Verification</h1>
        </div>

        {/* Status Card */}
        <Card className="mb-6 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {isVerified ? (
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              ) : isPending ? (
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              ) : isRejected ? (
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {isVerified ? "Verified ✅" : isPending ? "Under Review" : isRejected ? "Verification Failed" : "Not Verified"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isVerified
                    ? "Your identity has been verified. You can withdraw funds."
                    : isPending
                    ? "We're reviewing your documents. This usually takes 24 hours."
                    : isRejected
                    ? kycStatus.admin_notes || "Please resubmit with correct documents."
                    : "Complete KYC to enable withdrawals."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form - only show if not verified and not pending */}
        {!isVerified && !isPending && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Submit Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Legal Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As shown on your ID" />
              </div>

              <div className="space-y-2">
                <Label>ID Number (NIN / BVN)</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter your NIN or BVN" />
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Selfie Photo</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    id="selfie-upload"
                    className="hidden"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="selfie-upload" className="cursor-pointer">
                    <Camera className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{selfieFile ? selfieFile.name : kycStatus?.selfie_url ? "Already uploaded ✓" : "Take a selfie"}</p>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ID Document (NIN Slip / Voter's Card / Passport)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    id="id-upload"
                    className="hidden"
                    onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="id-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{idDocFile ? idDocFile.name : kycStatus?.id_document_url ? "Already uploaded ✓" : "Upload ID document"}</p>
                  </label>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full gradient-primary shadow-primary">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default KYC;
