import { useEffect, useState } from "react";
import { usePreAuthCanvas, PRE_AUTH_BG } from "@/hooks/usePreAuthCanvas";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // Additional 500ms for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  usePreAuthCanvas();

  return (
    <div
      className={`fixed inset-0 z-50 flex min-h-[100dvh] w-full items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ backgroundColor: PRE_AUTH_BG }}
    >
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <img src="/images/hub-logo.png" alt="IDIA Hub Logo" className="w-32 h-32 animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">The IDIA Hub</h1>
        <p className="text-xl text-purple-200 max-w-md mx-auto">
          Welcome to the Living Vault and Marketplace for the IDIA Protocol and the Verified Truth Economy
        </p>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
