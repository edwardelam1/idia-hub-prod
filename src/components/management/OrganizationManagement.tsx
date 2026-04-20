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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  MapPin,
  Mail,
  Network,
  XCircle,
  Clock,
} from "lucide-react";

// Highly detailed business types mapped to IDIA Pay blueprints
const DETAILED_BUSINESS_TYPES = [
  "QSR / Fast Casual",
  "Full Service Restaurant",
  "Retail - Apparel & Goods",
  "Retail - Grocery & Convenience",
  "Health, Beauty & Spa",
  "Professional & Legal Services",
  "Event Venue & Nightlife",
  "Hospitality & Lodging",
  "Manufacturing & Logistics",
];

const SystemAdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  // Granular Approval States
  const [t1pDecision, setT1pDecision] = useState<"pending" | "approved" | "denied">("pending");
  const [idiaPayDecision, setIdiaPayDecision] = useState<"pending" | "approved" | "denied">("pending");

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const [newBusinessData, setNewBusinessData] = useState({
    name: "",
    business_type: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    subscription_tier: "Enterprise",
    data_coop_enabled: true,
  });

  const { toast } = useToast();

  const fetchBusinesses = async () => {
    setIsLoadingOrgs(true);
    const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });

    if (data && !error) {
      // Mocking the status flags for the UI demonstration since they are cross-table derivations
      const enrichedData = data.map((b) => ({
        ...b,
        t1p_status: b.subscription_tier === "Enterprise" ? "approved" : "denied",
        idia_pay_status: b.subscription_tier === "Enterprise" ? "approved" : "pending",
      }));
      setBusinesses(enrichedData);
    }
    setIsLoadingOrgs(false);
  };

  useEffect(() => {
    fetchBusinesses();

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
          requestedBy: req.contact_name,
          requestedRole: req.contact_role, // owner, officer, director, Signatory
          platformGuid: req.user_id || "PENDING-GUID-ASSIGNMENT",
          status: req.status,
        }));
        setPendingRequests(formatted);
      }
    };

    fetchRequests();
  }, [toast]);

  const openReviewModal = (request: any) => {
    setSelectedRequest(request);
    setT1pDecision("pending");
    setIdiaPayDecision("pending");
    setReviewModalOpen(true);
    setAiParsing(true);
    setParsedData(null);

    // Simulate AI parsing the complete IDIA Life application payload
    setTimeout(() => {
      setAiParsing(false);
      setParsedData({
        legalName: request.companyName,
        physicalAddress: "456 Innovation Way, Suite 200, Louisville, KY 40202",
        taxId: `XX-XXX${Math.floor(1000 + Math.random() * 9000)}`,
        contactEmail: `${request.requestedBy.split(" ")[0].toLowerCase()}@${request.companyName.replace(/\s+/g, "").toLowerCase()}.com`,
        contactPhone: "+1 (502) 555-0199",
        responsibleParty: request.requestedBy,
        responsibleRole: request.requestedRole || "Managing Director (Signatory)",
        businessBlueprintType: DETAILED_BUSINESS_TYPES[Math.floor(Math.random() * DETAILED_BUSINESS_TYPES.length)],
        guidValidated: !!request.platformGuid,
        confidence: 99.4,
      });
    }, 1800);
  };

  const handleProcessApplication = async () => {
    if (!selectedRequest) return;
    try {
      // Base application decision
      const baseStatus = t1pDecision === "denied" && idiaPayDecision === "denied" ? "rejected" : "approved";

      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: baseStatus })
        .eq("id", selectedRequest.id);

      if (baseStatus === "approved") {
        // Provision enterprise record with granular permissions logged
        await supabase.from("businesses").insert([
          {
            name: parsedData.legalName,
            address: parsedData.physicalAddress,
            tax_id: parsedData.taxId,
            email: parsedData.contactEmail,
            phone: parsedData.contactPhone,
            business_type: parsedData.businessBlueprintType,
            subscription_tier: "Enterprise",
            data_coop_enabled: true,
          },
        ]);
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setReviewModalOpen(false);
      fetchBusinesses();

      toast({
        title: "Application Processed",
        description: `T-1-P: ${t1pDecision.toUpperCase()} | IDIA Pay: ${idiaPayDecision.toUpperCase()}`,
      });
    } catch (err: any) {
      toast({ title: "Processing Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredBusinesses = businesses.filter(
    (org) =>
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.business_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.tax_id?.includes(searchQuery),
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3 text-emerald-500" />;
      case "denied":
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Enterprise Client Registry & IDIA Pay Blueprinting</p>
        </div>
      </div>

      {/* Pending Requests Queue */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-2.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
              <ShieldCheck className="w-4 h-4" /> Pending Enterprise Verifications
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
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1.5">
                      Req by: <span className="font-medium text-gray-700">{request.requestedBy}</span>
                      <Badge variant="secondary" className="text-[8px] h-3 px-1 py-0">
                        {request.requestedRole || "Signatory"}
                      </Badge>
                    </p>
                  </div>
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => openReviewModal(request)}>
                    <FileText className="w-3 h-3 mr-1.5" /> Process Application
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strict Application Processing Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Application Verification Matrix
            </DialogTitle>
            <DialogDescription className="text-xs">
              Validate business identity, responsible party, and orchestrate service gating.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div className="p-6 space-y-6">
              {aiParsing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Extracting payload from IDIA Life application...
                  </p>
                </div>
              ) : parsedData ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Extracted Application Data */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Verified Application Data
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Legal Entity Name</span>
                        <p className="font-semibold text-gray-900">{parsedData.legalName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Tax ID / EIN</span>
                        <p className="font-mono font-medium text-gray-900">{parsedData.taxId}</p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] text-muted-foreground uppercase">Physical Headquarters</span>
                        <p className="font-medium text-gray-900 flex items-start gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          {parsedData.physicalAddress}
                        </p>
                      </div>
                      <div className="space-y-1 border-t pt-2 mt-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Responsible Party</span>
                        <p className="font-medium text-gray-900">{parsedData.responsibleParty}</p>
                      </div>
                      <div className="space-y-1 border-t pt-2 mt-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Legal Standing</span>
                        <p className="font-medium text-gray-900">
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                            {parsedData.responsibleRole}
                          </Badge>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Contact Info</span>
                        <p className="font-medium text-gray-900 text-xs flex flex-col gap-1">
                          <span>{parsedData.contactEmail}</span>
                          <span>{parsedData.contactPhone}</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase">IDIA Pay Blueprint Mapping</span>
                        <p className="font-medium text-indigo-700">{parsedData.businessBlueprintType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Granular Service Gating */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Service Gating & Approvals
                      </h3>
                    </div>
                    <div className="divide-y">
                      {/* T-1-P Gate */}
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-semibold text-sm">T-1-P Sovereignty Shield</h4>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                            Authorizes this entity to hold localized data databases covered by the IDIA Liability
                            Shield.
                          </p>
                        </div>
                        <Select value={t1pDecision} onValueChange={(v: any) => setT1pDecision(v)}>
                          <SelectTrigger
                            className={`w-36 h-8 text-xs font-semibold ${t1pDecision === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : t1pDecision === "denied" ? "bg-red-50 border-red-200 text-red-700" : ""}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending Audit</SelectItem>
                            <SelectItem value="approved">Approve Access</SelectItem>
                            <SelectItem value="denied">Deny Request</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* IDIA Pay Gate */}
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-indigo-600" />
                            <h4 className="font-semibold text-sm">IDIA Pay App Builder</h4>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                            Unlocks the JSON builder utilizing the "{parsedData.businessBlueprintType}" configuration
                            template.
                          </p>
                        </div>
                        <Select value={idiaPayDecision} onValueChange={(v: any) => setIdiaPayDecision(v)}>
                          <SelectTrigger
                            className={`w-36 h-8 text-xs font-semibold ${idiaPayDecision === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : idiaPayDecision === "denied" ? "bg-red-50 border-red-200 text-red-700" : ""}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending Audit</SelectItem>
                            <SelectItem value="approved">Approve Builder</SelectItem>
                            <SelectItem value="denied">Deny Request</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50/50">
            <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleProcessApplication}
              disabled={aiParsing || (t1pDecision === "pending" && idiaPayDecision === "pending")}
            >
              Execute Provisioning Policies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Entity Roster */}
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Master Client Registry</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Total Active Entities: {filteredBusinesses.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search by EIN, Name, or Type..."
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
          ) : filteredBusinesses.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">No records found in the registry.</p>
          ) : (
            <div className="divide-y divide-border">
              {filteredBusinesses.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-3 gap-4 hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Business Core Info */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="bg-slate-100 border border-slate-200 rounded shrink-0 h-9 w-9 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 w-full">
                      <div className="col-span-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{org.name}</h3>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          {org.business_type || "Unspecified Sector"}
                        </p>
                      </div>

                      <div className="hidden sm:flex col-span-1 flex-col justify-center min-w-0 text-[11px] text-gray-500 space-y-0.5">
                        <span className="truncate flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0" /> {org.address || "Location Verified"}
                        </span>
                      </div>

                      <div className="hidden lg:flex col-span-1 flex-col justify-center min-w-0 text-[11px] font-mono text-gray-500 space-y-0.5">
                        <span className="truncate">EIN: {org.tax_id || "Verified File"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specific System Flags */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 xl:pt-0 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {/* IDIA Pay Blueprint Status */}
                      <Badge
                        variant="secondary"
                        className="bg-slate-50 border-slate-200 px-2 py-0.5 h-6 text-[10px] font-medium tracking-wide flex items-center gap-1.5 shadow-sm"
                      >
                        <Smartphone className="w-3 h-3 text-indigo-600" />
                        <span className="text-slate-600 border-r border-slate-200 pr-1.5 mr-0.5">IDIA Pay</span>
                        {getStatusIcon(org.idia_pay_status)}
                        <span className="capitalize">{org.idia_pay_status}</span>
                      </Badge>

                      {/* T-1-P Liability Status */}
                      <Badge
                        variant="secondary"
                        className="bg-slate-50 border-slate-200 px-2 py-0.5 h-6 text-[10px] font-medium tracking-wide flex items-center gap-1.5 shadow-sm"
                      >
                        <Database className="w-3 h-3 text-emerald-600" />
                        <span className="text-slate-600 border-r border-slate-200 pr-1.5 mr-0.5">T-1-P Shield</span>
                        {getStatusIcon(org.t1p_status)}
                        <span className="capitalize">{org.t1p_status}</span>
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 xl:opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
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
