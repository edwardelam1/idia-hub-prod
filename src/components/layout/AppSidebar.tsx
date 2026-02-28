
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
  Package,
  Smartphone,
  Bot,
  ScrollText,
  KeyRound,
  Landmark,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  userRole: string;
}

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  const getSections = (): NavSection[] => {
    // -- Core (always visible) --
    const core: NavSection = {
      label: 'Core',
      items: [
        { title: 'Dashboard', url: '/dashboard', icon: BarChart3 },
        { title: 'Best Friend AI', url: '/best-friend', icon: Bot },
      ],
    };

    // -- Data & Discovery --
    const data: NavSection = {
      label: 'Data & Discovery',
      items: [
        { title: 'Data Marketplace', url: '/marketplace', icon: Database },
        { title: 'My Reports', url: '/my-reports', icon: Package },
      ],
    };

    // -- Finance --
    const finance: NavSection = {
      label: 'Finance',
      items: [
        { title: 'Synapse Ledger', url: '/billing', icon: DollarSign },
        { title: 'Top Up Wallet', url: '/top-up', icon: Zap },
        { title: 'Earnings & Settlement', url: '/earnings', icon: Landmark },
      ],
    };

    // -- Compliance & Provenance --
    const compliance: NavSection = {
      label: 'Compliance',
      items: [
        { title: 'Egress Logs', url: '/egress-logs', icon: ScrollText },
        { title: 'Hub Enrollment', url: '/onboarding', icon: ShieldCheck },
        { title: 'Auth Settings', url: '/auth-settings', icon: KeyRound },
      ],
    };

    // -- Trading & Liquidity (all roles) --
    const trading: NavSection = {
      label: 'Trading & Liquidity',
      items: [
        { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
        { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
      ],
    };

    // Role-specific sections
    const sections: NavSection[] = [core, data, finance, compliance, trading];

    switch (userRole) {
      case 'super-admin': {
        sections.push({
          label: 'Platform Admin',
          items: [
            { title: 'System Health', url: '/system-health', icon: Activity },
            { title: 'Client Organizations', url: '/organizations', icon: Building2 },
            { title: 'AI Management', url: '/ai-management', icon: Zap },
            { title: 'Security', url: '/security', icon: ShieldCheck },
            { title: 'Audit Logs', url: '/audit-logs', icon: FileText },
            { title: 'Pay App Builder', url: '/pay-blueprint', icon: Smartphone },
          ],
        });
        break;
      }
      case 'organization-admin': {
        sections.push({
          label: 'Organization',
          items: [
            { title: 'Team Management', url: '/teams', icon: Users },
            { title: 'Compliance', url: '/compliance', icon: ShieldCheck },
            { title: 'Settings', url: '/settings', icon: Settings },
          ],
        });
        break;
      }
      case 'team-lead': {
        sections.push({
          label: 'Team',
          items: [
            { title: 'My Team', url: '/my-team', icon: Users },
            { title: 'Saved Searches', url: '/saved-searches', icon: Search },
            { title: 'Analytics', url: '/analytics', icon: TrendingUp },
          ],
        });
        break;
      }
      case 'team-member': {
        sections.push({
          label: 'My Workspace',
          items: [
            { title: 'My Lists', url: '/my-lists', icon: FileText },
            { title: 'Saved Searches', url: '/saved-searches', icon: Search },
          ],
        });
        break;
      }
    }

    return sections;
  };

  const sections = getSections();
  const isActive = (path: string) => location.pathname === path;
  const sectionHasActive = (section: NavSection) =>
    section.items.some((item) => isActive(item.url));

  return (
    <Sidebar className="h-full flex-shrink-0" collapsible="icon">
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

        {/* Navigation Sections - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => (
            <CollapsibleNavGroup
              key={section.label}
              section={section}
              isCollapsed={isCollapsed}
              isActive={isActive}
              defaultOpen={sectionHasActive(section) || section.label === 'Core'}
            />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

/* ---- Collapsible Nav Group ---- */

interface CollapsibleNavGroupProps {
  section: NavSection;
  isCollapsed: boolean;
  isActive: (path: string) => boolean;
  defaultOpen: boolean;
}

const CollapsibleNavGroup = ({
  section,
  isCollapsed,
  isActive,
  defaultOpen,
}: CollapsibleNavGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isCollapsed ? false : open} onOpenChange={setOpen}>
      <SidebarGroup className="py-1">
        {!isCollapsed && (
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground/70 transition-colors">
            <span>{section.label}</span>
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            />
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 mt-0.5">
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`
                      mx-2 rounded-md transition-colors
                      ${
                        isActive(item.url)
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
        </CollapsibleContent>

        {/* When collapsed, show icons without group labels */}
        {isCollapsed && (
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`
                      mx-2 rounded-md transition-colors
                      ${
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    <NavLink to={item.url} className="flex items-center px-2 py-2">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </SidebarGroup>
    </Collapsible>
  );
};

export { AppSidebar };
