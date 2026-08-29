import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerProfile } from "@/hooks/useBuyerProfile";
import { ROLE_BATTERIES, latencyFromAnswers } from "./buyerDiagnosticQuestions";

const BuyerDiagnosticLevel1 = () => {
  const { isLoading: authLoading, isAuthenticated, termsAccepted } = useAuth();
  const { vector, needsLevel0, needsLevel1, submitLevel1, saving } = useBuyerProfile();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState(false);

  const battery = useMemo(() => (vector ? ROLE_BATTERIES[vector.role] : null), [vector?.role]);

  if (authLoading || !isAuthenticated || !termsAccepted) return null;
  if (needsLevel0 || !needsLevel1 || !battery || dismissed) return null;

  const complete = battery.questions.every((q) => !!answers[q.id]);

  const handleSubmit = async () => {
    if (!vector || !complete) return;
    try {
      const latency = latencyFromAnswers(vector.role, answers);
      await submitLevel1(
        vector.role,
        latency,
        battery.questions.map((q) => ({ questionId: q.id, choice: answers[q.id] })),
      );
      toast({ title: "Affinity weights updated", description: "Credit pricing now reflects your tier profile." });
    } catch {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open modal onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            {battery.title}
          </DialogTitle>
          <DialogDescription>
            {battery.subtitle} — your tier changed, so we need to recalculate your data affinity weights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {battery.questions.map((q) => (
            <div key={q.id} className="space-y-3">
              <div className="space-y-1">
                {q.helper && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {q.helper}
                  </Badge>
                )}
                <p className="text-sm font-medium text-foreground">{q.prompt}</p>
              </div>
              <div className="grid gap-2">
                {q.options.map((opt) => {
                  const active = answers[q.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.key }))}
                      className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="font-mono text-xs mr-2 opacity-70">({opt.key})</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDismissed(true)} className="flex-1">
            Later
          </Button>
          <Button onClick={handleSubmit} disabled={!complete || saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyerDiagnosticLevel1;
