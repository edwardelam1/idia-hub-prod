import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'alert' | 'maintenance';
  lastActivity: string;
  threatsDetected: number;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  icon: React.ElementType;
}

interface AgentCardsProps {
  agents: Agent[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'alert': return 'bg-red-100 text-red-800';
    case 'idle': return 'bg-gray-100 text-gray-800';
    case 'maintenance': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getAlertColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-blue-100 text-blue-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const AgentCards = ({ agents }: AgentCardsProps) => {
  const handleAgentAction = (agentId: string, action: string) => {
    toast.success(`${action} initiated for ${agents.find(a => a.id === agentId)?.name}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {agents.map((agent) => {
        const IconComponent = agent.icon;
        return (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <IconComponent className="h-6 w-6 text-purple-600" />
                <Badge className={getStatusColor(agent.status)}>
                  {agent.status}
                </Badge>
              </div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-sm">
                {agent.description}
                <div className="mt-2 text-xs text-blue-600 font-medium">Gemini-Powered</div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Activity:</span>
                <span>{agent.lastActivity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Threats Detected:</span>
                <span className="font-semibold">{agent.threatsDetected}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Alert Level:</span>
                <Badge className={getAlertColor(agent.alertLevel)}>
                  {agent.alertLevel}
                </Badge>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAgentAction(agent.id, 'Configure')}
                >
                  Configure
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAgentAction(agent.id, 'View Details')}
                >
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};