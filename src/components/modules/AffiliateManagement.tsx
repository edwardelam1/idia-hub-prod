import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Users, DollarSign, TrendingUp, Eye, Star, CheckCircle, XCircle, Clock } from "lucide-react";

interface AffiliateCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  status: string;
  commission_rate: number;
  budget_allocation: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface AffiliateTransaction {
  id: string;
  transaction_type: string;
  transaction_value: number;
  commission_amount: number;
  creator_id: string;
  campaign_id: string;
  created_at: string;
}

interface CreatorProfile {
  id: string;
  creator_handle: string;
  follower_count: number;
  engagement_rate: number;
  performance_rating: number;
  total_earnings: number;
  verification_status: string;
  specialty_categories: string[];
}

export const AffiliateManagement = () => {
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [transactions, setTransactions] = useState<AffiliateTransaction[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);

      // First get user's business access
      const { data: businessAccess, error: businessError } = await supabase
        .rpc('get_user_business_access');

      if (businessError) {
        console.error('Error getting business access:', businessError);
        // Gracefully handle business access error without showing toast
        return;
      }

      if (!businessAccess || businessAccess.length === 0) {
        console.error('No business access found');
        // Gracefully handle missing business access without showing toast
        return;
      }

      const businessId = businessAccess[0].business_id;

      // Fetch affiliate campaigns for the user's business
      const { data: campaignData, error: campaignError } = await supabase
        .from('affiliate_campaigns')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;
      setCampaigns(campaignData || []);

      // Fetch affiliate transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('affiliate_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Fetch creator profiles
      const { data: creatorData, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('verification_status', 'verified')
        .order('performance_rating', { ascending: false });

      if (creatorError) throw creatorError;
      setCreators(creatorData || []);

    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliate management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign approved and activated",
      });
      
      fetchAffiliateData();
    } catch (error) {
      console.error('Error approving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to approve campaign",
        variant: "destructive",
      });
    }
  };

  const rejectCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_campaigns')
        .update({ status: 'rejected' })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign Rejected",
        description: "Campaign has been rejected",
      });
      
      fetchAffiliateData();
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to reject campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div>Loading Affiliate Management...</div>;
  }

  // Calculate summary metrics
  const totalCommissionsPaid = transactions.reduce((sum, t) => sum + t.commission_amount, 0);
  const totalTransactionValue = transactions.reduce((sum, t) => sum + t.transaction_value, 0);
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;
  const pendingCampaignsCount = campaigns.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Affiliate Management</h2>
          <p className="text-muted-foreground">
            Manage influencer partnerships and AR-based marketing campaigns
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaignsCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingCampaignsCount} pending approval
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommissionsPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              IDIA-USD paid to creators
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalTransactionValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Generated through affiliates
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Creators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creators.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Campaigns</CardTitle>
              <CardDescription>
                Manage and approve marketing campaigns created by influencers and creators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(campaign.status)}
                        <h4 className="font-medium">{campaign.campaign_name}</h4>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Type: {campaign.campaign_type}</span>
                        <span>Commission: {(campaign.commission_rate * 100).toFixed(1)}%</span>
                        <span>Budget: ${campaign.budget_allocation?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <Badge variant="outline">{campaign.campaign_type}</Badge>
                      </div>
                    </div>
                    
                    {campaign.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => rejectCampaign(campaign.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => approveCampaign(campaign.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No affiliate campaigns yet. Campaigns will appear here when creators submit them.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verified Creators</CardTitle>
              <CardDescription>
                Browse and connect with verified influencers and content creators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {creators.map((creator) => (
                  <Card key={creator.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">@{creator.creator_handle}</CardTitle>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{creator.performance_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Followers</span>
                          <div className="font-medium">{creator.follower_count.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Engagement</span>
                          <div className="font-medium">{(creator.engagement_rate * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground">Specialties</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {creator.specialty_categories.slice(0, 3).map((category, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-muted-foreground">Total Earnings: </span>
                        <span className="font-medium">${creator.total_earnings.toFixed(2)}</span>
                      </div>
                      
                      <Button size="sm" className="w-full">
                        <Users className="mr-2 h-4 w-4" />
                        Invite to Campaign
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {creators.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No verified creators available at the moment.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Commission payments and affiliate-generated transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium capitalize">{transaction.transaction_type.replace('_', ' ')}</h4>
                        <Badge variant="outline">{transaction.transaction_type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${transaction.transaction_value.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        Commission: ${transaction.commission_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions yet. Affiliate transactions will appear here.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Analytics and insights for your affiliate marketing campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                <p className="mb-4">
                  Detailed campaign analytics, ROI tracking, and performance insights coming soon.
                </p>
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Performance Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};