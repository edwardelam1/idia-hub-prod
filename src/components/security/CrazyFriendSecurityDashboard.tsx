import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Eye, 
  Search, 
  Lock, 
  Database, 
  Layers, 
  Brain,
  TrendingUp,
  Activity,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { SecurityOverviewCards } from './SecurityOverviewCards';
import { AgentCards } from './AgentCards';
import { ThreatAnalysis } from './ThreatAnalysis';
import { HistoricalAnalytics } from './HistoricalAnalytics';
import { AgentPerformance } from './AgentPerformance';
import { SecurityOrchestration } from './SecurityOrchestration';
import { SecurityCommandCenter } from './SecurityCommandCenter';
import { useSecurityEvents } from '@/hooks/useSecurityEvents';

interface Threat {
  id: number;
  threat: string;
  severity: string;
  agent: string;
  timestamp: string;
  status: string;
}

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

interface RemediationPlan {
  id: string;
  title: string;
  agent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  explanation: string;
  actions: string[];
  timestamp: string;
}

const CrazyFriendSecurityDashboard = () => {
  const { securityEvents, agentStatus, isLoading } = useSecurityEvents();
  
  // Convert security events to the expected format
  const agents: Agent[] = Object.entries(agentStatus).map(([id, status]) => ({
    id,
    name: id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    status: status as 'active' | 'idle' | 'alert' | 'maintenance',
    lastActivity: 'Just now',
    threatsDetected: securityEvents.filter(e => e.agent_name === id && e.severity !== 'low').length,
    alertLevel: (securityEvents.find(e => e.agent_name === id && ['high', 'critical'].includes(e.severity)) ? 'high' : 'low') as 'low' | 'medium' | 'high' | 'critical',
    description: `${id.replace('crazy_', '').replace('_', ' ')} security monitoring`,
    icon: Shield
  }));

  // Convert security events to threat format
  const activeThreats: Threat[] = securityEvents
    .filter(e => ['medium', 'high', 'critical'].includes(e.severity) && !e.resolved)
    .map(event => ({
      id: parseInt(event.id.substring(0, 8), 16), // Convert UUID to number for compatibility
      threat: event.action_type.replace(/_/g, ' '),
      severity: event.severity,
      agent: event.agent_name.replace('crazy_', ''),
      timestamp: new Date(event.timestamp).toLocaleString(),
      status: event.resolved ? 'resolved' : 'active'
    }));

  const [remediationPlans, setRemediationPlans] = useState<RemediationPlan[]>([]);
  const [historicalData, setHistoricalData] = useState({
    weeklyThreats: [],
    agentPerformance: [],
    threatEvolution: []
  });

  const handleThreatAction = (threatId: number, action: string) => {
    toast.success(`Threat ${action === 'resolve' ? 'resolved' : 'investigation started'}`);
  };

  const handleRemediationApproval = (planId: string) => {
    setRemediationPlans(prev =>
      prev.map(plan =>
        plan.id === planId ? { ...plan, status: 'executed' as const } : plan
      )
    );
    toast.success('Remediation plan approved and executed');
  };

  const handleRemediationRejection = (planId: string) => {
    setRemediationPlans(prev =>
      prev.map(plan =>
        plan.id === planId ? { ...plan, status: 'rejected' as const } : plan
      )
    );
    toast.success('Remediation plan rejected');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crazy Friend AI Security Protocol</h1>
        <p className="text-gray-600 mt-2">Enterprise-grade autonomous defense system - awaiting live threat data</p>
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-medium text-blue-800">Security Command Center Status</h3>
          </div>
          <p className="text-sm text-blue-700 mt-1">Awaiting security agent initialization and live threat monitoring</p>
        </div>
      </div>

      <SecurityOverviewCards agents={agents} activeThreats={activeThreats} />

      {/* Security Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              <span className="text-sm">Command Center</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Security Command Center</DialogTitle>
            </DialogHeader>
            <SecurityCommandCenter 
              remediationPlans={remediationPlans}
              onApprove={handleRemediationApproval}
              onReject={handleRemediationRejection}
            />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Historical Analytics</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historical Analytics</DialogTitle>
            </DialogHeader>
            <HistoricalAnalytics historicalData={historicalData} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Brain className="h-6 w-6" />
              <span className="text-sm">The Crazy 8 Agents</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>The Crazy 8 Agents</DialogTitle>
            </DialogHeader>
            <AgentCards agents={agents} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Search className="h-6 w-6" />
              <span className="text-sm">Active Threats</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Active Threats</DialogTitle>
            </DialogHeader>
            <ThreatAnalysis activeThreats={activeThreats} onThreatAction={handleThreatAction} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Agent Performance</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agent Performance</DialogTitle>
            </DialogHeader>
            <AgentPerformance performanceData={historicalData.agentPerformance} />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Layers className="h-6 w-6" />
              <span className="text-sm">Central Orchestration</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Central Orchestration</DialogTitle>
            </DialogHeader>
            <SecurityOrchestration />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CrazyFriendSecurityDashboard;