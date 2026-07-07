import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SynapseCreditsProvider } from "./contexts/SynapseCreditsContext";
import { PurchaseHistoryProvider } from "./contexts/PurchaseHistoryContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";

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
                {/* Supabase OAuth 2.1 consent screen for MCP client authorization */}
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                {/* 🎯 THE PRODUCTION MAPPING: Preserves your nested Index logic */}
                <Route path="/*" element={<Index />} />
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
