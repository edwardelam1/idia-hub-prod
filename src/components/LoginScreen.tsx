
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, User } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: string) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleQuickLogin = (role: string) => {
    // For prototype purposes - direct login without authentication
    onLogin(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/images/hub-logo.png" 
            alt="IDIA Hub Logo" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">IDIA Hub</h1>
          <p className="text-gray-600 mt-2">Professional Data Intelligence Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your IDIA Hub dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="standard" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standard">Standard Login</TabsTrigger>
                <TabsTrigger value="sso">Enterprise SSO</TabsTrigger>
              </TabsList>
              
              <TabsContent value="standard" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleQuickLogin('team-member')}>
                  Sign In
                </Button>
              </TabsContent>
              
              <TabsContent value="sso" className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => handleQuickLogin('organization-admin')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Continue with Enterprise SSO
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">Quick Access (Prototype):</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('super-admin')}>
                  Super Admin
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('organization-admin')}>
                  Org Admin
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('team-lead')}>
                  Team Lead
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('team-member')}>
                  Team Member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;
