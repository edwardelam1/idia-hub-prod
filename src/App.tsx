import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SynapseCreditsProvider } from "@/contexts/SynapseCreditsContext";
import { PurchaseHistoryProvider } from "@/contexts/PurchaseHistoryContext";
import Index from "./pages/Index";
import BestFriendPage from "./pages/BestFriendPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SynapseCreditsProvider>
        <PurchaseHistoryProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Ensure paths are exact strings to prevent 404s */}
                <Route path="/" element={<Index />} />
                <Route path="/best-friend" element={<BestFriendPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Catch-all for undefined routes */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PurchaseHistoryProvider>
      </SynapseCreditsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
