import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { PLAN_PRICING } from '@/hooks/useBillingData';

const PLAN_TIERS = ['analyst', 'professional', 'enterprise'] as const;

interface AvailablePlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
}

const AvailablePlansDialog = ({ open, onOpenChange, currentTier = 'base' }: AvailablePlansDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Available Plans</DialogTitle>
          <DialogDescription>Choose the plan that fits your needs</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="analyst">
          <TabsList className="w-full">
            {PLAN_TIERS.map(tier => (
              <TabsTrigger key={tier} value={tier} className="flex-1 capitalize">
                {PLAN_PRICING[tier].name}
                {currentTier === tier && <Badge variant="outline" className="ml-2 text-[10px]">Current</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
          {PLAN_TIERS.map(tier => {
            const plan = PLAN_PRICING[tier];
            const isCurrent = currentTier === tier;
            return (
              <TabsContent key={tier} value={tier} className="mt-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{plan.cost}</div>
                    {isCurrent && <Badge className="mt-1">Active</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Features & Benefits</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-2 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Usage Limits</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border">
                        <div className="text-lg font-bold">{plan.limits.credits.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Credits / year</div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-lg font-bold">{plan.limits.apiCalls >= 10000000 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">API Calls / mo</div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-lg font-bold">{plan.limits.dataExport >= 1000 ? 'Unlimited' : `${plan.limits.dataExport}GB`}</div>
                        <div className="text-xs text-muted-foreground">Data Export / mo</div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-lg font-bold">{plan.limits.teamMembers}</div>
                        <div className="text-xs text-muted-foreground">Team Members</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/purchase?plan=${tier}`);
                  }}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AvailablePlansDialog;