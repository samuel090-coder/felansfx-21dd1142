import { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import { SplashScreen } from "@/components/SplashScreen";
import { PaywallGate } from "@/components/PaywallGate";
import { NetworkStatusBanner } from "@/components/layout/NetworkStatusBanner";
import { routes } from "@/navigation/routes";
import { sessionStore } from "@/lib/platform";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile-friendly defaults: fewer refetches, graceful retries.
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const ScreenFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-7 h-7 animate-spin text-primary" />
  </div>
);

const AppRoutes = () => {
  useDeepLinks();

  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        {routes.map(({ path, guarded, component: Screen }) => (
          <Route
            key={path}
            path={path}
            element={guarded ? (
              <PaywallGate>
                <Screen />
              </PaywallGate>
            ) : (
              <Screen />
            )}
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasShownSplash, setHasShownSplash] = useState(false);

  useEffect(() => {
    if (sessionStore.get("splashShown")) {
      setShowSplash(false);
      setHasShownSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStore.set("splashShown", "true");
    setShowSplash(false);
    setHasShownSplash(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {showSplash && !hasShownSplash && (
            <SplashScreen onComplete={handleSplashComplete} minDuration={2500} />
          )}
          <NetworkStatusBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
