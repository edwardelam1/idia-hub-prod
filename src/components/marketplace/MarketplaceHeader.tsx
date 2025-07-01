
import { Coins } from 'lucide-react';

interface MarketplaceHeaderProps {
  userCredits: number;
  isMobile: boolean;
}

const MarketplaceHeader = ({ userCredits, isMobile }: MarketplaceHeaderProps) => {
  return (
    <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-3xl'}`}>
          IDIA Data Marketplace
        </h1>
        <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
          Enterprise-grade AI-curated datasets
        </p>
      </div>
      
      <div className={`flex items-center space-x-2 ${isMobile ? 'self-end' : ''}`}>
        <Coins className="h-4 w-4 text-purple-600" />
        <span className={`font-bold text-purple-600 ${isMobile ? 'text-sm' : ''}`}>
          {userCredits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default MarketplaceHeader;
