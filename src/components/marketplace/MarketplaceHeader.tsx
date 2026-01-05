
import { Coins } from 'lucide-react';

interface MarketplaceHeaderProps {
  userCredits: number;
  isMobile: boolean;
  isTablet?: boolean;
}

const MarketplaceHeader = ({ userCredits, isMobile, isTablet }: MarketplaceHeaderProps) => {
  const titleSize = isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl';
  const subtitleSize = isMobile || isTablet ? 'text-sm' : '';
  const creditsSize = isMobile || isTablet ? 'text-sm' : '';
  
  return (
    <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
      <div>
        <h1 className={`font-bold text-gray-900 ${titleSize}`}>
          IDIA Data Marketplace
        </h1>
        <p className={`text-gray-600 ${subtitleSize}`}>
          {isTablet ? 'AI-curated datasets' : 'Enterprise-grade AI-curated datasets'}
        </p>
      </div>
      
      <div className={`flex items-center space-x-2 ${isMobile ? 'self-end' : ''}`}>
        <Coins className={`${isTablet ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-purple-600`} />
        <span className={`font-bold text-purple-600 ${creditsSize}`}>
          {userCredits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default MarketplaceHeader;
