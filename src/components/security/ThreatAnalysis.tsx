import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Threat {
  id: number;
  threat: string;
  severity: string;
  agent: string;
  timestamp: string;
  status: string;
}

interface ThreatAnalysisProps {
  activeThreats: Threat[];
  onThreatAction: (threatId: number, action: string) => void;
}

const getAlertColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-blue-100 text-blue-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'text-blue-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-orange-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const ThreatAnalysis = ({ activeThreats, onThreatAction }: ThreatAnalysisProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Threat Analysis</CardTitle>
        <CardDescription>Real-time threat detection and response coordination</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeThreats.map((threat) => (
            <div key={threat.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`h-4 w-4 ${getSeverityColor(threat.severity)}`} />
                  <span className="font-medium">{threat.threat}</span>
                  <Badge className={getAlertColor(threat.severity)}>
                    {threat.severity}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Detected by {threat.agent} • {threat.timestamp}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <Badge variant="outline" className={
                    threat.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    threat.status === 'contained' ? 'bg-blue-100 text-blue-800' :
                    threat.status === 'active' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {threat.status}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onThreatAction(threat.id, 'investigate')}
                >
                  Investigate
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => onThreatAction(threat.id, 'resolve')}
                >
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};