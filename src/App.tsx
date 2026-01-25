import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/SplashScreen";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Deposit from "./pages/Deposit";
import Analyze from "./pages/Analyze";
import AnalysisResult from "./pages/AnalysisResult";
import AnalysisHistory from "./pages/AnalysisHistory";
import AnalysisCompare from "./pages/AnalysisCompare";
import Saved from "./pages/Saved";
import Admin from "./pages/Admin";
import Patterns from "./pages/Patterns";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasShownSplash, setHasShownSplash] = useState(false);

  useEffect(() => {
    // Check if splash was already shown this session
    const splashShown = sessionStorage.getItem("splashShown");
    if (splashShown) {
      setShowSplash(false);
      setHasShownSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashShown", "true");
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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/analysis/:id" element={<AnalysisResult />} />
              <Route path="/history" element={<AnalysisHistory />} />
              <Route path="/analysis/compare" element={<AnalysisCompare />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/patterns" element={<Patterns />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;