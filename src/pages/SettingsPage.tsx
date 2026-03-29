import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsProfile } from '@/components/settings/SettingsProfile';
import { SettingsInsights } from '@/components/settings/SettingsInsights';
import { SettingsBusinessProfile } from '@/components/settings/SettingsBusinessProfile';
import { SettingsBilling } from '@/components/settings/SettingsBilling';
import { User, BarChart3, Building2, CreditCard } from 'lucide-react';

const SettingsPage = () => {
  const { isBusinessAccount, isAdminRole } = useAuth();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, billing, and data access preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5" />
            My Profile
          </TabsTrigger>
          {!isBusinessAccount && (
            <TabsTrigger value="insights" className="flex items-center gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              My Insights
            </TabsTrigger>
          )}
          {isAdminRole && (
            <TabsTrigger value="business" className="flex items-center gap-2 text-xs sm:text-sm">
              <Building2 className="h-3.5 w-3.5" />
              Business Profile & Team
            </TabsTrigger>
          )}
          <TabsTrigger value="billing" className="flex items-center gap-2 text-xs sm:text-sm">
            <CreditCard className="h-3.5 w-3.5" />
            Billing & Data Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <SettingsProfile />
        </TabsContent>

        {!isBusinessAccount && (
          <TabsContent value="insights">
            <SettingsInsights />
          </TabsContent>
        )}

        {isAdminRole && (
          <TabsContent value="business">
            <SettingsBusinessProfile />
          </TabsContent>
        )}

        <TabsContent value="billing">
          <SettingsBilling />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
