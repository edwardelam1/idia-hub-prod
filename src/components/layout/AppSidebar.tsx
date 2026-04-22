
import { useEffect, useMemo, useState } from 'react';
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
  GripVertical,
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

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  userRole: string;
}

// Dashboard is always pinned at the top and not reorderable.
const PINNED_ITEM: NavItem = { title: 'Dashboard', url: '/dashboard', icon: BarChart3 };

const getRoleItems = (userRole: string): NavItem[] => {
  const base: NavItem[] = [
    { title: 'Best Friend AI', url: '/best-friend', icon: Bot },
    { title: 'Data Marketplace', url: '/marketplace', icon: Database },
    { title: 'My Reports', url: '/my-reports', icon: Package },
    { title: 'Hub Enrollment', url: '/billing', icon: DollarSign },
    { title: 'Top Up Wallet', url: '/top-up', icon: Zap },
    { title: 'Earnings & Settlement', url: '/earnings', icon: Landmark },
    { title: 'Egress Logs', url: '/egress-logs', icon: ScrollText },
    { title: 'Auth Settings', url: '/auth-settings', icon: KeyRound },
    { title: 'Trading Interface', url: '/trading', icon: TrendingUp },
    { title: 'Liquidity Pools', url: '/liquidity', icon: Coins },
  ];

  switch (userRole) {
    case 'super-admin':
      base.push(
        { title: 'System Health', url: '/system-health', icon: Activity },
        { title: 'Client Organizations', url: '/organizations', icon: Building2 },
        { title: 'AI Management', url: '/ai-management', icon: Zap },
        { title: 'Security', url: '/security', icon: ShieldCheck },
        { title: 'Audit Logs', url: '/audit-logs', icon: FileText },
        { title: 'Pay App Builder', url: '/pay-blueprint', icon: Smartphone },
      );
      break;
    case 'organization-admin':
      base.push(
        { title: 'Team Management', url: '/teams', icon: Users },
        { title: 'Compliance', url: '/compliance', icon: ShieldCheck },
      );
      break;
    case 'team-lead':
      base.push(
        { title: 'My Team', url: '/my-team', icon: Users },
        { title: 'Saved Searches', url: '/saved-searches', icon: Search },
        { title: 'Analytics', url: '/analytics', icon: TrendingUp },
      );
      break;
    case 'team-member':
      base.push(
        { title: 'My Lists', url: '/my-lists', icon: FileText },
        { title: 'Saved Searches', url: '/saved-searches', icon: Search },
      );
      break;
  }

  base.push({ title: 'Settings', url: '/settings', icon: Settings });
  return base;
};

const storageKey = (role: string) => `sidebar-order:${role}`;

const loadSavedOrder = (role: string, items: NavItem[]): NavItem[] => {
  try {
    const raw = localStorage.getItem(storageKey(role));
    if (!raw) return items;
    const savedUrls: string[] = JSON.parse(raw);
    const byUrl = new Map(items.map((i) => [i.url, i]));
    const ordered: NavItem[] = [];
    for (const url of savedUrls) {
      const item = byUrl.get(url);
      if (item) {
        ordered.push(item);
        byUrl.delete(url);
      }
    }
    // Append any new items not present in saved order
    for (const item of byUrl.values()) ordered.push(item);
    return ordered;
  } catch {
    return items;
  }
};

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';
  const isActive = (path: string) => location.pathname === path;

  const roleItems = useMemo(() => getRoleItems(userRole), [userRole]);
  const [items, setItems] = useState<NavItem[]>(() => loadSavedOrder(userRole, roleItems));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Re-reconcile when role changes
  useEffect(() => {
    setItems(loadSavedOrder(userRole, roleItems));
  }, [userRole, roleItems]);

  const persistOrder = (next: NavItem[]) => {
    try {
      localStorage.setItem(storageKey(userRole), JSON.stringify(next.map((i) => i.url)));
    } catch {
      /* ignore */
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox to start the drag
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setItems(next);
    persistOrder(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Sidebar className="h-full flex-shrink-0" collapsible="icon">
      <SidebarContent className="bg-background border-r border-border h-full flex flex-col">
        {/* Logo Section */}
        <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2 md:space-x-3">
            <img
              src="/images/hub-logo.png"
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

        {/* Flat, drag-reorderable navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {/* Pinned: Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`mx-2 rounded-md transition-colors ${
                      isActive(PINNED_ITEM.url)
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <NavLink to={PINNED_ITEM.url} className="flex items-center px-2 py-2">
                      <PINNED_ITEM.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="ml-3 text-sm font-medium truncate">
                          {PINNED_ITEM.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Reorderable items */}
                {items.map((item, index) => {
                  const isDragging = dragIndex === index;
                  const isOver =
                    overIndex === index && dragIndex !== null && dragIndex !== index;
                  const indicatorAbove = isOver && (dragIndex as number) > index;
                  const indicatorBelow = isOver && (dragIndex as number) < index;
                  return (
                    <SidebarMenuItem
                      key={item.url}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group/drag relative ${isDragging ? 'opacity-50' : ''} ${
                        indicatorAbove ? 'border-t-2 border-primary' : ''
                      } ${indicatorBelow ? 'border-b-2 border-primary' : ''}`}
                    >
                      <SidebarMenuButton
                        asChild
                        className={`mx-2 rounded-md transition-colors ${
                          isActive(item.url)
                            ? 'bg-primary/10 text-primary border-r-2 border-primary'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <NavLink to={item.url} className="flex items-center px-2 py-2">
                          {!isCollapsed && (
                            <GripVertical
                              className="h-3.5 w-3.5 mr-1 text-muted-foreground/40 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && (
                            <span className="ml-3 text-sm font-medium truncate">
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export { AppSidebar };
