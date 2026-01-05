
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Eye, Download, Calendar, Database } from 'lucide-react';
import { useComplianceData } from '@/hooks/useComplianceData';
import APICleanroom from './APICleanroom';

const ComplianceDashboard = () => {
  const { 
    complianceOverview, 
    auditLogs, 
    riskAssessments, 
    regulations, 
    reports,
    generateReport,
    scheduleAudit
  } = useComplianceData();

  const overallScore = complianceOverview.reduce((acc, curr) => acc + curr.score, 0) / complianceOverview.length;
  const criticalIssues = riskAssessments.filter(risk => risk.severity === 'critical').length;
  const completedAudits = auditLogs.filter(audit => audit.status === 'completed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor regulatory compliance and manage risk assessments</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={overallScore >= 85 ? "default" : overallScore >= 70 ? "secondary" : "destructive"}>
            Compliance Score: {overallScore.toFixed(1)}%
          </Badge>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore.toFixed(1)}%</div>
            <Progress value={overallScore} className="mt-2" />
            <div className="text-sm text-muted-foreground mt-1">
              {overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Attention'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical Issues</CardTitle>
          </CardHeader>
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
