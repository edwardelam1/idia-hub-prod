import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Bot,
  Loader2,
  ShieldCheck,
  Smartphone,
  Database,
  Plus,
} from "lucide-react";

const SystemAdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [enterprises, setEnterprises] = useState<any[]>([]);

  const [newOrgData, setNewOrgData] = useState({
    name: "",
    industry: "",
    tier: "Enterprise", // Defaulting to Enterprise for this view
  });

  const { toast } = useToast();

  const fetchEnterprises = async () => {
    setIsLoadingOrgs(true);
    const { data, error } = await supabase.from("enterprises").select("*").order("created_at", { ascending: false });

    if (data && !error) {
      setEnterprises(data);
    }
    setIsLoadingOrgs(false);
  };

  useEffect(() => {
    fetchEnterprises();

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("account_conversion_requests" as any)
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
          platformGuid: req.user_id || "PENDING-GUID-ASSIGNMENT",
          status: req.status,
        }));
        setPendingRequests(formatted);
      }
    };

    fetchRequests();

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
            platformGuid: req.user_id || "PENDING-GUID-ASSIGNMENT",
            status: req.status,
          };

          setPendingRequests((prev) => [formatted, ...prev]);

          toast({
            title: "New IDIA Life Business Request",
            description: `${req.company_name} requires System Administrator verification.`,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleCreateOrganization = async () => {
    if (!newOrgData.name) {
      toast({ title: "Validation Error", description: "Organization name is required.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("enterprises").insert([
        {
          name: newOrgData.name,
          industry: newOrgData.industry,
          tier: newOrgData.tier,
          kyb_status: "active",
          available_credits: 0,
        },
      ]);

      if (error) throw error;

      toast({ title: "Enterprise Created", description: `${newOrgData.name} has been provisioned manually.` });
      setShowNewOrgModal(false);
      setNewOrgData({ name: "", industry: "", tier: "Enterprise" });
      fetchEnterprises();
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    }
  };

  const openReviewModal = (request: any) => {
    setSelectedRequest(request);
    setReviewModalOpen(true);
    setAiParsing(true);
    setParsedData(null);

    // Simulate AI parsing the uploaded document from IDIA Life
    setTimeout(() => {
      setAiParsing(false);
      setParsedData({
        legalName: request.companyName,
        taxId: `XX-XXX${Math.floor(1000 + Math.random() * 9000)}`,
        address: "Extracted from Legal Documentation",
        signatoryMatch: true,
        guidValidated: !!request.platformGuid,
        confidence: 99.1,
      });
    }, 2500);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    try {
      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: "approved" })
        .eq("id", selectedRequest.id);

      // Auto-provision enterprise record upon approval, unlocking IDIA Pay Builder & T-1-P eligibility
      await supabase.from("enterprises").insert([
        {
          name: selectedRequest.companyName,
          kyb_status: "active",
          tier: "Enterprise",
          available_credits: 0,
        },
      ]);

      setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setReviewModalOpen(false);
      fetchEnterprises();
      toast({
        title: "Enterprise Provisioned",
        description: `${selectedRequest.companyName} now has access to the App Builder.`,
      });
    } catch (err: any) {
      toast({ title: "Provisioning Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: "rejected" })
        .eq("id", requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({ title: "Verification Rejected", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error Rejecting Request", description: err.message, variant: "destructive" });
    }
  };

  const filteredEnterprises = enterprises.filter(
    (org) =>
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.industry?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Administrator</h1>
          <p className="text-gray-600 mt-2">Enterprise Client & App Builder Management</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              Add Enterprise Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle>Manually Provision Enterprise</DialogTitle>
              <DialogDescription>
                Create a new enterprise account. Gating rules are currently disabled for testing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="orgName">Enterprise Name</Label>
                <Input
                  id="orgName"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  placeholder="Enter organization name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={newOrgData.industry}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, industry: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Financial Services">Financial Services</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Hospitality">Hospitality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tier">Account Tier</Label>
                <Select
                  value={newOrgData.tier}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, tier: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enterprise">Enterprise (App Builder Access)</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewOrgModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrganization}>Provision Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Account Conversion Requests (IDIA Life Signal) */}
      <Card className="border-blue-100">
        <CardHeader className="bg-blue-50/30 border-b border-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            Pending IDIA Life Business Requests
            <Badge className="bg-blue-600">{pendingRequests.length}</Badge>
          </CardTitle>
          <CardDescription>
            Review and process business conversions initiated from biological identities
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-2">
              <ShieldCheck className="w-8 h-8 opacity-50" />
              <p>No pending enterprise requests from IDIA Life</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-blue-100 bg-white rounded-lg shadow-sm gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{request.companyName}</h4>
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        GUID: {request.platformGuid.substring(0, 8)}...
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{request.requestType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by: <span className="font-semibold">{request.requestedBy}</span> on{" "}
                      {request.requestDate}
                    </p>
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <Button className="flex-1 sm:flex-none" size="sm" onClick={() => openReviewModal(request)}>
                      <FileText className="w-4 h-4 mr-2" /> Verify Documents
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Parsing & Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              T-1-P Document Verification
            </DialogTitle>
            <DialogDescription>{selectedRequest?.companyName}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {aiParsing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">AI Parsing Biological & Legal Binding</p>
                  <p className="text-xs text-muted-foreground">Validating IDIA Life origin request...</p>
                </div>
              </div>
            ) : parsedData ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700">Verification Score</span>
                  </div>
                  <Badge className="bg-green-600">{parsedData.confidence}% Validated</Badge>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-1 sm:gap-4">
                    <Label className="text-left sm:text-right text-muted-foreground">Legal Name</Label>
                    <span className="col-span-1 sm:col-span-2 font-medium">{parsedData.legalName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-1 sm:gap-4">
                    <Label className="text-left sm:text-right text-muted-foreground">IDIA Life GUID</Label>
                    <span className="col-span-1 sm:col-span-2 font-medium font-mono text-xs flex items-center gap-2">
                      {parsedData.guidValidated ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                      {selectedRequest?.platformGuid}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start sm:items-center gap-1 sm:gap-4">
                    <Label className="text-left sm:text-right text-muted-foreground">T-1-P Clearance</Label>
                    <span className="col-span-1 sm:col-span-2 font-medium flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" /> Eligible for Local Storage
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setReviewModalOpen(false);
                handleRejectRequest(selectedRequest.id);
              }}
            >
              Reject Application
            </Button>
            <Button onClick={handleApproveRequest} className="w-full sm:w-auto" disabled={aiParsing}>
              Approve Enterprise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enterprise Roster */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Active Enterprise Clients</CardTitle>
              <CardDescription>Accounts eligible for IDIA Pay App Builder & IDIA Liability Shield</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search enterprises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-6 sm:pt-0">
          {isLoadingOrgs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredEnterprises.length === 0 ? (
            <p className="text-gray-500 text-center p-8">No active enterprise organizations found.</p>
          ) : (
            filteredEnterprises.map((org) => (
              <div
                key={org.id}
                className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 sm:p-6 border-b sm:border border-border sm:rounded-xl gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-4 w-full lg:w-auto">
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg flex-shrink-0 h-12 w-12 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate">{org.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {org.tier === "Enterprise" && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                      {org.industry || "Unspecified Industry"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
                  {/* IDIA Pay Builder Eligibility Flag */}
                  {org.tier === "Enterprise" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border-indigo-100 px-2.5 py-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      IDIA Pay App Builder
                    </Badge>
                  )}

                  {/* IDIA Liability Shield (T-1-P) Flag */}
                  {org.tier === "Enterprise" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-100 px-2.5 py-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      T-1-P Verification Active
                    </Badge>
                  )}

                  <Button variant="outline" size="sm" className="ml-auto lg:ml-0 mt-2 sm:mt-0 w-full sm:w-auto">
                    Manage Access
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdminManagement;
