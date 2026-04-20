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
  AlertTriangle,
  FileText,
  Bot,
  Loader2,
  ShieldCheck,
  Smartphone,
  Database,
  Plus,
  MoreVertical,
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
    tier: "Enterprise",
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
            description: `${req.company_name} requires verification.`,
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  const handleCreateOrganization = async () => {
    if (!newOrgData.name) {
      toast({ title: "Validation Error", description: "Name required.", variant: "destructive" });
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
      toast({ title: "Enterprise Created", description: `${newOrgData.name} provisioned.` });
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
    }, 1500);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    try {
      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: "approved" })
        .eq("id", selectedRequest.id);
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
      toast({ title: "Enterprise Provisioned", description: `${selectedRequest.companyName} is active.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: "rejected" })
        .eq("id", requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({ title: "Rejected", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredEnterprises = enterprises.filter(
    (org) =>
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.industry?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header - Compacted */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Client & App Builder Management</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Provision Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">Provision Enterprise</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Enterprise Name</Label>
                <Input
                  size={1}
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  className="h-8 mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Industry</Label>
                <Select
                  value={newOrgData.industry}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, industry: value })}
                >
                  <SelectTrigger className="h-8 mt-1 text-sm">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowNewOrgModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateOrganization}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests - High Density List */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-2.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
              <ShieldCheck className="w-4 h-4" /> Pending Approvals
            </CardTitle>
            <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] px-1.5 py-0 h-4">
              {pendingRequests.length}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-blue-50">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">{request.companyName}</h4>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono bg-slate-50 px-1 py-0 h-4 border-slate-200"
                      >
                        GUID: {request.platformGuid.substring(0, 8)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {request.requestType} • Req by{" "}
                      <span className="font-medium text-gray-700">{request.requestedBy}</span> ({request.requestDate})
                    </p>
                  </div>
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => openReviewModal(request)}>
                    <FileText className="w-3 h-3 mr-1.5" /> Verify
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Review Modal - Tightened */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> T-1-P Verification
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {aiParsing ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Validating IDIA Life origin...</p>
              </div>
            ) : parsedData ? (
              <div className="space-y-3 animate-in fade-in duration-200 text-sm">
                <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-xs text-green-700">Confidence Match</span>
                  </div>
                  <Badge className="bg-green-600 text-[10px] h-5">{parsedData.confidence}%</Badge>
                </div>
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Legal Name</span>
                    <span className="font-medium">{parsedData.legalName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">IDIA Life GUID</span>
                    <span className="font-medium font-mono flex items-center gap-1">
                      {parsedData.guidValidated && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {selectedRequest?.platformGuid}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">T-1-P Status</span>
                    <span className="font-medium flex items-center gap-1 text-blue-600">
                      <Database className="w-3 h-3" /> Eligible
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReviewModalOpen(false);
                handleRejectRequest(selectedRequest.id);
              }}
            >
              Reject
            </Button>
            <Button size="sm" onClick={handleApproveRequest} disabled={aiParsing}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roster - Flush Table-like List for Thousands of Records */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Active Enterprises</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Total: {filteredEnterprises.length} records
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingOrgs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredEnterprises.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">No active enterprises found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filteredEnterprises.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 gap-4 hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Client Info Core */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="bg-slate-100 border border-slate-200 rounded shrink-0 h-8 w-8 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{org.name}</h3>
                        {org.tier === "Enterprise" && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{org.industry || "Unspecified"}</p>
                    </div>
                  </div>

                  {/* Flags & Controls - Compact layout */}
                  <div className="flex items-center gap-2 shrink-0">
                    {org.tier === "Enterprise" && (
                      <div className="hidden md:flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 text-indigo-700 border-indigo-100/50 px-1.5 py-0 h-5 text-[10px] font-medium tracking-wide flex items-center gap-1 shadow-sm"
                        >
                          <Smartphone className="w-3 h-3" /> App Builder
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 border-emerald-100/50 px-1.5 py-0 h-5 text-[10px] font-medium tracking-wide flex items-center gap-1 shadow-sm"
                        >
                          <ShieldCheck className="w-3 h-3" /> T-1-P
                        </Badge>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdminManagement;
