import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, Smartphone, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/** CJIS 5.5.5: lock after 30 minutes of inactivity. */
export const MFA_IDLE_LOCK_MS = 30 * 60 * 1000;

type Phase = "loading" | "enroll" | "verify" | "locked" | "ready" | "error";

interface Props {
  children: ReactNode;
  /** Short name of what is being protected, shown in the prompt. */
  resource: string;
}

/**
 * Requires an authenticator-app (TOTP, aal2) session before rendering children,
 * and re-locks after 30 minutes without interaction. The database and edge functions
 * enforce aal2 independently; this gate is the user-facing step.
 */
export default function MfaGate({ children, resource }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());

  const assess = useCallback(async () => {
    console.info("[BEGIN: MfaGate.Assess]");
    setMessage(null);
    try {
      const [{ data: aal, error: aalErr }, { data: factors, error: fErr }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (aalErr) throw aalErr;
      if (fErr) throw fErr;
      const verified = factors?.totp?.[0];
      if (aal?.currentLevel === "aal2") {
        setFactorId(verified?.id ?? null);
        lastActivity.current = Date.now();
        setPhase("ready");
      } else if (verified) {
        setFactorId(verified.id);
        setPhase("verify");
      } else {
        setPhase("enroll");
      }
      console.info(`[END: MfaGate.Assess] level=${aal?.currentLevel} factor=${!!verified}`);
    } catch (err) {
      console.error(`[ERROR: MfaGate.Assess] ${err instanceof Error ? err.stack : String(err)}`);
      setMessage("Could not check your sign-in security. Please refresh and try again.");
      setPhase("error");
    }
  }, []);

  useEffect(() => { void assess(); }, [assess]);

  // Idle lock while unlocked.
  useEffect(() => {
    if (phase !== "ready") return;
    const touch = () => { lastActivity.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= MFA_IDLE_LOCK_MS) {
        console.info("[MfaGate.IdleLock] 30 minutes idle — locking.");
        setCode("");
        setPhase("locked");
      }
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [phase]);

  const startEnrollment = async () => {
    console.info("[BEGIN: MfaGate.Enroll]");
    setBusy(true);
    setMessage(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `IDIA Hub ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      console.info("[END: MfaGate.Enroll]");
    } catch (err) {
      console.error(`[ERROR: MfaGate.Enroll] ${err instanceof Error ? err.stack : String(err)}`);
      setMessage("Authenticator setup is not available right now. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!factorId || code.length !== 6) return;
    console.info("[BEGIN: MfaGate.Verify]");
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      setCode("");
      setQr(null);
      setSecret(null);
      await assess();
      console.info("[END: MfaGate.Verify]");
    } catch (err) {
      console.error(`[ERROR: MfaGate.Verify] ${err instanceof Error ? err.stack : String(err)}`);
      setMessage("That code didn't work. Check the time on your phone and enter the newest code.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "ready") return <>{children}</>;

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const enrolling = phase === "enroll";
  const title = phase === "locked" ? `${resource} locked` : enrolling ? "Set up your authenticator app" : "Enter your authenticator code";
  const description = phase === "locked"
    ? "Locked after 30 minutes without activity. Enter a code from your authenticator app to continue."
    : enrolling
      ? `${resource} holds criminal-justice data and requires a second sign-in step. Scan the code with Google Authenticator, 1Password, Authy or a similar app.`
      : `${resource} requires a code from your authenticator app.`;

  return (
    <Card className="mx-auto mt-4 max-w-md">
      <CardHeader className="pb-3 text-center">
        <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3">
          {phase === "locked" ? <Lock className="h-5 w-5 text-primary" /> : enrolling ? <Smartphone className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {phase === "error" ? (
          <Button variant="outline" onClick={() => void assess()}>Try again</Button>
        ) : enrolling && !qr ? (
          <Button onClick={startEnrollment} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Start setup
          </Button>
        ) : (
          <>
            {enrolling && qr && (
              <div className="flex flex-col items-center gap-2">
                <img src={qr} alt="Authenticator setup code" className="h-44 w-44 rounded-md border bg-background p-2" />
                {secret && (
                  <p className="break-all text-center font-mono text-[11px] text-muted-foreground">
                    Can't scan? Enter: {secret}
                  </p>
                )}
              </div>
            )}
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={() => void verify()}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            <Button onClick={verify} disabled={busy || code.length !== 6} className="w-full gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {enrolling ? "Confirm and continue" : "Unlock"}
            </Button>
          </>
        )}
        {message && <p className="text-center text-xs text-destructive">{message}</p>}
      </CardContent>
    </Card>
  );
}
