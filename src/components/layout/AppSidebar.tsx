
import { useState } from 'react';
import { 
  BarChart3, 
  Building2, 
  Database, 
  Settings, 
  Users, 
  Zap,
  DollarSign,
  Activity,
  Search,
  FileText,
  Coins,
  TrendingUp,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  userRole: string;
}

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const { collapsed } = useSidebar();
  const location = useLocation();

  const getMenuItems = () => {
    const baseItems = [
      { title: 'Dashboard', url: '/dashboard', icon: BarChart3 },
      { title: 'Data Marketplace', url: '/marketplace', icon: Database },
    ];

    switch (userRole) {
      case 'super-admin':
        return [
          ...baseItems,
          { title: 'System Health', url: '/system-health', icon: Activity },
          { title: 'Client Organizations', url: '/organizations', icon: Building2 },
          { title: 'AI Management', url: '/ai-management', icon: Zap },
          { title: 'Security', url: '/security', icon: ShieldCheck },
          { title: 'Audit Logs', url: '/audit-logs', icon: FileText },
        ];
      case 'organization-admin':
        return [
          ...baseItems,
          { title: 'Team Management', url: '/teams', icon: Users },
          { title: 'Billing & Credits', url: '/billing', icon: DollarSign },
          { title: 'Compliance', url: '/compliance', icon: ShieldCheck },
          { title: 'Settings', url: '/settings', icon: Settings },
        ];
      case 'team-lead':
        return [
          ...baseItems,
          { title: 'My Team', url: '/my-team', icon: Users },
          { title: 'Saved Searches', url: '/saved-searches', icon: Search },
          { title: 'Analytics', url: '/analytics', icon: TrendingUp },
        ];
      case 'team-member':
        return [
          ...baseItems,
          { title: 'My Lists', url: '/my-lists', icon: FileText },
          { title: 'Saved Searches', url: '/saved-searches', icon: Search },
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible>
      <SidebarContent className="bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/02424e72-23a1-4487-b4a8-5e645a56e27a.png" 
              alt="IDIA Hub" 
              className="w-8 h-8"
            />
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg text-gray-900">IDIA Hub</h2>
                <p className="text-xs text-gray-500 capitalize">{userRole.replace('-', ' ')}</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={isActive(item.url) ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700' : 'hover:bg-gray-50'}
                  >
                    <a href={item.url} className="flex items-center">
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === 'organization-admin' || userRole === 'team-lead' || userRole === 'team-member') && (
          <SidebarGroup>
            <SidebarGroupLabel>DeFi Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/trading" className="flex items-center">
                      <TrendingUp className="mr-3 h-4 w-4" />
                      {!collapsed && <span>Trading Interface</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/liquidity" className="flex items-center">
                      <Coins className="mr-3 h-4 w-4" />
                      {!collapsed && <span>Liquidity Pools</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export { AppSidebar };
