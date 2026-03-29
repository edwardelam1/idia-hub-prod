import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, UserPlus, Shield, Mail } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_TEAM = [
  { id: '1', name: 'Sarah Johnson', email: 's.johnson@acme-corp.io', role: 'team-lead', status: 'active' },
  { id: '2', name: 'Mike Davis', email: 'm.davis@acme-corp.io', role: 'team-member', status: 'active' },
  { id: '3', name: 'Emily Chen', email: 'e.chen@acme-corp.io', role: 'team-member', status: 'active' },
  { id: '4', name: 'Alex Rivera', email: 'a.rivera@acme-corp.io', role: 'team-member', status: 'pending' },
];

export const SettingsBusinessProfile = () => {
  const [companyName, setCompanyName] = useState('Acme Corporation');
  const [billingWallet, setBillingWallet] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d89A34');
  const [taxId, setTaxId] = useState('XX-XXXXXXX');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('team-member');

  const handleSave = () => {
    toast.success('Business profile updated');
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setShowInvite(false);
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Entity Profile
          </CardTitle>
          <CardDescription>
            Manage your organization's identity and billing configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tax ID / EIN</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="XX-XXXXXXX" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Billing Wallet Address</Label>
            <Input
              value={billingWallet}
              onChange={(e) => setBillingWallet(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={handleSave} size="sm">Save Changes</Button>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage analyst access to your enterprise's queries and data bundles.
              </CardDescription>
            </div>
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to grant access to your enterprise's data and queries.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="flex gap-2">
                      <Mail className="h-4 w-4 mt-2.5 text-muted-foreground" />
                      <Input
                        placeholder="analyst@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        type="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team-member">Analyst</SelectItem>
                        <SelectItem value="team-lead">Team Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleInvite} className="w-full">Send Invitation</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_TEAM.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'outline'} className="text-xs capitalize">
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
