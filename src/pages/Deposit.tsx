import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Clock, CheckCircle, XCircle, AlertCircle, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";

interface DepositMethod {
  id: string;
  name: string;
  details: string;
}

interface Deposit {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  admin_notes: string | null;
}

const Deposit = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { settings } = useAppSettings();
  
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchDeposits = async () => {
    if (!user) return;
    const { data: userDeposits } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setDeposits((userDeposits || []) as Deposit[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch deposit methods
        const { data: methods } = await supabase
          .from("deposit_methods")
          .select("*")
          .eq("is_active", true);
        setDepositMethods(methods || []);

        // Fetch user's deposits
        await fetchDeposits();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Refetch wallet and deposits periodically to catch admin approvals
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refetchWallet();
      fetchDeposits();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user, refetchWallet]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleCopyDetails = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || !file) {
      toast.error("Please fill all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    const minDeposit = parseFloat(settings.min_deposit);
    const maxDeposit = parseFloat(settings.max_deposit);

    if (amountNum < minDeposit || amountNum > maxDeposit) {
      toast.error(`Amount must be between $${minDeposit} and $${maxDeposit}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const screenshotUrl = await uploadFile("uploads", filePath, file);

      // Create deposit request
      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: amountNum,
        screenshot_url: screenshotUrl,
        deposit_method_id: selectedMethod || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Deposit request submitted! Awaiting admin approval.");
      setAmount("");
      setFile(null);
      setSelectedMethod("");

      // Refresh deposits
      await fetchDeposits();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit deposit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const selectedMethodDetails = depositMethods.find((m) => m.id === selectedMethod);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <Header title="Deposit Funds" showBack />
      
      <div className="px-4 py-4">
        {/* Current Balance */}
        <Card className="mb-6 border-0 shadow-md gradient-primary text-white">
          <CardContent className="pt-6">
            <p className="text-sm opacity-80">Current Balance</p>
            <p className="text-3xl font-bold">${wallet?.balance?.toFixed(2) || "0.00"}</p>
          </CardContent>
        </Card>

        {/* Deposit Form */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">New Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {depositMethods.length > 0 && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {depositMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show payment details when method is selected */}
              {selectedMethodDetails && (
                <Card className="bg-muted/50 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{selectedMethodDetails.name}</span>
                      <span className="text-xs text-muted-foreground">- Payment Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedMethodDetails.details.split("\n").map((line, idx) => {
                      const [label, ...valueParts] = line.split(":");
                      const value = valueParts.join(":").trim();
                      if (!value) return null;
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{value}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyDetails(value, `${idx}`)}
                            >
                              {copiedField === `${idx}` ? (
                                <Check className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      Make payment to the details above, then upload your screenshot below.
                    </p>
                  </CardContent>
                </Card>
              )}

              {depositMethods.length === 0 && (
                <Card className="bg-warning/10 border-warning/20">
                  <CardContent className="py-4">
                    <p className="text-sm text-warning text-center">
                      No payment methods available. Please contact support.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Min: $${settings.min_deposit}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={settings.min_deposit}
                  max={settings.max_deposit}
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Min: ${settings.min_deposit} | Max: ${settings.max_deposit}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">Payment Screenshot</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors">
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="screenshot" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {file ? file.name : "Click to upload screenshot"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={isSubmitting || !amount || !file}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : "Submit Deposit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deposit History */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No deposits yet</p>
            ) : (
              <div className="space-y-3">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(deposit.status)}
                      <div>
                        <p className="font-medium">${deposit.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                        deposit.status === "approved"
                          ? "bg-success/10 text-success"
                          : deposit.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {deposit.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Deposit;
