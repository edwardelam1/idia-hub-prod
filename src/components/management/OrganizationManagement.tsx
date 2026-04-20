import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [t1pDecision, setT1pDecision] = useState<"pending" | "approved" | "denied">("pending");
  const [idiaPayDecision, setIdiaPayDecision] = useState<"pending" | "approved" | "denied">("pending");

  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

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

      await supabase.from("business_locations").insert([
        {
          business_id: businessData.id,
          name: "Primary Headquarters",
          address: formData.hqAddress,
          contact_email: formData.contactEmail,
          phone: formData.contactPhone,
          is_active: true,
        },
      ]);

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

      toast({ title: "Record Updated", description: "Enterprise profile modifications saved." });
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
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case "denied":
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto h-[calc(100vh-6rem)] flex flex-col p-4">
      {/* HEADER & ADD BUTTON 
        Notice the huge button on the right side of the header.
      */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Client Organizations</h1>
          <p className="text-lg text-gray-500 mt-1">Enterprise Registry & Platform Provisioning</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="gap-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg text-xl py-6 px-8 rounded-xl"
            >
              <Plus className="h-6 w-6" /> Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
            <DialogHeader className="px-8 py-6 border-b bg-slate-50/50">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Plus className="w-6 h-6 text-indigo-600" /> Manual Organization Entry
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] px-8 py-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="text-lg font-bold text-slate-700">
                    Legal Entity Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="h-14 text-xl"
                    placeholder="Enter business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-700">Blueprint Category</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                  >
                    <SelectTrigger className="h-14 text-xl">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DETAILED_BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-lg">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-700">Headquarters Address</Label>
                  <Input
                    value={formData.hqAddress}
                    onChange={(e) => setFormData({ ...formData, hqAddress: e.target.value })}
                    className="h-14 text-xl"
                    placeholder="123 Main St..."
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="px-8 py-6 border-t bg-slate-50/50 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="text-xl py-6 px-8"
                onClick={() => setShowNewOrgModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                className="text-xl py-6 px-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreateBusiness}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Force Provision"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* PENDING APPLICATIONS */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-200 shadow-md shrink-0">
          <CardHeader className="bg-blue-50 border-b border-blue-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-900">
              <ShieldCheck className="w-6 h-6" /> Pending Verifications
            </CardTitle>
            <Badge className="bg-blue-600 text-base px-3 py-1">{pendingRequests.length} Pending</Badge>
          </CardHeader>
          <CardContent className="p-0 max-h-48 overflow-y-auto">
            <div className="divide-y divide-blue-100">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 gap-4 bg-white hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    <h4 className="font-bold text-lg text-gray-900 truncate">{request.companyName}</h4>
                    <span className="text-sm text-gray-500 font-medium bg-slate-100 px-2 py-1 rounded">
                      Req: {request.requestedBy}
                    </span>
                  </div>
                  <Button size="lg" className="text-base shrink-0" onClick={() => openReviewModal(request)}>
                    Process Application
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VERIFICATION MODAL */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Verification Actions</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-lg text-slate-600">
            Please review documents and apply T-1-P and IDIA Pay policies.
          </div>
          <DialogFooter>
            <Button size="lg" className="text-lg" onClick={handleProcessApplication}>
              Approve Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SPLIT LAYOUT: MASTER LIST AND DETAIL VIEW */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-lg">
        {/* LEFT PANEL: LIST CONTAINER */}
        <div className="w-full lg:w-[35%] flex flex-col bg-slate-50 border-r border-slate-300 min-h-0">
          <div className="p-5 border-b border-slate-300 bg-white flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">Registry List</span>
              <Badge variant="outline" className="text-sm px-2 py-1 bg-slate-100">
                {filteredBusinesses.length} active
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-14 text-lg border-slate-300"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoadingOrgs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="p-8 text-center text-lg text-slate-500">No organizations found.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredBusinesses.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectBusiness(org)}
                    className={`w-full text-left p-6 hover:bg-slate-100 transition-colors border-l-4 focus:outline-none ${selectedBusiness?.id === org.id ? "bg-white border-indigo-600 shadow-md relative z-10" : "border-transparent"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-bold text-slate-900 truncate pr-3">{org.name}</h4>
                      <Badge variant="secondary" className="text-sm px-2 py-1 shrink-0 capitalize">
                        {org.subscription_tier}
                      </Badge>
                    </div>
                    <p className="text-base font-medium text-slate-600 truncate mb-4">
                      {org.business_type || "Unspecified"}
                    </p>
                    <div className="flex items-center gap-3">
                      {org.t1p_status === "approved" && <ShieldCheck className="w-6 h-6 text-emerald-500" />}
                      {org.idia_pay_status === "approved" && <Smartphone className="w-6 h-6 text-indigo-500" />}
                      {org.data_coop_enabled && <Network className="w-6 h-6 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT PANEL: BUSINESS DETAIL CARD */}
        <div className="w-full lg:w-[65%] flex flex-col bg-slate-50 overflow-y-auto">
          {selectedBusiness ? (
            <div className="p-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white border border-slate-300 rounded-2xl shadow-lg overflow-hidden">
                {/* CARD HEADER */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 flex flex-col xl:flex-row xl:items-start justify-between relative gap-6">
                  <div className="flex items-center gap-6 w-full">
                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-inner shrink-0">
                      <Building2 className="h-12 w-12 text-white" />
                    </div>
                    <div className="w-full min-w-0">
                      {isEditingCard ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-14 text-2xl font-bold bg-white/20 border-white/40 text-white placeholder:text-white/50 mb-2 w-full"
                        />
                      ) : (
                        <h2 className="text-4xl font-extrabold text-white tracking-tight truncate">
                          {selectedBusiness.name}
                        </h2>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 text-base px-3 py-1 border-none">
                          {selectedBusiness.subscription_tier}
                        </Badge>
                        <span className="text-base font-medium text-slate-300 flex items-center gap-2">
                          <MapPin className="w-5 h-5" /> {selectedBusiness.address?.split(",")[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EDIT/SAVE ACTIONS */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    {isEditingCard ? (
                      <>
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={() => {
                            setIsEditingCard(false);
                            setEditForm({ ...selectedBusiness });
                          }}
                          className="w-full text-lg text-white hover:bg-white/20"
                        >
                          <X className="w-5 h-5 mr-2" /> Cancel
                        </Button>
                        <Button
                          size="lg"
                          onClick={handleUpdateBusiness}
                          disabled={isSubmitting}
                          className="w-full text-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Save className="w-5 h-5 mr-2" /> Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => setIsEditingCard(true)}
                        className="w-full text-lg text-white hover:bg-white/20 border border-white/30 bg-white/5"
                      >
                        <Edit2 className="w-5 h-5 mr-2" /> Edit Profile
                      </Button>
                    )}
                  </div>
                </div>

                {/* CARD BODY (EDITABLE SECTIONS) */}
                <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-slate-500 border-b-2 border-slate-100 pb-2">
                      Operational Profile
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <Label className="text-sm font-bold text-slate-500 uppercase">Blueprint Classification</Label>
                        {isEditingCard ? (
                          <Select
                            value={editForm.business_type}
                            onValueChange={(v) => setEditForm({ ...editForm, business_type: v })}
                          >
                            <SelectTrigger className="h-14 text-xl mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DETAILED_BUSINESS_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-lg">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-2xl font-bold text-slate-900 mt-2">
                            {selectedBusiness.business_type || "Uncategorized"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-slate-500 uppercase">Tax Identification</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.tax_id}
                            onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
                            className="h-14 text-xl font-mono mt-2"
                          />
                        ) : (
                          <p className="text-2xl font-mono font-medium text-slate-900 mt-2">
                            {selectedBusiness.tax_id || "Not on file"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-slate-500 uppercase">Headquarters Address</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="h-14 text-xl mt-2"
                          />
                        ) : (
                          <p className="text-xl font-medium text-slate-900 mt-2">
                            {selectedBusiness.address || "No location set"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-slate-500 border-b-2 border-slate-100 pb-2">
                      Communication
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <Label className="text-sm font-bold text-slate-500 uppercase">Corporate Email</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-14 text-xl mt-2"
                          />
                        ) : (
                          <p className="text-xl font-medium text-slate-900 mt-2 flex items-center gap-3">
                            <Mail className="w-6 h-6 text-slate-400" /> {selectedBusiness.email || "N/A"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-slate-500 uppercase">Corporate Phone</Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="h-14 text-xl mt-2"
                          />
                        ) : (
                          <p className="text-xl font-medium text-slate-900 mt-2 flex items-center gap-3">
                            <Phone className="w-6 h-6 text-slate-400" /> {selectedBusiness.phone || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 xl:col-span-2 pt-4">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-slate-500 border-b-2 border-slate-100 pb-2 mb-4">
                      Network Capabilities
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div
                        className={`p-6 rounded-xl border-2 ${selectedBusiness.t1p_status === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" /> T-1-P Shield
                          </Label>
                          {getStatusIcon(selectedBusiness.t1p_status)}
                        </div>
                      </div>

                      <div
                        className={`p-6 rounded-xl border-2 ${selectedBusiness.idia_pay_status === "approved" ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Smartphone className="w-6 h-6 text-indigo-600" /> IDIA Pay UI
                          </Label>
                          {getStatusIcon(selectedBusiness.idia_pay_status)}
                        </div>
                      </div>

                      <div
                        className={`p-6 rounded-xl border-2 ${selectedBusiness.data_coop_enabled ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Network className="w-6 h-6 text-blue-600" /> Data Co-op
                          </Label>
                          {isEditingCard ? (
                            <Switch
                              checked={editForm.data_coop_enabled}
                              onCheckedChange={(v) => setEditForm({ ...editForm, data_coop_enabled: v })}
                              className="scale-125 ml-4"
                            />
                          ) : (
                            getStatusIcon(selectedBusiness.data_coop_enabled ? "approved" : "denied")
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <Building2 className="w-24 h-24 opacity-20" />
              <p className="text-xl font-medium">Select an organization to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOrganizations;
