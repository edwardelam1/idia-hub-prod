
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
  Globe,
  Package,
  Smartphone,
  Bot,
  ScrollText,
  KeyRound
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  const getMenuItems = () => {
    const baseItems = [
      { title: 'Dashboard', url: '/dashboard', icon: BarChart3 },
      { title: 'Data Marketplace', url: '/marketplace', icon: Database },
      { title: 'My Reports', url: '/my-reports', icon: Package },
      { title: 'Best Friend AI', url: '/best-friend', icon: Bot },
      { title: 'Synapse Ledger', url: '/billing', icon: DollarSign },
      { title: 'Top Up Wallet', url: '/top-up', icon: Zap },
      { title: 'Egress Logs', url: '/egress-logs', icon: ScrollText },
      { title: 'Auth Settings', url: '/auth-settings', icon: KeyRound },
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
          // Add Trading and Liquidity for super-admin too
          { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
          { title: 'Pay App Builder', url: '/pay-blueprint', icon: Smartphone },
          { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
        ];
      case 'organization-admin':
        return [
          ...baseItems,
          { title: 'Team Management', url: '/teams', icon: Users },
          { title: 'Billing & Credits', url: '/billing', icon: DollarSign },
          { title: 'Compliance', url: '/compliance', icon: ShieldCheck },
          { title: 'Settings', url: '/settings', icon: Settings },
          { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
          { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
        ];
      case 'team-lead':
        return [
          ...baseItems,
          { title: 'My Team', url: '/my-team', icon: Users },
          { title: 'Saved Searches', url: '/saved-searches', icon: Search },
          { title: 'Analytics', url: '/analytics', icon: TrendingUp },
          { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
          { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
        ];
      case 'team-member':
        return [
          ...baseItems,
          { title: 'My Lists', url: '/my-lists', icon: FileText },
          { title: 'Saved Searches', url: '/saved-searches', icon: Search },
          { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
          { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar 
      className="h-full flex-shrink-0"
      collapsible="icon"
    >
      <SidebarContent className="bg-background border-r border-border h-full flex flex-col">
        {/* Logo Section */}
        <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2 md:space-x-3">
            <img 
              src="/lovable-uploads/02424e72-23a1-4487-b4a8-5e645a56e27a.png" 
              alt="IDIA Hub" 
              className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="font-bold text-sm md:text-lg text-foreground truncate">
                  IDIA Hub
                </h2>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {userRole.replace('-', ' ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <SidebarGroup className="py-2">
            <SidebarGroupLabel className="px-3 text-xs">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={`
                        mx-2 rounded-md transition-colors
                        ${isActive(item.url) 
                          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                          : 'hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <NavLink to={item.url} className="flex items-center px-2 py-2">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="ml-3 text-sm font-medium truncate">
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export { AppSidebar };
