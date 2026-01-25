import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ExternalLink, GripVertical } from "lucide-react";
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

interface RecommendedTool {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  redirect_url: string;
  display_order: number;
  is_active: boolean;
}

export const RecommendedToolsManager = () => {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTool, setEditingTool] = useState<RecommendedTool | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTool, setNewTool] = useState({
    title: "",
    description: "",
    image_url: "",
    redirect_url: "",
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from("recommended_tools")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error("Error fetching tools:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    if (!newTool.title || !newTool.redirect_url) {
      toast.error("Title and redirect URL are required");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = tools.reduce((max, t) => Math.max(max, t.display_order), 0);
      const { error } = await supabase.from("recommended_tools").insert({
        title: newTool.title,
        description: newTool.description,
        image_url: newTool.image_url || null,
        redirect_url: newTool.redirect_url,
        display_order: maxOrder + 1,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Tool added successfully");
      setNewTool({ title: "", description: "", image_url: "", redirect_url: "" });
      setIsAddDialogOpen(false);
      fetchTools();
    } catch (error: any) {
      toast.error(error.message || "Failed to add tool");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTool = async () => {
    if (!editingTool) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("recommended_tools")
        .update({
          title: editingTool.title,
          description: editingTool.description,
          image_url: editingTool.image_url,
          redirect_url: editingTool.redirect_url,
          is_active: editingTool.is_active,
        })
        .eq("id", editingTool.id);

      if (error) throw error;
      toast.success("Tool updated successfully");
      setEditingTool(null);
      fetchTools();
    } catch (error: any) {
      toast.error(error.message || "Failed to update tool");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      const { error } = await supabase.from("recommended_tools").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tool deleted");
      fetchTools();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tool");
    }
  };

  const handleToggleActive = async (tool: RecommendedTool) => {
    try {
      const { error } = await supabase
        .from("recommended_tools")
        .update({ is_active: !tool.is_active })
        .eq("id", tool.id);

      if (error) throw error;
      fetchTools();
    } catch (error: any) {
      toast.error(error.message || "Failed to update tool");
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
          <CardTitle className="text-lg">Recommended Tools</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" />
                Add Tool
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recommended Tool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., TradingView"
                    value={newTool.title}
                    onChange={(e) => setNewTool({ ...newTool, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the tool"
                    value={newTool.description}
                    onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://example.com/image.png"
                    value={newTool.image_url}
                    onChange={(e) => setNewTool({ ...newTool, image_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Redirect URL *</Label>
                  <Input
                    placeholder="https://tradingview.com"
                    value={newTool.redirect_url}
                    onChange={(e) => setNewTool({ ...newTool, redirect_url: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button className="gradient-primary" onClick={handleAddTool} disabled={saving}>
                  {saving ? <LoadingSpinner size="sm" /> : "Add Tool"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tools.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No recommended tools configured yet.
          </p>
        ) : (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className={`p-3 rounded-lg border ${
                  tool.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  {tool.image_url && (
                    <img
                      src={tool.image_url}
                      alt={tool.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tool.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tool.redirect_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tool.is_active}
                      onCheckedChange={() => handleToggleActive(tool)}
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTool(tool)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Tool</DialogTitle>
                        </DialogHeader>
                        {editingTool && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={editingTool.title}
                                onChange={(e) =>
                                  setEditingTool({ ...editingTool, title: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={editingTool.description}
                                onChange={(e) =>
                                  setEditingTool({ ...editingTool, description: e.target.value })
                                }
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Image URL</Label>
                              <Input
                                value={editingTool.image_url || ""}
                                onChange={(e) =>
                                  setEditingTool({ ...editingTool, image_url: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Redirect URL</Label>
                              <Input
                                value={editingTool.redirect_url}
                                onChange={(e) =>
                                  setEditingTool({ ...editingTool, redirect_url: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button className="gradient-primary" onClick={handleUpdateTool} disabled={saving}>
                            {saving ? <LoadingSpinner size="sm" /> : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTool(tool.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
