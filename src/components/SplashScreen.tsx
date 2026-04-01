
import { useEffect, useState } from 'react';

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

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <img 
            src="/images/hub-logo.png" 
            alt="IDIA Hub Logo" 
            className="w-32 h-32 animate-pulse"
          />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">IDIA Hub</h1>
        <p className="text-xl text-purple-200 max-w-md mx-auto">
          Unlock the power of intelligent data with the professional command center for the IDIA ecosystem
        </p>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
