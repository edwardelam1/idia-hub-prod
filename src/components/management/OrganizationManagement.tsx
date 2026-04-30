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
import { ALL_INDUSTRIES } from "@/taxonomy/industries";
import {
  Building2,
  Search,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Smartphone,
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
  User as UserIcon,
} from "lucide-react";

// Taxonomy-aligned categories (single source of truth)
const TAXONOMY_CATEGORIES = ALL_INDUSTRIES.map((i) => ({ id: i.id, label: i.label }));

const ClientOrganizations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [, setAiParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [t1pDecision, setT1pDecision] = useState<"pending" | "approved" | "denied">("pending");
  const [idiaPayDecision, setIdiaPayDecision] = useState<"pending" | "approved" | "denied">("pending");

  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<
    { user_id: string; display: string; account_type: string | null }[]
  >([]);

  const [formData, setFormData] = useState({
    legalName: "",
    businessType: "",
    hqAddress: "",
    ownerUserId: "",
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
    const fetchEligibleUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, account_type, occupation, location")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) {
        setEligibleUsers(
          data.map((p: any) => ({
            user_id: p.user_id,
            account_type: p.account_type,
            display: `${p.user_id.slice(0, 8)} · ${p.occupation || p.location || p.account_type || "user"}`,
          })),
        );
      }
    };
    fetchEligibleUsers();
  }, [toast]);

  const handleCreateBusiness = async () => {
    if (!formData.legalName || !formData.businessType || !formData.hqAddress || !formData.ownerUserId) {
      toast({
        title: "Validation Error",
        description: "Name, Address, Category, and Owner User are required.",
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
            business_type: formData.businessType,
            address: formData.hqAddress,
            subscription_tier: "Enterprise",
            data_coop_enabled: true,
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
          is_active: true,
        },
      ]);

      // CRITICAL: Tether business to at least one user via the business_users junction.
      const { error: linkError } = await supabase.from("business_users").insert([
        {
          business_id: businessData.id,
          user_id: formData.ownerUserId,
          role: "owner",
          is_active: true,
          accepted_at: new Date().toISOString(),
        },
      ]);
      if (linkError) {
        console.error("[OrgMgmt] Failed to link owner user:", linkError);
        throw new Error(`Owner association failed: ${linkError.message}`);
      }

      toast({ title: "Organization Added", description: `${formData.legalName} provisioned successfully.` });
      setShowNewOrgModal(false);
      setFormData({
        legalName: "",
        businessType: "",
        hqAddress: "",
        ownerUserId: "",
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
        businessBlueprintType: TAXONOMY_CATEGORIES[0]?.label ?? "Uncategorized",
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
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "denied":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto h-[calc(100vh-6rem)] flex flex-col p-6">
      {/* HEADER & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Client Organizations</h1>
          <p className="text-sm text-muted-foreground">Enterprise Registry & Platform Provisioning</p>
        </div>

        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Manual Organization Entry
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Legal Entity Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="text-sm"
                  placeholder="Enter business name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Headquarters Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.hqAddress}
                  onChange={(e) => setFormData({ ...formData, hqAddress: e.target.value })}
                  className="text-sm"
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Blueprint Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select taxonomy category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TAXONOMY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.label} className="text-sm">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  Associated User (Owner) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.ownerUserId}
                  onValueChange={(v) => setFormData({ ...formData, ownerUserId: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select an existing platform user..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {eligibleUsers.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500">No profiles available.</div>
                    ) : (
                      eligibleUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id} className="text-sm font-mono">
                          {u.display}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Every business must be tethered to at least one platform user.
                </p>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 gap-2">
              <Button variant="outline" onClick={() => setShowNewOrgModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreateBusiness}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Force Provision"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* PENDING APPLICATIONS */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-200 shadow-sm shrink-0">
          <CardHeader className="bg-blue-50 border-b border-blue-100 py-2 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900">
              <ShieldCheck className="w-4 h-4" /> Pending Verifications
            </CardTitle>
            <Badge className="bg-blue-600">{pendingRequests.length} Pending</Badge>
          </CardHeader>
          <CardContent className="p-0 max-h-40 overflow-y-auto">
            <div className="divide-y divide-blue-100">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between px-4 py-2 gap-3 bg-white hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    <h4 className="font-medium text-sm text-gray-900 truncate">{request.companyName}</h4>
                    <span className="text-xs text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Req: {request.requestedBy}
                    </span>
                  </div>
                  <Button size="sm" className="shrink-0" onClick={() => openReviewModal(request)}>
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
            <DialogTitle className="text-base font-semibold">Verification Actions</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            Please review documents and apply T-1-P and IDIA Pay policies.
          </div>
          <DialogFooter>
            <Button onClick={handleProcessApplication}>Approve Organization</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SPLIT LAYOUT: MASTER LIST AND DETAIL VIEW */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* LEFT PANEL: LIST CONTAINER */}
        <div className="w-full lg:w-[35%] flex flex-col bg-slate-50 border-r border-slate-200 min-h-0">
          <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registry List</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100">
                {filteredBusinesses.length} active
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm border-slate-300"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoadingOrgs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No organizations found.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredBusinesses.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectBusiness(org)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-100 transition-colors border-l-2 focus:outline-none ${selectedBusiness?.id === org.id ? "bg-white border-indigo-600 relative z-10" : "border-transparent"}`}
                  >
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-sm font-medium text-slate-900 truncate pr-2">{org.name}</h4>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                        {org.subscription_tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1.5">
                      {org.business_type || "Unspecified"}
                    </p>
                    <div className="flex items-center gap-2">
                      {org.t1p_status === "approved" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      {org.idia_pay_status === "approved" && <Smartphone className="w-3.5 h-3.5 text-indigo-500" />}
                      {org.data_coop_enabled && <Network className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT PANEL: BUSINESS DETAIL CARD */}
        <div className="w-full lg:w-[65%] flex flex-col bg-slate-50 min-h-0">
          {selectedBusiness ? (
            <div className="p-3 flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
                {/* CARD HEADER */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="bg-white/10 backdrop-blur-md p-2 rounded-md border border-white/20 shrink-0">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditingCard ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-7 text-sm font-semibold bg-white/20 border-white/40 text-white placeholder:text-white/50 w-full"
                        />
                      ) : (
                        <h2 className="text-sm font-semibold text-white tracking-tight truncate">
                          {selectedBusiness.name}
                        </h2>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] px-1.5 py-0 border-none">
                          {selectedBusiness.subscription_tier}
                        </Badge>
                        <span className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {selectedBusiness.address?.split(",")[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EDIT/SAVE ACTIONS */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditingCard ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingCard(false);
                            setEditForm({ ...selectedBusiness });
                          }}
                          className="h-7 px-2 text-xs text-white hover:bg-white/20"
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUpdateBusiness}
                          disabled={isSubmitting}
                          className="h-7 px-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Save className="w-3 h-3 mr-1" /> Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingCard(true)}
                        className="h-7 px-2 text-xs text-white hover:bg-white/20 border border-white/30 bg-white/5"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* CARD BODY — dense two-column, no scroll */}
                <div className="p-4 grid grid-cols-2 gap-x-5 gap-y-3 flex-1">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                      Operational Profile
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Blueprint
                        </Label>
                        {isEditingCard ? (
                          <Select
                            value={editForm.business_type}
                            onValueChange={(v) => setEditForm({ ...editForm, business_type: v })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {TAXONOMY_CATEGORIES.map((c) => (
                                <SelectItem key={c.id} value={c.label} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5 truncate">
                            {selectedBusiness.business_type || "Uncategorized"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Tax ID
                        </Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.tax_id}
                            onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
                            className="h-8 text-xs font-mono mt-0.5"
                          />
                        ) : (
                          <p className="text-xs font-mono font-medium text-slate-900 mt-0.5">
                            {selectedBusiness.tax_id || "Not on file"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          HQ Address
                        </Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="h-8 text-xs mt-0.5"
                          />
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5 truncate">
                            {selectedBusiness.address || "No location set"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Provisioning Code
                        </Label>
                        <p className="text-xs font-mono font-medium text-slate-900 mt-0.5 truncate">
                          {selectedBusiness.provisioning_code || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                      Communication
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Email
                        </Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-8 text-xs mt-0.5"
                          />
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5 flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {selectedBusiness.email || "N/A"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Phone
                        </Label>
                        {isEditingCard ? (
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="h-8 text-xs mt-0.5"
                          />
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5 flex items-center gap-1.5 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {selectedBusiness.phone || "N/A"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 pt-1">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
                      Network Capabilities
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div
                        className={`px-2.5 py-1.5 rounded-md border ${selectedBusiness.t1p_status === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-medium flex items-center gap-1 text-slate-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> T-1-P Verified
                          </Label>
                          {getStatusIcon(selectedBusiness.t1p_status)}
                        </div>
                      </div>

                      <div
                        className={`px-2.5 py-1.5 rounded-md border ${selectedBusiness.idia_pay_status === "approved" ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-medium flex items-center gap-1 text-slate-800">
                            <Smartphone className="w-3 h-3 text-indigo-600" /> Pay UI
                          </Label>
                          {getStatusIcon(selectedBusiness.idia_pay_status)}
                        </div>
                      </div>

                      <div
                        className={`px-2.5 py-1.5 rounded-md border ${selectedBusiness.data_coop_enabled ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-medium flex items-center gap-1 text-slate-800">
                            <Network className="w-3 h-3 text-blue-600" /> Data Co-op
                          </Label>
                          {isEditingCard ? (
                            <Switch
                              checked={editForm.data_coop_enabled}
                              onCheckedChange={(v) => setEditForm({ ...editForm, data_coop_enabled: v })}
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
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 opacity-20" />
              <p className="text-sm text-muted-foreground">Select an organization to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOrganizations;
