import { useState, useEffect } from "react";
import { MessageSquare, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface NotificationTemplate {
  id: string;
  key: string;
  subject: string;
  body: string;
  is_active: boolean;
}

export const NotificationTemplates = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", body: "" });

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("key");

      if (error) throw error;
      setTemplates((data || []) as NotificationTemplate[]);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (template: NotificationTemplate) => {
    setEditingId(template.id);
    setEditForm({ subject: template.subject, body: template.body });
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update({
          subject: editForm.subject,
          body: editForm.body,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Template updated");
      setEditingId(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    }
  };

  const handleToggleActive = async (template: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    }
  };

  const formatKey = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Notification Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Customize email and notification messages. Use placeholders like $AMOUNT,
          $SYMBOL, $REASON for dynamic content.
        </p>

        {templates.map((template) => (
          <div
            key={template.id}
            className="p-4 rounded-lg border bg-muted/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{formatKey(template.key)}</h4>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={() => handleToggleActive(template)}
                />
              </div>
              {editingId === template.id ? (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSave(template.id)}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>

            {editingId === template.id ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={editForm.subject}
                    onChange={(e) =>
                      setEditForm({ ...editForm, subject: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Body</Label>
                  <Textarea
                    value={editForm.body}
                    onChange={(e) =>
                      setEditForm({ ...editForm, body: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {template.subject}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.body}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
