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
import WithdrawalChallenge from "./pages/WithdrawalChallenge";
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
              <Route path="/auth" element={<Auth />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/" element={<PaywallGate><Index /></PaywallGate>} />
              <Route path="/profile" element={<PaywallGate><Profile /></PaywallGate>} />
              <Route path="/analyze" element={<PaywallGate><Analyze /></PaywallGate>} />
              <Route path="/analysis/:id" element={<PaywallGate><AnalysisResult /></PaywallGate>} />
              <Route path="/history" element={<PaywallGate><AnalysisHistory /></PaywallGate>} />
              <Route path="/analysis/compare" element={<PaywallGate><AnalysisCompare /></PaywallGate>} />
              <Route path="/saved" element={<PaywallGate><Saved /></PaywallGate>} />
              <Route path="/admin" element={<PaywallGate><Admin /></PaywallGate>} />
              <Route path="/patterns" element={<PaywallGate><Patterns /></PaywallGate>} />
              <Route path="/notifications" element={<PaywallGate><Notifications /></PaywallGate>} />
              <Route path="/daily-streak" element={<PaywallGate><DailyStreak /></PaywallGate>} />
              <Route path="/screenshot-guide" element={<PaywallGate><ScreenshotGuide /></PaywallGate>} />
              <Route path="/trading" element={<PaywallGate><Trading /></PaywallGate>} />
              <Route path="/withdraw" element={<PaywallGate><Withdraw /></PaywallGate>} />
              <Route path="/withdrawal-challenge" element={<PaywallGate><WithdrawalChallenge /></PaywallGate>} />
              <Route path="/invite" element={<PaywallGate><Invite /></PaywallGate>} />
              <Route path="/help" element={<PaywallGate><Help /></PaywallGate>} />
              <Route path="/school" element={<PaywallGate><SchoolHub /></PaywallGate>} />
              <Route path="/kyc" element={<PaywallGate><KYC /></PaywallGate>} />
              <Route path="/notification-settings" element={<PaywallGate><NotificationSettings /></PaywallGate>} />
              <Route path="/feed" element={<PaywallGate><Feed /></PaywallGate>} />
              <Route path="/trade/:id" element={<PaywallGate><TradeDetail /></PaywallGate>} />
              <Route path="/chat-rooms" element={<PaywallGate><ChatRooms /></PaywallGate>} />
              <Route path="/chat/:id" element={<PaywallGate><ChatRoom /></PaywallGate>} />
              <Route path="/send-funds" element={<PaywallGate><SendFunds /></PaywallGate>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;