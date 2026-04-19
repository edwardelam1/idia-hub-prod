import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Building2, 
  Users, 
  Plus, 
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Settings,
  FileText,
  Bot,
  Loader2,
  ShieldCheck
} from 'lucide-react';

const OrganizationManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  
  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const [pendingRequests, setPendingRequests] = useState<any[]>([
    {
      id: 998,
      companyName: 'Future Finance Corp',
      requestType: 'Personal to Business',
      requestDate: '2024-01-15',
      requestedBy: 'Sarah Wilson (Controlling Partner)',
      status: 'pending'
    }
  ]);
  
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    industry: '',
    tier: '',
    adminEmail: ''
  });

  const { toast } = useToast();

  const organizations = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      industry: 'Technology',
      tier: 'Enterprise',
      users: 45,
      status: 'active',
      credits: 12500,
      monthlySpend: 4250,
      admin: 'john.doe@techcorp.com'
    },
    {
      id: 2,
      name: 'HealthFirst Medical',
      industry: 'Healthcare',
      tier: 'Professional',
      users: 23,
      status: 'active',
      credits: 8200,
      monthlySpend: 1890,
      admin: 'admin@healthfirst.com'
    }
  ];

  useEffect(() => {
    const fetchRequests = async () => {
      // Cast table name as any to bypass strict type checking until types are regenerated
      const { data, error } = await supabase
        .from('account_conversion_requests' as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        const formatted = data.map((req: any) => ({
          id: req.id,
          companyName: req.company_name,
          requestType: req.request_type,
          requestDate: new Date(req.created_at).toLocaleDateString(),
          requestedBy: `${req.contact_name} (${req.contact_role})`,
          status: req.status
        }));
        setPendingRequests(prev => [...formatted, ...prev.filter(p => p.id === 998)]);
      }
    };

    fetchRequests();

    const channel = supabase.channel('conversion_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'account_conversion_requests' }, payload => {
        const req = payload.new;
        const formatted = {
          id: req.id,
          companyName: req.company_name,
          requestType: req.request_type,
          requestDate: new Date(req.created_at).toLocaleDateString(),
          requestedBy: `${req.contact_name} (${req.contact_role})`,
          status: req.status
        };
        
        setPendingRequests(prev => [formatted, ...prev]);
        
        toast({
          title: "New Business Onboarding",
          description: `${req.company_name} has submitted an account upgrade request.`,
        });
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'bg-purple-100 text-purple-800';
      case 'Professional': return 'bg-blue-100 text-blue-800';
      case 'Starter': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'trial': return <Clock className="h-4 w-4" />;
      case 'suspended': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleCreateOrganization = () => {
    toast({ title: "Organization Created", description: `${newOrgData.name} has been added.`});
    setShowNewOrgModal(false);
    setNewOrgData({ name: '', industry: '', tier: '', adminEmail: '' });
  };

  const openReviewModal = (request: any) => {
    setSelectedRequest(request);
    setReviewModalOpen(true);
    setAiParsing(true);
    setParsedData(null);

    // Simulate AI parsing the uploaded document
    setTimeout(() => {
      setAiParsing(false);
      setParsedData({
        legalName: request.companyName,
        taxId: `XX-XXX${Math.floor(1000 + Math.random() * 9000)}`,
        address: '123 Primary Business Blvd, Louisville KY',
        signatoryMatch: true,
        confidence: 98.4
      });
    }, 2500);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    try {
      if (selectedRequest.id !== 998) {
        await supabase.from('account_conversion_requests' as any).update({ status: 'approved' }).eq('id', selectedRequest.id);
      }
      setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setReviewModalOpen(false);
      toast({ title: "Business Approved", description: `${selectedRequest.companyName} is now available in the App Builder.` });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      if (requestId !== 998) {
        await supabase.from('account_conversion_requests' as any).update({ status: 'rejected' }).eq('id', requestId);
      }
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      toast({ title: "Request Rejected", variant: "destructive" });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600 mt-2">Manage client organizations and account requests</p>
        </div>
        
        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({...newOrgData, name: e.target.value})}
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={newOrgData.industry} onValueChange={(value) => setNewOrgData({...newOrgData, industry: value})}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Financial Services</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select value={newOrgData.tier} onValueChange={(value) => setNewOrgData({...newOrgData, tier: value})}>
                  <SelectTrigger><SelectValue placeholder="Select subscription tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={newOrgData.adminEmail}
                  onChange={(e) => setNewOrgData({...newOrgData, adminEmail: e.target.value})}
                  placeholder="admin@company.com"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewOrgModal(false)}>Cancel</Button>
                <Button onClick={handleCreateOrganization}>Create Organization</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Account Conversion Requests (Live Signal) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Business Verifications
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </CardTitle>
          <CardDescription>Review and parse uploaded legal documents for business upgrades originating from IDIA Life</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending requests from IDIA Life</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/20 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{request.companyName}</h4>
                    <p className="text-sm font-medium text-gray-700">{request.requestType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by: <span className="font-semibold">{request.requestedBy}</span> on {request.requestDate}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => openReviewModal(request)}>
                      <FileText className="w-4 h-4 mr-2" /> Review Docs
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Parsing & Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Business Verification Review
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {aiParsing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">AI Document Parsing Active</p>
                  <p className="text-xs text-muted-foreground">Extracting entities from legal documentation...</p>
                </div>
              </div>
            ) : parsedData ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700">AI Confidence Score</span>
                  </div>
                  <Badge className="bg-green-600">{parsedData.confidence}% Match</Badge>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right text-muted-foreground">Legal Name</Label>
                    <span className="col-span-2 font-medium">{parsedData.legalName}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right text-muted-foreground">Tax ID</Label>
                    <span className="col-span-2 font-medium">{parsedData.taxId}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right text-muted-foreground">Address</Label>
                    <span className="col-span-2 font-medium">{parsedData.address}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right text-muted-foreground">Signatory Auth</Label>
                    <span className="col-span-2 font-medium flex items-center gap-2">
                      {parsedData.signatoryMatch ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-orange-500" />}
                      {selectedRequest?.requestedBy}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApproveRequest} disabled={aiParsing}>
              Approve Business Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search active organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div className="space-y-4">
        {filteredOrgs.map((org) => (
          <Card key={org.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{org.name}</h3>
                    <p className="text-gray-600">{org.industry}</p>
                    <p className="text-sm text-gray-500">{org.admin}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    {getStatusIcon(org.status)}
                    <Badge className={getStatusColor(org.status)} variant="outline">{org.status}</Badge>
                  </div>
                  <Badge className={getTierColor(org.tier)} variant="outline">{org.tier}</Badge>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="mr-1 h-4 w-4" />{org.users} users
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="mr-1 h-4 w-4" />{org.credits} credits
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrganizationManagement;      const { data, error } = await supabase
        .from("account_conversion_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (data && !error) {
        const formatted = data.map((req: any) => ({
          id: req.id,
          companyName: req.company_name,
          requestType: req.request_type,
          requestDate: new Date(req.created_at).toLocaleDateString(),
          requestedBy: `${req.contact_name} (${req.contact_role})`,
          status: req.status,
        }));
        setPendingRequests((prev) => [...formatted, ...prev]);
      }
    };

    fetchRequests();

    // Real-Time Listener for Business Account Onboarding from IDIA Life
    const channel = supabase
      .channel("conversion_requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "account_conversion_requests" },
        (payload) => {
          const req = payload.new;
          const formatted = {
            id: req.id,
            companyName: req.company_name,
            requestType: req.request_type,
            requestDate: new Date(req.created_at).toLocaleDateString(),
            requestedBy: `${req.contact_name} (${req.contact_role})`,
            status: req.status,
          };

          setPendingRequests((prev) => [formatted, ...prev]);

          // Notify the Corporate User
          toast({
            title: "New Business Onboarding",
            description: `${req.company_name} has submitted an account upgrade request.`,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Enterprise":
        return "bg-purple-100 text-purple-800";
      case "Professional":
        return "bg-blue-100 text-blue-800";
      case "Starter":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trial":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "trial":
        return <Clock className="h-4 w-4" />;
      case "suspended":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleCreateOrganization = () => {
    toast({ title: "Organization Created", description: `${newOrgData.name} has been added.` });
    setShowNewOrgModal(false);
    setNewOrgData({ name: "", industry: "", tier: "", adminEmail: "" });
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await supabase.from("account_conversion_requests").update({ status: "approved" }).eq("id", requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({ title: "Request Approved", description: "Account is being converted to business status." });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await supabase.from("account_conversion_requests").update({ status: "rejected" }).eq("id", requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({ title: "Request Rejected", variant: "destructive" });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.industry.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600 mt-2">Manage client organizations and account requests</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={newOrgData.industry}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Financial Services</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select
                  value={newOrgData.tier}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={newOrgData.adminEmail}
                  onChange={(e) => setNewOrgData({ ...newOrgData, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewOrgModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrganization}>Create Organization</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Account Conversion Requests (Live Signal) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Account Conversion Requests
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </CardTitle>
          <CardDescription>Review and approve account upgrade requests originating from IDIA Life</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending requests from IDIA Life</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/20 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{request.companyName}</h4>
                    <p className="text-sm font-medium text-gray-700">{request.requestType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by: <span className="font-semibold">{request.requestedBy}</span> on{" "}
                      {request.requestDate}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleApproveRequest(request.id)}>
                      Approve Docs
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search active organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div className="space-y-4">
        {filteredOrgs.map((org) => (
          <Card key={org.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{org.name}</h3>
                    <p className="text-gray-600">{org.industry}</p>
                    <p className="text-sm text-gray-500">{org.admin}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    {getStatusIcon(org.status)}
                    <Badge className={getStatusColor(org.status)} variant="outline">
                      {org.status}
                    </Badge>
                  </div>
                  <Badge className={getTierColor(org.tier)} variant="outline">
                    {org.tier}
                  </Badge>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="mr-1 h-4 w-4" />
                    {org.users} users
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="mr-1 h-4 w-4" />
                    {org.credits} credits
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrganizationManagement;
