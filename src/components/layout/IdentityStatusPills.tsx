
import { ShieldCheck, Fingerprint, AlertCircle, CircleDot } from 'lucide-react';

type BioKeyStatus = 'STABLE' | 'ANOMALY' | 'DISCONNECTED';

interface IdentityStatusPillsProps {
  bioKeyStatus?: BioKeyStatus;
  kycTier?: 0 | 1 | 2;
}

const bioKeyMap: Record<BioKeyStatus, { color: string; bg: string; label: string }> = {
  STABLE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Bio-Key: Stable' },
  ANOMALY: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Bio-Key: Anomaly' },
  DISCONNECTED: { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Bio-Key: Offline' },
};

const IdentityStatusPills = ({ bioKeyStatus = 'STABLE', kycTier = 1 }: IdentityStatusPillsProps) => {
  const currentBio = bioKeyMap[bioKeyStatus];

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Bio-Key Indicator */}
      <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border ${currentBio.bg} transition-all`}>
        <Fingerprint className={`w-3.5 h-3.5 ${currentBio.color}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${currentBio.color}`}>
          {currentBio.label}
        </span>
        {bioKeyStatus === 'STABLE' && (
          <CircleDot className="w-2 h-2 text-emerald-500 animate-pulse" />
        )}
      </div>

      {/* KYC Tier Indicator */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50">
        <ShieldCheck className={`w-3.5 h-3.5 ${kycTier > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70">
          KYC Tier {kycTier}
        </span>
        {kycTier === 2 && (
          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 font-mono">
            T-1-P
          </span>
        )}
      </div>

      {/* Info tooltip */}
      <div className="hidden xl:block group relative">
        <AlertCircle className="w-4 h-4 text-muted-foreground hover:text-foreground/60 cursor-help" />
        <div className="absolute right-0 top-8 w-48 p-3 bg-popover border border-border rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Detailed Bio-metric and Identity metrics are managed exclusively within the <strong>IDIA Life</strong> mobile app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdentityStatusPills;
