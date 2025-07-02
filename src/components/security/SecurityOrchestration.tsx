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
        <CardTitle>Central Security Orchestration</CardTitle>
        <CardDescription>AI-powered coordination and automated response management</CardDescription>
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
          <h3 className="text-lg font-semibold mb-4">Real-time Agent Communication</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-mono space-y-1">
              <div className="text-green-600">[GUARDIAN] → Received alert from SENTINEL: Anomaly detected in user authentication patterns</div>
              <div className="text-blue-600">[ORACLE] → Predictive model suggests 85% probability of credential stuffing attack</div>
              <div className="text-purple-600">[HUNTER] → Initiating targeted hunt for related IOCs across network traffic</div>
              <div className="text-orange-600">[GATEKEEPER] → Implementing enhanced MFA requirements for affected user segments</div>
              <div className="text-green-600">[GUARDIAN] → Playbook "Credential-Stuffing-Response-v2.1" executed successfully</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};