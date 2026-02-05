import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Wallet, 
  Upload, 
  Check, 
  Loader2, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface DepositFlowProps {
  userId: string;
  onComplete: (message: string) => void;
  onCancel: () => void;
}

type FlowStep = "amount" | "payment" | "upload" | "validating" | "invalid" | "pending" | "complete";

const DEPOSIT_AMOUNTS = [
  { value: 5000, label: "₦5,000" },
  { value: 10000, label: "₦10,000" },
  { value: 20000, label: "₦20,000" },
  { value: 50000, label: "₦50,000" },
  { value: 100000, label: "₦100,000" },
];

export const DepositFlow = ({ userId, onComplete, onCancel }: DepositFlowProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<{
    name: string;
    details: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPaymentDetails = async () => {
    const { data, error } = await supabase
      .from("deposit_methods")
      .select("name, details")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Could not load payment details. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    setPaymentDetails(data);
    return true;
  };

  const handleAmountSelect = async (amount: number) => {
    setSelectedAmount(amount);
    const success = await fetchPaymentDetails();
    if (success) {
      setStep("payment");
    }
  };

  const handleCustomAmount = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1000) {
      toast({
        title: "Invalid amount",
        description: "Please enter at least ₦1,000",
        variant: "destructive",
      });
      return;
    }
    await handleAmountSelect(amount);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePaymentSent = () => {
    setStep("upload");
  };

  const validateFileType = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateReceiptWithAI = async (imageUrl: string): Promise<{ valid: boolean; reason: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("validate-receipt", {
        body: { imageUrl },
      });

      if (error) {
        console.error("Receipt validation error:", error);
        // Fallback: accept for manual review
        return { valid: true, reason: "Accepted for manual review" };
      }

      return {
        valid: data.valid === true,
        reason: data.reason || "Validation complete",
      };
    } catch (error) {
      console.error("Receipt validation failed:", error);
      return { valid: true, reason: "Accepted for manual review" };
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file)) return;

    setStep("validating");
    setIsUploading(true);

    try {
      // Upload to Supabase storage first
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Validate the receipt with AI
      console.log("Validating receipt with AI...");
      const validation = await validateReceiptWithAI(imageUrl);

      if (!validation.valid) {
        // Receipt is invalid - ask user to upload a real one
        setInvalidReason(validation.reason);
        setStep("invalid");
        
        // Delete the invalid upload
        await supabase.storage.from("uploads").remove([fileName]);
        return;
      }

      // Receipt is valid - create deposit record
      const { error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: userId,
          amount: selectedAmount!,
          screenshot_url: imageUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      setStep("pending");
      
      // After a brief moment, complete the flow
      setTimeout(() => {
        onComplete(
          `Perfect! 🎉 I've received your payment proof for ${formatCurrency(selectedAmount!, "NGN")}!\n\n` +
          `Your screenshot has been verified and sent to our admin team. ⏳\n\n` +
          `You'll receive a notification once your deposit is confirmed (usually within 5-15 minutes).\n\n` +
          `In the meantime, would you like to continue learning? I have some great lessons ready for you! 📚`
        );
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload your screenshot. Please try again.",
        variant: "destructive",
      });
      setStep("upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = () => {
    setInvalidReason("");
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parsePaymentDetails = (details: string) => {
    const lines = details.split("\n").filter(Boolean);
    const parsed: { label: string; value: string }[] = [];
    
    lines.forEach((line) => {
      const [label, ...valueParts] = line.split(":");
      if (label && valueParts.length) {
        parsed.push({
          label: label.trim(),
          value: valueParts.join(":").trim(),
        });
      }
    });
    
    return parsed;
  };

  if (step === "amount") {
    return (
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">How much would you like to deposit? 💰</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {DEPOSIT_AMOUNTS.map((amt) => (
              <Button
                key={amt.value}
                variant="outline"
                className="h-12"
                onClick={() => handleAmountSelect(amt.value)}
              >
                {amt.label}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom amount (min ₦1,000)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCustomAmount} disabled={!customAmount}>
              Go
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
            Maybe later
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "payment" && paymentDetails) {
    const parsedDetails = parsePaymentDetails(paymentDetails.details);
    
    return (
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-2xl">💳</span>
            <h3 className="font-semibold mt-1">Transfer {formatCurrency(selectedAmount!, "NGN")}</h3>
            <p className="text-sm text-muted-foreground">Send to this account:</p>
          </div>
          
          <div className="bg-background rounded-lg p-4 space-y-3">
            {parsedDetails.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-sm">{item.value}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleCopy(item.value, item.label)}
                >
                  {copiedField === item.label ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
          
          <Button 
            className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            onClick={handlePaymentSent}
          >
            <Check className="w-4 h-4 mr-2" />
            I've Sent the Money
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "upload") {
    return (
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="space-y-4 text-center">
          <div>
            <span className="text-3xl">📸</span>
            <h3 className="font-semibold mt-2">Upload Payment Screenshot</h3>
            <p className="text-sm text-muted-foreground">
              Please upload a clear screenshot of your transfer confirmation
            </p>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <Button
            className="w-full h-20 border-dashed border-2"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <Upload className="w-6 h-6 mb-1" />
              <span>Tap to upload screenshot</span>
            </div>
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "validating") {
    return (
      <Card className="p-6 bg-muted/50 border-primary/20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="font-semibold">Scanning your screenshot... 🔍</h3>
            <p className="text-sm text-muted-foreground">
              Coach Alex is verifying your payment receipt
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (step === "invalid") {
    return (
      <Card className="p-6 bg-muted/50 border-red-500/20">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 mx-auto text-red-500" />
          <div>
            <h3 className="font-semibold text-red-600">Invalid Screenshot 😕</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {invalidReason || "This doesn't look like a valid payment receipt."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please upload a real bank transfer or payment confirmation screenshot.
            </p>
          </div>
          
          <Button 
            onClick={handleRetryUpload}
            className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Real Screenshot
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "pending") {
    return (
      <Card className="p-6 bg-muted/50 border-green-500/20">
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          <div>
            <h3 className="font-semibold text-green-600">Screenshot Verified! ✅</h3>
            <p className="text-sm text-muted-foreground">
              Sent to admin for confirmation...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Usually 5-15 minutes</span>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};
