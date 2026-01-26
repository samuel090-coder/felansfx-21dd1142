import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Newspaper, Calendar, Lightbulb, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MarketNews {
  id: string;
  title: string;
  content: string;
  news_type: string;
  importance: string;
  source: string | null;
  is_active: boolean;
  published_at: string;
  created_at: string;
}

export const MarketNewsManager = () => {
  const [news, setNews] = useState<MarketNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    news_type: "news",
    importance: "medium",
    source: "",
  });

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from("market_news")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch news");
      return;
    }
    setNews(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      news_type: "news",
      importance: "medium",
      source: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Please fill in title and content");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("market_news")
        .update({
          title: formData.title,
          content: formData.content,
          news_type: formData.news_type,
          importance: formData.importance,
          source: formData.source || null,
        })
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update");
        return;
      }
      toast.success("News updated!");
    } else {
      const { error } = await supabase.from("market_news").insert({
        title: formData.title,
        content: formData.content,
        news_type: formData.news_type,
        importance: formData.importance,
        source: formData.source || null,
      });

      if (error) {
        toast.error("Failed to create");
        return;
      }
      toast.success("News posted!");
     
     // Send push notification to all subscribers
     try {
       const emoji = formData.importance === "high" ? "🔴" : formData.importance === "medium" ? "🟡" : "🔵";
       await supabase.functions.invoke("send-push", {
         body: {
           title: `${emoji} ${formData.news_type === "calendar" ? "Economic Event" : "Market News"}`,
           message: formData.title,
           url: "/daily-streak",
         },
       });
     } catch (pushError) {
       console.error("Failed to send push notification:", pushError);
     }
    }

    resetForm();
    fetchNews();
  };

  const editNews = (item: MarketNews) => {
    setFormData({
      title: item.title,
      content: item.content,
      news_type: item.news_type,
      importance: item.importance,
      source: item.source || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const deleteNews = async (id: string) => {
    const { error } = await supabase.from("market_news").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted!");
    fetchNews();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "news":
        return <Newspaper className="w-4 h-4" />;
      case "calendar":
        return <Calendar className="w-4 h-4" />;
      case "insight":
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Newspaper className="w-4 h-4" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge>{importance}</Badge>;
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Market News & Calendar</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add News
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit News" : "Post News/Calendar Event"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={formData.news_type}
                onValueChange={(v) => setFormData({ ...formData, news_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">📰 News</SelectItem>
                  <SelectItem value="calendar">📅 Calendar Event</SelectItem>
                  <SelectItem value="insight">💡 Market Insight</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formData.importance}
                onValueChange={(v) => setFormData({ ...formData, importance: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High Impact</SelectItem>
                  <SelectItem value="medium">🟡 Medium Impact</SelectItem>
                  <SelectItem value="low">🟢 Low Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Source (optional)"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? "Update" : "Post"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No news posted yet</p>
        ) : (
          news.map((item) => (
            <Card key={item.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.news_type)}
                      <span className="font-semibold">{item.title}</span>
                      {getImportanceBadge(item.importance)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.published_at), "MMM d, yyyy 'at' h:mm a")}
                      {item.source && ` • ${item.source}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editNews(item)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNews(item.id)}
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
