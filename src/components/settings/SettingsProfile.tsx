import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Lock, Smartphone, Fingerprint, ScrollText, CalendarClock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TermsDownloadButton } from '@/components/legal/TermsDownloadButton';
import { TERMS_TITLE, TERMS_VERSION } from '@/content/terms-cdla';

export const SettingsProfile = () => {
  const { user, piiData, termsAccepted, termsAcceptedAt, termsVersion } = useAuth();

  // PII comes from in-memory bridge (IDIA Life device), never from DB
  const displayName = piiData?.displayName || '—';
  const email = piiData?.email || '—';
  const platformGuid = piiData?.platformGuid || user?.user_id || '—';
  const accountStatus = user?.account_status ?? 'N/A';
  const piiSource = piiData?.source;

  const isFromSecureEnclave = piiSource === 'secure_enclave';
  const isPiiAvailable = piiData && piiData.displayName;

  const acceptedDisplay = termsAcceptedAt
    ? new Date(termsAcceptedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;


  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Identity & Profile
              </CardTitle>
              <CardDescription>
                Your identity is verified and managed through the IDIA Life mobile application.
                No personal information is stored in the Hub database.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              {isFromSecureEnclave ? 'Secure Enclave' : 'Verified via IDIA Life'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-muted bg-muted/30">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm text-muted-foreground">
              {isPiiAvailable ? (
                <>
                  Personal information is fetched securely from your{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Smartphone className="h-3.5 w-3.5" />
                    IDIA Life device
                  </span>{' '}
                  and held in-memory only. It is <strong>never stored</strong> in the Hub database.
                </>
              ) : (
                <>
                  Connect your{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Smartphone className="h-3.5 w-3.5" />
                    IDIA Life mobile application
                  </span>{' '}
                  to view your identity information here.
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Display Name</Label>
              <Input
                value={displayName}
                disabled
                className="bg-muted/20 text-foreground cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
              <Input
                value={email}
                disabled
                className="bg-muted/20 text-foreground cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint className="h-3 w-3" />
                Platform GUID
              </Label>
              <Input
                value={typeof platformGuid === 'string' && platformGuid.length > 12 
                  ? platformGuid.slice(0, 12).toUpperCase() + '…' 
                  : platformGuid}
                disabled
                className="bg-muted/20 text-foreground font-mono text-xs cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Account Status</Label>
              <Input
                value={accountStatus}
                disabled
                className="bg-muted/20 text-foreground font-mono text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Legal &amp; Agreements
                </h3>
                <p className="text-xs text-muted-foreground">{TERMS_TITLE}</p>
              </div>
              <TermsDownloadButton label="Download Terms (PDF)" />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {termsAccepted && acceptedDisplay ? (
                <>
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary gap-1.5">
                    <ShieldCheck className="h-3 w-3" />
                    Accepted
                  </Badge>
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {acceptedDisplay}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    v{termsVersion || TERMS_VERSION}
                  </span>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not accepted
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

  );
};
