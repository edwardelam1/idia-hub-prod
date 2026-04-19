import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  ShieldCheck, 
  Mail, 
  MoreVertical, 
  UserPlus, 
  Building2,
  Key,
  AlertCircle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Database Alignment: Users tied to an Enterprise
interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: 'Controlling Partner' | 'Enterprise Admin' | 'Analyst' | 'Developer';
  status: 'Active' | 'Pending' | 'Suspended';
  idiaVerified: boolean;
  platformGuid: string;
  lastActive: string;
}

const mockEnterpriseUsers: EnterpriseUser[] = [
  {
    id: 'u-1',
    name: 'Sarah Wilson',
    email: 'sarah@futurefinance.com',
    role: 'Controlling Partner',
    status: 'Active',
    idiaVerified: true,
    platformGuid: 'idx-773a-992b',
    lastActive: 'Just now'
  },
  {
    id: 'u-2',
    name: 'Michael Chang',
    email: 'michael@futurefinance.com',
    role: 'Enterprise Admin',
    status: 'Active',
    idiaVerified: true,
    platformGuid: 'idx-881c-445f',
    lastActive: '2 hours ago'
  },
  {
    id: 'u-3',
    name: 'Alex Rivera',
    email: 'alex@futurefinance.com',
    role: 'Developer',
    status: 'Pending',
    idiaVerified: false,
    platformGuid: 'pending',
    lastActive: 'Never'
  }
];

export default function TeamManagement() {
  const [users, setUsers] = useState<EnterpriseUser[]>(mockEnterpriseUsers);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Analyst');
  const { toast } = useToast();

  const handleInviteUser = () => {
    if (!inviteEmail) return;
    
    const newUser: EnterpriseUser = {
      id: `u-${Date.now()}`,
      name: 'Pending Invite',
      email: inviteEmail,
      role: inviteRole as any,
      status: 'Pending',
      idiaVerified: false, // Must be false until they link their IDIA Life account
      platformGuid: 'pending',
      lastActive: 'Never'
    };

    setUsers([...users, newUser]);
    setInviteModalOpen(false);
    setInviteEmail('');
    
    toast({
      title: "Invite Sent",
      description: `An invitation has been sent to ${inviteEmail}. They must authenticate via IDIA Life to join the enterprise.`,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Controlling Partner': return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100"><Key className="w-3 h-3 mr-1"/> Owner</Badge>;
      case 'Enterprise Admin': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Admin</Badge>;
      case 'Developer': return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Developer</Badge>;
      default: return <Badge variant="outline">Analyst</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Enterprise Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users and Role-Based Access Control (RBAC) for this enterprise.
          </p>
        </div>
        
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Enterprise User</DialogTitle>
              <DialogDescription>
                Invite a team member. They will be required to link an active IDIA Life sovereign identity before accessing the Hub.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>Every enterprise must maintain at least one Controlling Partner with a verified IDIA Life account.</p>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  placeholder="colleague@enterprise.com" 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Enterprise Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enterprise Admin">Enterprise Admin</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Analyst">Data Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteUser}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active Users
          </CardTitle>
          <CardDescription>All users associated with this enterprise database record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">IDIA Life Verification</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="bg-background hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.idiaVerified ? (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                            <ShieldCheck className="h-4 w-4" /> Verified Identity
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {user.platformGuid}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-medium text-xs">
                          <AlertCircle className="h-4 w-4" /> Pending ACA Link
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit Role</DropdownMenuItem>
                          <DropdownMenuItem>View Activity Log</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role !== 'Controlling Partner' && (
                            <DropdownMenuItem className="text-destructive">Revoke Access</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="text-sm text-muted-foreground">Across {teams.length} teams</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <div className="text-sm text-green-600">
              {((activeUsers / totalUsers) * 100).toFixed(1)}% active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvites}</div>
            <div className="text-sm text-muted-foreground">Awaiting acceptance</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <div className="text-sm text-muted-foreground">Active teams</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Distribution</CardTitle>
            <CardDescription>Users by team and role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="members" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Users by role across organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Team Members', value: users.filter(u => u.role === 'team-member').length },
                      { name: 'Team Leads', value: users.filter(u => u.role === 'team-lead').length },
                      { name: 'Org Admins', value: users.filter(u => u.role === 'organization-admin').length },
                      { name: 'Super Admins', value: users.filter(u => u.role === 'super-admin').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {teamStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="invite">Invite Users</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>Manage your organization's teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <Card key={team.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <h4 className="font-medium">{team.name}</h4>
                      </div>
                      <Badge variant="outline">{team.members.length} members</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {team.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Team Lead:</span>
                        <span>{team.lead}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Department:</span>
                        <span>{team.department}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Created:</span>
                        <span>{team.createdDate}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button size="sm" variant="outline">
                        <Activity className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>Manage individual users and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-4">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {user.team}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant={user.role === 'super-admin' ? 'default' : 
                                      user.role === 'organization-admin' ? 'secondary' : 'outline'}>
                          {user.role.replace('-', ' ')}
                        </Badge>
                        <div className={`text-sm mt-1 ${
                          user.status === 'active' ? 'text-green-600' :
                          user.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {user.status}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deactivateUser(user.id)}
                          disabled={user.status !== 'active'}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>Role-based access control settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Permission</th>
                      <th className="text-center p-2">Super Admin</th>
                      <th className="text-center p-2">Org Admin</th>
                      <th className="text-center p-2">Team Lead</th>
                      <th className="text-center p-2">Team Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(permission => (
                      <tr key={permission.name} className="border-b">
                        <td className="p-2 font-medium">{permission.name}</td>
                        <td className="text-center p-2">
                          {permission.superAdmin ? <Shield className="h-4 w-4 text-green-600 mx-auto" /> : '-'}
                        </td>
                        <td className="text-center p-2">
                          {permission.orgAdmin ? <Shield className="h-4 w-4 text-green-600 mx-auto" /> : '-'}
                        </td>
                        <td className="text-center p-2">
                          {permission.teamLead ? <Shield className="h-4 w-4 text-green-600 mx-auto" /> : '-'}
                        </td>
                        <td className="text-center p-2">
                          {permission.teamMember ? <Shield className="h-4 w-4 text-green-600 mx-auto" /> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite New Users</CardTitle>
              <CardDescription>Add new team members to your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team-member">Team Member</SelectItem>
                      <SelectItem value="team-lead">Team Lead</SelectItem>
                      <SelectItem value="organization-admin">Organization Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select value={selectedTeam.id} onValueChange={(value) => setSelectedTeam(teams.find(t => t.id === value) || teams[0])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInviteUser} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManagement;
