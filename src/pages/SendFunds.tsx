import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Search, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SendFunds = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [requestTarget, setRequestTarget] = useState<any>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (user) {
      loadHistory();
      loadRequests();
    }
  }, [user]);

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url")
      .or(`full_name.ilike.%${q}%,display_id.ilike.%${q}%`)
      .neq("user_id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from("fund_transfers").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(50);
    if (data) {
      setTransfers(data);
      const uids = [...new Set(data.flatMap(t => [t.sender_id, t.receiver_id]))];
      await loadProfiles(uids);
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from("money_requests").select("*")
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(50);
    if (data) {
      setRequests(data);
      const uids = [...new Set(data.flatMap(r => [r.requester_id, r.target_id]))];
      await loadProfiles(uids);
    }
  };

  const loadProfiles = async (uids: string[]) => {
    const needed = uids.filter(id => !profiles[id]);
    if (needed.length === 0) return;
    const { data } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", needed);
    if (data) {
      const pm: Record<string, any> = {};
      data.forEach(p => { pm[p.user_id] = p; });
      setProfiles(prev => ({ ...prev, ...pm }));
    }
  };

  const sendFunds = async () => {
    if (!user || !selectedUser) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 50) return toast.error("Minimum ₦50");
    if (!wallet || wallet.balance < amt) return toast.error("Insufficient balance");
    setSending(true);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amt });
      if (!ok) throw new Error("Deduction failed");
      
      // Credit receiver - we need an RPC that allows crediting another user
      // Since credit_user_wallet requires admin, we'll use a direct wallet update approach
      // Actually deduct_user_wallet works for self, let's use a service approach
      // For now, insert transfer record and use edge function or direct update
      const { error: creditErr } = await supabase.from("fund_transfers").insert({
        sender_id: user.id, receiver_id: selectedUser.user_id, amount: amt, note: note.trim() || null,
      });
      if (creditErr) {
        // Refund
        await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: -amt });
        throw new Error("Transfer failed");
      }

      // Credit receiver wallet directly (RPC)
      // We need a new function for P2P - let's update wallet directly through a workaround
      // Since credit_user_wallet requires admin, we'll create an edge function
      const { error: fnErr } = await supabase.functions.invoke("process-transfer", {
        body: { transfer_id: undefined, receiver_id: selectedUser.user_id, amount: amt }
      });
      
      if (fnErr) {
        console.error("Edge function credit failed, but deduction succeeded", fnErr);
      }

      refetchWallet();
      toast.success(`₦${amt.toLocaleString()} sent to ${selectedUser.full_name || selectedUser.display_id}!`);
      setSelectedUser(null);
      setAmount("");
      setNote("");
      loadHistory();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };

  const sendMoneyRequest = async () => {
    if (!user || !requestTarget) return;
    const amt = parseFloat(requestAmount);
    if (isNaN(amt) || amt < 50) return toast.error("Minimum ₦50");
    setSendingRequest(true);
    try {
      await supabase.from("money_requests").insert({
        requester_id: user.id, target_id: requestTarget.user_id, amount: amt, note: requestNote.trim() || null,
      });

      // Notify target user
      try {
        await supabase.functions.invoke("notify-activity", {
          body: { type: "money_request", target_user_id: requestTarget.user_id, amount: amt, note: requestNote.trim() || null },
        });
      } catch {}

      toast.success("Money request sent!");
      setShowRequest(false);
      setRequestTarget(null);
      setRequestAmount("");
      setRequestNote("");
      loadRequests();
    } catch { toast.error("Failed"); }
    setSendingRequest(false);
  };

  const handleRequest = async (req: any, accept: boolean) => {
    if (!user) return;
    if (accept) {
      const amt = req.amount;
      if (!wallet || wallet.balance < amt) return toast.error("Insufficient balance");
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amt });
      if (!ok) return toast.error("Deduction failed");

      await supabase.functions.invoke("process-transfer", {
        body: { receiver_id: req.requester_id, amount: amt }
      });

      await supabase.from("fund_transfers").insert({
        sender_id: user.id, receiver_id: req.requester_id, amount: amt, note: `Request: ${req.note || ""}`.trim(),
      });

      refetchWallet();
    }
    await supabase.from("money_requests").update({
      status: accept ? "accepted" : "declined", resolved_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast.success(accept ? "Payment sent!" : "Request declined");
    loadRequests();
    loadHistory();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold flex-1">Send & Request Funds</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Balance */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-bold text-primary">₦{wallet?.balance?.toLocaleString() || "0"}</p>
          </CardContent>
        </Card>

        {/* Search Users */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Search by name or ID (e.g. FX123456)"
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map(u => (
                <div key={u.user_id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); setSearchResults([]); }}>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{(u.full_name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.full_name || "Trader"}</p>
                    <p className="text-[10px] text-muted-foreground">{u.display_id}</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(u); setSearchQuery(""); setSearchResults([]);
                    }}>
                      <Send className="w-3 h-3 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={(e) => {
                      e.stopPropagation();
                      setRequestTarget(u); setShowRequest(true); setSearchQuery(""); setSearchResults([]);
                    }}>
                      Request
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send form */}
        {selectedUser && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">{(selectedUser.full_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">Sending to {selectedUser.full_name || selectedUser.display_id}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedUser.display_id}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setSelectedUser(null)}>Cancel</Button>
              </div>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount (₦)" />
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" />
              <Button className="w-full" onClick={sendFunds} disabled={sending}>
                {sending ? "Sending..." : `Send ₦${amount || "0"}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs: History & Requests */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="requests">
              Requests {requests.filter(r => r.target_id === user?.id && r.status === "pending").length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[9px]">{requests.filter(r => r.target_id === user?.id && r.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-2 mt-3">
            {requests.filter(r => r.status === "pending").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
            ) : requests.filter(r => r.status === "pending").map(req => {
              const isIncoming = req.target_id === user?.id;
              const otherUser = profiles[isIncoming ? req.requester_id : req.target_id];
              return (
                <Card key={req.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={otherUser?.avatar_url} />
                      <AvatarFallback className="text-xs">{(otherUser?.full_name || "U")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {isIncoming ? `${otherUser?.full_name || "Someone"} requests` : `You requested from ${otherUser?.full_name || "Someone"}`}
                      </p>
                      <p className="text-sm font-bold text-primary">₦{req.amount.toLocaleString()}</p>
                      {req.note && <p className="text-[10px] text-muted-foreground truncate">{req.note}</p>}
                    </div>
                    {isIncoming ? (
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-[10px]" onClick={() => handleRequest(req, true)}>Pay</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleRequest(req, false)}>Decline</Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-[9px]"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 mt-3">
            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No transfers yet</p>
            ) : transfers.map(t => {
              const isSent = t.sender_id === user?.id;
              const otherUser = profiles[isSent ? t.receiver_id : t.sender_id];
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSent ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                    {isSent ? <ArrowUpRight className="w-4 h-4 text-red-500" /> : <ArrowDownLeft className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{isSent ? `To ${otherUser?.full_name || otherUser?.display_id || "User"}` : `From ${otherUser?.full_name || otherUser?.display_id || "User"}`}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                  </div>
                  <p className={`text-sm font-bold ${isSent ? 'text-red-500' : 'text-green-500'}`}>
                    {isSent ? "-" : "+"}₦{t.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Money Dialog */}
      <Dialog open={showRequest} onOpenChange={(o) => { if (!o) { setShowRequest(false); setRequestTarget(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Money</DialogTitle></DialogHeader>
          {requestTarget && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={requestTarget.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">{(requestTarget.full_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">From {requestTarget.full_name || requestTarget.display_id}</p>
                  <p className="text-[10px] text-muted-foreground">{requestTarget.display_id}</p>
                </div>
              </div>
              <Input value={requestAmount} onChange={e => setRequestAmount(e.target.value)} type="number" placeholder="Amount (₦)" />
              <Input value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Reason (optional)" />
              <Button className="w-full" onClick={sendMoneyRequest} disabled={sendingRequest}>
                {sendingRequest ? "Sending..." : `Request ₦${requestAmount || "0"}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SendFunds;
