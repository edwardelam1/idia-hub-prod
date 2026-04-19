import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  FileSignature, 
  Lock, 
  AlertTriangle, 
  Server,
  Building2,
  Users,
  Download,
  Activity
} from 'lucide-react';

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
            <p className="text-xs text-muted-foreground mt-4">All active users linked to IDIA Life</p>
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
                <Progress value={100} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
                <p className="text-xs text-muted-foreground">The enterprise record is securely anchored to an IDIA Life verified owner.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">User ACA (Auditable Consent Artifact) Coverage</span>
                  <span className="text-blue-600 font-bold">95%</span>
                </div>
                <Progress value={95} className="h-2 bg-muted" indicatorClassName="bg-blue-500" />
                <p className="text-xs text-muted-foreground">95% of invited enterprise users have completed sovereign onboarding. 5% pending.</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-4">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">Zero-PII Access Enforced</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The IDIA Hub is operating with zero-PII persistence. All personal data associated with enterprise users remains encrypted in their respective mobile Secure Enclaves. Session data is bridged temporarily via Edge Functions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delt">
          <Card>
            <CardHeader>
              <CardTitle>Data Escrow Liability Transfer (DELT)</CardTitle>
              <CardDescription>Monitor the status of your cryptographic liability shields.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>All active data endpoints are currently protected by DELT.</p>
                  <Button variant="link" className="mt-2 text-primary">View Escrow Ledgers</Button>
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
                <Badge variant="outline" className="bg-green-50 text-green-700">SOC2 Compliant</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="font-medium">Consent Hash Ledgers</p>
                    <p className="text-xs text-muted-foreground">Distributed Edge</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">Immutable</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
            <div className="text-sm text-muted-foreground">Require immediate attention</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAudits}</div>
            <div className="text-sm text-muted-foreground">This quarter</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next Deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <div className="text-sm text-muted-foreground">days until GDPR review</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status by Framework</CardTitle>
            <CardDescription>Current compliance scores across different regulations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceOverview.map(framework => (
                <div key={framework.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        framework.score >= 85 ? 'bg-green-500' : 
                        framework.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium">{framework.name}</span>
                    </div>
                    <Badge variant={framework.score >= 85 ? "default" : framework.score >= 70 ? "secondary" : "destructive"}>
                      {framework.score}%
                    </Badge>
                  </div>
                  <Progress value={framework.score} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    Last updated: {framework.lastUpdated}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Trend</CardTitle>
            <CardDescription>Compliance scores over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceOverview[0]?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="regulations" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="regulations">Regulations</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
          <TabsTrigger value="audits">Audit Logs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="api-cleanroom" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            API Cleanroom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regulations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Requirements</CardTitle>
              <CardDescription>Track compliance with various regulatory frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regulations.map(regulation => (
                  <Card key={regulation.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <h4 className="font-medium">{regulation.name}</h4>
                      </div>
                      <Badge variant={regulation.status === 'compliant' ? 'default' : 
                                    regulation.status === 'partial' ? 'secondary' : 'destructive'}>
                        {regulation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {regulation.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Requirements Met:</span>
                        <span>{regulation.requirementsMet}/{regulation.totalRequirements}</span>
                      </div>
                      <Progress 
                        value={(regulation.requirementsMet / regulation.totalRequirements) * 100} 
                        className="h-2" 
                      />
                      <div className="text-xs text-muted-foreground">
                        Next review: {regulation.nextReview}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessments</CardTitle>
              <CardDescription>Identified risks and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskAssessments.map(risk => (
                  <div key={risk.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      risk.severity === 'critical' ? 'bg-red-500' :
                      risk.severity === 'high' ? 'bg-orange-500' :
                      risk.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{risk.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            risk.severity === 'critical' ? 'destructive' :
                            risk.severity === 'high' ? 'secondary' : 'outline'
                          }>
                            {risk.severity}
                          </Badge>
                          <Badge variant="outline">{risk.category}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {risk.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Impact:</span> {risk.impact}
                        </div>
                        <div>
                          <span className="font-medium">Likelihood:</span> {risk.likelihood}
                        </div>
                        <div>
                          <span className="font-medium">Owner:</span> {risk.owner}
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span> {risk.dueDate}
                        </div>
                      </div>
                      {risk.mitigation && (
                        <div className="mt-3 p-3 bg-accent/50 rounded-lg">
                          <span className="font-medium text-sm">Mitigation:</span>
                          <p className="text-sm text-muted-foreground mt-1">{risk.mitigation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Recent compliance activities and audits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.map(audit => (
                  <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        audit.type === 'security' ? 'bg-red-100' :
                        audit.type === 'privacy' ? 'bg-blue-100' :
                        audit.type === 'data' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {audit.type === 'security' ? <Shield className="h-5 w-5 text-red-600" /> :
                         audit.type === 'privacy' ? <Eye className="h-5 w-5 text-blue-600" /> :
                         <FileText className="h-5 w-5 text-green-600" />}
                      </div>
                      <div>
                        <div className="font-medium">{audit.activity}</div>
                        <div className="text-sm text-muted-foreground">
                          {audit.timestamp} • by {audit.user}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        audit.status === 'completed' ? 'default' :
                        audit.status === 'in-progress' ? 'secondary' : 'outline'
                      }>
                        {audit.status}
                      </Badge>
                      {audit.details && (
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Generate and download compliance reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.type} • Generated {report.generatedDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{report.format}</Badge>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <Button onClick={() => generateReport()} className="mr-2">
                    Generate New Report
                  </Button>
                  <Button variant="outline" onClick={() => scheduleAudit()}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Audit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-cleanroom" className="space-y-4">
          <APICleanroom />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceDashboard;
