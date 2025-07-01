
import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

  const handleSplashComplete = () => {
    setCurrentView('login');
  };

  const handleLogin = (role: string) => {
    setUserRole(role);
    setCurrentView('app');
  };

  const handleLogout = () => {
    setUserRole('');
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

  if (currentView === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentView === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppLayout userRole={userRole} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={renderDashboard()} />
        <Route path="/marketplace" element={<DataMarketplace userRole={userRole} />} />
        <Route path="/system-health" element={<div>System Health (Coming Soon)</div>} />
        <Route path="/organizations" element={<div>Organizations (Coming Soon)</div>} />
        <Route path="/ai-management" element={<div>AI Management (Coming Soon)</div>} />
        <Route path="/security" element={<div>Security (Coming Soon)</div>} />
        <Route path="/audit-logs" element={<div>Audit Logs (Coming Soon)</div>} />
        <Route path="/teams" element={<div>Team Management (Coming Soon)</div>} />
        <Route path="/billing" element={<div>Billing & Credits (Coming Soon)</div>} />
        <Route path="/compliance" element={<div>Compliance (Coming Soon)</div>} />
        <Route path="/settings" element={<div>Settings (Coming Soon)</div>} />
        <Route path="/my-team" element={<div>My Team (Coming Soon)</div>} />
        <Route path="/saved-searches" element={<div>Saved Searches (Coming Soon)</div>} />
        <Route path="/analytics" element={<div>Analytics (Coming Soon)</div>} />
        <Route path="/my-lists" element={<div>My Lists (Coming Soon)</div>} />
        <Route path="/trading" element={<div>Trading Interface (Coming Soon)</div>} />
        <Route path="/liquidity" element={<div>Liquidity Pools (Coming Soon)</div>} />
      </Routes>
    </AppLayout>
  );
};

export default Index;
