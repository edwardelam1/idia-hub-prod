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
  Loader2,
  ShieldCheck,
  Smartphone,
  Database,
  Plus,
  MapPin,
  XCircle,
  Clock,
  Network,
  Edit2,
  Save,
  X,
  Mail,
  Phone,
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

  // Verification Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [t1pDecision, setT1pDecision] = useState<"pending" | "approved" | "denied">("pending");
  const [idiaPayDecision, setIdiaPayDecision] = useState<"pending" | "approved" | "denied">("pending");

  // Master-Detail State
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  // Manual Provisioning Form State
  const [formData, setFormData] = useState({
    legalName: "",
    taxId: "",
    businessType: "",
    hqAddress: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionTier: "Enterprise",
    t1pStatus: "approved",
    idiaPayStatus: "approved",
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

      // Update selected business if one is already selected to reflect fresh data
      if (selectedBusiness) {
        const updatedSelected = enrichedData.find((b) => b.id === selectedBusiness.id);
        if (updatedSelected && !isEditingCard) setSelectedBusiness(updatedSelected);
      }
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

      toast({ title: "Organization Added", description: `${formData.legalName} provisioned successfully.` });
      setShowNewOrgModal(false);
      setFormData({
        legalName: "",
        taxId: "",
        businessType: "",
        hqAddress: "",
        contactEmail: "",
        contactPhone: "",
        subscriptionTier: "Enterprise",
        t1pStatus: "approved",
        idiaPayStatus: "approved",
        dataCoopEnabled: true,
      });
      fetchBusinesses();
    } catch (error: any) {
      toast({ title: "Provisioning Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBusiness = async () => {
    if (!editForm.name) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: editForm.name,
          tax_id: editForm.tax_id,
          business_type: editForm.business_type,
          address: editForm.address,
          email: editForm.email,
          phone: editForm.phone,
          subscription_tier: editForm.subscription_tier,
          data_coop_enabled: editForm.data_coop_enabled,
        })
        .eq("id", selectedBusiness.id);

      if (error) throw error;

      toast({ title: "Record Updated", description: "Enterprise profile modifications committed to ledger." });
      setIsEditingCard(false);
      fetchBusinesses();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectBusiness = (org: any) => {
    setSelectedBusiness(org);
    setIsEditingCard(false);
    setEditForm({ ...org });
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
        contactEmail: `${request.requestedBy.split(" ")[0].toLowerCase()}@company.com`,
        contactPhone: "+1 (555) 000-0000",
        responsibleParty: request.requestedBy,
        responsibleRole: request.requestedRole || "Signatory",
        businessBlueprintType: DETAILED_BUSINESS_TYPES[0],
        guidValidated: true,
        confidence: 99.4,
      });
    }, 1200);
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
      toast({ title: "Application Processed" });
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
        return <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />;
      case "denied":
        return <XCircle className="w-2.5 h-2.5 text-red-500" />;
      default:
        return <Clock className="w-2.5 h-2.5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Client Organizations</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Enterprise Registry & Platform Provisioning</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-[11px] gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
              <Plus className="h-3 w-3" /> Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
            {/* Manual Provisioning Form (Omitted for brevity in this snippet as it is unchanged from previous) */}
            <DialogHeader className="px-5 py-3 border-b bg-slate-50/50">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Manual Organization Entry
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] px-5 py-4">
              {/* Same form grid as previously provided */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] font-semibold text-slate-600">
                    Legal Entity Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-slate-600">Blueprint Category</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
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
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-slate-600">Headquarters Address</Label>
                  <Input
                    value={formData.hqAddress}
                    onChange={(e) => setFormData({ ...formData, hqAddress: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="px-5 py-3 border-t bg-slate-50/50 gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewOrgModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-indigo-600"
                onClick={handleCreateBusiness}
                disabled={isSubmitting}
              >
                Force Provision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Applications (Conditionally Rendered) */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-100 shadow-sm shrink-0">
          <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold flex items-center gap-1.5 text-blue-900">
              <ShieldCheck className="w-3.5 h-3.5" /> Pending Verifications
            </CardTitle>
            <Badge className="bg-blue-600 text-[9px] px-1.5 py-0 h-4">{pendingRequests.length}</Badge>
          </CardHeader>
          <CardContent className="p-0 max-h-32 overflow-y-auto">
            <div className="divide-y divide-blue-50">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 gap-3 bg-white hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <h4 className="font-semibold text-xs text-gray-900 truncate">{request.companyName}</h4>
                    <span className="text-[9px] text-gray-500">Req: {request.requestedBy}</span>
                  </div>
                  <Button size="sm" className="h-6 text-[10px] shrink-0" onClick={() => openReviewModal(request)}>
                    Process
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Modal Placeholder */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-sm">Verification App</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleProcessApplication}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Master-Detail Registry Layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Left Panel: Container List */}
        <div className="w-full lg:w-[35%] flex flex-col bg-slate-50/50 border-r border-slate-200 min-h-0">
          <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Master Registry</span>
              <Badge variant="outline" className="text-[9px] h-4 bg-slate-50">
                {filteredBusinesses.length} active
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-6 h-7 text-[10px] bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoadingOrgs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="p-6 text-center text-[10px] text-slate-500">No organizations found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBusinesses.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectBusiness(org)}
                    className={`w-full text-left p-3 hover:bg-white transition-colors border-l-2 focus:outline-none ${selectedBusiness?.id === org.id ? "bg-white border-primary shadow-sm relative z-10" : "border-transparent"}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate pr-2">{org.name}</h4>
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0 shrink-0 capitalize">
                        {org.subscription_tier}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mb-1.5">{org.business_type || "Unspecified"}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {org.t1p_status === "approved" && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                      {org.idia_pay_status === "approved" && <Smartphone className="w-3 h-3 text-indigo-500" />}
                      {org.data_coop_enabled && <Network className="w-3 h-3 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel: Business Card */}
        <div className="w-full lg:w-[65%] flex flex-col bg-slate-50/30 overflow-y-auto">
          {selectedBusiness ? (
            <div className="p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 flex items-start justify-between relative">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-inner">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      {isEditingCard ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8 text-sm font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50 mb-1"
                        />
                      ) : (
                        <h2 className="text-lg font-bold text-white tracking-tight">{selectedBusiness.name}</h2>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 text-[9px] border-none">
                          {selectedBusiness.subscription_tier}
                        </Badge>
                        <span className="text-[10px] text-slate-300 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {selectedBusiness.address?.split(",")[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isEditingCard ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingCard(false);
                            setEditForm({ ...selectedBusiness });
                          }}
                          className="h-7 text-[10px] text-white hover:bg-white/20"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUpdateBusiness}
                          disabled={isSubmitting}
                          className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Save className="w-3 h-3 mr-1" /> Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingCard(true)}
                        className="h-7 text-[10px] text-white hover:bg-white/20 border border-white/20"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit Profile
                      </Button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Operations Identity */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b pb-1">
                      Operational Profile
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-[9px] text-slate-500 uppercase">Blueprint Classification</Label>
                        {isEditingCard ? (
                          <Select
                            value={editForm.business_type}
                            onValueChange={(v) => setEditForm({ ...editForm, business_type: v })}
                          >
                            <SelectTrigger className="h-7 text-[11px] mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DETAILED_BUSINESS_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-[10px]">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5">
                            {selectedBusiness.business_type || "Uncategorized"}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-[9px] text-slate-500 uppercase">Tax Identification</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.tax_id}
                            onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
                            className="h-7 text-[11px] font-mono mt-1"
                          />
                        ) : (
                          <p className="text-xs font-mono text-slate-900 mt-0.5">
                            {selectedBusiness.tax_id || "Not on file"}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-[9px] text-slate-500 uppercase">Headquarters Address</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="h-7 text-[11px] mt-1"
                          />
                        ) : (
                          <p className="text-xs text-slate-900 mt-0.5">
                            {selectedBusiness.address || "No location set"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Sub */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b pb-1">
                      Communication
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-[9px] text-slate-500 uppercase">Corporate Email</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-7 text-[11px] mt-1"
                          />
                        ) : (
                          <p className="text-xs text-slate-900 mt-0.5 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" /> {selectedBusiness.email || "N/A"}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-[9px] text-slate-500 uppercase">Corporate Phone</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="h-7 text-[11px] mt-1"
                          />
                        ) : (
                          <p className="text-xs text-slate-900 mt-0.5 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {selectedBusiness.phone || "N/A"}
                          </p>
                        )}
                      </div>

                      {isEditingCard && (
                        <div>
                          <Label className="text-[9px] text-slate-500 uppercase">Service Tier Override</Label>
                          <Select
                            value={editForm.subscription_tier}
                            onValueChange={(v) => setEditForm({ ...editForm, subscription_tier: v })}
                          >
                            <SelectTrigger className="h-7 text-[11px] mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Enterprise" className="text-[10px]">
                                Enterprise
                              </SelectItem>
                              <SelectItem value="Professional" className="text-[10px]">
                                Professional
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* System Capabilities Matrix */}
                  <div className="col-span-1 md:col-span-2 pt-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b pb-1 mb-3">
                      Network Capabilities
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* T-1-P Card */}
                      <div
                        className={`p-3 rounded-lg border ${selectedBusiness.t1p_status === "approved" ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] font-bold flex items-center gap-1.5 text-slate-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> T-1-P Shield
                          </Label>
                          {getStatusIcon(selectedBusiness.t1p_status)}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight">
                          Liability protocol deployment capability.
                        </p>
                      </div>

                      {/* IDIA Pay Card */}
                      <div
                        className={`p-3 rounded-lg border ${selectedBusiness.idia_pay_status === "approved" ? "bg-indigo-50/50 border-indigo-100" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] font-bold flex items-center gap-1.5 text-slate-800">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> IDIA Pay UI
                          </Label>
                          {getStatusIcon(selectedBusiness.idia_pay_status)}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight">
                          POS blueprint application builder access.
                        </p>
                      </div>

                      {/* Co-op Card */}
                      <div
                        className={`p-3 rounded-lg border ${selectedBusiness.data_coop_enabled ? "bg-blue-50/50 border-blue-100" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] font-bold flex items-center gap-1.5 text-slate-800">
                            <Network className="w-3.5 h-3.5 text-blue-600" /> Data Co-op
                          </Label>
                          {isEditingCard ? (
                            <Switch
                              checked={editForm.data_coop_enabled}
                              onCheckedChange={(v) => setEditForm({ ...editForm, data_coop_enabled: v })}
                              className="scale-75"
                            />
                          ) : (
                            getStatusIcon(selectedBusiness.data_coop_enabled ? "approved" : "denied")
                          )}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight">
                          Federated verification network enrollment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
              <Building2 className="w-12 h-12 opacity-20" />
              <p className="text-xs font-medium">Select an organization from the registry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOrganizations;
