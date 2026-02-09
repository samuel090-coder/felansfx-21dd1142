import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Trash2,
  Edit,
  Wallet,
  Users,
  BarChart3,
  MessageSquare,
  Bell,
  Layers,
  Mail,
  ArrowDownToLine,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { UserManagement } from "@/components/admin/UserManagement";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { NotificationTemplates } from "@/components/admin/NotificationTemplates";
import { PushNotificationManager } from "@/components/admin/PushNotificationManager";
import { RecommendedToolsManager } from "@/components/admin/RecommendedToolsManager";
import { DailyStreakManager } from "@/components/admin/DailyStreakManager";
import { ScreenshotGuideManager } from "@/components/admin/ScreenshotGuideManager";
import { SubscriptionPlansManager } from "@/components/admin/SubscriptionPlansManager";
import { DailySignalsManager } from "@/components/admin/DailySignalsManager";
import { MarketNewsManager } from "@/components/admin/MarketNewsManager";
import { ProContentManager } from "@/components/admin/ProContentManager";
import { AdminMessagingCenter } from "@/components/admin/AdminMessagingCenter";
import { WithdrawalManager } from "@/components/admin/WithdrawalManager";
import { KYCManager } from "@/components/admin/KYCManager";

interface PendingDeposit {
  id: string;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; email: string; display_id: string } | null;
}

interface DepositMethod {
  id: string;
  name: string;
  details: string;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkIsAdmin } = useAuth();
  const { settings, refetch: refetchSettings } = useAppSettings();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [settingsForm, setSettingsForm] = useState({
    site_name: "",
    analysis_cost: "",
    min_deposit: "",
    max_deposit: "",
    daily_analysis_limit: "",
    auto_approve_threshold: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

  // New payment method form
  const [newMethod, setNewMethod] = useState({ name: "", details: "" });
  const [editingMethod, setEditingMethod] = useState<DepositMethod | null>(null);
  const [isAddingMethod, setIsAddingMethod] = useState(false);

  // Check admin role on mount
  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (!user) {
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const isAdmin = await checkIsAdmin(user.id);
        if (isAdmin) {
          setIsAuthenticated(true);
          fetchDeposits();
          fetchDepositMethods();
        } else {
          toast.error("You are not authorized to access admin panel");
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("Failed to verify admin access");
        navigate("/", { replace: true });
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    if (!authLoading && user) {
      verifyAdminAccess();
    } else if (!authLoading && !user) {
      setIsCheckingAdmin(false);
    }
  }, [user, authLoading, checkIsAdmin, navigate]);

  const fetchDeposits = async () => {
    try {
      let query = supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter === "pending") {
        query = query.eq("status", "pending");
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const depositsWithProfiles = await Promise.all(
        (data || []).map(async (deposit) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, display_id")
            .eq("user_id", deposit.user_id)
            .maybeSingle();
          return { ...deposit, profiles: profile };
        })
      );
      
      setDeposits(depositsWithProfiles as PendingDeposit[]);
    } catch (error) {
      console.error("Error fetching deposits:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepositMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("deposit_methods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDepositMethods((data || []) as DepositMethod[]);
    } catch (error) {
      console.error("Error fetching deposit methods:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeposits();
    }
  }, [statusFilter, isAuthenticated]);

  const handleDepositAction = async (depositId: string, action: "approved" | "rejected", reason?: string) => {
    setProcessingId(depositId);

    try {
      const deposit = deposits.find((d) => d.id === depositId);
      if (!deposit) throw new Error("Deposit not found");

      // Update deposit status
      const { error: depositError } = await supabase
        .from("deposits")
        .update({ status: action, admin_notes: reason || null })
        .eq("id", depositId);

      if (depositError) throw depositError;

      // If approved, credit the wallet using secure database function
      if (action === "approved") {
        const { error: creditError } = await supabase.rpc("credit_user_wallet", {
          p_user_id: deposit.user_id,
          p_amount: deposit.amount,
        });

        if (creditError) throw creditError;
      }

      // Send notification and get Gmail URL
      const { data: notifResult, error: notifError } = await supabase.functions.invoke(
        "deposit-notification",
        {
          body: {
            action: action === "approved" ? "approve" : "reject",
            depositId: deposit.id,
            userId: deposit.user_id,
            userEmail: deposit.profiles?.email || "",
            userName: deposit.profiles?.full_name || "User",
            amount: deposit.amount,
            reason: reason,
          },
        }
      );

      if (notifError) {
        console.error("Notification error:", notifError);
      }

      toast.success(`Deposit ${action}`);

      // Open native email app with mailto: link (works on mobile!)
      if (notifResult?.mailtoUrl) {
        window.location.href = notifResult.mailtoUrl;
      }

      fetchDeposits();
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedDepositId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to process deposit");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (depositId: string) => {
    setSelectedDepositId(depositId);
    setRejectDialogOpen(true);
  };

  const handleAddMethod = async () => {
    if (!newMethod.name || !newMethod.details) {
      toast.error("Please fill all fields");
      return;
    }

    setIsAddingMethod(true);
    try {
      const { error } = await supabase.from("deposit_methods").insert({
        name: newMethod.name,
        details: newMethod.details,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Payment method added");
      setNewMethod({ name: "", details: "" });
      fetchDepositMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to add payment method");
    } finally {
      setIsAddingMethod(false);
    }
  };

  const handleUpdateMethod = async () => {
    if (!editingMethod) return;

    try {
      const { error } = await supabase
        .from("deposit_methods")
        .update({
          name: editingMethod.name,
          details: editingMethod.details,
          is_active: editingMethod.is_active,
        })
        .eq("id", editingMethod.id);

      if (error) throw error;
      toast.success("Payment method updated");
      setEditingMethod(null);
      fetchDepositMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment method");
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      const { error } = await supabase.from("deposit_methods").delete().eq("id", id);
      if (error) throw error;
      toast.success("Payment method deleted");
      fetchDepositMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment method");
    }
  };

  const handleToggleMethodActive = async (method: DepositMethod) => {
    try {
      const { error } = await supabase
        .from("deposit_methods")
        .update({ is_active: !method.is_active })
        .eq("id", method.id);

      if (error) throw error;
      fetchDepositMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to update method");
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

  if (authLoading || isCheckingAdmin) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <AppLayout hideNav>
        <Header title="Admin Panel" showBack />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                You don't have permission to access the admin panel.
              </p>
              <Button className="w-full mt-4" onClick={() => navigate("/")}>
                Go Home
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
        <Tabs defaultValue="analytics">
          <TabsList className="grid w-full grid-cols-10 mb-6 h-auto">
            <TabsTrigger value="analytics" className="text-xs px-1 py-2">
              <BarChart3 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs px-1 py-2">
              <CreditCard className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs px-1 py-2">
              <ArrowDownToLine className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="kyc" className="text-xs px-1 py-2">
              <ShieldCheck className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs px-1 py-2">
              <Users className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="messaging" className="text-xs px-1 py-2">
              <Mail className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="push" className="text-xs px-1 py-2">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs px-1 py-2">
              <Layers className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs px-1 py-2">
              <MessageSquare className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-1 py-2">
              <Settings className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalytics />
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <WithdrawalManager />
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-4">
            <KYCManager />
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Deposits</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("pending")}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                    >
                      All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : deposits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No deposits found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {deposits.map((deposit) => (
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
                            <p className="text-xs text-muted-foreground">
                              ID: {deposit.profiles?.display_id || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(deposit.amount, "NGN")}
                            </span>
                            <p className={cn(
                              "text-xs font-medium capitalize",
                              deposit.status === "approved" && "text-success",
                              deposit.status === "rejected" && "text-destructive",
                              deposit.status === "pending" && "text-warning"
                            )}>
                              {deposit.status}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Screenshot
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

                          {deposit.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => handleRejectClick(deposit.id)}
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
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Payment Methods</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Method
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Method Name</Label>
                          <Input
                            placeholder="e.g., Bank Transfer, Bitcoin, PayPal"
                            value={newMethod.name}
                            onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Details</Label>
                          <Textarea
                            placeholder="e.g., Bank Name: XYZ Bank&#10;Account Number: 1234567890&#10;Account Name: John Doe"
                            value={newMethod.details}
                            onChange={(e) => setNewMethod({ ...newMethod, details: e.target.value })}
                            rows={5}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          className="gradient-primary"
                          onClick={handleAddMethod}
                          disabled={isAddingMethod}
                        >
                          {isAddingMethod ? <LoadingSpinner size="sm" /> : "Add Method"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {depositMethods.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payment methods configured
                  </p>
                ) : (
                  <div className="space-y-4">
                    {depositMethods.map((method) => (
                      <div
                        key={method.id}
                        className={cn(
                          "p-4 rounded-lg border space-y-2",
                          method.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{method.name}</h4>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.is_active}
                              onCheckedChange={() => handleToggleMethodActive(method)}
                            />
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingMethod(method)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Payment Method</DialogTitle>
                                </DialogHeader>
                                {editingMethod && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Method Name</Label>
                                      <Input
                                        value={editingMethod.name}
                                        onChange={(e) =>
                                          setEditingMethod({ ...editingMethod, name: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Payment Details</Label>
                                      <Textarea
                                        value={editingMethod.details}
                                        onChange={(e) =>
                                          setEditingMethod({ ...editingMethod, details: e.target.value })
                                        }
                                        rows={5}
                                      />
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button className="gradient-primary" onClick={handleUpdateMethod}>
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMethod(method.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {method.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Messaging Center Tab */}
          <TabsContent value="messaging">
            <AdminMessagingCenter />
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="push">
            <PushNotificationManager />
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-4">
            <DailySignalsManager />
            <MarketNewsManager />
            <ProContentManager />
            <RecommendedToolsManager />
            <DailyStreakManager />
            <ScreenshotGuideManager />
            <SubscriptionPlansManager />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <NotificationTemplates />
          </TabsContent>

          {/* Settings Tab */}
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
                  <Label>Analysis Cost (NGN - Nigerian Naira)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={settingsForm.analysis_cost}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, analysis_cost: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Cost per analysis in Nigerian Naira</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Deposit (NGN)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={settingsForm.min_deposit}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, min_deposit: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Deposit (NGN)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={settingsForm.max_deposit}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, max_deposit: e.target.value })
                        }
                      />
                    </div>
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

                <div className="space-y-2">
                  <Label>Auto-Approve Threshold (NGN)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={settingsForm.auto_approve_threshold}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, auto_approve_threshold: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Deposits at or below this amount with valid receipts are auto-approved. Set to 0 to disable.</p>
                </div>

                <Button className="w-full gradient-primary" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. This will be sent to the user.
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedDepositId) {
                  handleDepositAction(selectedDepositId, "rejected", rejectReason);
                }
              }}
              disabled={processingId !== null}
            >
              {processingId ? <LoadingSpinner size="sm" /> : "Reject & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Admin;
