import { useEffect, useState } from "react";
import { Shield, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PROTOCOL } from "@/config/contracts";

interface MintState {
  tokenId: string | null;
  txHash: string | null;
}

/**
 * "Shield Verified" only when the Liability Shield NFT for this receipt is
 * minted on-chain; links to the exact mint on BaseScan. Polls briefly because
 * minting settles asynchronously after the chat reply.
 */
const ShieldVerifiedBadge = ({ egressLogId }: { egressLogId?: string | null }) => {
  const [mint, setMint] = useState<MintState | null>(null);

  useEffect(() => {
    if (!egressLogId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      attempts += 1;
      try {
        const { data } = await supabase
          .from("egress_logs")
          .select("nft_token_id, nft_mint_tx_hash")
          .eq("id", egressLogId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.nft_token_id || data?.nft_mint_tx_hash) {
          setMint({ tokenId: data.nft_token_id ?? null, txHash: data.nft_mint_tx_hash ?? null });
          return;
        }
        if (attempts === 2) {
          // Ask the reconciler to pull fresh mints from Base.
          supabase.functions.invoke("reconcile-liability-nfts", { body: {} }).catch(() => undefined);
        }
      } catch (err) {
        console.error("[ShieldVerifiedBadge] mint lookup failed", err);
      }
      if (!cancelled && attempts < 20) timer = setTimeout(check, 6000);
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [egressLogId]);

  if (!egressLogId) return null;

  if (!mint) {
    return (
      <Badge variant="outline" className="h-5 text-[9px] text-muted-foreground font-bold tracking-tighter">
        <Loader2 size={10} className="mr-1 animate-spin" /> MINTING SHIELD NFT
      </Badge>
    );
  }

  const href = mint.txHash
    ? `https://basescan.org/tx/${mint.txHash}`
    : `https://basescan.org/nft/${PROTOCOL.liabilityReceipt}/${mint.tokenId}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title="View Liability Shield NFT on BaseScan">
      <Badge
        variant="outline"
        className="h-5 text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50 font-black tracking-tighter hover:bg-emerald-100 cursor-pointer"
      >
        <Shield size={10} className="mr-1" /> SHIELD VERIFIED
        {mint.tokenId && <span className="ml-1 font-mono">#{mint.tokenId}</span>}
        <ExternalLink size={9} className="ml-1" />
      </Badge>
    </a>
  );
};

export default ShieldVerifiedBadge;
