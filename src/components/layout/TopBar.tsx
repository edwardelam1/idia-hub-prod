
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, ChevronDown, Coins, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import SynapsePurchaseModal from '@/components/billing/SynapsePurchaseModal';
import IdentityStatusPills from '@/components/layout/IdentityStatusPills';

interface TopBarProps {
  userRole: string;
  onLogout: () => void;
}

const TopBar = ({ userRole, onLogout }: TopBarProps) => {
  const [notifications] = useState(3);
  const { balanceData, isLoading } = useSynapseCredits();
  const synapseCredits = balanceData?.available_credits ?? 0;

  const getUserName = () => {
    switch (userRole) {
      case 'super-admin': return 'Super Admin';
      case 'organization-admin': return 'John Smith';
      case 'team-lead': return 'Sarah Johnson';
      case 'team-member': return 'Mike Davis';
      default: return 'User';
    }
  };

  const getOrganization = () => {
    if (userRole === 'super-admin') return 'IDIA Platform';
    return 'Acme Corporation';
  };

  return (
    <header className="
      sticky top-0 z-40 
      h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 
      border-b border-border 
      flex items-center justify-between 
      px-4 md:px-6
      flex-shrink-0
    ">
      <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
        <SidebarTrigger className="flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">
            Welcome back, {getUserName()}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
            {getOrganization()}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
        <IdentityStatusPills />
        {/* Synapse Credits - shown for non-super-admin users */}
        {userRole !== 'super-admin' && (
          <div className="hidden sm:flex items-center space-x-2">
            <SynapsePurchaseModal
              trigger={
                <button className="flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 transition-colors px-2 md:px-3 py-1 rounded-full cursor-pointer">
                  <Coins className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  <span className="text-xs md:text-sm font-medium text-primary">
                    {isLoading ? '...' : synapseCredits.toFixed(2)}
                  </span>
                  <span className="text-xs text-primary/70">CRD</span>
                </button>
              }
            />
          </div>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative h-8 w-8 md:h-9 md:w-9">
          <Bell className="h-3 w-3 md:h-4 md:w-4" />
          {notifications > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-xs">
              {notifications}
            </Badge>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1 md:space-x-2 h-8 md:h-9">
              <Avatar className="h-6 w-6 md:h-8 md:w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm">
                  {getUserName().split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 md:w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium text-sm">{getUserName()}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole.replace('-', ' ')}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm" onClick={() => window.location.href = '/settings'}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive text-sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export { TopBar };
