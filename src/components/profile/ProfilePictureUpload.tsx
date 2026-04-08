import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProfilePictureUploadProps {
  currentUrl?: string | null;
  initials: string;
  onUpload: (url: string) => void;
  locked?: boolean;
}

export const ProfilePictureUpload = ({
  currentUrl,
  initials,
  onUpload,
  locked = false,
}: ProfilePictureUploadProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setIsOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      onUpload(avatarUrl);
      toast.success("Profile picture updated");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      setPreview(null);
      setSelectedFile(null);
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Update profile to remove avatar
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", user.id);

      if (error) throw error;

      onUpload("");
      toast.success("Profile picture removed");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error("Failed to remove image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative inline-block">
        <Avatar className="w-20 h-20">
          <AvatarImage src={currentUrl || undefined} />
          <AvatarFallback className="bg-muted text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {locked ? (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow-lg" title="Locked — KYC verified">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover"
                />
                <button
                  onClick={() => {
                    setPreview(null);
                    setSelectedFile(null);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">
                  Click to select
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {currentUrl && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleRemove}
                disabled={uploading}
              >
                Remove Photo
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? <LoadingSpinner size="sm" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
