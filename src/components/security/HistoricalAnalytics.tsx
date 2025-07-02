import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface HistoricalData {
  weeklyThreats: Array<{
    day: string;
    threats: number;
    resolved: number;
    critical: number;
  }>;
  threatEvolution: Array<{
    month: string;
    malware: number;
    phishing: number;
    apt: number;
    insider: number;
  }>;
}

interface HistoricalAnalyticsProps {
  historicalData: HistoricalData;
}

export const HistoricalAnalytics = ({ historicalData }: HistoricalAnalyticsProps) => {
  return (
    <div className="space-y-6">
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
    </div>
  );
};