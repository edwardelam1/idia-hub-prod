
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar userRole={userRole} />
        <div className="flex-1 flex flex-col">
          <TopBar userRole={userRole} onLogout={onLogout} />
          <main className={`flex-1 ${isMobile ? 'p-0' : 'p-6'}`}>
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
