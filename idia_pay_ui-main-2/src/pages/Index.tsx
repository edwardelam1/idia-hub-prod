import { useState, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { ProvisioningGate } from "@/components/ProvisioningGate";
import { Dashboard } from "@/components/Dashboard";
import { ProvisioningEngine, PayAppBlueprint } from "@/lib/provisioning-engine";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [blueprint, setBlueprint] = useState<PayAppBlueprint | null>(null);

  useEffect(() => {
    const cached = ProvisioningEngine.loadCached();
    if (cached) setBlueprint(cached);
  }, []);

  const handleSplashComplete = () => setShowSplash(false);

  const handleHydrated = (bp: PayAppBlueprint) => setBlueprint(bp);

  const handleWipeDevice = () => {
    ProvisioningEngine.wipeDevice();
    setBlueprint(null);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!blueprint) {
    return <ProvisioningGate onHydrated={handleHydrated} />;
  }

  return <Dashboard blueprint={blueprint} onWipeDevice={handleWipeDevice} />;
};

export default Index;
