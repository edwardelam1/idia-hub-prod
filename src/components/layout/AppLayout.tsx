
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
  const { isMobile } = useResponsive();

  return (
    <SidebarProvider 
      defaultOpen={!isMobile}
      className="w-full h-full"
    >
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar */}
        <AppSidebar userRole={userRole} />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Fixed Header */}
          <TopBar userRole={userRole} onLogout={onLogout} />
          
          {/* Scrollable Main Content */}
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
        
        {/* Floating Best Friend - appears on all pages */}
        <FloatingBestFriend userRole={userRole} />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
