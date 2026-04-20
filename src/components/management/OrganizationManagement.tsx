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
  FileText,
  Bot,
  Loader2,
  ShieldCheck,
  Smartphone,
  Database,
  Plus,
  MoreVertical,
  MapPin,
  XCircle,
  Clock,
  Network,
} from "lucide-react";

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
  "Data Infrastructure Utility",
];

const ClientOrganizations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [formData, setFormData] = useState({
    legalName: "",
    taxId: "",
    businessType: "",
    hqAddress: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionTier: "Enterprise",
    t1pShieldEnabled: true,
    idiaPayEnabled: true,
    dataCoopEnabled: true,
  });

  const { toast } = useToast();

  const fetchBusinesses = async () => {
    setIsLoadingOrgs(true);
    const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });

    if (data && !error) {
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
          requestedRole: req.contact_role,
          platformGuid: req.user_id || "PENDING-GUID-ASSIGNMENT",
          status: req.status,
        }));
        setPendingRequests(formatted);
      }
    };

    fetchRequests();
  }, [toast]);

  const handleCreateBusiness = async () => {
    if (!formData.legalName || !formData.businessType || !formData.hqAddress) {
      toast({
        title: "Validation Error",
        description: "Name, Blueprint, and Address are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Create Core Registry Record
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert([
          {
            name: formData.legalName,
            tax_id: formData.taxId,
            business_type: formData.businessType,
            email: formData.contactEmail,
            phone: formData.contactPhone,
            address: formData.hqAddress,
            subscription_tier: formData.subscriptionTier,
            data_coop_enabled: formData.dataCoopEnabled,
            business_health_score: 100,
          },
        ])
        .select()
        .single();

      if (businessError) throw businessError;

      // Provision Primary Facility
      const { error: locationError } = await supabase.from("business_locations").insert([
        {
          business_id: businessData.id,
          name: "Primary Headquarters",
          address: formData.hqAddress,
          contact_email: formData.contactEmail,
          phone: formData.contactPhone,
          is_active: true,
        },
      ]);

      if (locationError) throw locationError;

      toast({ title: "Client Provisioned", description: `${formData.legalName} has been fully registered.` });
      setShowNewOrgModal(false);
      setFormData({
        legalName: "",
        taxId: "",
        businessType: "",
        hqAddress: "",
        contactEmail: "",
        contactPhone: "",
        subscriptionTier: "Enterprise",
        t1pShieldEnabled: true,
        idiaPayEnabled: true,
        dataCoopEnabled: true,
      });
      fetchBusinesses();
    } catch (error: any) {
      toast({ title: "Provisioning Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (request: any) => {
    setSelectedRequest(request);
    setT1pDecision("pending");
    setIdiaPayDecision("pending");
    setReviewModalOpen(true);
    setAiParsing(true);
    setParsedData(null);

    setTimeout(() => {
      setAiParsing(false);
      setParsedData({
        legalName: request.companyName,
        physicalAddress: "Extracted from Legal Documentation",
        taxId: `XX-XXX${Math.floor(1000 + Math.random() * 9000)}`,
        contactEmail: `${request.requestedBy.split(" ")[0].toLowerCase()}@${request.companyName.replace(/\s+/g, "").toLowerCase()}.com`,
        contactPhone: "+1 (555) 000-0000",
        responsibleParty: request.requestedBy,
        responsibleRole: request.requestedRole || "Signatory",
        businessBlueprintType: DETAILED_BUSINESS_TYPES[0],
        guidValidated: !!request.platformGuid,
        confidence: 99.4,
      });
    }, 1500);
  };

  const handleProcessApplication = async () => {
    if (!selectedRequest) return;
    try {
      const baseStatus = t1pDecision === "denied" && idiaPayDecision === "denied" ? "rejected" : "approved";
      await supabase
        .from("account_conversion_requests" as any)
        .update({ status: baseStatus })
        .eq("id", selectedRequest.id);

      if (baseStatus === "approved") {
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .insert([
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
          ])
          .select()
          .single();

        if (businessError) throw businessError;

        await supabase.from("business_locations").insert([
          {
            business_id: businessData.id,
            name: "Primary Headquarters",
            address: parsedData.physicalAddress,
            contact_email: parsedData.contactEmail,
            phone: parsedData.contactPhone,
            is_active: true,
          },
        ]);
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setReviewModalOpen(false);
      fetchBusinesses();
      toast({ title: "Application Processed", description: "Verification complete." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Client Organizations</h1>
          <p className="text-xs text-gray-500 mt-0.5">Enterprise Registry & Platform Provisioning</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Provision Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
            <DialogHeader className="px-5 py-3 border-b bg-slate-50/50">
              <DialogTitle className="text-sm font-bold">New Client Registration</DialogTitle>
              <DialogDescription className="text-[11px]">
                Register entity and establish primary facility.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] px-5 py-4">
              <div className="space-y-5">
                {/* Identification */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Legal Entity Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Tax ID / EIN</Label>
                    <Input
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Blueprint Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DETAILED_BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="text-xs">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Operations */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Headquarters Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.hqAddress}
                      onChange={(e) => setFormData({ ...formData, hqAddress: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Corporate Email</Label>
                    <Input
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Corporate Phone</Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Infrastructure Toggles */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-slate-600 mb-2 block">
                    Infrastructure Assignments
                  </Label>

                  <div className="flex items-center justify-between p-2.5 border rounded bg-slate-50/50">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> IDIA Liability Shield (T-1-P)
                      </Label>
                      <p className="text-[10px] text-slate-500">
                        Authorize localized data databases covered by liability protocols.
                      </p>
                    </div>
                    <Switch
                      checked={formData.t1pShieldEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, t1pShieldEnabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 border rounded bg-slate-50/50">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> IDIA Pay App Builder
                      </Label>
                      <p className="text-[10px] text-slate-500">
                        Provision POS blueprint routing construction capabilities.
                      </p>
                    </div>
                    <Switch
                      checked={formData.idiaPayEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, idiaPayEnabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 border border-blue-100 rounded bg-blue-50/30">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-blue-600" /> Global Data Co-op
                      </Label>
                      <p className="text-[10px] text-blue-700/80">Enroll entity in federated verification network.</p>
                    </div>
                    <Switch
                      checked={formData.dataCoopEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, dataCoopEnabled: v })}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="px-5 py-3 border-t bg-slate-50/50 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewOrgModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreateBusiness}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Provisioning...
                  </>
                ) : (
                  "Commit to Registry"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending T-1-P Applications */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-blue-900">
              <ShieldCheck className="w-3.5 h-3.5" /> Pending Verifications
            </CardTitle>
            <Badge className="bg-blue-600 text-[9px] px-1.5 py-0 h-4">{pendingRequests.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-blue-50">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2.5 gap-3 bg-white hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-gray-900 truncate">{request.companyName}</h4>
                      <Badge
                        variant="outline"
                        className="text-[8px] font-mono bg-slate-50 px-1 py-0 h-3 border-slate-200"
                      >
                        GUID: {request.platformGuid.substring(0, 8)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                      Req: <span className="font-medium text-gray-700">{request.requestedBy}</span>
                      <span className="text-[8px] px-1 bg-slate-100 rounded">
                        {request.requestedRole || "Signatory"}
                      </span>
                    </p>
                  </div>
                  <Button size="sm" className="h-6 text-[10px] shrink-0" onClick={() => openReviewModal(request)}>
                    <FileText className="w-3 h-3 mr-1" /> Process
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Verification Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-xl p-0">
          <DialogHeader className="px-5 py-3 border-b bg-slate-50/50">
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> Application Verification
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-5">
            {aiParsing ? (
              <div className="flex flex-col items-center py-8 space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Extracting payload...</p>
              </div>
            ) : parsedData ? (
              <div className="space-y-5 animate-in fade-in text-xs">
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Entity Name</span>
                    <p className="font-semibold">{parsedData.legalName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Tax ID</span>
                    <p className="font-mono">{parsedData.taxId}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Headquarters</span>
                    <p>{parsedData.physicalAddress}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Responsible Party</span>
                    <p>
                      {parsedData.responsibleParty}{" "}
                      <span className="text-[9px] bg-slate-100 px-1 rounded">{parsedData.responsibleRole}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Contact</span>
                    <p>{parsedData.contactEmail}</p>
                  </div>
                </div>

                <div className="border rounded divide-y bg-slate-50/30">
                  <div className="p-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" /> T-1-P Shield
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Liability shield assignment.</p>
                    </div>
                    <Select value={t1pDecision} onValueChange={(v: any) => setT1pDecision(v)}>
                      <SelectTrigger className="w-28 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-[10px]">
                          Pending
                        </SelectItem>
                        <SelectItem value="approved" className="text-[10px]">
                          Approve
                        </SelectItem>
                        <SelectItem value="denied" className="text-[10px]">
                          Deny
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> IDIA Pay
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        Builder access ({parsedData.businessBlueprintType}).
                      </p>
                    </div>
                    <Select value={idiaPayDecision} onValueChange={(v: any) => setIdiaPayDecision(v)}>
                      <SelectTrigger className="w-28 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-[10px]">
                          Pending
                        </SelectItem>
                        <SelectItem value="approved" className="text-[10px]">
                          Approve
                        </SelectItem>
                        <SelectItem value="denied" className="text-[10px]">
                          Deny
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="px-5 py-3 border-t bg-slate-50/50 gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleProcessApplication}
              disabled={aiParsing || (t1pDecision === "pending" && idiaPayDecision === "pending")}
            >
              Apply Decisions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Registry */}
      <Card className="shadow-sm">
        <CardHeader className="py-2.5 px-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Master Registry</CardTitle>
            <CardDescription className="text-[10px]">{filteredBusinesses.length} active records</CardDescription>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 h-7 text-[10px] bg-white"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingOrgs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <p className="text-[11px] text-gray-500 text-center py-8">No records found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filteredBusinesses.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-2.5 gap-4 hover:bg-slate-50/80 group">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="bg-slate-100 border border-slate-200 rounded shrink-0 h-8 w-8 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <div className="min-w-0 grid grid-cols-3 gap-x-4 w-full items-center">
                      <div className="col-span-1 min-w-0">
                        <h3 className="text-[11px] font-bold text-gray-900 truncate">{org.name}</h3>
                        <p className="text-[9px] text-gray-500 truncate">{org.business_type}</p>
                      </div>
                      <div className="col-span-1 min-w-0">
                        <p className="text-[10px] text-gray-600 truncate flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {org.address || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-1 min-w-0">
                        <p className="text-[10px] font-mono text-gray-500 truncate">EIN: {org.tax_id || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="secondary"
                      className="bg-slate-50 border-slate-200 px-1.5 py-0 h-5 text-[9px] flex items-center gap-1"
                    >
                      <Smartphone className="w-2.5 h-2.5 text-indigo-600" /> Pay {getStatusIcon(org.idia_pay_status)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-slate-50 border-slate-200 px-1.5 py-0 h-5 text-[9px] flex items-center gap-1"
                    >
                      <Database className="w-2.5 h-2.5 text-emerald-600" /> T-1-P {getStatusIcon(org.t1p_status)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
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

export default ClientOrganizations;
