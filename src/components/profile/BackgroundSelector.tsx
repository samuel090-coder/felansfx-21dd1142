import { useRef } from "react";
import { ImageIcon, X, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PRESET_BACKGROUNDS = [
  { id: "gradient-1", label: "Ocean Blue", css: "linear-gradient(135deg, #0c1445 0%, #1a237e 40%, #0d47a1 100%)" },
  { id: "gradient-2", label: "Emerald Night", css: "linear-gradient(135deg, #0a1a0a 0%, #1b5e20 50%, #2e7d32 100%)" },
  { id: "gradient-3", label: "Sunset Flame", css: "linear-gradient(135deg, #1a0000 0%, #b71c1c 40%, #ff6f00 100%)" },
  { id: "gradient-4", label: "Purple Haze", css: "linear-gradient(135deg, #1a0033 0%, #4a148c 40%, #7c4dff 100%)" },
  { id: "gradient-5", label: "Midnight Gold", css: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 40%, #b8860b 100%)" },
  { id: "gradient-6", label: "Arctic Frost", css: "linear-gradient(135deg, #e3f2fd 0%, #90caf9 40%, #42a5f5 100%)" },
  { id: "gradient-7", label: "Rose Blush", css: "linear-gradient(135deg, #1a0011 0%, #880e4f 40%, #ec407a 100%)" },
  { id: "gradient-8", label: "Cyber Teal", css: "linear-gradient(135deg, #001a1a 0%, #00695c 40%, #00e5ff 100%)" },
  { id: "gradient-9", label: "Storm Grey", css: "linear-gradient(135deg, #1c1c1c 0%, #37474f 40%, #607d8b 100%)" },
  { id: "gradient-10", label: "Neon Night", css: "linear-gradient(135deg, #0a0a0a 0%, #1a0033 30%, #00e5ff 70%, #76ff03 100%)" },
];

interface BackgroundSelectorProps {
  currentBg: string | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<string | undefined>;
  onRemove: () => Promise<void>;
  onSelectPreset: (css: string) => void;
}

export const BackgroundSelector = ({ currentBg, uploading, onUpload, onRemove, onSelectPreset }: BackgroundSelectorProps) => {
  const bgInputRef = useRef<HTMLInputElement>(null);

  const isPreset = currentBg?.startsWith("linear-gradient");

  return (
    <div className="p-3 rounded-xl bg-muted/50 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Background</p>
            <p className="text-[10px] text-muted-foreground">
              {currentBg ? (isPreset ? "Preset gradient" : "Custom image") : "Default"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await onUpload(file);
                toast.success("Background updated!");
              } catch {
                toast.error("Upload failed");
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => bgInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3 h-3 mr-1" />
            {uploading ? "..." : "Upload"}
          </Button>
          {currentBg && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive"
              onClick={async () => {
                await onRemove();
                toast.success("Background removed");
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-5 gap-2">
        {PRESET_BACKGROUNDS.map((preset) => {
          const isActive = currentBg === preset.css;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.css)}
              className="relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105"
              style={{
                background: preset.css,
                borderColor: isActive ? "hsl(var(--primary))" : "transparent",
              }}
              title={preset.label}
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { PRESET_BACKGROUNDS };
