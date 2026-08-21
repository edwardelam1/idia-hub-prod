import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  FileSignature,
  Lock,
  AlertTriangle,
  Server,
  Building2,
  Users,
  Download,
  Activity,
} from "lucide-react";

export default function ComplianceDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-green-500" />
            Enterprise Compliance Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor KYB status, user sovereignty bindings, and active DELT agreements.
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Audit Report
        </Button>
      </div>

      {/* Top Level Enterprise Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Enterprise KYB</p>
                <h3 className="text-2xl font-bold text-green-700">Verified</h3>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Legal documentation approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Team Sovereignty</p>
                <h3 className="text-2xl font-bold">100%</h3>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">All active users linked to Life by IDIA</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Active DELTs</p>
                <h3 className="text-2xl font-bold">2,405</h3>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileSignature className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Data Escrow Liability Transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">ACA Hashes</p>
                <h3 className="text-2xl font-bold">14,291</h3>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Immutable consent records logged</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sovereignty" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="sovereignty">Identity & Sovereignty</TabsTrigger>
          <TabsTrigger value="delt">DELT Protocol</TabsTrigger>
          <TabsTrigger value="residency">Data Residency</TabsTrigger>
        </TabsList>

        <TabsContent value="sovereignty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Sovereignty Binding</CardTitle>
              <CardDescription>
                Enforcement metrics for ensuring all enterprise access is tied to an auditable human identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Controlling Partner Linkage</span>
                  <span className="text-green-600 font-bold">Compliant</span>
                </div>
                <Progress value={100} className="h-2 bg-muted [&>div]:bg-green-500" />
                <p className="text-xs text-muted-foreground">
                  The enterprise record is securely anchored to an Life by IDIA verified owner.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">User ACA (Auditable Consent Artifact) Coverage</span>
                  <span className="text-blue-600 font-bold">95%</span>
                </div>
                <Progress value={95} className="h-2 bg-muted [&>div]:bg-blue-500" />
                <p className="text-xs text-muted-foreground">
                  95% of invited enterprise users have completed sovereign onboarding. 5% pending.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-4">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">Zero-PII Access Enforced</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The IDIA Hub is operating with zero-PII persistence. All personal data associated with enterprise
                    users remains encrypted in their respective mobile Secure Enclaves. Session data is bridged
                    temporarily via Edge Functions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delt">
          <Card>
            <CardHeader>
              <CardTitle>Liability Shield</CardTitle>
              <CardDescription>Monitor the status of your immutable indemnity.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>All active data endpoints are currently protected by the Liability Shield.</p>
                  <Button variant="link" className="mt-2 text-primary">
                    View Escrow Ledgers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residency">
          <Card>
            <CardHeader>
              <CardTitle>Data Residency & Infrastructure</CardTitle>
              <CardDescription>Geographic and infrastructural compliance mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="font-medium">Primary Storage</p>
                    <p className="text-xs text-muted-foreground">US-East-1 (N. Virginia)</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  SOC2 Compliant
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="font-medium">Consent Hash Ledgers</p>
                    <p className="text-xs text-muted-foreground">Distributed Edge</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Immutable
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
