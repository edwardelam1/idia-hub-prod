import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveOAuthRedirect, isNativeShell } from "@/lib/auth-redirect";


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

const AppleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
  </svg>
);

const LoginScreen = ({ onLogin, onRealLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();

  // Same-origin relative path only — used to bounce OAuth-consent visitors
  // back to /.lovable/oauth/consent after they sign in.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const consumeNext = () => {
    if (nextPath) {
      window.location.href = nextPath;
      return true;
    }
    return false;
  };

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
        toast.success("Signed in successfully");
        // Honor OAuth-consent bounce-back before the default post-login flow.
        if (consumeNext()) return;
        // Surgical Fix: Call the login trigger immediately to avoid landing on Site URL
        onRealLogin?.();
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
      // Native shells (iOS / Android / macOS) return via idialife://auth-callback.
      const redirectTo = resolveOAuthRedirect(nextPath);
      const { error } = await supabase.auth.signInWithOAuth({

        provider,
        options: {
          // Honor ?next= so MCP OAuth-consent visitors return to the consent screen.
          redirectTo,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/images/hub-logo.png" alt="IDIA Hub Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">The IDIA Hub</h1>
          <p className="text-gray-600 mt-2">Professional Data Intelligence Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in with your Life by IDIA Credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                onClick={() => handleOAuthLogin("apple")}
                disabled={isAppleLoading}
                className="w-full bg-black text-white hover:bg-black/90"
              >
                <AppleIcon />
                <span className="ml-2">{isAppleLoading ? "Redirecting..." : "Sign-in with Apple"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin("google")}
                disabled={isGoogleLoading}
                className="w-full bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
              >
                <GoogleIcon />
                <span className="ml-2">{isGoogleLoading ? "Redirecting..." : "Sign-in with Google"}</span>
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

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
                    onKeyDown={(e) => e.key === "Enter" && handleRealLogin()}
                  />
                </div>
                <Button className="w-full" onClick={handleRealLogin} disabled={isSigningIn}>
                  {isSigningIn ? "Signing In..." : "Sign In"}
                </Button>
              </TabsContent>

              <TabsContent value="sso" className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => handleQuickLogin("organization-admin")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Continue with Enterprise SSO
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;
