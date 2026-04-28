import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, User, Package } from "lucide-react";

export type UserRole = 'owner' | 'manager' | 'employee' | 'warehouse_associate';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSwitcher = ({ currentRole, onRoleChange }: RoleSwitcherProps) => {
  const roles = [
    {
      id: 'owner' as UserRole,
      title: 'Corporate Admin',
      description: 'Full administrative access to all business operations and locations',
      icon: Crown,
      permissions: [
        'Global Menu Management',
        'Team Management & Permissions',
        'Financial Payout Information',
        'All Reporting & Analytics',
        'Data Co-op Authorization',
        'Billing & Tax Management'
      ]
    },
    {
      id: 'manager' as UserRole,
      title: 'Management',
      description: 'Operational access to assigned locations and delegated responsibilities',
      icon: Users,
      permissions: [
        'POS Operations',
        'Local Inventory Management',
        'Employee Timesheets',
        'Location-specific Reporting',
        'Customer Management',
        'Daily Operations'
      ]
    },
    {
      id: 'employee' as UserRole,
      title: 'Employee / Cashier',
      description: 'Access limited to Point-of-Sale and basic operational functions',
      icon: User,
      permissions: [
        'Point-of-Sale Interface',
        'Digital Time Clock',
        'Basic Transaction Processing',
        'Customer Service Tools',
        'Shift Management'
      ]
    },
    {
      id: 'warehouse_associate' as UserRole,
      title: 'Warehouse Associate',
      description: 'Warehouse operations including receiving, picking, and inventory management',
      icon: Package,
      permissions: [
        'Warehouse Management',
        'Inventory Receiving',
        'Pick List Processing',
        'Cycle Counting',
        'Put-away Operations',
        'Shipping & Fulfillment'
      ]
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background to-muted p-2 sm:p-3 overflow-auto">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground mb-1">IDIA Pay Demo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Select a role to explore the application's capabilities</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0 auto-rows-fr">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = currentRole === role.id;
            
            return (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all duration-300 hover:shadow-card h-full flex flex-col ${
                  isSelected ? 'ring-2 ring-primary shadow-glow' : ''
                }`}
                onClick={() => onRoleChange(role.id)}
              >
                <CardHeader className="text-center p-2 sm:p-3 flex-shrink-0">
                  <div className={`mx-auto w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1 sm:mb-2 ${
                    role.id === 'owner' ? 'bg-gradient-primary' :
                    role.id === 'manager' ? 'bg-gradient-secondary' :
                    role.id === 'warehouse_associate' ? 'bg-gradient-hero' :
                    'bg-gradient-accent'
                  }`}>
                    <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-lg">{role.title}</CardTitle>
                  <CardDescription className="text-xs hidden sm:block">{role.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="p-2 sm:p-3 pt-0 flex-1 flex flex-col">
                  <div className="flex-1"></div>
                  
                  <Button
                    variant={
                      role.id === 'owner' ? 'role-owner' :
                      role.id === 'manager' ? 'role-manager' :
                      role.id === 'warehouse_associate' ? 'role-manager' :
                      'role-employee'
                    }
                    className="w-full flex-shrink-0 text-xs sm:text-sm"
                    size="sm"
                  >
                    {isSelected ? 'Selected' : `Login`}
                    <span className="hidden sm:inline ml-1">
                      {isSelected ? '' : `as ${role.title}`}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-2 sm:mt-3 text-center flex-shrink-0">
          <p className="text-xs text-muted-foreground hidden sm:block">
            This is a demo environment. In production, users would authenticate using their IDIA Life credentials.
          </p>
        </div>
      </div>
    </div>
  );
};