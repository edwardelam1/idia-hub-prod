import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark, Building2, ShieldCheck, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BankingFormData {
  legalBusinessName: string;
  ein: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: string;
  swiftBic: string;
  bankAddress: string;
  authorizedSignatory: string;
  signatoryTitle: string;
}

const initialForm: BankingFormData = {
  legalBusinessName: "IDIA Data Inc.",
  ein: "**-***4821",
  bankName: "JPMorgan Chase",
  routingNumber: "******021",
  accountNumber: "********9921",
  confirmAccountNumber: "",
  accountType: "checking",
  swiftBic: "CHASUS33",
  bankAddress: "270 Park Avenue, New York, NY 10172",
  authorizedSignatory: "John Smith",
  signatoryTitle: "CFO",
};

const UpdateBankingDetails = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<BankingFormData>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BankingFormData, string>>>({});

  const update = (field: keyof BankingFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BankingFormData, string>> = {};

    if (!form.legalBusinessName.trim()) newErrors.legalBusinessName = "Required";
    if (!form.ein.trim()) newErrors.ein = "Required";
    if (!form.bankName.trim()) newErrors.bankName = "Required";
    if (!form.routingNumber.trim()) newErrors.routingNumber = "Required";
    if (!form.accountNumber.trim()) newErrors.accountNumber = "Required";
    if (form.confirmAccountNumber && form.confirmAccountNumber !== form.accountNumber) {
      newErrors.confirmAccountNumber = "Account numbers do not match";
    }
    if (!form.authorizedSignatory.trim()) newErrors.authorizedSignatory = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    // Simulated save
    await new Promise((r) => setTimeout(r, 1200));
    setIsSaving(false);
    toast.success("Banking details updated successfully.");
    navigate("/earnings");
  };

  const Field = ({
    label,
    field,
    placeholder,
    masked,
    className,
  }: {
    label: string;
    field: keyof BankingFormData;
    placeholder?: string;
    masked?: boolean;
    className?: string;
  }) => (
    <div className={className}>
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>
      <Input
        value={form[field]}
        onChange={(e) => update(field, e.target.value)}
        placeholder={placeholder}
        type={masked ? "password" : "text"}
        maxLength={100}
        className={`font-mono text-sm ${errors[field] ? "border-destructive" : ""}`}
      />
      {errors[field] && <p className="text-[10px] text-destructive mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/earnings")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Update Banking Details
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Commercial settlement account for TradFi Rails.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">KYB Verified</span>
        </div>
      </div>

      {/* Business Identity Section */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">Business Identity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Legal Business Name" field="legalBusinessName" placeholder="Registered entity name" />
          <Field label="EIN / Tax ID" field="ein" placeholder="XX-XXXXXXX" masked />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Authorized Signatory" field="authorizedSignatory" placeholder="Full legal name" />
          <Field label="Title / Role" field="signatoryTitle" placeholder="e.g. CFO, Treasurer" />
        </div>
      </section>

      {/* Bank Account Section */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">Bank Account</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Bank Name" field="bankName" placeholder="e.g. JPMorgan Chase" />
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Account Type
            </Label>
            <Select value={form.accountType} onValueChange={(v) => update("accountType", v)}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Routing Number (ABA)" field="routingNumber" placeholder="9 digits" masked />
          <Field label="SWIFT / BIC (optional)" field="swiftBic" placeholder="e.g. CHASUS33" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Account Number" field="accountNumber" placeholder="Account number" masked />
          <Field
            label="Confirm Account Number"
            field="confirmAccountNumber"
            placeholder="Re-enter account number"
            masked
          />
        </div>

        <Separator />

        <Field label="Bank Address" field="bankAddress" placeholder="Full address of your banking institution" />
      </section>

      {/* Compliance Disclaimer */}
      <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">
          Changes to banking details require re-verification and may take up to 48 hours. IDIA Data Inc. validates all
          commercial accounts through our KYB compliance partner before enabling egress rails. Funds in transit during a
          change will be held in FBO custody until the new account is verified.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate("/earnings")} className="sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
        >
          {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Banking Details
        </Button>
      </div>
    </div>
  );
};

export default UpdateBankingDetails;
