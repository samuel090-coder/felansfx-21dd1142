import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/SplashScreen";
import { PaywallGate } from "@/components/PaywallGate";

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
import DailyStreak from "./pages/DailyStreak";
import ScreenshotGuide from "./pages/ScreenshotGuide";
import Trading from "./pages/Trading";
import Withdraw from "./pages/Withdraw";
import Invite from "./pages/Invite";
import Help from "./pages/Help";
import SchoolHub from "./pages/SchoolHub";
import KYC from "./pages/KYC";
import NotificationSettings from "./pages/NotificationSettings";
import NotFound from "./pages/NotFound";
import Feed from "./pages/Feed";
import TradeDetail from "./pages/TradeDetail";
import ChatRooms from "./pages/ChatRooms";
import ChatRoom from "./pages/ChatRoom";
import SendFunds from "./pages/SendFunds";

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
              <Route path="/daily-streak" element={<DailyStreak />} />
              <Route path="/screenshot-guide" element={<ScreenshotGuide />} />
              <Route path="/trading" element={<Trading />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/help" element={<Help />} />
              <Route path="/school" element={<SchoolHub />} />
              <Route path="/kyc" element={<KYC />} />
              <Route path="/notification-settings" element={<NotificationSettings />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/trade/:id" element={<TradeDetail />} />
              <Route path="/chat-rooms" element={<ChatRooms />} />
              <Route path="/chat/:id" element={<ChatRoom />} />
              <Route path="/send-funds" element={<SendFunds />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;