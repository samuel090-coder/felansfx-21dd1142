import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Clock, CheckCircle, XCircle, AlertCircle, Copy, Check, Loader2, ShieldAlert, ArrowLeft, Eye, ShieldCheck, Landmark, CreditCard, Wallet, CircleEllipsis, ArrowRight, HelpCircle, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCurrency, formatWithConversion } from "@/lib/currency";
import { FintechCard } from "@/components/ui/fintech";
import { cn } from "@/lib/utils";

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

const METHOD_META: Record<string, { icon: typeof Landmark; label: string }> = {
  bank: { icon: Landmark, label: "Bank Transfer" },
  ussd: { icon: CreditCard, label: "USSD" },
  card: { icon: CreditCard, label: "Debit/Credit Card" },
  opay: { icon: Wallet, label: "Opay / PalmPay / Moniepoint" },
  other: { icon: CircleEllipsis, label: "Other Methods" },
};

const quickAmounts = [1000, 5000, 10000, 50000, 100000];

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
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "invalid">("idle");
  const [invalidReason, setInvalidReason] = useState("");

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
        const { data: methods } = await supabase.from("deposit_methods").select("*").eq("is_active", true);
        setDepositMethods(methods || []);
        await fetchDeposits();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refetchWallet();
      fetchDeposits();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, refetchWallet]);

  useEffect(() => {
    if (!selectedMethod && depositMethods.length > 0) setSelectedMethod(depositMethods[0].id);
  }, [depositMethods, selectedMethod]);

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

  const parsePaymentDetails = (details: string) => {
    const lines = details.split("\n").filter(Boolean);
    const parsed: { label: string; value: string }[] = [];
    lines.forEach((line) => {
      const [label, ...valueParts] = line.split(":");
      if (label && valueParts.length) {
        parsed.push({ label: label.trim(), value: valueParts.join(":").trim() });
      }
    });
    return parsed;
  };

  const validateReceiptWithAI = async (imageUrl: string, amountNgn: number) => {
    try {
      let expectedBeneficiary: Record<string, string | undefined> | undefined;
      if (selectedMethodDetails) {
        const parsed = parsePaymentDetails(selectedMethodDetails.details);
        const pick = (labels: string[]) => parsed.find((d) => labels.includes(d.label.toLowerCase()))?.value;
        const receiver_account = pick(["account number", "acct number", "account no", "acct no"]);
        const receiver_bank = pick(["bank", "bank name"]);
        const receiver_name = pick(["account name", "beneficiary", "beneficiary name", "name"]);
        if (receiver_account || receiver_bank || receiver_name) {
          expectedBeneficiary = { receiver_account, receiver_bank, receiver_name };
        }
      }

      const { data, error } = await supabase.functions.invoke("validate-receipt", {
        body: { imageUrl, expectedAmountNgn: amountNgn, expectedBeneficiary },
      });
      if (error) return { valid: false, reason: "Could not verify screenshot. Please try again." };
      return { valid: data?.valid === true, reason: data?.reason || "Validation complete" };
    } catch {
      return { valid: false, reason: "Could not verify screenshot. Please try again." };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !file) {
      toast.error("Please fill all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    const minDepositNGN = parseFloat(settings.min_deposit);
    const maxDepositNGN = parseFloat(settings.max_deposit);

    if (amountNum < minDepositNGN || amountNum > maxDepositNGN) {
      toast.error(`Amount must be between ${formatCurrency(minDepositNGN, "NGN", { decimals: 0 })} and ${formatCurrency(maxDepositNGN, "NGN", { decimals: 0 })}`);
      return;
    }

    setIsSubmitting(true);
    setValidationStatus("validating");
    setInvalidReason("");

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const screenshotUrl = await uploadFile("uploads", filePath, file);
      const validation = await validateReceiptWithAI(screenshotUrl, amountNum);

      if (!validation.valid) {
        setValidationStatus("invalid");
        setInvalidReason(validation.reason);
        await supabase.storage.from("uploads").remove([filePath]);
        setFile(null);
        setIsSubmitting(false);
        return;
      }

      setValidationStatus("idle");
      const autoApproveThreshold = parseFloat(settings.auto_approve_threshold || "0");
      const shouldAutoApprove = autoApproveThreshold > 0 && amountNum <= autoApproveThreshold;

      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: amountNum,
        screenshot_url: screenshotUrl,
        deposit_method_id: selectedMethod || null,
        status: shouldAutoApprove ? "approved" : "pending",
      });
      if (error) throw error;

      if (shouldAutoApprove) {
        await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: amountNum });
        toast.success("Deposit auto-approved and credited! ✅💰");
        refetchWallet();
      } else {
        toast.success("Screenshot verified ✅ Deposit submitted! Awaiting admin approval.");
      }
      setAmount("");
      setFile(null);
      await fetchDeposits();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit deposit request");
      setValidationStatus("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "approved": return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const selectedMethodDetails = depositMethods.find((m) => m.id === selectedMethod);
  const parsedPaymentDetails = useMemo(() => selectedMethodDetails ? parsePaymentDetails(selectedMethodDetails.details) : [], [selectedMethodDetails]);

  if (authLoading || loading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <AppLayout>
      <div className="bg-fx-app">
        <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5 safe-area-top">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-[2.1rem] font-bold text-white">Deposit Funds</h1>
              </div>
            </div>
            <button className="flex items-center gap-2 text-white/58">
              <HelpCircle className="h-5 w-5" />
              <span className="text-base">How it works</span>
            </button>
          </header>

          <FintechCard className="relative mb-6 overflow-hidden p-5">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(26,178,155,0.35),rgba(15,74,138,0.38))]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-white/72">
                  <p className="text-[17px]">Current Balance</p>
                  <Eye className="h-4 w-4" />
                </div>
                <p className="text-[3.1rem] font-extrabold text-white">{formatCurrency(wallet?.balance || 0, "NGN")}</p>
                <p className="mt-2 text-[2rem] text-white/88">≈ {formatWithConversion(wallet?.balance || 0).usd}</p>
                <p className="mt-3 text-base text-white/58">All deposits are in Nigerian Naira (NGN)</p>
              </div>
              <div className="flex h-32 w-32 items-center justify-center rounded-[30px] bg-white/5">
                <Wallet className="h-16 w-16 text-primary" />
              </div>
            </div>
          </FintechCard>

          <FintechCard className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[2rem] font-bold text-white">New Deposit</h2>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-lg">Secure & Encrypted</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">1</span>
                    <p className="text-[1.75rem] font-semibold text-white">Select Payment Method</p>
                  </div>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">Recommended</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(depositMethods.length ? depositMethods : [{ id: 'bank', name: 'Bank Transfer', details: '' }]).map((method, idx) => {
                    const keys = Object.keys(METHOD_META);
                    const meta = METHOD_META[keys[idx] || 'other'] || METHOD_META.other;
                    const Icon = meta.icon;
                    const active = selectedMethod === method.id;
                    return (
                      <button key={method.id} type="button" onClick={() => setSelectedMethod(method.id)} className={cn('rounded-[22px] border p-4 text-left', active ? 'border-primary bg-primary/10 shadow-primary' : 'border-white/10 bg-white/[0.03]')}>
                        <div className="mb-6 flex items-start justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 text-white">
                            <Icon className="h-6 w-6" />
                          </div>
                          {active ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="h-4 w-4" /></span> : null}
                        </div>
                        <p className="text-lg font-semibold text-white">{meta.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">2</span>
                  <p className="text-[1.75rem] font-semibold text-white">Enter Amount</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4">
                  <div className="flex items-center gap-4 text-white">
                    <span className="text-[2.2rem] text-white/45">₦</span>
                    <Input id="amount" type="number" placeholder="10,000" className="h-auto border-0 bg-transparent px-0 py-0 text-[2.2rem] font-medium text-white placeholder:text-white/25 focus-visible:ring-0" value={amount} onChange={(e) => setAmount(e.target.value)} step="100" />
                    {amount ? <button type="button" onClick={() => setAmount("")} className="rounded-full bg-white/8 p-2 text-white/45"><XCircle className="h-5 w-5" /></button> : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {quickAmounts.map((value) => (
                    <button key={value} type="button" onClick={() => setAmount(String(value))} className={cn('rounded-2xl border px-2 py-3 text-base', Number(amount) === value ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/[0.03] text-white/50')}>
                      {formatCurrency(value, 'NGN', { decimals: 0 })}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-base text-white/52">Min: {formatCurrency(parseFloat(settings.min_deposit), 'NGN', { decimals: 0 })} <span className="mx-2">|</span> Max: {formatCurrency(parseFloat(settings.max_deposit), 'NGN', { decimals: 0 })}</p>
              </div>

              {selectedMethodDetails && parsedPaymentDetails.length > 0 ? (
                <FintechCard className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-lg font-semibold text-white">Transfer Details</p>
                    <button type="button" className="text-sm text-primary">Recommended</button>
                  </div>
                  <div className="space-y-3">
                    {parsedPaymentDetails.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div>
                          <p className="text-sm text-white/45">{item.label}</p>
                          <p className="text-base font-semibold text-white">{item.value}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleCopyDetails(item.value, `${idx}`)} className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white">
                          {copiedField === `${idx}` ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </FintechCard>
              ) : null}

              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">3</span>
                  <p className="text-[1.75rem] font-semibold text-white">Upload Payment Screenshot</p>
                </div>
                <label htmlFor="screenshot" className="block rounded-[28px] border-2 border-dashed border-white/12 bg-white/[0.02] px-6 py-10 text-center cursor-pointer">
                  <Upload className="mx-auto mb-4 h-14 w-14 text-primary" />
                  <p className="text-[1.9rem] text-white">Drag & drop or tap to upload</p>
                  <p className="mt-2 text-lg text-white/45">PNG, JPG or JPEG (Max 10MB)</p>
                  <p className="mt-4 text-sm text-white/40">{file ? file.name : 'No screenshot selected yet'}</p>
                </label>
                <input id="screenshot" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <FintechCard className="flex items-start gap-4 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[1.7rem] font-semibold text-primary">Important</p>
                  <p className="mt-2 text-lg leading-relaxed text-white/65">Please ensure the screenshot shows the transaction reference and amount clearly.</p>
                </div>
              </FintechCard>

              {validationStatus === 'validating' ? (
                <FintechCard className="p-5 text-center">
                  <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg font-semibold text-white">Scanning your screenshot...</p>
                  <p className="mt-1 text-sm text-white/45">Verifying payment receipt</p>
                </FintechCard>
              ) : null}

              {validationStatus === 'invalid' ? (
                <FintechCard className="border-destructive/25 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-1 h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-lg font-semibold text-destructive">Invalid Screenshot</p>
                      <p className="mt-1 text-sm text-white/58">{invalidReason}</p>
                      <p className="mt-1 text-sm text-white/40">Please upload a valid bank transfer confirmation screenshot.</p>
                    </div>
                  </div>
                </FintechCard>
              ) : null}

              <Button type="submit" className="h-16 w-full rounded-2xl gradient-primary text-[1.9rem] font-semibold shadow-primary" disabled={isSubmitting || !amount || !file}>
                {isSubmitting ? <LoadingSpinner size="sm" /> : <>Submit Deposit Request <ArrowRight className="ml-2 h-5 w-5" /></>}
              </Button>

              <div className="flex items-center justify-center gap-3 text-white/38">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-base">Your deposits are safe with us. We never store your banking details.</p>
              </div>
            </form>
          </FintechCard>

          <FintechCard className="mt-6 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.8rem] font-bold text-white">Deposit History</h3>
              <span className="text-sm text-white/45">Status tracking</span>
            </div>
            {deposits.length === 0 ? (
              <p className="py-6 text-center text-base text-white/45">No deposits yet</p>
            ) : (
              <div className="space-y-3">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6">{getStatusIcon(deposit.status)}</div>
                      <div>
                        <p className="text-lg font-semibold text-white">{formatCurrency(deposit.amount, 'NGN')}</p>
                        <p className="text-sm text-white/45">{new Date(deposit.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-sm capitalize', deposit.status === 'approved' ? 'bg-success/15 text-success' : deposit.status === 'rejected' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning')}>
                      {deposit.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FintechCard>
        </div>
      </div>
    </AppLayout>
  );
};

export default Deposit;
