import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Eye, 
  Search, 
  Lock, 
  Database, 
  Layers, 
  Brain,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { SecurityOverviewCards } from './SecurityOverviewCards';
import { AgentCards } from './AgentCards';
import { ThreatAnalysis } from './ThreatAnalysis';
import { HistoricalAnalytics } from './HistoricalAnalytics';
import { AgentPerformance } from './AgentPerformance';
import { SecurityOrchestration } from './SecurityOrchestration';

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

const CrazyFriendSecurityDashboard = () => {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'sentinel',
      name: 'Crazy Sentinel',
      status: 'active',
      lastActivity: '2 minutes ago',
      threatsDetected: 12,
      alertLevel: 'medium',
      description: 'Anomaly Detection & Behavioral Analysis',
      icon: Eye
    },
    {
      id: 'oracle',
      name: 'Crazy Oracle',
      status: 'active',
      lastActivity: '5 minutes ago',
      threatsDetected: 8,
      alertLevel: 'low',
      description: 'Predictive Analytics & Vulnerability Prioritization',
      icon: Brain
    },
    {
      id: 'hunter',
      name: 'Crazy Hunter',
      status: 'alert',
      lastActivity: '1 minute ago',
      threatsDetected: 23,
      alertLevel: 'high',
      description: 'Automated Threat Hunting',
      icon: Search
    },
    {
      id: 'guardian',
      name: 'Crazy Guardian',
      status: 'active',
      lastActivity: '30 seconds ago',
      threatsDetected: 45,
      alertLevel: 'medium',
      description: 'Security Orchestration, Automation & Response',
      icon: Shield
    },
    {
      id: 'gatekeeper',
      name: 'Crazy Gatekeeper',
      status: 'active',
      lastActivity: '1 minute ago',
      threatsDetected: 7,
      alertLevel: 'low',
      description: 'Identity & Access Management',
      icon: Lock
    },
    {
      id: 'shield',
      name: 'Crazy Shield',
      status: 'active',
      lastActivity: '3 minutes ago',
      threatsDetected: 15,
      alertLevel: 'medium',
      description: 'Information Protection & Data Loss Prevention',
      icon: Database
    },
    {
      id: 'mirror',
      name: 'Crazy Mirror',
      status: 'active',
      lastActivity: '4 minutes ago',
      threatsDetected: 3,
      alertLevel: 'low',
      description: 'Adversarial AI Defense',
      icon: Layers
    },
    {
      id: 'insight',
      name: 'Crazy Insight',
      status: 'active',
      lastActivity: '1 minute ago',
      threatsDetected: 0,
      alertLevel: 'low',
      description: 'Explainable AI & Ethical AI',
      icon: TrendingUp
    }
  ]);

  const [activeThreats, setActiveThreats] = useState([
    {
      id: 1,
      threat: 'Suspicious login pattern detected',
      severity: 'high',
      agent: 'Crazy Sentinel',
      timestamp: '2 minutes ago',
      status: 'investigating'
    },
    {
      id: 2,
      threat: 'Unusual data access pattern',
      severity: 'medium',
      agent: 'Crazy Shield',
      timestamp: '5 minutes ago',
      status: 'contained'
    },
    {
      id: 3,
      threat: 'APT signature detected in network traffic',
      severity: 'critical',
      agent: 'Crazy Hunter',
      timestamp: '1 minute ago',
      status: 'active'
    }
  ]);

  const [historicalData, setHistoricalData] = useState({
    weeklyThreats: [
      { day: 'Mon', threats: 23, resolved: 21, critical: 2 },
      { day: 'Tue', threats: 18, resolved: 18, critical: 0 },
      { day: 'Wed', threats: 31, resolved: 28, critical: 3 },
      { day: 'Thu', threats: 15, resolved: 15, critical: 0 },
      { day: 'Fri', threats: 27, resolved: 24, critical: 3 },
      { day: 'Sat', threats: 12, resolved: 12, critical: 0 },
      { day: 'Sun', threats: 8, resolved: 8, critical: 0 }
    ],
    agentPerformance: [
      { agent: 'Sentinel', accuracy: 94.2, responseTime: 0.8, threatsFound: 45 },
      { agent: 'Oracle', accuracy: 89.7, responseTime: 2.1, threatsFound: 12 },
      { agent: 'Hunter', accuracy: 91.5, responseTime: 1.2, threatsFound: 67 },
      { agent: 'Guardian', accuracy: 98.1, responseTime: 0.3, threatsFound: 23 },
      { agent: 'Gatekeeper', accuracy: 96.8, responseTime: 0.5, threatsFound: 8 },
      { agent: 'Shield', accuracy: 93.4, responseTime: 1.1, threatsFound: 34 },
      { agent: 'Mirror', accuracy: 87.9, responseTime: 3.2, threatsFound: 5 },
      { agent: 'Insight', accuracy: 99.2, responseTime: 0.1, threatsFound: 0 }
    ],
    threatEvolution: [
      { month: 'Oct', malware: 45, phishing: 23, apt: 8, insider: 3 },
      { month: 'Nov', malware: 52, phishing: 31, apt: 12, insider: 2 },
      { month: 'Dec', malware: 38, phishing: 28, apt: 15, insider: 5 },
      { month: 'Jan', malware: 41, phishing: 35, apt: 18, insider: 4 }
    ]
  });


  const handleThreatAction = (threatId: number, action: string) => {
    setActiveThreats(prev => 
      prev.map(threat => 
        threat.id === threatId 
          ? { ...threat, status: action === 'resolve' ? 'resolved' : 'investigating' }
          : threat
      )
    );
    toast.success(`Threat ${action === 'resolve' ? 'resolved' : 'investigation started'}`);
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        lastActivity: Math.random() > 0.8 ? 'Just now' : agent.lastActivity,
        threatsDetected: Math.random() > 0.9 ? agent.threatsDetected + 1 : agent.threatsDetected
      })));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Crazy Friend AI Security Protocol</h1>
        <p className="text-gray-600 mt-2">Enterprise-level autonomous defense system powered by The Crazy 8 agents</p>
      </div>

      <SecurityOverviewCards agents={agents} activeThreats={activeThreats} />

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Historical Analytics</TabsTrigger>
          <TabsTrigger value="agents">The Crazy 8 Agents</TabsTrigger>
          <TabsTrigger value="threats">Active Threats</TabsTrigger>
          <TabsTrigger value="performance">Agent Performance</TabsTrigger>
          <TabsTrigger value="orchestration">Central Orchestration</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <AgentCards agents={agents} />
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          <ThreatAnalysis activeThreats={activeThreats} onThreatAction={handleThreatAction} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <HistoricalAnalytics historicalData={historicalData} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <AgentPerformance performanceData={historicalData.agentPerformance} />
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-6">
          <SecurityOrchestration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CrazyFriendSecurityDashboard;