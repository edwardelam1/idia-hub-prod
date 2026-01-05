
import { useIsMobile } from './use-mobile';
import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);
  const [isSmallTablet, setIsSmallTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
      setIsSmallTablet(width >= 768 && width < 900);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return {
    isMobile,
    isTablet,
    isSmallTablet,
    isDesktop: !isMobile && !isTablet
  };
};
