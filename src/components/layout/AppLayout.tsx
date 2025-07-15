
import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useResponsive } from '@/hooks/useResponsive';
import FloatingBestFriend from '@/components/ai/FloatingBestFriend';

interface AppLayoutProps {
  children: React.ReactNode;
  userRole: string;
  onLogout: () => void;
}

const AppLayout = ({ children, userRole, onLogout }: AppLayoutProps) => {
  const { isMobile, isTablet } = useResponsive();

  return (
    <SidebarProvider 
      defaultOpen={!isMobile}
      className="w-full h-full overflow-hidden"
    >
      <div className="w-full h-full flex bg-background relative overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobile && (
          <div className="fixed inset-0 z-20 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        )}
        
        {/* Fixed Sidebar */}
        <AppSidebar userRole={userRole} />
        
        {/* Main Content Area */}
        <div className={`
          flex-1 flex flex-col min-w-0 relative h-full
          ${isMobile ? 'ml-0' : 'ml-64'}
          transition-all duration-300 ease-in-out
          overflow-hidden
        `}>
          {/* Fixed Header */}
          <TopBar userRole={userRole} onLogout={onLogout} />
          
          {/* Scrollable Main Content */}
          <main className={`
            flex-1 overflow-auto
            ${isMobile ? 'p-2' : isTablet ? 'p-4' : 'p-6'}
            bg-background
          `}>
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
        
        {/* Floating Best Friend - appears on all pages */}
        <FloatingBestFriend userRole={userRole} />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
