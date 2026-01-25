import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, GripVertical, Upload, X } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<ScreenshotGuideContent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    section_type: "checklist_item",
    title: "",
    description: "",
    image_url: "",
    icon_name: "",
  });
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `guide/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("admin-content")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("admin-content")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleNewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const url = await uploadImage(file);
    if (url) {
      setNewItem({ ...newItem, image_url: url });
    }
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const url = await uploadImage(file);
    if (url) {
      setEditingItem({ ...editingItem, image_url: url });
    }
  };

  const clearNewImage = () => {
    setNewImagePreview(null);
    setNewItem({ ...newItem, image_url: "" });
    if (newFileInputRef.current) {
      newFileInputRef.current.value = "";
    }
  };

  const clearEditImage = () => {
    setEditImagePreview(null);
    if (editingItem) {
      setEditingItem({ ...editingItem, image_url: null });
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
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
      setNewImagePreview(null);
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
      setEditImagePreview(null);
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
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setNewImagePreview(null);
                setNewItem({
                  section_type: "checklist_item",
                  title: "",
                  description: "",
                  image_url: "",
                  icon_name: "",
                });
              }
            }}>
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
                    <Label>Image</Label>
                    <div className="space-y-2">
                      {(newImagePreview || newItem.image_url) ? (
                        <div className="relative inline-block">
                          <img
                            src={newImagePreview || newItem.image_url}
                            alt="Preview"
                            className="w-32 h-24 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-6 h-6"
                            onClick={clearNewImage}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => newFileInputRef.current?.click()}
                          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {uploading ? "Uploading..." : "Click to upload image"}
                          </p>
                        </div>
                      )}
                      <input
                        ref={newFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleNewImageChange}
                      />
                    </div>
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
                  <Button className="gradient-primary" onClick={handleAddItem} disabled={saving || uploading}>
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
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
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
                              <Dialog onOpenChange={(open) => {
                                if (!open) {
                                  setEditingItem(null);
                                  setEditImagePreview(null);
                                }
                              }}>
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
                                        <Label>Image</Label>
                                        <div className="space-y-2">
                                          {(editImagePreview || editingItem.image_url) ? (
                                            <div className="relative inline-block">
                                              <img
                                                src={editImagePreview || editingItem.image_url || ""}
                                                alt="Preview"
                                                className="w-32 h-24 object-cover rounded-lg border"
                                              />
                                              <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 w-6 h-6"
                                                onClick={clearEditImage}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div
                                              onClick={() => editFileInputRef.current?.click()}
                                              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                                            >
                                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                              <p className="text-sm text-muted-foreground">
                                                {uploading ? "Uploading..." : "Click to upload image"}
                                              </p>
                                            </div>
                                          )}
                                          <input
                                            ref={editFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleEditImageChange}
                                          />
                                        </div>
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
                                      disabled={saving || uploading}
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