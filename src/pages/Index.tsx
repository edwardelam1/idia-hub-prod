
import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import LoginScreen from '@/components/LoginScreen';
import AppLayout from '@/components/layout/AppLayout';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import OrganizationAdminDashboard from '@/components/dashboards/OrganizationAdminDashboard';
import TeamLeadDashboard from '@/components/dashboards/TeamLeadDashboard';
import TeamMemberDashboard from '@/components/dashboards/TeamMemberDashboard';
import DataMarketplace from '@/components/marketplace/DataMarketplace';

const Index = () => {
  const [currentView, setCurrentView] = useState<'splash' | 'login' | 'app'>('splash');
  const [userRole, setUserRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const handleSplashComplete = () => {
    setCurrentView('login');
  };

  const handleLogin = (role: string) => {
    setUserRole(role);
    setCurrentView('app');
  };

  const handleLogout = () => {
    setUserRole('');
    setCurrentPage('dashboard');
    setCurrentView('login');
  };

  const renderDashboard = () => {
    switch (userRole) {
      case 'super-admin':
        return <SuperAdminDashboard />;
      case 'organization-admin':
        return <OrganizationAdminDashboard />;
      case 'team-lead':
        return <TeamLeadDashboard />;
      case 'team-member':
        return <TeamMemberDashboard />;
      default:
        return <TeamMemberDashboard />;
    }
  };

  const renderContent = () => {
    // Get current page from URL path
    const path = window.location.pathname;
    
    if (path === '/marketplace') {
      return <DataMarketplace userRole={userRole} />;
    }
    
    return renderDashboard();
  };

  if (currentView === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentView === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppLayout userRole={userRole} onLogout={handleLogout}>
      {renderContent()}
    </AppLayout>
  );
};

export default Index;
