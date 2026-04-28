
import { useState, useEffect } from "react";
import { UserRole } from "./RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";

interface SplashScreenProps {
  onComplete: (role: UserRole) => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [marketingData, setMarketingData] = useState({
    logoUrl: "/lovable-uploads/91fc9afd-c1cf-4088-8d4f-12b744fcfda4.png",
    taglines: ["Loading IDIA Pay..."]
  });
  const [currentTagline, setCurrentTagline] = useState("");

  useEffect(() => {
    // Fetch dynamic marketing content
    const fetchMarketingData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('pay-marketing-config');
        if (data && !error) {
          setMarketingData(data);
          // Randomly select a tagline
          const randomTagline = data.taglines[Math.floor(Math.random() * data.taglines.length)];
          setCurrentTagline(randomTagline);
        } else {
          // Use default tagline if API fails
          setCurrentTagline(marketingData.taglines[0]);
        }
      } catch (error) {
        console.error('Failed to fetch marketing data:', error);
        setCurrentTagline("Revolutionizing Business Operations with AI");
      }
    };

    fetchMarketingData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete("owner"), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center overflow-auto">
      <div className="text-center space-y-4 p-4">
        {/* Logo */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center bg-white rounded-xl shadow-lg">
            <img 
              src={marketingData.logoUrl} 
              alt="IDIA Pay Logo" 
              className="w-14 h-14 object-contain"
              onError={(e) => {
                console.error('Logo failed to load in splash screen');
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center"><span class="text-lg font-bold text-primary">IP</span></div>';
              }}
            />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">IDIA Pay</h1>
            <p className="text-sm text-muted-foreground mb-1">Merchant & Warehouse Operating System</p>
            <p className="text-xs text-muted-foreground animate-fade-in">
              {currentTagline || "Revolutionizing Business Operations with AI"}
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-xs">
          <div className="text-center p-2 rounded-lg bg-card border">
            <div className="text-primary font-semibold text-xs">Smart POS</div>
            <div className="text-xs text-muted-foreground">AI-Powered Menu</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-card border">
            <div className="text-primary font-semibold text-xs">Data Co-op</div>
            <div className="text-xs text-muted-foreground">Monetize Analytics</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-card border">
            <div className="text-primary font-semibold text-xs">NFC Payments</div>
            <div className="text-xs text-muted-foreground">Contactless Tech</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-card border">
            <div className="text-primary font-semibold text-xs">Recipe Engine</div>
            <div className="text-xs text-muted-foreground">Inventory Integration</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 max-w-xs mx-auto">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Loading platform... {Math.round(progress)}%
          </p>
        </div>

        {/* Loading States */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          {progress > 20 && <div>✓ Initializing smart menu system</div>}
          {progress > 40 && <div>✓ Connecting to blockchain network</div>}
          {progress > 60 && <div>✓ Loading business intelligence</div>}
          {progress > 80 && <div>✓ Preparing data co-op features</div>}
          {progress >= 100 && <div className="text-success">✓ Ready to launch!</div>}
        </div>
      </div>
    </div>
  );
};
