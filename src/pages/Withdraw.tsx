import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Building2, CreditCard, Wallet, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface Bank {
  name: string;
  code: string;
}

interface VerifiedAccount {
  account_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

// Dynamic minimum withdrawal calculation - hidden from user
const calculateMinimumWithdrawal = (balance: number): number => {
  if (balance >= 10000000) return 10000000; // 10M - can actually withdraw
  if (balance >= 5000000) return 8000000; // 5M balance -> 8M minimum
  if (balance >= 3000000) return 5000000; // 3M balance -> 5M minimum
  if (balance >= 1000000) return 3000000; // 1M balance -> 3M minimum
  if (balance >= 500000) return 1500000; // 500k balance -> 1.5M minimum
  if (balance >= 300000) return 1000000; // 300k balance -> 1M minimum
  if (balance >= 100000) return 500000; // 100k balance -> 500k minimum
  if (balance >= 50000) return 300000; // 50k balance -> 300k minimum
  if (balance >= 15000) return 100000; // 15k balance -> 100k minimum
  return 50000; // Default minimum
};

const Withdraw = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  
  const [verifying, setVerifying] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [transactionPin, setTransactionPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check KYC status
  useEffect(() => {
    const checkKYC = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("kyc_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      setKycVerified(data?.status === "approved");
    };
    if (user) checkKYC();
  }, [user]);

  // Fetch banks on mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-bank-account', {
          body: {},
          headers: {},
        });
        
        // Use query param approach for list-banks
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-bank-account?action=list-banks`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        
        const result = await response.json();
        if (result.success && result.banks) {
          setBanks(result.banks);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
        toast.error('Failed to load banks');
      } finally {
        setLoadingBanks(false);
      }
    };

    if (user) {
      fetchBanks();
    }
  }, [user]);

  // Fetch withdrawal history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setWithdrawalHistory(data);
      }
    };

    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Verify account when both bank and account number are provided
  const handleVerifyAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setVerifiedAccount(null);

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-bank-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_number: accountNumber,
            bank_code: selectedBank,
          }),
        }
      );

      const result = await response.json();

      if (result.verified && result.account_name) {
        const bankInfo = banks.find(b => b.code === selectedBank);
        setVerifiedAccount({
          account_name: result.account_name,
          account_number: result.account_number,
          bank_code: selectedBank,
          bank_name: bankInfo?.name || '',
        });
        toast.success('Account verified successfully');
      } else {
        setVerificationError(result.error || 'Could not verify account');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('Failed to verify account. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitWithdrawal = async () => {
    if (!verifiedAccount || !amount || !user || !wallet) return;

    if (!kycVerified) {
      toast.error("Please complete KYC verification before withdrawing.");
      navigate("/kyc");
      return;
    }

    // Verify transaction PIN
    if (!transactionPin || transactionPin.length !== 4) {
      setPinError("Enter your 4-digit transaction PIN");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const minimumWithdrawal = calculateMinimumWithdrawal(wallet.balance);

    if (withdrawAmount < minimumWithdrawal) {
      toast.error(`Minimum withdrawal amount is ${formatCurrency(minimumWithdrawal, "NGN", { decimals: 0 })}. Keep trading to unlock withdrawals!`);
      return;
    }

    if (withdrawAmount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setSubmitting(true);
    setPinError(null);

    try {
      // Verify PIN server-side
      const { data: pinValid, error: pinErr } = await supabase.rpc("verify_transaction_pin", { p_pin: transactionPin });
      if (pinErr) {
        if (pinErr.message.includes("No transaction PIN set")) {
          setPinError("No PIN set. Please set one in your Profile first.");
          setSubmitting(false);
          return;
        }
        throw pinErr;
      }
      if (!pinValid) {
        setPinError("Incorrect PIN. Please try again.");
        setSubmitting(false);
        return;
      }

    try {
      // First, save the bank account if not exists
      const { data: existingAccount } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_number', verifiedAccount.account_number)
        .eq('bank_code', verifiedAccount.bank_code)
        .maybeSingle();

      let bankAccountId: string;

      if (existingAccount) {
        bankAccountId = existingAccount.id;
      } else {
        const { data: newAccount, error: accountError } = await supabase
          .from('bank_accounts')
          .insert({
            user_id: user.id,
            bank_code: verifiedAccount.bank_code,
            bank_name: verifiedAccount.bank_name,
            account_number: verifiedAccount.account_number,
            account_name: verifiedAccount.account_name,
            is_verified: true,
          })
          .select('id')
          .single();

        if (accountError) throw accountError;
        bankAccountId = newAccount.id;
      }

      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          bank_account_id: bankAccountId,
          amount: withdrawAmount,
          status: 'pending',
        });

      if (withdrawalError) throw withdrawalError;

      toast.success('Withdrawal request submitted successfully');
      
      // Reset form
      setAmount('');
      setVerifiedAccount(null);
      setAccountNumber('');
      setSelectedBank('');
      
      // Refresh data
      refetchWallet();
      
      // Refresh history
      const { data: newHistory } = await supabase
        .from('withdrawals')
        .select('*, bank_accounts(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (newHistory) {
        setWithdrawalHistory(newHistory);
      }

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-chart-2';
      case 'rejected': return 'text-destructive';
      case 'processing': return 'text-chart-4';
      default: return 'text-muted-foreground';
    }
  };

  if (authLoading || walletLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-semibold">Withdraw Funds</h1>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(wallet?.balance || 0, "NGN", { decimals: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* KYC Gate */}
        {kycVerified === false && (
          <Card className="mb-6 border-0 shadow-md bg-warning/5 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-warning flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-warning">Identity Verification Required</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You must complete KYC verification before you can withdraw funds.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => navigate("/kyc")}
                  >
                    Verify Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Form */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bank Selection */}
            <div className="space-y-2">
              <Label>Select Bank</Label>
              <Select 
                value={selectedBank} 
                onValueChange={(value) => {
                  setSelectedBank(value);
                  setVerifiedAccount(null);
                  setVerificationError(null);
                }}
                disabled={loadingBanks}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select your bank"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter 10-digit account number"
                value={accountNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAccountNumber(value);
                  setVerifiedAccount(null);
                  setVerificationError(null);
                }}
                maxLength={10}
              />
              {accountNumber.length > 0 && accountNumber.length < 10 && (
                <p className="text-xs text-muted-foreground">{10 - accountNumber.length} digits remaining</p>
              )}
            </div>

            {/* Verify Button */}
            {selectedBank && accountNumber.length === 10 && !verifiedAccount && (
              <Button 
                onClick={handleVerifyAccount} 
                disabled={verifying}
                className="w-full"
                variant="outline"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Account...
                  </>
                ) : (
                  'Verify Account'
                )}
              </Button>
            )}

            {/* Verification Error */}
            {verificationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
            )}

            {/* Verified Account Display */}
            {verifiedAccount && (
              <Alert className="border-chart-2/30 bg-chart-2/10">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <AlertDescription className="text-foreground">
                  <span className="font-semibold">{verifiedAccount.account_name}</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {verifiedAccount.bank_name} • {verifiedAccount.account_number}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Amount Input */}
            {verifiedAccount && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Withdrawal Amount (NGN)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setAmount(value);
                  }}
                />
              </div>
            )}

            {/* Submit Button */}
            {verifiedAccount && amount && (
              <Button 
                onClick={handleSubmitWithdrawal}
                disabled={submitting || !amount}
                className="w-full gradient-primary shadow-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Request Withdrawal
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        {withdrawalHistory.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Recent Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {withdrawalHistory.map((withdrawal) => (
                <div 
                  key={withdrawal.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {formatCurrency(withdrawal.amount, "NGN", { decimals: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-medium capitalize ${getStatusColor(withdrawal.status)}`}>
                    {withdrawal.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Withdraw;
