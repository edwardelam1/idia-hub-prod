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
import OrganizationManagement from '@/components/management/OrganizationManagement';
import AIManagement from '@/components/ai/AIManagement';
import DataViewer from '@/components/data/DataViewer';
import MyReports from '@/components/reports/MyReports';
import SecurityPage from './SecurityPage';
import SystemHealthDashboard from '@/components/system/SystemHealthDashboard';
import TradingInterface from '@/components/trading/TradingInterface';
import { TradingDeskDashboard } from '@/components/trading/TradingDeskDashboard';
import { PayAppBlueprint } from '@/components/trading/PayAppBlueprint';
import LiquidityPools from '@/components/liquidity/LiquidityPools';
import BillingCredits from '@/components/billing/BillingCredits';
import ComplianceDashboard from '@/components/compliance/ComplianceDashboard';
import TeamManagement from '@/components/teams/TeamManagement';
import ProvenanceAuditLog from '@/components/trading/ProvenanceAuditLog';
import SynapseTopUp from '@/components/billing/SynapseTopUp';
import EcosystemOnboarding from '@/components/onboarding/EcosystemOnboarding';
import EarningsSettlement from '@/components/billing/EarningsSettlement';
import UpdateBankingDetails from '@/components/billing/UpdateBankingDetails';
import UniversalPurchaseScreen from '@/components/billing/UniversalPurchaseScreen';
import SettingsPage from './SettingsPage';
import BestFriendPage from './BestFriendPage';

const Index = () => {
  const [currentView, setCurrentView] = useState<'splash' | 'login' | 'app'>('splash');
  const [userRole, setUserRole] = useState<string>('');

  const handleSplashComplete = () => setCurrentView('login');
  const handleLogin = (role: string) => { setUserRole(role); setCurrentView('app'); };
  const handleLogout = () => { setUserRole(''); setCurrentView('login'); };

  const renderDashboard = () => {
    switch (userRole) {
      case 'super-admin': return <SuperAdminDashboard />;
      case 'organization-admin': return <OrganizationAdminDashboard />;
      case 'team-lead': return <TeamLeadDashboard />;
      case 'team-member': return <TeamMemberDashboard />;
      default: return <TeamMemberDashboard />;
    }
  };

  if (currentView === 'splash') return <SplashScreen onComplete={handleSplashComplete} />;
  if (currentView === 'login') return <LoginScreen onLogin={handleLogin} />;

  return (
    <AppLayout userRole={userRole} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={renderDashboard()} />
        <Route path="/marketplace" element={<DataMarketplace userRole={userRole} />} />
        <Route path="/data-viewer/:bundleId" element={<DataViewer />} />
        <Route path="/data-viewer/purchased/:purchaseId" element={<DataViewer />} />
        <Route path="/my-reports" element={<MyReports />} />
        <Route path="/system-health" element={<SystemHealthDashboard />} />
        <Route path="/organizations" element={<OrganizationManagement />} />
        <Route path="/ai-management" element={<AIManagement />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/best-friend" element={<BestFriendPage />} />
        <Route path="/audit-logs" element={<div>Audit Logs (Coming Soon)</div>} />
        <Route path="/teams" element={<TeamManagement />} />
        <Route path="/billing" element={<BillingCredits />} />
        <Route path="/compliance" element={<ComplianceDashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/my-team" element={<div>My Team (Coming Soon)</div>} />
        <Route path="/saved-searches" element={<div>Saved Searches - Available in Data Viewer</div>} />
        <Route path="/analytics" element={<div>Analytics (Coming Soon)</div>} />
        <Route path="/my-lists" element={<div>My Lists - Available in Data Viewer</div>} />
        <Route path="/trading" element={<TradingDeskDashboard />} />
        <Route path="/pay-blueprint" element={<PayAppBlueprint />} />
        <Route path="/liquidity" element={<LiquidityPools />} />
        <Route path="/egress-logs" element={<ProvenanceAuditLog />} />
        <Route path="/top-up" element={<SynapseTopUp />} />
        <Route path="/auth-settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Ecosystem Auth Settings</h1><p className="text-muted-foreground mt-2">Authentication configuration — awaiting AWS Cognito integration.</p></div>} />
        <Route path="/onboarding" element={<EcosystemOnboarding isLifeAppVerified={true} />} />
        <Route path="/earnings" element={<EarningsSettlement />} />
        <Route path="/earnings/banking" element={<UpdateBankingDetails />} />
        <Route path="/purchase" element={<UniversalPurchaseScreen />} />
      </Routes>
    </AppLayout>
  );
};

export default Index;
