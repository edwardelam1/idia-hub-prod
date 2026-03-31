import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Lock, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const SettingsProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Identity & Profile
              </CardTitle>
              <CardDescription>
                Your identity is verified and managed through the IDIA Life mobile application.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Verified via IDIA Life
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-muted bg-muted/30">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm text-muted-foreground">
              Personal information is securely managed and can only be updated through the{' '}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                IDIA Life mobile application
              </span>.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Full Name</Label>
              <Input
                value="John Smith"
                disabled
                className="bg-muted/20 text-foreground cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
              <Input
                value="j.smith@acme-corp.io"
                disabled
                className="bg-muted/20 text-foreground cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">User ID</Label>
              <Input
                value={user?.user_id?.slice(0, 12).toUpperCase() ?? '--------'}
                disabled
                className="bg-muted/20 text-foreground font-mono text-xs cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Account Status</Label>
              <Input
                value={user?.account_status ?? 'N/A'}
                disabled
                className="bg-muted/20 text-foreground font-mono text-xs cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
