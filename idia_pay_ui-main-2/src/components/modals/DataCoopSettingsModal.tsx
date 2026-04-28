import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, DollarSign, TrendingUp, Database, Upload, FileText, X, Loader2 } from "lucide-react";

const BUSINESS_ID = "550e8400-e29b-41d4-a716-446655440001";

interface DataSharingPreference {
  id: string;
  category: string;
  sharing_enabled: boolean;
  anonymization_level: string;
  compensation_rate: number;
}

interface UploadedReport {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

interface DataCoopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const dataCategories = [
  { key: "sales_data", name: "Sales Analytics", desc: "Transaction volumes, peak hours" },
  { key: "customer_behavior", name: "Customer Behavior", desc: "Visit patterns (anonymized)" },
  { key: "inventory_trends", name: "Inventory Trends", desc: "Stock levels, demand patterns" },
  { key: "operational_metrics", name: "Operational Metrics", desc: "Staff efficiency metrics" },
  { key: "financial_performance", name: "Financial Performance", desc: "Revenue trends, cost analysis" },
];

const anonLevels = [
  { value: "high", label: "High Privacy", mult: 0.8 },
  { value: "medium", label: "Balanced", mult: 1.0 },
  { value: "low", label: "Detailed", mult: 1.3 },
];

export const DataCoopSettingsModal = ({ isOpen, onClose }: DataCoopSettingsModalProps) => {
  const [preferences, setPreferences] = useState<DataSharingPreference[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploads, setUploads] = useState<UploadedReport[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAll();
    }
  }, [isOpen]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [prefsRes, earningsRes, uploadsRes] = await Promise.all([
        supabase.from("data_sharing_preferences").select("*").eq("business_id", BUSINESS_ID),
        supabase.from("data_monetization").select("revenue_earned, data_points_shared").eq("business_id", BUSINESS_ID).gte("usage_period", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from("financial_report_uploads").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false }),
      ]);

      if (prefsRes.data && prefsRes.data.length > 0) {
        setPreferences(prefsRes.data);
      } else {
        setPreferences(dataCategories.map(c => ({
          id: `default-${c.key}`, category: c.key, sharing_enabled: false, anonymization_level: "high", compensation_rate: 0.0001,
        })));
      }

      if (earningsRes.data) {
        setMonthlyEarnings(earningsRes.data.reduce((s, i) => s + (i.revenue_earned || 0), 0));
        setTotalDataPoints(earningsRes.data.reduce((s, i) => s + (i.data_points_shared || 0), 0));
      }

      if (uploadsRes.data) setUploads(uploadsRes.data as UploadedReport[]);
    } catch (e) {
      console.error("Error loading data coop:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePref = (category: string, field: keyof DataSharingPreference, value: any) => {
    setPreferences(prev => prev.map(p => p.category === category ? { ...p, [field]: value } : p));
  };

  const getEst = (category: string) => {
    const p = preferences.find(x => x.category === category);
    if (!p?.sharing_enabled) return 0;
    return 50 * (anonLevels.find(l => l.value === p.anonymization_level)?.mult || 1);
  };

  const totalEst = preferences.filter(p => p.sharing_enabled).reduce((s, p) => s + getEst(p.category), 0);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await supabase.from("data_sharing_preferences").delete().eq("business_id", BUSINESS_ID);
      const toSave = preferences.filter(p => p.sharing_enabled).map(p => ({
        business_id: BUSINESS_ID, category: p.category, sharing_enabled: true, anonymization_level: p.anonymization_level, compensation_rate: p.compensation_rate,
      }));
      if (toSave.length > 0) await supabase.from("data_sharing_preferences").insert(toSave);
      toast({ title: "Settings Saved", description: `${toSave.length} categories enabled` });
      setTimeout(onClose, 500);
    } catch {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|csv|xlsx|xls)$/i)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, CSV, or XLSX", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${BUSINESS_ID}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("financial-reports").upload(fileName, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("financial-reports").getPublicUrl(fileName);

      await supabase.from("financial_report_uploads").insert({
        business_id: BUSINESS_ID,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        status: "pending",
      });

      toast({ title: "Report uploaded", description: "Processing will begin shortly" });
      loadAll();
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-base">
            <Shield className="w-4 h-4 mr-2" />
            Data Co-op Settings
          </DialogTitle>
          <DialogDescription className="text-xs">
            Control data sharing and monetization through IDIA Synapse
          </DialogDescription>
        </DialogHeader>

        {/* Compact Earnings Summary */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-success" />
              <span className="text-sm font-bold text-success">${monthlyEarnings.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">earned</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold">{totalDataPoints.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">points</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-warning" />
            <span className="text-sm font-bold text-warning">${totalEst.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">/mo est.</span>
          </div>
        </div>

        {/* Compact Data Categories */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Data Sharing</h3>
          <div className="space-y-1.5">
            {dataCategories.map((cat) => {
              const pref = preferences.find(p => p.category === cat.key);
              return (
                <div key={cat.key} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Switch
                    checked={pref?.sharing_enabled || false}
                    onCheckedChange={(v) => updatePref(cat.key, "sharing_enabled", v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cat.desc}</p>
                  </div>
                  {pref?.sharing_enabled && (
                    <>
                      <Select value={pref.anonymization_level} onValueChange={(v) => updatePref(cat.key, "anonymization_level", v)}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {anonLevels.map(l => (
                            <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        ${getEst(cat.key).toFixed(0)}/mo
                      </Badge>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Report Upload */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Financial Report Upload</h3>
          <p className="text-xs text-muted-foreground">
            Upload up to 90 days of financial reports (PDF, CSV, XLSX) to train our AI for your BHI™ analysis
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            variant="outline"
            className="w-full h-16 border-dashed flex flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-xs">Click to upload financial report</span>
              </>
            )}
          </Button>

          {uploads.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
                  <FileText className="w-3 h-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{u.file_name}</span>
                  <Badge variant={u.status === "processed" ? "default" : u.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                    {u.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button size="sm" onClick={saveSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
