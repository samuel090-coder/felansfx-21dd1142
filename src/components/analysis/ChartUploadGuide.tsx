import { Info, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ChartUploadGuide = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary">
          <Info className="w-4 h-4 mr-1" />
          Chart Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How to Upload Charts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* What to Include */}
          <div>
            <h4 className="font-medium flex items-center gap-2 text-success mb-2">
              <CheckCircle className="w-4 h-4" />
              What Makes a Good Chart
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Clear candlestick or bar chart</li>
              <li>• Visible price axis with numbers</li>
              <li>• Time axis showing timeframe</li>
              <li>• Key indicators (MA, RSI, etc.)</li>
              <li>• Support/resistance lines if drawn</li>
              <li>• Clean, uncluttered view</li>
            </ul>
          </div>

          {/* What to Avoid */}
          <div>
            <h4 className="font-medium flex items-center gap-2 text-destructive mb-2">
              <XCircle className="w-4 h-4" />
              What to Avoid
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Blurry or low-resolution images</li>
              <li>• Screenshots of non-chart content</li>
              <li>• Cropped charts missing price data</li>
              <li>• Too many overlapping indicators</li>
              <li>• Annotated with personal notes</li>
            </ul>
          </div>

          {/* Best Practices */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Pro Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>📊 Use full-screen mode before screenshot</li>
              <li>🎯 Include at least 50-100 candles</li>
              <li>⏰ Match the timeframe to your trade focus</li>
              <li>💡 4H chart for swing, 15M for scalp</li>
            </ul>
          </div>

          {/* Supported Platforms */}
          <div>
            <h4 className="font-medium text-sm mb-2">Supported Platforms</h4>
            <div className="flex flex-wrap gap-2">
              {["TradingView", "MT4/MT5", "cTrader", "Binance", "ThinkorSwim"].map((platform) => (
                <span
                  key={platform}
                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
