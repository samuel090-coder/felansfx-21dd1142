import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Mail,
  Wallet,
  Shield,
  ShieldOff,
  Eye,
  BarChart3,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  display_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserWallet {
  balance: number;
}

interface UserRole {
  role: string;
}

interface UserDetails {
  profile: UserProfile;
  wallet: UserWallet | null;
  roles: UserRole[];
  analysisCount: number;
  depositTotal: number;
}

// Welcome message template - professional, no emojis, avoids spam triggers
const generateWelcomeMessage = (userName: string) => {
  const siteName = "FelansFX";
  const siteUrl = "https://felansfx.lovable.app";
  
  return {
    subject: `Welcome to ${siteName} - Your Trading Journey Starts Here`,
    body: `Dear ${userName},

Thank you for joining ${siteName}. We are excited to have you as part of our growing community of traders.

Our platform offers powerful tools to enhance your trading experience:

- AI-Powered Chart Analysis: Upload your trading charts and receive detailed analysis with entry points, stop-loss, and take-profit recommendations tailored to your strategy.

- Live Trading: Execute trades directly on our platform with real-time market data. Practice with our demo account or trade with real funds when you are ready.

- Daily Market Insights: Access expert signals, market news, and educational content to stay ahead of market movements.

Getting Started:
1. Complete your profile setup
2. Add funds to your wallet
3. Start with our AI analysis or jump into live trading

Our support team is available to assist you with any questions. Simply reply to this email or visit our Help Center.

We look forward to supporting your trading success.

Best regards,
The ${siteName} Team

${siteUrl}

---
This message was sent to you because you recently created an account on ${siteName}. If you did not create this account, please disregard this email.`
  };
};

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [welcomeTarget, setWelcomeTarget] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = async (profile: UserProfile) => {
    try {
      // Fetch wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);

      // Fetch analysis count
      const { count: analysisCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      // Fetch deposit total
      const { data: deposits } = await supabase
        .from("deposits")
        .select("amount")
        .eq("user_id", profile.user_id)
        .eq("status", "approved");

      const depositTotal = (deposits || []).reduce(
        (sum, d) => sum + (d.amount || 0),
        0
      );

      setSelectedUser({
        profile,
        wallet: wallet as UserWallet | null,
        roles: (roles || []) as UserRole[],
        analysisCount: analysisCount || 0,
        depositTotal,
      });
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        toast.success("Admin role removed");
      } else {
        // Add admin role
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: "admin",
        });
        toast.success("Admin role granted");
      }

      // Refresh user details
      if (selectedUser) {
        handleViewUser(selectedUser.profile);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  const handleSendEmail = (email: string | null) => {
    if (!email) {
      toast.error("User has no email");
      return;
    }
    window.open(`mailto:${email}`, "_blank");
  };

  const handleOpenWelcomeMessage = (user: UserProfile) => {
    setWelcomeTarget(user);
    setWelcomeDialogOpen(true);
  };

  const handleSendWelcomeMessage = () => {
    if (!welcomeTarget?.email) {
      toast.error("User has no email");
      return;
    }
    
    const userName = welcomeTarget.full_name || "Valued Trader";
    const { subject, body } = generateWelcomeMessage(userName);
    
    const mailtoUrl = `mailto:${welcomeTarget.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    
    setWelcomeDialogOpen(false);
    setWelcomeTarget(null);
    toast.success("Email client opened with welcome message");
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
          <Badge variant="secondary">{users.length} users</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No users found
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                    {user.full_name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {user.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.display_id && (
                      <p className="text-xs text-primary">{user.display_id}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenWelcomeMessage(user)}
                    title="Send Welcome Message"
                  >
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSendEmail(user.email)}
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewUser(user)}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* User Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-lg font-medium">
                  {selectedUser.profile.full_name?.slice(0, 2).toUpperCase() ||
                    "??"}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedUser.profile.full_name || "Unknown"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.profile.email}
                  </p>
                  {selectedUser.profile.display_id && (
                    <Badge variant="secondary" className="mt-1">
                      {selectedUser.profile.display_id}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Wallet className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    ${selectedUser.wallet?.balance?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {selectedUser.analysisCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Analyses</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Roles</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedUser.roles.map((r, i) => (
                    <Badge
                      key={i}
                      variant={r.role === "admin" ? "default" : "secondary"}
                    >
                      {r.role}
                    </Badge>
                  ))}
                  {selectedUser.roles.length === 0 && (
                    <Badge variant="outline">user</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    handleSendEmail(selectedUser.profile.email)
                  }
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  variant={
                    selectedUser.roles.some((r) => r.role === "admin")
                      ? "destructive"
                      : "default"
                  }
                  className={cn(
                    "flex-1",
                    !selectedUser.roles.some((r) => r.role === "admin") &&
                      "gradient-primary"
                  )}
                  onClick={() =>
                    handleToggleAdmin(
                      selectedUser.profile.user_id,
                      selectedUser.roles.some((r) => r.role === "admin")
                    )
                  }
                >
                  {selectedUser.roles.some((r) => r.role === "admin") ? (
                    <>
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Make Admin
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Welcome Message Dialog */}
      <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send Welcome Message
            </DialogTitle>
            <DialogDescription>
              Send a professional welcome email to {welcomeTarget?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>

          {welcomeTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Recipient</p>
                <p className="text-sm">{welcomeTarget.full_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{welcomeTarget.email}</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Message Preview</p>
                <div className="text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                  <p><strong>Subject:</strong> Welcome to FelansFX - Your Trading Journey Starts Here</p>
                  <p className="whitespace-pre-line">
                    Dear {welcomeTarget.full_name || "Valued Trader"},

Thank you for joining FelansFX. We are excited to have you as part of our growing community of traders.

Our platform offers powerful tools including AI-Powered Chart Analysis, Live Trading, and Daily Market Insights.

Getting Started:
1. Complete your profile setup
2. Add funds to your wallet
3. Start with our AI analysis or jump into live trading

Best regards,
The FelansFX Team
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setWelcomeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary"
                  onClick={handleSendWelcomeMessage}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Open in Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
