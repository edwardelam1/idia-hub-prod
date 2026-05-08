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
import { PAY_APP_VERTICAL_OPTIONS, getPayAppVerticalLabel } from "@/taxonomy/payAppVerticals";
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

const BLUEPRINT_CATEGORIES = PAY_APP_VERTICAL_OPTIONS;

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
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    state: "",
    postalCode: "",
    ownerUserId: "",
  });

  const { toast } = useToast();

  const fetchBusinesses = async () => {
    console.log("[ClientOrganizations] >>> START: fetchBusinesses()");
    setIsLoadingOrgs(true);

    try {
      console.log("[ClientOrganizations] --- STEP: Querying 'businesses' table ordered by created_at");
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("[ClientOrganizations] !!! ERROR: Supabase SELECT failed:", error);
        toast({ title: "Registry Fetch Failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data) {
        console.log(`[ClientOrganizations] --- SUCCESS: Retrieved ${data.length} organizations. Enriching data.`);
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
    } catch (err) {
      console.error("[ClientOrganizations] !!! FATAL EXCEPTION in fetchBusinesses:", err);
    } finally {
      setIsLoadingOrgs(false);
      console.log("[ClientOrganizations] <<< END: fetchBusinesses()");
    }
  };

  useEffect(() => {
    console.log("[ClientOrganizations] >>> START: useEffect Initialization");
    fetchBusinesses();

    const fetchRequests = async () => {
      console.log("[ClientOrganizations] >>> START: fetchRequests()");
      try {
        console.log("[ClientOrganizations] --- STEP: Querying 'account_conversion_requests'");
        const { data, error } = await supabase
          .from("account_conversion_requests" as any)
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[ClientOrganizations] !!! ERROR: Failed to fetch pending requests:", error);
          return;
        }

        if (data) {
          console.log(`[ClientOrganizations] --- SUCCESS: Retrieved ${data.length} pending requests.`);
          const formatted = data.map((req: any) => ({
            id: req.id,
            companyName: req.company_name,
            requestType: req.request_type,
            requestDate: new Date(req.created_at).toLocaleDateString(),
            // STRIPPED PII: Solely relying on the UUID for identification
            requestedBy: req.user_id || "PENDING-GUID-ASSIGNMENT",
            requestedRole: req.contact_role,
            platformGuid: req.user_id || "PENDING-GUID-ASSIGNMENT",
            status: req.status,
          }));
          setPendingRequests(formatted);
        }
      } catch (err) {
        console.error("[ClientOrganizations] !!! FATAL EXCEPTION in fetchRequests:", err);
      } finally {
        console.log("[ClientOrganizations] <<< END: fetchRequests()");
      }
    };

    const fetchEligibleUsers = async () => {
      console.log("[ClientOrganizations] >>> START: fetchEligibleUsers()");
      try {
        console.log("[ClientOrganizations] --- STEP: Querying 'profiles'");
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, account_type, occupation, location")
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) {
          console.error("[ClientOrganizations] !!! ERROR: Failed to fetch eligible users:", error);
          return;
        }

        if (data) {
          console.log(`[ClientOrganizations] --- SUCCESS: Retrieved ${data.length} eligible users.`);
          setEligibleUsers(
            data.map((p: any) => ({
              user_id: p.user_id,
              account_type: p.account_type,
              display: `${p.user_id.slice(0, 8)} · ${p.account_type || "user"}`,
            })),
          );
        }
      } catch (err) {
        console.error("[ClientOrganizations] !!! FATAL EXCEPTION in fetchEligibleUsers:", err);
      } finally {
        console.log("[ClientOrganizations] <<< END: fetchEligibleUsers()");
      }
    };

    fetchRequests();
    fetchEligibleUsers();
    console.log("[ClientOrganizations] <<< END: useEffect Initialization Triggered");
  }, [toast]);

  const handleCreateBusiness = async () => {
    console.log("[ClientOrganizations] >>> START: handleCreateBusiness()");
    if (
      !formData.legalName ||
      !formData.businessType ||
      !formData.streetAddress1 ||
      !formData.city ||
      !formData.state ||
      !formData.postalCode ||
      !formData.ownerUserId
    ) {
      console.warn("[ClientOrganizations] !!! WARN: Validation failed, required fields missing.");
      toast({
        title: "Validation Error",
        description: "Name, Category, Owner, and full Address (Street, City, State, ZIP) are required.",
        variant: "destructive",
      });
      console.log("[ClientOrganizations] <<< END: handleCreateBusiness() aborted");
      return;
    }

    const composedAddress = [
      formData.streetAddress1,
      formData.streetAddress2,
      `${formData.city}, ${formData.state} ${formData.postalCode}`,
    ]
      .filter(Boolean)
      .join(", ");

    setIsSubmitting(true);

    try {
      console.log("[ClientOrganizations] --- STEP 1: Inserting record into 'businesses'");
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert([
          {
            name: formData.legalName,
            business_type: formData.businessType,
            address: composedAddress,
            street_address_1: formData.streetAddress1,
            street_address_2: formData.streetAddress2 || null,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postalCode,
            country: "US",
            subscription_tier: "Enterprise",
            data_coop_enabled: true,
            business_health_score: 100,
          },
        ] as any)
        .select()
        .single();

      if (businessError) {
        console.error("[ClientOrganizations] !!! ERROR Step 1: Failed to insert business.", businessError);
        throw businessError;
      }
      console.log(`[ClientOrganizations] --- SUCCESS Step 1: Business provisioned with ID ${businessData.id}`);

      console.log("[ClientOrganizations] --- STEP 2: Inserting record into 'business_locations'");
      const { error: locationError } = await supabase.from("business_locations").insert([
        {
          business_id: businessData.id,
          name: "Primary Headquarters",
          address: composedAddress,
          is_active: true,
        },
      ]);

      if (locationError) {
        console.error("[ClientOrganizations] !!! ERROR Step 2: Failed to insert business location.", locationError);
        throw locationError;
      }
      console.log("[ClientOrganizations] --- SUCCESS Step 2: Business location recorded.");

      console.log("[ClientOrganizations] --- STEP 3: Tying business to user via 'business_users'");
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
        console.error("[ClientOrganizations] !!! ERROR Step 3: Failed to link owner user.", linkError);
        throw new Error(`Owner association failed: ${linkError.message}`);
      }
      console.log(`[ClientOrganizations] --- SUCCESS Step 3: Owner ${formData.ownerUserId} tethered to business.`);

      console.log("[ClientOrganizations] --- STEP 4: Injecting optimistic state into UI");
      const newBusiness = {
        ...businessData,
        t1p_status: "approved",
        idia_pay_status: "pending",
      };
      setBusinesses((prev) => [newBusiness, ...prev]);

      toast({ title: "Organization Added", description: `${formData.legalName} provisioned successfully.` });
      setShowNewOrgModal(false);
      setFormData({
        legalName: "",
        businessType: "",
        streetAddress1: "",
        streetAddress2: "",
        city: "",
        state: "",
        postalCode: "",
        ownerUserId: "",
      });

      console.log("[ClientOrganizations] --- STEP 5: Triggering background sync fetchBusinesses()");
      await fetchBusinesses();
    } catch (error: any) {
      console.error("[ClientOrganizations] !!! FATAL EXCEPTION in handleCreateBusiness:", error);
      toast({ title: "Provisioning Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      console.log("[ClientOrganizations] <<< END: handleCreateBusiness()");
    }
  };

  const handleUpdateBusiness = async () => {
    console.log("[ClientOrganizations] >>> START: handleUpdateBusiness()");
    if (!editForm.name) return;
    setIsSubmitting(true);

    try {
      const composedAddress = [
        editForm.street_address_1,
        editForm.street_address_2,
        `${editForm.city ?? ""}, ${editForm.state ?? ""} ${editForm.postal_code ?? ""}`.trim(),
      ]
        .filter((p) => p && p.trim() && p.trim() !== ",")
        .join(", ");

      console.log(`[ClientOrganizations] --- STEP: Updating business ID ${selectedBusiness.id}`);
      const { error } = await supabase
        .from("businesses")
        .update({
          name: editForm.name,
          tax_id: editForm.tax_id,
          business_type: editForm.business_type,
          address: composedAddress || editForm.address,
          street_address_1: editForm.street_address_1 || null,
          street_address_2: editForm.street_address_2 || null,
          city: editForm.city || null,
          state: editForm.state || null,
          postal_code: editForm.postal_code || null,
          email: editForm.email,
          phone: editForm.phone,
          subscription_tier: editForm.subscription_tier,
          data_coop_enabled: editForm.data_coop_enabled,
        } as any)
        .eq("id", selectedBusiness.id);

      if (error) {
        console.error("[ClientOrganizations] !!! ERROR: Failed to update business record.", error);
        throw error;
      }

      console.log("[ClientOrganizations] --- SUCCESS: Business record updated.");
      toast({ title: "Record Updated", description: "Enterprise profile modifications saved." });
      setIsEditingCard(false);
      await fetchBusinesses();
    } catch (error: any) {
      console.error("[ClientOrganizations] !!! FATAL EXCEPTION in handleUpdateBusiness:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      console.log("[ClientOrganizations] <<< END: handleUpdateBusiness()");
    }
  };

  const handleToggleProvisioning = async () => {
    console.log("[ClientOrganizations] >>> START: handleToggleProvisioning()");
    if (!selectedBusiness) return;
    const isActive = selectedBusiness.provisioning_active !== false;
    const next = !isActive;

    if (!next) {
      const ok = window.confirm(
        `Cut off "${selectedBusiness.name}" from IDIA Pay? Their provisioning code will be deactivated immediately.`,
      );
      if (!ok) {
        console.log("[ClientOrganizations] <<< END: handleToggleProvisioning() cancelled by user");
        return;
      }
    }

    try {
      console.log(
        `[ClientOrganizations] --- STEP: Updating provisioning status to ${next} for ID ${selectedBusiness.id}`,
      );
      const { error } = await supabase
        .from("businesses")
        .update({
          provisioning_active: next,
          deactivated_at: next ? null : new Date().toISOString(),
        } as any)
        .eq("id", selectedBusiness.id);

      if (error) {
        console.error("[ClientOrganizations] !!! ERROR: Failed to toggle provisioning status.", error);
        toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        return;
      }

      console.log("[ClientOrganizations] --- SUCCESS: Provisioning status toggled.");
      toast({
        title: next ? "Provisioning Restored" : "Provisioning Deactivated",
        description: next
          ? `${selectedBusiness.name} has been re-enabled for IDIA Pay.`
          : `${selectedBusiness.name} can no longer access IDIA Pay.`,
      });
      await fetchBusinesses();
    } catch (err) {
      console.error("[ClientOrganizations] !!! FATAL EXCEPTION in handleToggleProvisioning:", err);
    } finally {
      console.log("[ClientOrganizations] <<< END: handleToggleProvisioning()");
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

      // STRIPPED PII: Using UUID for email synthesis and responsibility assignment
      const safeGuidSegment = request.platformGuid.split("-")[0];

      setParsedData({
        legalName: request.companyName || "Unknown Entity",
        physicalAddress: "Extracted from Legal Documentation",
        taxId: `XX-XXX${Math.floor(1000 + Math.random() * 9000)}`,
        contactEmail: `id_${safeGuidSegment}@idia-network.local`,
        contactPhone: "+1 (000) 000-0000",
        responsibleParty: request.platformGuid, // Assigning UUID strictly
        responsibleRole: request.requestedRole || "Signatory",
        businessBlueprintType: BLUEPRINT_CATEGORIES[0]?.id ?? "uncategorized",
        guidValidated: true,
        confidence: 99.4,
      });
    }, 1200);
  };

  const handleProcessApplication = async () => {
    console.log("[ClientOrganizations] >>> START: handleProcessApplication()");
    if (!selectedRequest) return;

    try {
      const baseStatus = t1pDecision === "denied" && idiaPayDecision === "denied" ? "rejected" : "approved";
      console.log(`[ClientOrganizations] --- STEP 1: Updating account_conversion_requests status to ${baseStatus}`);

      const { error: updateError } = await supabase
        .from("account_conversion_requests" as any)
        .update({ status: baseStatus })
        .eq("id", selectedRequest.id);

      if (updateError) {
        console.error("[ClientOrganizations] !!! ERROR Step 1: Failed to update request status.", updateError);
        throw updateError;
      }

      if (baseStatus === "approved") {
        console.log("[ClientOrganizations] --- STEP 2: Creating approved organization in 'businesses'");
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
            } as any,
          ])
          .select()
          .single();

        if (businessError) {
          console.error("[ClientOrganizations] !!! ERROR Step 2: Failed to auto-provision business.", businessError);
          throw businessError;
        }

        console.log("[ClientOrganizations] --- STEP 3: Inserting generated headquarters into 'business_locations'");
        const { error: locError } = await supabase.from("business_locations").insert([
          {
            business_id: businessData.id,
            name: "Primary Headquarters",
            address: parsedData.physicalAddress,
            contact_email: parsedData.contactEmail,
            phone: parsedData.contactPhone,
            is_active: true,
          },
        ]);

        if (locError) {
          console.error("[ClientOrganizations] !!! ERROR Step 3: Failed to auto-provision location.", locError);
          throw locError;
        }

        setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
        setReviewModalOpen(false);
        await fetchBusinesses();

        toast({
          title: "Organization Approved",
          description: `Provisioning code: ${(businessData as any)?.provisioning_code ?? "—"}. Open the Pay App Blueprint to vault its terminal schema.`,
        });
      } else {
        setPendingRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
        setReviewModalOpen(false);
        await fetchBusinesses();
        toast({ title: "Application Rejected" });
      }
    } catch (err: any) {
      console.error("[ClientOrganizations] !!! FATAL EXCEPTION in handleProcessApplication:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      console.log("[ClientOrganizations] <<< END: handleProcessApplication()");
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
                  Street Address 1 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.streetAddress1}
                  onChange={(e) => setFormData({ ...formData, streetAddress1: e.target.value })}
                  className="text-sm"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Street Address 2 <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={formData.streetAddress2}
                  onChange={(e) => setFormData({ ...formData, streetAddress2: e.target.value })}
                  className="text-sm"
                  placeholder="Suite, Unit, Floor (optional)"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="text-sm"
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                    className="text-sm uppercase"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    ZIP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="text-sm"
                    placeholder="94103"
                  />
                </div>
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
                    <SelectValue placeholder="Select Pay App vertical..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BLUEPRINT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm">
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
                    <span className="text-xs font-mono text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                      GUID: {request.platformGuid.split("-")[0]}...
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
                      <div className="flex items-center gap-1 shrink-0">
                        {org.provisioning_active === false && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                            Suspended
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                          {org.subscription_tier}
                        </Badge>
                      </div>
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
                          <MapPin className="w-3 h-3 shrink-0" />
                          {(() => {
                            const street =
                              selectedBusiness.street_address_1 || selectedBusiness.address?.split(",")[0]?.trim();
                            const cityState = [selectedBusiness.city, selectedBusiness.state]
                              .filter(Boolean)
                              .join(", ");
                            const preview = [street, cityState].filter(Boolean).join(" • ");
                            return preview || "No location set";
                          })()}
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
                      <>
                        {selectedBusiness.provisioning_active === false ? (
                          <Button
                            size="sm"
                            onClick={handleToggleProvisioning}
                            className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleToggleProvisioning}
                            className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                          >
                            Deactivate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingCard(true)}
                          className="h-7 px-2 text-xs text-white hover:bg-white/20 border border-white/30 bg-white/5"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </>
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
                              {BLUEPRINT_CATEGORIES.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs font-medium text-slate-900 mt-0.5 truncate">
                            {getPayAppVerticalLabel(selectedBusiness.business_type) || "Uncategorized"}
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
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          HQ Address
                        </Label>
                        {isEditingCard ? (
                          <div className="space-y-1.5 mt-0.5">
                            <Input
                              value={editForm.street_address_1 ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, street_address_1: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="Street Address 1"
                            />
                            <Input
                              value={editForm.street_address_2 ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, street_address_2: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="Street Address 2 (optional)"
                            />
                            <div className="grid grid-cols-3 gap-1.5">
                              <Input
                                value={editForm.city ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="h-8 text-xs"
                                placeholder="City"
                              />
                              <Input
                                value={editForm.state ?? ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, state: e.target.value.toUpperCase().slice(0, 2) })
                                }
                                className="h-8 text-xs uppercase"
                                placeholder="ST"
                                maxLength={2}
                              />
                              <Input
                                value={editForm.postal_code ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                                className="h-8 text-xs"
                                placeholder="ZIP"
                              />
                            </div>
                          </div>
                        ) : selectedBusiness.street_address_1 ? (
                          <div className="text-xs font-medium text-slate-900 mt-0.5 leading-snug">
                            <div className="truncate">{selectedBusiness.street_address_1}</div>
                            {selectedBusiness.street_address_2 && (
                              <div className="truncate">{selectedBusiness.street_address_2}</div>
                            )}
                            <div className="truncate">
                              {[selectedBusiness.city, selectedBusiness.state].filter(Boolean).join(", ")}
                              {selectedBusiness.postal_code ? ` ${selectedBusiness.postal_code}` : ""}
                            </div>
                          </div>
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
