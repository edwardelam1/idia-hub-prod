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
import { Box, Eye, TrendingUp, Users, Upload, MapPin, Target } from "lucide-react";

interface ARExperience {
  id: string;
  title: string;
  description: string;
  experience_type: string;
  is_active: boolean;
  conversion_rate: number;
  revenue_attributed: number;
  created_at: string;
}

interface ARCampaignPerformance {
  total_interactions: number;
  unique_users: number;
  conversion_count: number;
  revenue_generated: number;
  engagement_duration_avg: number;
}

export const XRManagement = () => {
  const [arExperiences, setArExperiences] = useState<ARExperience[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<ARCampaignPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeBusinessAccess();
  }, []);

  const initializeBusinessAccess = async () => {
    try {
      const { data: businessAccess, error } = await supabase
        .rpc('get_user_business_access');

      if (error || !businessAccess || businessAccess.length === 0) {
        // Gracefully handle missing business access without showing error
        setLoading(false);
        return;
      }

      const businessId = businessAccess[0].business_id;
      setSelectedBusinessId(businessId);
      
      // Now fetch data with proper business ID
      await Promise.all([
        fetchARExperiences(businessId),
        fetchCampaignPerformance(businessId)
      ]);
    } catch (error) {
      console.error('Error initializing business access:', error);
      setLoading(false);
    }
  };

  const fetchARExperiences = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('ar_experiences')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArExperiences(data || []);
    } catch (error) {
      console.error('Error fetching AR experiences:', error);
      toast({
        title: "Error",
        description: "Failed to load AR experiences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignPerformance = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('ar_campaign_performance')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const aggregated = data.reduce((acc, curr) => ({
          total_interactions: acc.total_interactions + curr.total_interactions,
          unique_users: acc.unique_users + curr.unique_users,
          conversion_count: acc.conversion_count + curr.conversion_count,
          revenue_generated: acc.revenue_generated + curr.revenue_generated,
          engagement_duration_avg: (acc.engagement_duration_avg + curr.engagement_duration_avg) / 2,
        }), {
          total_interactions: 0,
          unique_users: 0,
          conversion_count: 0,
          revenue_generated: 0,
          engagement_duration_avg: 0,
        });
        setCampaignPerformance(aggregated);
      }
    } catch (error) {
      console.error('Error fetching campaign performance:', error);
    }
  };

  const CreateARExperienceModal = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [experienceType, setExperienceType] = useState("menu_visualization");

    const handleCreate = async () => {
      try {
        const { error } = await supabase
          .from('ar_experiences')
          .insert({
            title,
            description,
            experience_type: experienceType,
            business_id: selectedBusinessId,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "AR experience created successfully",
        });
        
        if (selectedBusinessId) {
          fetchARExperiences(selectedBusinessId);
        }
        setTitle("");
        setDescription("");
      } catch (error) {
        console.error('Error creating AR experience:', error);
        toast({
          title: "Error",
          description: "Failed to create AR experience",
          variant: "destructive",
        });
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <Box className="mr-2 h-4 w-4" />
            Create AR Experience
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New AR Experience</DialogTitle>
            <DialogDescription>
              Set up a new augmented reality experience for your menu items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Experience Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 3D Pizza Visualization"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the AR experience"
              />
            </div>
            <div>
              <Label htmlFor="type">Experience Type</Label>
              <Select value={experienceType} onValueChange={setExperienceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="menu_visualization">Menu Visualization</SelectItem>
                  <SelectItem value="3d_model">3D Product Model</SelectItem>
                  <SelectItem value="interactive_demo">Interactive Demo</SelectItem>
                  <SelectItem value="promotional_overlay">Promotional Overlay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full">
              Create Experience
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return <div>Loading XR Management...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">XR Management</h2>
          <p className="text-muted-foreground">
            Manage your Augmented Reality experiences and campaigns
          </p>
        </div>
        <CreateARExperienceModal />
      </div>

      {/* Performance Overview Cards */}
      {campaignPerformance && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignPerformance.total_interactions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignPerformance.unique_users.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignPerformance.conversion_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${campaignPerformance.revenue_generated.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(campaignPerformance.engagement_duration_avg)}s</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="experiences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experiences">AR Experiences</TabsTrigger>
          <TabsTrigger value="content">Content Assets</TabsTrigger>
          <TabsTrigger value="placement">Placement Zones</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="experiences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AR Experiences</CardTitle>
              <CardDescription>
                Manage your augmented reality experiences for menu items and promotional content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arExperiences.map((experience) => (
                  <div key={experience.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{experience.title}</h4>
                      <p className="text-sm text-muted-foreground">{experience.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={experience.is_active ? "default" : "secondary"}>
                          {experience.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{experience.experience_type}</Badge>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{(experience.conversion_rate * 100).toFixed(1)}%</span>
                        <span className="text-muted-foreground"> conversion</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${experience.revenue_attributed.toFixed(2)} revenue
                      </div>
                    </div>
                  </div>
                ))}
                {arExperiences.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No AR experiences created yet. Create your first experience to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Assets</CardTitle>
              <CardDescription>
                Upload and manage 3D models, textures, and other AR content assets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload AR Content</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your 3D models, textures, or animations here
                </p>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="placement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AR Placement Zones</CardTitle>
              <CardDescription>
                Define where AR experiences can be activated within your locations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Placement Zones Configured</h3>
                <p className="text-muted-foreground mb-4">
                  Set up AR placement zones to define where customers can access AR experiences
                </p>
                <Button>
                  <MapPin className="mr-2 h-4 w-4" />
                  Configure Zones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AR Analytics</CardTitle>
              <CardDescription>
                Detailed analytics for your AR experiences and customer interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Advanced AR analytics dashboard coming soon. Monitor conversion rates, 
                  engagement patterns, and revenue attribution from AR experiences.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};