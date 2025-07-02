import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentPerformanceData {
  agent: string;
  accuracy: number;
  responseTime: number;
  threatsFound: number;
}

interface AgentPerformanceProps {
  performanceData: AgentPerformanceData[];
}

export const AgentPerformance = ({ performanceData }: AgentPerformanceProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance Analytics</CardTitle>
        <CardDescription>Historical performance metrics for each Crazy 8 agent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {performanceData.map((agent, index) => (
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
  );
};