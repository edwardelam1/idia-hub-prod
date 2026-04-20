import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Apple, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LoginScreenProps {
  onLogin: (role: string) => void;
  onRealLogin?: () => void;
}

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const LoginScreen = ({ onLogin, onRealLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleRealLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (data.session) {
        toast.success("Identity Verified. Syncing Hub...");
        // Explicitly trigger the navigation callback passed from App.tsx
        if (onRealLogin) {
          onRealLogin();
        } else {
          // Fallback if prop isn't passed: Hard redirect to dashboard
          window.location.href = "/dashboard";
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleOAuthLogin = async (provider: "apple" | "google") => {
    const setLoading = provider === "apple" ? setIsAppleLoading : setIsGoogleLoading;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Ensure this points specifically to the dashboard for the Hub
          redirectTo: `${window.location.origin}/dashboard`,
          ...(provider === "google" && {
            queryParams: { access_type: "offline", prompt: "select_account" },
          }),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || `${provider} sign in failed`);
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    onLogin(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-sans">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4 border border-primary/20">
            <img src="/images/hub-logo.png" alt="IDIA Hub Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IDIA Hub</h1>
          <p className="text-sm text-muted-foreground">Verification Economy & Data Rights Management</p>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Authentication</CardTitle>
            <CardDescription className="text-xs">Enter credentials to access the sovereign data vault</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => handleOAuthLogin("apple")}
                disabled={isAppleLoading}
                variant="outline"
                className="h-9 text-xs border-border/60 hover:bg-white hover:text-black"
              >
                {isAppleLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Apple className="mr-2 h-3.5 w-3.5" />}
                Apple
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin("google")}
                disabled={isGoogleLoading}
                className="h-9 text-xs border-border/60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <div className="mr-2">
                    <GoogleIcon />
                  </div>
                )}
                Google
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-card px-2 text-muted-foreground">Sovereign Link</span>
              </div>
            </div>

            <Tabs defaultValue="standard" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9 mb-4 bg-muted/50">
                <TabsTrigger value="standard" className="text-xs">
                  Standard
                </TabsTrigger>
                <TabsTrigger value="sso" className="text-xs">
                  SSO
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standard" className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] uppercase font-bold text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-sm bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[11px] uppercase font-bold text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRealLogin()}
                    className="h-9 text-sm bg-background/50"
                  />
                </div>
                <Button className="w-full h-9 font-bold mt-2" onClick={handleRealLogin} disabled={isSigningIn}>
                  {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSigningIn ? "Authenticating..." : "Access Hub"}
                </Button>
              </TabsContent>

              <TabsContent value="sso" className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-10 text-sm border-dashed border-primary/30 hover:border-primary/60"
                  onClick={() => handleQuickLogin("organization-admin")}
                >
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  Connect via Enterprise SSO
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 tracking-wider">
                Dev Sandbox Access
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] bg-muted/30 hover:bg-primary/20"
                  onClick={() => handleQuickLogin("super-admin")}
                >
                  SUPER ADMIN
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] bg-muted/30 hover:bg-primary/20"
                  onClick={() => handleQuickLogin("organization-admin")}
                >
                  ORG ADMIN
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
