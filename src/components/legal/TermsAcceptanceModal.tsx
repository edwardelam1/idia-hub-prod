import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollText, ShieldCheck, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TermsDownloadButton } from "@/components/legal/TermsDownloadButton";
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_INTRO,
  TERMS_SECTIONS,
  TERMS_TITLE,
  TERMS_VERSION,
} from "@/content/terms-cdla";

export const TermsAcceptanceModal = () => {
  const { user, refreshProfile, logout } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasReadAll, setHasReadAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const evaluateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 8) {
      setProgress(100);
      setHasReadAll(true);
      return;
    }
    const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    setProgress(pct);
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setHasReadAll(true);
  };

  useEffect(() => {
    // Short viewports where everything already fits count as fully read.
    evaluateScroll();
  }, []);

  const handleAccept = async () => {
    if (!user?.user_id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        })
        .eq("user_id", user.user_id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Terms accepted — thank you.");
    } catch (err: any) {
      toast.error(err?.message || "Could not record your acceptance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-lg border border-border bg-card shadow-xl">
        <header className="p-5 border-b border-border space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                {TERMS_TITLE}
              </h2>
              <p className="text-xs text-muted-foreground">
                Effective {TERMS_EFFECTIVE_DATE} · Version {TERMS_VERSION}
              </p>
            </div>
            <TermsDownloadButton />
          </div>
          <Progress value={progress} className="h-1" />
        </header>

        <div
          ref={scrollRef}
          onScroll={evaluateScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed text-foreground"
        >
          {TERMS_INTRO.map((block, i) =>
            block.type === "p" ? (
              <p key={`intro-${i}`} className="text-muted-foreground">
                {block.text}
              </p>
            ) : null,
          )}

          {TERMS_SECTIONS.map((section) => (
            <section key={section.id} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">{section.heading}</h3>
              {section.blocks.map((block, i) =>
                block.type === "p" ? (
                  <p key={`${section.id}-p-${i}`} className="text-muted-foreground">
                    {block.text}
                  </p>
                ) : (
                  <ul key={`${section.id}-l-${i}`} className="list-disc pl-5 space-y-2 text-muted-foreground">
                    {block.items.map((item, j) => (
                      <li key={`${section.id}-l-${i}-${j}`}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </div>

        <footer className="p-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {hasReadAll ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                You have reached the end of the agreement.
              </>
            ) : (
              <>
                <ArrowDown className="h-3.5 w-3.5" />
                Scroll to the end to enable acceptance.
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              Decline &amp; Sign Out
            </Button>
            <Button onClick={handleAccept} disabled={!hasReadAll || isSubmitting}>
              {isSubmitting ? "Recording…" : "Accept Terms"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;
