import { useState } from 'react';
import { ShieldCheck, User, Search, Users, Building2, Lock, ArrowRight, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface EcosystemOnboardingProps {
  isLifeAppVerified?: boolean;
  hasBusinessTag?: boolean;
}

interface Role {
  id: string;
  name: string;
  price?: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  requiresBusiness?: boolean;
  automatic?: boolean;
}

const EcosystemOnboarding = ({ isLifeAppVerified = false, hasBusinessTag = false }: EcosystemOnboardingProps) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const automaticRoles: Role[] = [
    {
      id: 'individual',
      name: 'Standard Individual',
      icon: <User className="w-4 h-4 text-muted-foreground" />,
      description: 'Access the Hub for $10 a la carte queries.',
      available: true,
      automatic: true,
    },
  ];

  const upgradeRoles: Role[] = [
    {
      id: 'analyst',
      name: 'Analyst Enrollment',
      price: '$9,995/yr',
      icon: <Search className="w-4 h-4 text-primary" />,
      description: 'Unlock 5,000 CRD and Foundational Filters.',
      available: true,
    },
    {
      id: 'professional',
      name: 'Professional Enrollment',
      price: '$24,995/yr',
      icon: <Users className="w-4 h-4 text-emerald-400" />,
      description: 'Unlock 20,000 CRD and Merchant Integrations.',
      available: true,
    },
  ];

  const restrictedRoles: Role[] = [
    {
      id: 'enterprise',
      name: 'Enterprise Client',
      price: '$49,995+/yr',
      icon: <Building2 className="w-4 h-4 text-amber-400" />,
      description: 'Unlock 50,000 CRD and T-1-P Verification.',
      available: hasBusinessTag,
      requiresBusiness: true,
    },
  ];

  if (!isLifeAppVerified) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-card border border-border rounded-2xl text-center">
        <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">IDIA Life App Required</h2>
        <p className="text-muted-foreground text-sm mb-6">
          All ecosystem users must verify their biological identity via IDIA Life before accessing the Hub.
        </p>
        <Button className="w-full gap-2">
          Download IDIA Life <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configure Your Hub Access</h1>
        <p className="text-muted-foreground text-sm mt-1">Elevate your individual account with professional data capabilities.</p>
      </div>

      {/* Automatic tier - disabled/included */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Included With Verification</h2>
        {automaticRoles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30 opacity-70"
          >
            <div className="p-1.5 rounded-md bg-muted">{role.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{role.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          </div>
        ))}
      </div>

      <Separator className="mb-6" />

      {/* Upgrade tiers */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Upgrades</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {upgradeRoles.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                    {role.price && <div className="text-xs font-mono text-emerald-400 mt-0.5">{role.price}</div>}
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Restricted tiers */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requires Business Tag</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {restrictedRoles.map((role) => (
            <div
              key={role.id}
              className="relative p-4 rounded-xl border-2 border-border bg-card opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-muted">{role.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                  {role.price && <div className="text-xs font-mono text-muted-foreground mt-0.5">{role.price}</div>}
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
                </div>
              </div>
              {role.requiresBusiness && (
                <button className="text-[10px] text-primary hover:underline mt-2 ml-8">Apply for Business Tag</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button
          disabled={!selectedRole}
          className="gap-2"
        >
          {selectedRole === 'enterprise' ? 'Begin T-1-P Enrollment' : 'Confirm & Continue'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EcosystemOnboarding;