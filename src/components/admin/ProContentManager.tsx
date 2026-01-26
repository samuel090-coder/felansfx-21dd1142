import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Video, FileText, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface ProContent {
  id: string;
  title: string;
  content: string;
  content_type: string;
  video_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const ProContentManager = () => {
  const [items, setItems] = useState<ProContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    content_type: "article",
    video_url: "",
    display_order: 0,
  });

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("pro_content")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to fetch content");
      return;
    }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      content_type: "article",
      video_url: "",
      display_order: items.length,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    const payload = {
      title: formData.title,
      content: formData.content,
      content_type: formData.content_type,
      video_url: formData.video_url || null,
      display_order: formData.display_order,
    };

    if (editingId) {
      const { error } = await supabase
        .from("pro_content")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update");
        return;
      }
      toast.success("Content updated!");
    } else {
      const { error } = await supabase.from("pro_content").insert(payload);

      if (error) {
        toast.error("Failed to create");
        return;
      }
      toast.success("Content added!");
     
     // Send push notification to all subscribers
     try {
       const hasVideo = formData.video_url && formData.video_url.trim().length > 0;
       await supabase.functions.invoke("send-push", {
         body: {
           title: `📚 New ${hasVideo ? "Video" : "Guide"} Available`,
           message: formData.title,
           url: "/daily-streak",
         },
       });
     } catch (pushError) {
       console.error("Failed to send push notification:", pushError);
     }
    }

    resetForm();
    fetchItems();
  };

  const editItem = (item: ProContent) => {
    setFormData({
      title: item.title,
      content: item.content,
      content_type: item.content_type,
      video_url: item.video_url || "",
      display_order: item.display_order,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("pro_content")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Failed to toggle");
      return;
    }
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("pro_content").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted!");
    fetchItems();
  };

  // Extract video ID from YouTube or Vimeo URL
  const getVideoPreview = (url: string) => {
    if (!url) return null;
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    }
    
    return null;
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pro Content (Guides & Videos)</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Content
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit Content" : "Add Pro Content"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Select
              value={formData.content_type}
              onValueChange={(v) => setFormData({ ...formData, content_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">📄 Article/Guide</SelectItem>
                <SelectItem value="video">🎬 Video Tutorial</SelectItem>
                <SelectItem value="tip">💡 Trading Tip</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Content text (supports markdown)"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
            />
            <div className="space-y-1">
              <Input
                placeholder="Video URL (YouTube or Vimeo)"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube or Vimeo link. Example: https://youtube.com/watch?v=abc123
              </p>
              {formData.video_url && getVideoPreview(formData.video_url) && (
                <img 
                  src={getVideoPreview(formData.video_url) || ""} 
                  alt="Video preview" 
                  className="w-32 h-20 object-cover rounded"
                />
              )}
            </div>
            <Input
              type="number"
              placeholder="Display Order"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? "Update" : "Add"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No content yet</p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className={`border ${!item.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.video_url ? (
                        <Video className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.content_type}
                      </Badge>
                      {!item.is_active && (
                        <Badge variant="outline">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.content || "No description"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(item.id, item.is_active)}
                    >
                      {item.is_active ? "Hide" : "Show"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editItem(item)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
