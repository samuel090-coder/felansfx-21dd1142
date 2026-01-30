import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { Loader2, Search, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  bank_accounts: {
    bank_name: string;
    account_number: string;
    account_name: string;
  } | null;
  profiles?: {
    email: string;
    display_id: string;
    full_name: string;
  } | null;
}

export const WithdrawalManager = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          bank_accounts (
            bank_name,
            account_number,
            account_name
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as 'pending' | 'processing' | 'completed' | 'rejected');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for each withdrawal
      if (data) {
        const userIds = [...new Set(data.map(w => w.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, display_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedWithdrawals = data.map(w => ({
          ...w,
          profiles: profileMap.get(w.user_id) || null
        }));

        setWithdrawals(enrichedWithdrawals);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const handleViewDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes(withdrawal.admin_notes || "");
    setDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: 'processing' | 'completed' | 'rejected') => {
    if (!selectedWithdrawal) return;

    setProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes,
      };

      if (newStatus === 'completed' || newStatus === 'rejected') {
        updateData.processed_at = new Date().toISOString();
      }

      // If completing a withdrawal, deduct from user's wallet
      if (newStatus === 'completed') {
        const { data: success, error: deductError } = await supabase
          .rpc('deduct_user_wallet', {
            p_user_id: selectedWithdrawal.user_id,
            p_amount: selectedWithdrawal.amount
          });

        if (deductError || !success) {
          toast.error('Failed to deduct from wallet. User may have insufficient balance.');
          setProcessing(false);
          return;
        }
      }

      const { error } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      toast.success(`Withdrawal ${newStatus}`);
      setDialogOpen(false);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast.error('Failed to update withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-chart-2/20 text-chart-2 border-0">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'processing':
        return <Badge className="bg-chart-4/20 text-chart-4 border-0">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      w.profiles?.email?.toLowerCase().includes(search) ||
      w.profiles?.display_id?.toLowerCase().includes(search) ||
      w.bank_accounts?.account_name?.toLowerCase().includes(search) ||
      w.bank_accounts?.account_number?.includes(search)
    );
  });

  const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const totalCompleted = withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
            <p className="text-2xl font-bold text-chart-4">
              {formatCurrency(totalPending, "NGN", { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Paid Out</p>
            <p className="text-2xl font-bold text-chart-2">
              {formatCurrency(totalCompleted, "NGN", { decimals: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, ID, or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No withdrawals found
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{withdrawal.profiles?.display_id || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{withdrawal.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{withdrawal.bank_accounts?.account_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {withdrawal.bank_accounts?.bank_name} • {withdrawal.bank_accounts?.account_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(withdrawal.amount, "NGN", { decimals: 0 })}
                  </TableCell>
                  <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(withdrawal.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(withdrawal)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Details</DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedWithdrawal.profiles?.display_id}</p>
                  <p className="text-xs text-muted-foreground">{selectedWithdrawal.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">
                    {formatCurrency(selectedWithdrawal.amount, "NGN", { decimals: 0 })}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Bank Account</p>
                <p className="font-semibold">{selectedWithdrawal.bank_accounts?.account_name}</p>
                <p className="text-sm">
                  {selectedWithdrawal.bank_accounts?.bank_name} • {selectedWithdrawal.bank_accounts?.account_number}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this withdrawal..."
                  rows={3}
                />
              </div>

              {selectedWithdrawal.status === 'pending' && (
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('processing')}
                    disabled={processing}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mark Processing
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={processing}
                    className="bg-chart-2 hover:bg-chart-2/90"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Complete
                  </Button>
                </DialogFooter>
              )}

              {selectedWithdrawal.status === 'processing' && (
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={processing}
                    className="bg-chart-2 hover:bg-chart-2/90"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Complete
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
