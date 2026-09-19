import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { isOnline, onNetworkChange } from "@/lib/platform";

/** Persistent, non-blocking notice while the device has no connection. */
export const NetworkStatusBanner = () => {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => onNetworkChange(setOnline), []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground safe-area-top">
      <div className="max-w-md mx-auto flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>You're offline — some things may not load</span>
      </div>
    </div>
  );
};
