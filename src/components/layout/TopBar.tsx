
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
import { Bell, ChevronDown, Coins, User, LogOut, Settings } from 'lucide-react';

interface TopBarProps {
  userRole: string;
  onLogout: () => void;
}

const TopBar = ({ userRole, onLogout }: TopBarProps) => {
  const [notifications] = useState(3);
  const [synapseCredits] = useState(12450);

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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Welcome back, {getUserName()}
          </h1>
          <p className="text-sm text-gray-500">{getOrganization()}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Synapse Credits - shown for non-super-admin users */}
        {userRole !== 'super-admin' && (
          <div className="flex items-center space-x-2 bg-purple-50 px-3 py-1 rounded-full">
            <Coins className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              {synapseCredits.toLocaleString()} Credits
            </span>
          </div>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {notifications > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {notifications}
            </Badge>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  {getUserName().split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{getUserName()}</p>
                <p className="text-sm text-gray-500 capitalize">{userRole.replace('-', ' ')}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
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
