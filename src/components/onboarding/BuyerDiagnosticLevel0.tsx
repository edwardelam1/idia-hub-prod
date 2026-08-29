import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerProfile } from "@/hooks/useBuyerProfile";
import {
  CHOICE_TO_JURISDICTION,
  LEVEL0_JURISDICTION,
  LEVEL0_POSTURE,
  POSTURE_TO_ROLE,
  type DiagnosticQuestion,
} from "./buyerDiagnosticQuestions";

const QuestionBlock = ({
  question,
  value,
  onSelect,
}: {
  question: DiagnosticQuestion;
  value: string | null;
  onSelect: (key: string) => void;
}) => (
  <div className="space-y-3">
    <div className="space-y-1">
      {question.helper && (
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          {question.helper}
        </Badge>
      )}
      <p className="text-sm font-medium text-foreground">{question.prompt}</p>
    </div>
    <div className="grid gap-2">
      {question.options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelect(opt.key)}
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
);

const BuyerDiagnosticLevel0 = () => {
  const { isLoading: authLoading, isAuthenticated, termsAccepted } = useAuth();
  const { needsLevel0, submitLevel0, saving } = useBuyerProfile();
  const { toast } = useToast();
  const [posture, setPosture] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);

  // Auth hydration guard — never flash over unauthenticated or loading states,
  // and never stack on top of the mandatory terms gate.
  if (authLoading || !isAuthenticated || !termsAccepted) return null;
  if (!needsLevel0) return null;

  const canSubmit = !!posture && !!jurisdiction && !saving;

  const handleSubmit = async () => {
    if (!posture || !jurisdiction) return;
    try {
      await submitLevel0(POSTURE_TO_ROLE[posture], CHOICE_TO_JURISDICTION[jurisdiction], [
        { questionId: "0.1", choice: posture },
        { questionId: "0.2", choice: jurisdiction },
      ]);
      toast({ title: "Buyer profile calibrated", description: "Dataset valuation is now personalized to your posture." });
    } catch {
      toast({ title: "Calibration failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        hideCloseButton
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Buyer Diagnostic — Level 0
          </DialogTitle>
          <DialogDescription>
            Two questions establish your baseline taxonomy and jurisdictional routing. Your answers set the affinity
            weights used to price every Synapse Credit consumption action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <QuestionBlock question={LEVEL0_POSTURE} value={posture} onSelect={setPosture} />
          <QuestionBlock question={LEVEL0_JURISDICTION} value={jurisdiction} onSelect={setJurisdiction} />
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Complete Diagnostic
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BuyerDiagnosticLevel0;
