import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PendingDeposit {
  id: string;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, refetch: refetchSettings } = useAppSettings();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    site_name: "",
    analysis_cost: "",
    min_deposit: "",
    max_deposit: "",
    daily_analysis_limit: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setSettingsForm({
      site_name: settings.site_name,
      analysis_cost: settings.analysis_cost,
      min_deposit: settings.min_deposit,
      max_deposit: settings.max_deposit,
      daily_analysis_limit: settings.daily_analysis_limit,
    });
  }, [settings]);

  const verifyPasscode = () => {
    if (passcode === settings.admin_passcode) {
      setIsAuthenticated(true);
      fetchPendingDeposits();
    } else {
      toast.error("Invalid passcode");
    }
  };

  const fetchPendingDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profile data separately for each deposit
      const depositsWithProfiles = await Promise.all(
        (data || []).map(async (deposit) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", deposit.user_id)
            .maybeSingle();
          return { ...deposit, profiles: profile };
        })
      );
      
      setPendingDeposits(depositsWithProfiles as PendingDeposit[]);
    } catch (error) {
      console.error("Error fetching deposits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositAction = async (depositId: string, action: "approved" | "rejected") => {
    setProcessingId(depositId);

    try {
      const deposit = pendingDeposits.find((d) => d.id === depositId);
      if (!deposit) throw new Error("Deposit not found");

      // Update deposit status
      const { error: depositError } = await supabase
        .from("deposits")
        .update({ status: action })
        .eq("id", depositId);

      if (depositError) throw depositError;

      // If approved, credit the wallet
      if (action === "approved") {
        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", deposit.user_id)
          .single();

        if (walletError) throw walletError;

        const newBalance = (wallet?.balance || 0) + deposit.amount;

        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("user_id", deposit.user_id);

        if (updateError) throw updateError;
      }

      toast.success(`Deposit ${action}`);
      fetchPendingDeposits();
    } catch (error: any) {
      toast.error(error.message || "Failed to process deposit");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updates = Object.entries(settingsForm).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: update.value })
          .eq("key", update.key);

        if (error) throw error;
      }

      toast.success("Settings saved");
      refetchSettings();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <AppLayout hideNav>
        <Header title="Admin Panel" showBack />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Enter Admin Passcode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyPasscode()}
              />
              <Button className="w-full gradient-primary" onClick={verifyPasscode}>
                Access Admin
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <Header title="Admin Panel" showBack />

      <div className="px-4 py-4">
        <Tabs defaultValue="deposits">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="deposits">
              <CreditCard className="w-4 h-4 mr-2" />
              Deposits
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposits">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Pending Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : pendingDeposits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No pending deposits
                  </p>
                ) : (
                  <div className="space-y-4">
                    {pendingDeposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="p-4 rounded-lg bg-muted/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {deposit.profiles?.full_name || "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {deposit.profiles?.email}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-primary">
                            ${deposit.amount.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View Screenshot
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Payment Screenshot</DialogTitle>
                              </DialogHeader>
                              <img
                                src={deposit.screenshot_url}
                                alt="Payment screenshot"
                                className="w-full rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>

                          <div className="flex-1" />

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleDepositAction(deposit.id, "rejected")}
                            disabled={processingId === deposit.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>

                          <Button
                            size="sm"
                            className="gradient-primary"
                            onClick={() => handleDepositAction(deposit.id, "approved")}
                            disabled={processingId === deposit.id}
                          >
                            {processingId === deposit.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">App Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input
                    value={settingsForm.site_name}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, site_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Analysis Cost ($)</Label>
                  <Input
                    type="number"
                    value={settingsForm.analysis_cost}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, analysis_cost: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Deposit ($)</Label>
                    <Input
                      type="number"
                      value={settingsForm.min_deposit}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, min_deposit: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Deposit ($)</Label>
                    <Input
                      type="number"
                      value={settingsForm.max_deposit}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, max_deposit: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Daily Analysis Limit</Label>
                  <Input
                    type="number"
                    value={settingsForm.daily_analysis_limit}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        daily_analysis_limit: e.target.value,
                      })
                    }
                  />
                </div>

                <Button className="w-full gradient-primary" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
