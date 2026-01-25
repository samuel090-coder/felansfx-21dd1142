import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface ScreenshotGuideContent {
  id: string;
  section_type: string;
  title: string;
  description: string | null;
  image_url: string | null;
  icon_name: string | null;
  display_order: number;
  is_active: boolean;
}

const SECTION_TYPES = [
  { value: "header", label: "Header" },
  { value: "checklist_item", label: "Checklist Item" },
  { value: "good_example", label: "Good Example" },
  { value: "bad_example", label: "Bad Example" },
];

export const ScreenshotGuideManager = () => {
  const [content, setContent] = useState<ScreenshotGuideContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ScreenshotGuideContent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    section_type: "checklist_item",
    title: "",
    description: "",
    image_url: "",
    icon_name: "",
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("screenshot_guide_content")
        .select("*")
        .order("section_type")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = content
        .filter((c) => c.section_type === newItem.section_type)
        .reduce((max, c) => Math.max(max, c.display_order), 0);

      const { error } = await supabase.from("screenshot_guide_content").insert({
        section_type: newItem.section_type,
        title: newItem.title,
        description: newItem.description || null,
        image_url: newItem.image_url || null,
        icon_name: newItem.icon_name || null,
        display_order: maxOrder + 1,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Content added successfully");
      setNewItem({
        section_type: "checklist_item",
        title: "",
        description: "",
        image_url: "",
        icon_name: "",
      });
      setIsAddDialogOpen(false);
      fetchContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to add content");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("screenshot_guide_content")
        .update({
          section_type: editingItem.section_type,
          title: editingItem.title,
          description: editingItem.description,
          image_url: editingItem.image_url,
          icon_name: editingItem.icon_name,
          is_active: editingItem.is_active,
        })
        .eq("id", editingItem.id);

      if (error) throw error;
      toast.success("Content updated successfully");
      setEditingItem(null);
      fetchContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to update content");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("screenshot_guide_content").delete().eq("id", id);
      if (error) throw error;
      toast.success("Content deleted");
      fetchContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete content");
    }
  };

  const handleToggleActive = async (item: ScreenshotGuideContent) => {
    try {
      const { error } = await supabase
        .from("screenshot_guide_content")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      fetchContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to update content");
    }
  };

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.section_type]) {
      acc[item.section_type] = [];
    }
    acc[item.section_type].push(item);
    return acc;
  }, {} as Record<string, ScreenshotGuideContent[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Screenshot Guide Content</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Content
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Guide Content</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Section Type</Label>
                    <Select
                      value={newItem.section_type}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, section_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="e.g., Crop chart area only"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Additional details..."
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      placeholder="https://example.com/image.png"
                      value={newItem.image_url}
                      onChange={(e) =>
                        setNewItem({ ...newItem, image_url: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon Name (Lucide)</Label>
                    <Input
                      placeholder="e.g., Check, Camera, AlertTriangle"
                      value={newItem.icon_name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, icon_name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button className="gradient-primary" onClick={handleAddItem} disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" /> : "Add Content"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedContent).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No content configured yet.
            </p>
          ) : (
            <div className="space-y-6">
              {SECTION_TYPES.map((sectionType) => {
                const items = groupedContent[sectionType.value] || [];
                if (items.length === 0) return null;

                return (
                  <div key={sectionType.value}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      {sectionType.label}s ({items.length})
                    </h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border ${
                            item.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => handleToggleActive(item)}
                              />
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingItem(item)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Content</DialogTitle>
                                  </DialogHeader>
                                  {editingItem && (
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label>Section Type</Label>
                                        <Select
                                          value={editingItem.section_type}
                                          onValueChange={(value) =>
                                            setEditingItem({
                                              ...editingItem,
                                              section_type: value,
                                            })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {SECTION_TYPES.map((type) => (
                                              <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                          value={editingItem.title}
                                          onChange={(e) =>
                                            setEditingItem({
                                              ...editingItem,
                                              title: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                          value={editingItem.description || ""}
                                          onChange={(e) =>
                                            setEditingItem({
                                              ...editingItem,
                                              description: e.target.value,
                                            })
                                          }
                                          rows={3}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Image URL</Label>
                                        <Input
                                          value={editingItem.image_url || ""}
                                          onChange={(e) =>
                                            setEditingItem({
                                              ...editingItem,
                                              image_url: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Icon Name</Label>
                                        <Input
                                          value={editingItem.icon_name || ""}
                                          onChange={(e) =>
                                            setEditingItem({
                                              ...editingItem,
                                              icon_name: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      className="gradient-primary"
                                      onClick={handleUpdateItem}
                                      disabled={saving}
                                    >
                                      {saving ? <LoadingSpinner size="sm" /> : "Save Changes"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
