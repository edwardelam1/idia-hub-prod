import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export const SecurityOrchestration = () => {
  const playbooks = [
    'Incident Response Automation',
    'Threat Containment Protocol',
    'Data Loss Prevention Response',
    'Identity Compromise Mitigation',
    'Advanced Persistent Threat (APT) Response'
  ];

  const integrations = [
    'Best Friend AI Core',
    'Gemini API Integration',
    'SIEM/XDR Systems',
    'Endpoint Detection',
    'Cloud Security Posture'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Central Security Orchestration Hub</CardTitle>
        <CardDescription>Gemini-powered command center with continuous feedback loops and human-AI collaboration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Automated Playbooks</h3>
            <div className="space-y-2">
              {playbooks.map((playbook, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm">{playbook}</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Integration Status</h3>
            <div className="space-y-2">
              {integrations.map((integration, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm">{integration}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Gemini-Powered Agent Intelligence Bus</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="text-sm font-mono space-y-1">
              <div className="text-green-600">[GUARDIAN] → Orchestrating response to SENTINEL anomaly: Authentication deviation detected</div>
              <div className="text-blue-600">[ORACLE] → Gemini analysis: 89% confidence credential stuffing imminent (next 47 minutes)</div>
              <div className="text-purple-600">[HUNTER] → Correlating IOCs across 847 data sources • 3 suspicious patterns identified</div>
              <div className="text-orange-600">[GATEKEEPER] → Dynamic MFA enforcement activated for risk score &gt;0.7 users</div>
              <div className="text-cyan-600">[INSIGHT] → Human explanation: Automated response justified due to historical pattern match</div>
              <div className="text-green-600">[GUARDIAN] → Playbook executed successfully • Human review requested for false positive analysis</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
              <h4 className="font-medium text-blue-800">Continuous Learning</h4>
              <p className="text-sm text-blue-700">127 feedback loops active</p>
            </div>
            <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
              <h4 className="font-medium text-green-800">Model Refinement</h4>
              <p className="text-sm text-green-700">Last update: 23 minutes ago</p>
            </div>
            <div className="p-3 bg-purple-50 rounded border-l-4 border-purple-400">
              <h4 className="font-medium text-purple-800">Human-AI Collaboration</h4>
              <p className="text-sm text-purple-700">94.7% accuracy with oversight</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};