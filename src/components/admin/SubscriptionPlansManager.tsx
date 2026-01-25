import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  discount_text: string | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
}

export const SubscriptionPlansManager = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    price: "",
    description: "",
    discount_text: "",
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price) {
      toast.error("Name and price are required");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = plans.reduce((max, p) => Math.max(max, p.display_order), 0);
      const { error } = await supabase.from("subscription_plans").insert({
        name: newPlan.name,
        price: parseFloat(newPlan.price),
        description: newPlan.description || null,
        discount_text: newPlan.discount_text || null,
        display_order: maxOrder + 1,
        is_featured: false,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Plan added successfully");
      setNewPlan({ name: "", price: "", description: "", discount_text: "" });
      setIsAddDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to add plan");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: editingPlan.name,
          price: editingPlan.price,
          description: editingPlan.description,
          discount_text: editingPlan.discount_text,
          is_featured: editingPlan.is_featured,
          is_active: editingPlan.is_active,
        })
        .eq("id", editingPlan.id);

      if (error) throw error;
      toast.success("Plan updated successfully");
      setEditingPlan(null);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
      toast.success("Plan deleted");
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete plan");
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    }
  };

  const handleToggleFeatured = async (plan: SubscriptionPlan) => {
    try {
      // Remove featured from all others first
      if (!plan.is_featured) {
        await supabase
          .from("subscription_plans")
          .update({ is_featured: false })
          .neq("id", plan.id);
      }

      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_featured: !plan.is_featured })
        .eq("id", plan.id);

      if (error) throw error;
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subscription Plans</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Subscription Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Name *</Label>
                  <Input
                    placeholder="e.g., Weekly, Monthly, Yearly"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (₦) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder="5000"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Plan benefits description..."
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Text</Label>
                  <Input
                    placeholder="e.g., Save 20%"
                    value={newPlan.discount_text}
                    onChange={(e) => setNewPlan({ ...newPlan, discount_text: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button className="gradient-primary" onClick={handleAddPlan} disabled={saving}>
                  {saving ? <LoadingSpinner size="sm" /> : "Add Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No subscription plans configured yet.
          </p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "p-4 rounded-lg border",
                  plan.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60",
                  plan.is_featured && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{plan.name}</h4>
                    {plan.is_featured && (
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    )}
                    {plan.discount_text && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {plan.discount_text}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-primary">
                    {formatCurrency(plan.price, "NGN")}
                  </span>
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(plan.is_featured && "border-primary")}
                    onClick={() => handleToggleFeatured(plan)}
                  >
                    <Star className={cn("w-4 h-4 mr-1", plan.is_featured && "fill-primary")} />
                    {plan.is_featured ? "Featured" : "Set Featured"}
                  </Button>
                  <div className="flex-1" />
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={() => handleToggleActive(plan)}
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Plan</DialogTitle>
                      </DialogHeader>
                      {editingPlan && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input
                              value={editingPlan.name}
                              onChange={(e) =>
                                setEditingPlan({ ...editingPlan, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price (₦)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                              <Input
                                type="number"
                                className="pl-8"
                                value={editingPlan.price}
                                onChange={(e) =>
                                  setEditingPlan({
                                    ...editingPlan,
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={editingPlan.description || ""}
                              onChange={(e) =>
                                setEditingPlan({ ...editingPlan, description: e.target.value })
                              }
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Discount Text</Label>
                            <Input
                              value={editingPlan.discount_text || ""}
                              onChange={(e) =>
                                setEditingPlan({ ...editingPlan, discount_text: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button className="gradient-primary" onClick={handleUpdatePlan} disabled={saving}>
                          {saving ? <LoadingSpinner size="sm" /> : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
