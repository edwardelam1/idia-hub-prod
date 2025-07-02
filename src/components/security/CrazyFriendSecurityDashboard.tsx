import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Eye, 
  Search, 
  Zap, 
  Lock, 
  Database, 
  Layers, 
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleAgentAction = (agentId: string, action: string) => {
    toast.success(`${action} initiated for ${agents.find(a => a.id === agentId)?.name}`);
  };

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

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(a => a.status === 'active').length}/8
            </div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {agents.reduce((sum, agent) => sum + agent.threatsDetected, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {activeThreats.filter(t => t.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">0.3s</div>
            <p className="text-xs text-muted-foreground">Average detection to response</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Historical Analytics</TabsTrigger>
          <TabsTrigger value="agents">The Crazy 8 Agents</TabsTrigger>
          <TabsTrigger value="threats">Active Threats</TabsTrigger>
          <TabsTrigger value="performance">Agent Performance</TabsTrigger>
          <TabsTrigger value="orchestration">Central Orchestration</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
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
                        onClick={() => handleThreatAction(threat.id, 'investigate')}
                      >
                        Investigate
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleThreatAction(threat.id, 'resolve')}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Threat Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Threat Analysis</CardTitle>
                <CardDescription>Threat detection and resolution patterns over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalData.weeklyThreats.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium w-8">{day.day}</span>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-orange-50 text-orange-800">
                            {day.threats} threats
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-800">
                            {day.resolved} resolved
                          </Badge>
                          {day.critical > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-800">
                              {day.critical} critical
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.round((day.resolved / day.threats) * 100)}% resolved
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Threat Evolution */}
            <Card>
              <CardHeader>
                <CardTitle>Threat Landscape Evolution</CardTitle>
                <CardDescription>Emerging threat patterns over the last 4 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalData.threatEvolution.map((month, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{month.month} 2024</span>
                        <span className="text-sm text-gray-600">
                          {month.malware + month.phishing + month.apt + month.insider} total
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-lg font-semibold text-red-700">{month.malware}</div>
                          <div className="text-xs text-red-600">Malware</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="text-lg font-semibold text-yellow-700">{month.phishing}</div>
                          <div className="text-xs text-yellow-600">Phishing</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-lg font-semibold text-purple-700">{month.apt}</div>
                          <div className="text-xs text-purple-600">APT</div>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <div className="text-lg font-semibold text-orange-700">{month.insider}</div>
                          <div className="text-xs text-orange-600">Insider</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Historical Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Security Insights</CardTitle>
              <CardDescription>AI-generated insights from historical threat data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Predictive Alert</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    85% probability of credential stuffing attack this week based on login pattern anomalies.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Performance Improvement</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Response time improved by 47% since implementing Crazy Guardian automation.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">Risk Pattern</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    APT attacks increasing 22% monthly. Enhanced monitoring on endpoints recommended.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Analytics</CardTitle>
              <CardDescription>Historical performance metrics for each Crazy 8 agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {historicalData.agentPerformance.map((agent, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Crazy {agent.agent}</h3>
                      <Badge className={
                        agent.accuracy >= 95 ? 'bg-green-100 text-green-800' :
                        agent.accuracy >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }>
                        {agent.accuracy}% accuracy
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{agent.responseTime}s</div>
                        <div className="text-sm text-gray-600">Avg Response Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{agent.threatsFound}</div>
                        <div className="text-sm text-gray-600">Threats Found</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{agent.accuracy}%</div>
                        <div className="text-sm text-gray-600">Accuracy Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-6">
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
                    {[
                      'Incident Response Automation',
                      'Threat Containment Protocol',
                      'Data Loss Prevention Response',
                      'Identity Compromise Mitigation',
                      'Advanced Persistent Threat (APT) Response'
                    ].map((playbook, index) => (
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
                    {[
                      'Best Friend AI Core',
                      'Gemini API Integration',
                      'SIEM/XDR Systems',
                      'Endpoint Detection',
                      'Cloud Security Posture'
                    ].map((integration, index) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CrazyFriendSecurityDashboard;