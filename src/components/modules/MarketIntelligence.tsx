import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, TrendingDown, BarChart3, Target, DollarSign, Users, ShoppingCart, Clock } from "lucide-react";

interface MarketBenchmark {
  id: string;
  industry_category: string;
  metric_name: string;
  metric_value: number;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  geographic_region: string;
}

interface CompetitiveAnalysis {
  id: string;
  metric_category: string;
  business_value: number;
  industry_average: number;
  percentile_rank: number;
  competitive_gap: number;
  recommendations: any;
}

interface MarketIntelligenceSubscription {
  id: string;
  bundle_id: string;
  subscription_type: string;
  status: string;
  expires_at: string;
}

export const MarketIntelligence = () => {
  const [benchmarks, setBenchmarks] = useState<MarketBenchmark[]>([]);
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<CompetitiveAnalysis[]>([]);
  const [subscriptions, setSubscriptions] = useState<MarketIntelligenceSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("national");
  const { toast } = useToast();

  useEffect(() => {
    fetchMarketData();
  }, [selectedRegion]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      // Fetch market benchmarks
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('market_benchmarks')
        .select('*')
        .eq('geographic_region', selectedRegion)
        .order('created_at', { ascending: false });

      if (benchmarkError) throw benchmarkError;
      setBenchmarks(benchmarkData || []);

      // Fetch competitive analysis
      const { data: competitiveData, error: competitiveError } = await supabase
        .from('competitive_analysis')
        .select('*')
        .order('analysis_date', { ascending: false });

      if (competitiveError) throw competitiveError;
      setCompetitiveAnalysis(competitiveData || []);

      // Fetch subscriptions
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('market_intelligence_subscriptions')
        .select('*')
        .eq('status', 'active');

      if (subscriptionError) throw subscriptionError;
      setSubscriptions(subscriptionData || []);

    } catch (error) {
      console.error('Error fetching market data:', error);
      toast({
        title: "Error",
        description: "Failed to load market intelligence data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceIndicator = (percentileRank: number) => {
    if (percentileRank >= 75) return { icon: TrendingUp, color: "text-green-500", label: "Excellent" };
    if (percentileRank >= 50) return { icon: TrendingUp, color: "text-blue-500", label: "Good" };
    if (percentileRank >= 25) return { icon: TrendingDown, color: "text-yellow-500", label: "Below Average" };
    return { icon: TrendingDown, color: "text-red-500", label: "Needs Improvement" };
  };

  const MetricCard = ({ analysis }: { analysis: CompetitiveAnalysis }) => {
    const indicator = getPerformanceIndicator(analysis.percentile_rank);
    const Icon = indicator.icon;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {analysis.metric_category.replace('_', ' ')}
          </CardTitle>
          <Icon className={`h-4 w-4 ${indicator.color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analysis.metric_category.includes('revenue') || analysis.metric_category.includes('cost') 
              ? `$${analysis.business_value.toLocaleString()}` 
              : analysis.business_value.toFixed(1)}
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Performance</span>
              <Badge variant={analysis.percentile_rank >= 50 ? "default" : "secondary"}>
                {analysis.percentile_rank}th percentile
              </Badge>
            </div>
            <Progress value={analysis.percentile_rank} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Industry Average: {analysis.metric_category.includes('revenue') || analysis.metric_category.includes('cost') 
                ? `$${analysis.industry_average.toLocaleString()}` 
                : analysis.industry_average.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div>Loading Market Intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Market Intelligence</h2>
          <p className="text-muted-foreground">
            Compare your performance against industry peers and market benchmarks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="national">National</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="local">Local Market</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Performance Overview</TabsTrigger>
          <TabsTrigger value="benchmarks">Industry Benchmarks</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="insights">Market Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {competitiveAnalysis.slice(0, 8).map((analysis) => (
              <MetricCard key={analysis.id} analysis={analysis} />
            ))}
          </div>

          {competitiveAnalysis.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Your competitive analysis will appear here once data is available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Analysis Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Competitive analysis data will be generated based on your business metrics
                  </p>
                  <Button onClick={fetchMarketData}>Generate Analysis</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmarks</CardTitle>
              <CardDescription>
                Current industry benchmarks for key performance metrics in your sector.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarks.map((benchmark) => (
                  <div key={benchmark.id} className="grid grid-cols-6 gap-4 p-4 border rounded-lg">
                    <div className="col-span-2">
                      <h4 className="font-medium capitalize">{benchmark.metric_name.replace('_', ' ')}</h4>
                      <p className="text-sm text-muted-foreground">{benchmark.industry_category}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">25th</div>
                      <div className="text-xs text-muted-foreground">
                        {benchmark.percentile_25?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">50th</div>
                      <div className="text-xs text-muted-foreground">
                        {benchmark.percentile_50?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">75th</div>
                      <div className="text-xs text-muted-foreground">
                        {benchmark.percentile_75?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">90th</div>
                      <div className="text-xs text-muted-foreground">
                        {benchmark.percentile_90?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
                {benchmarks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No benchmark data available for the selected region.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitive Positioning</CardTitle>
              <CardDescription>
                See how your business compares to competitors in key areas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {competitiveAnalysis.map((analysis) => {
                  const indicator = getPerformanceIndicator(analysis.percentile_rank);
                  const Icon = indicator.icon;
                  
                  return (
                    <div key={analysis.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium capitalize">
                            {analysis.metric_category.replace('_', ' ')}
                          </h4>
                          <Icon className={`h-4 w-4 ${indicator.color}`} />
                          <Badge variant={analysis.percentile_rank >= 50 ? "default" : "secondary"}>
                            {indicator.label}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {analysis.percentile_rank}th percentile
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Your Value: </span>
                          <span className="font-medium">
                            {analysis.metric_category.includes('revenue') || analysis.metric_category.includes('cost') 
                              ? `$${analysis.business_value.toLocaleString()}` 
                              : analysis.business_value.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Industry Avg: </span>
                          <span className="font-medium">
                            {analysis.metric_category.includes('revenue') || analysis.metric_category.includes('cost') 
                              ? `$${analysis.industry_average.toLocaleString()}` 
                              : analysis.industry_average.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gap: </span>
                          <span className={`font-medium ${analysis.competitive_gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.competitive_gap >= 0 ? '+' : ''}{analysis.competitive_gap.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <Progress value={analysis.percentile_rank} className="h-2" />
                      
                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="bg-muted p-3 rounded-lg">
                          <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {analysis.recommendations.slice(0, 2).map((rec: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <Target className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Market Trends</CardTitle>
                <CardDescription>
                  Key trends affecting your industry segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Digital Payment Adoption</h4>
                      <p className="text-sm text-muted-foreground">
                        87% increase in digital payment usage across your industry
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Customer Experience Focus</h4>
                      <p className="text-sm text-muted-foreground">
                        Top performers invest 23% more in customer experience initiatives
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingDown className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Labor Cost Pressures</h4>
                      <p className="text-sm text-muted-foreground">
                        Average labor costs increased 12% year-over-year
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Intelligence Subscriptions</CardTitle>
                <CardDescription>
                  Access premium market data and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Premium Intelligence</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {sub.subscription_type} subscription
                          </p>
                        </div>
                        <Badge variant="default">{sub.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h4 className="font-medium mb-1">No Active Subscriptions</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Subscribe to premium market intelligence for deeper insights
                    </p>
                    <Button size="sm" onClick={() => toast({ title: "Feature Coming Soon", description: "Premium subscriptions will be available soon!" })}>Browse Plans</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};