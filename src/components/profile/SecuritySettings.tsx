import { useState, useEffect } from "react";
import { Phone, Lock, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const SecuritySettings = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone_number, transaction_pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPhone((data as any).phone_number || "");
        setHasPin(!!(data as any).transaction_pin_hash);
      }
    };
    load();
  }, [user]);

  const savePhone = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ phone_number: phone } as any)
      .eq("user_id", user.id);
    setSaving(false);
    toast.success("Phone number saved");
  };

  const savePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs don't match");
      return;
    }
    setSavingPin(true);
    const { error } = await supabase.rpc("set_transaction_pin", { p_pin: newPin });
    setSavingPin(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(hasPin ? "PIN updated" : "PIN set successfully");
      setHasPin(true);
      setNewPin("");
      setConfirmPin("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Phone Number */}
      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">Phone Number</Label>
        </div>
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={savePhone} disabled={saving} className="h-9">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Transaction PIN */}
      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">
            {hasPin ? "Change Transaction PIN" : "Set Transaction PIN"}
          </Label>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {hasPin ? "PIN is set ✅ — enter new PIN to change it" : "Required for withdrawals"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Confirm"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <Button
          size="sm"
          onClick={savePin}
          disabled={savingPin || newPin.length !== 4}
          className="w-full"
          variant="outline"
        >
          {savingPin ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          {hasPin ? "Update PIN" : "Set PIN"}
        </Button>
      </div>
    </div>
  );
};
