import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
import { copyText } from "@/lib/platform";
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

export type CheckoutPurpose = "deposit" | "app_access" | "ai_bot";

interface VirtualAccountCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: CheckoutPurpose;
  amount: number;
  planKey?: string;
  invocationId?: string | null;
  /** Called after the payment proof has been submitted successfully. */
  onSubmitted?: () => void;
}

interface BankDetails {
  bank: string;
  accountNumber: string;
  accountName: string;
}

const FALLBACK_BANK: BankDetails = {
  bank: "Opay",
  accountNumber: "9066423764",
  accountName: "Samuel",
};

const GENERATING_STEPS = [
  "Securing your session",
  "Contacting payment partner",
  "Reserving a virtual account",
  "Finalising account details",
];

const purposeLabel: Record<CheckoutPurpose, string> = {
  deposit: "Wallet Deposit",
  app_access: "Premium Access",
  ai_bot: "AI Trading Bot",
};

export const VirtualAccountCheckout = ({
  open,
  onOpenChange,
  purpose,
  amount,
  planKey,
  invocationId,
  onSubmitted,
}: VirtualAccountCheckoutProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"generating" | "details" | "proof" | "done">("generating");
  const [progress, setProgress] = useState(0);
  const [bank, setBank] = useState<BankDetails>(FALLBACK_BANK);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [accountCopied, setAccountCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [reference] = useState(
    () => `FX-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the flow every time the sheet opens
  useEffect(() => {
    if (!open) return;
    setStep("generating");
    setProgress(0);
    setAccountCopied(false);
    setCopiedField(null);
    setFile(null);
    setSecondsLeft(30 * 60);
  }, [open]);

  // Load bank details (admin-configurable via app settings)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["payment_bank_name", "payment_account_number", "payment_account_name"]);
      const map: Record<string, string> = {};
      data?.forEach((d) => { map[d.key] = d.value; });
      setBank({
        bank: map.payment_bank_name || FALLBACK_BANK.bank,
        accountNumber: map.payment_account_number || FALLBACK_BANK.accountNumber,
        accountName: map.payment_account_name || FALLBACK_BANK.accountName,
      });
    })();
  }, [open]);

  // "Generating virtual account" animation
  useEffect(() => {
    if (!open || step !== "generating") return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 4;
      });
    }, 110);
    return () => clearInterval(timer);
  }, [open, step]);

  useEffect(() => {
    if (step === "generating" && progress >= 100) {
      const t = setTimeout(() => setStep("details"), 350);
      return () => clearTimeout(t);
    }
  }, [step, progress]);

  // Session countdown on the details screen
  useEffect(() => {
    if (step !== "details") return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const copy = useCallback(async (label: string, value: string) => {
    try {
      if (!(await copyText(value))) throw new Error("copy failed");
    } catch {
      /* clipboard blocked — still treat as acknowledged */
    }
    setCopiedField(label);
    if (label === "account") setAccountCopied(true);
    toast.success(`${label === "account" ? "Account number" : "Details"} copied`);
    setTimeout(() => setCopiedField((c) => (c === label ? null : c)), 1800);
  }, []);

  const submitProof = async () => {
    if (!user || !file) return;
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${purpose}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      const screenshotUrl = pub.publicUrl;

      if (purpose === "deposit") {
        const { error } = await supabase
          .from("deposits")
          .insert({ user_id: user.id, amount, screenshot_url: screenshotUrl, status: "pending" });
        if (error) throw error;
      } else if (purpose === "app_access") {
        const { error } = await supabase.from("access_payments").insert({
          user_id: user.id,
          amount,
          screenshot_url: screenshotUrl,
          invocation_id: invocationId || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_bot_purchases").insert({
          user_id: user.id,
          plan_key: planKey || "daily",
          amount,
          screenshot_url: screenshotUrl,
        });
        if (error) throw error;
      }

      setStep("done");
      onSubmitted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit your payment proof");
    } finally {
      setSubmitting(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const Row = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <button
      type="button"
      onClick={() => copy(field, value)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left transition-colors hover:bg-muted/70"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("truncate font-semibold", field === "account" ? "text-lg tracking-wider" : "text-sm")}>
          {value}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
        {copiedField === field ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copiedField === field ? "Copied" : "Copy"}
      </span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl p-0">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/5 to-transparent px-5 pb-4 pt-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{purposeLabel[purpose]}</p>
              <p className="truncate text-[11px] text-muted-foreground">Ref {reference}</p>
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold">{formatCurrency(amount, "NGN", { decimals: 0 })}</p>
        </div>

        <div className="space-y-4 px-5 pb-5">
          {step === "generating" && (
            <div className="space-y-4 py-6 text-center">
              <div className="relative mx-auto h-16 w-16">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Hold on…</p>
                <p className="text-xs text-muted-foreground">
                  We're generating a virtual account number for you. Generating…
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <ul className="space-y-1.5 text-left">
                {GENERATING_STEPS.map((s, i) => {
                  const reached = progress >= (i + 1) * 25 - 10;
                  return (
                    <li key={s} className="flex items-center gap-2 text-[11px]">
                      {reached ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                      )}
                      <span className={reached ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <Building2 className="h-3.5 w-3.5" /> Virtual account ready
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Expires {mm}:{ss}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Transfer exactly <b className="text-foreground">{formatCurrency(amount, "NGN", { decimals: 0 })}</b> to
                the account below, then tap <b className="text-foreground">I've Paid</b>.
              </p>

              <div className="space-y-2">
                <Row label="Bank" value={bank.bank} field="bank" />
                <Row label="Account Number" value={bank.accountNumber} field="account" />
                <Row label="Account Name" value={bank.accountName} field="name" />
              </div>

              {!accountCopied && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Tap the account number to copy it and unlock the payment button.
                </p>
              )}

              <Button
                className="h-12 w-full rounded-xl gradient-primary text-sm font-bold"
                disabled={!accountCopied}
                onClick={() => setStep("proof")}
              >
                {accountCopied ? (
                  <>I've Paid {formatCurrency(amount, "NGN", { decimals: 0 })}</>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Copy account number to continue
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full text-center text-xs text-muted-foreground"
              >
                Cancel payment
              </button>
            </div>
          )}

          {step === "proof" && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Upload payment proof</p>
                <p className="text-xs text-muted-foreground">
                  Attach the screenshot or receipt of your transfer so we can confirm it.
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="truncate text-xs">{file.name}</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-muted-foreground"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Tap to select screenshot</span>
                </button>
              )}

              <Button
                className="h-12 w-full rounded-xl gradient-primary text-sm font-bold"
                disabled={!file || submitting}
                onClick={submitProof}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Payment Proof
              </Button>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="w-full text-center text-xs text-muted-foreground"
              >
                Back to account details
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3 py-5 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <p className="text-sm font-semibold">Payment proof received</p>
              <p className="text-xs text-muted-foreground">
                Our team is confirming your transfer. You'll be notified as soon as it's approved — usually within
                minutes.
              </p>
              <Button className="h-11 w-full rounded-xl" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
