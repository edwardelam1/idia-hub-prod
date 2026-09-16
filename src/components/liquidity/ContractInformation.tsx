import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink } from "lucide-react";
import { PROTOCOL, ACTIVE_DEPLOYMENT } from "@/config/contracts";
import { useIdiaTokenInfo } from "@/hooks/useProtocolHoldings";

const addrUrl = (a: string) => `https://basescan.org/address/${a}`;
const tokenUrl = (a: string) => `https://basescan.org/token/${a}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const CopyBtn = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy address"
      title="Copy address"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

const ContractRow = ({ label, address, href }: { label: string; address: string; href: string }) => (
  <div className="flex items-center justify-between gap-2 rounded border border-border/40 bg-muted/20 px-2 py-1.5">
    <span className="text-xs truncate">{label}</span>
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[10px] font-mono text-muted-foreground">{short(address)}</span>
      <CopyBtn value={address} />
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </div>
);

interface Props {
  idiaUsdPrice: number | null;
}

const ContractInformation = ({ idiaUsdPrice }: Props) => {
  const { data: token, isLoading } = useIdiaTokenInfo();
  const marketValue = token && idiaUsdPrice != null ? token.totalSupply * idiaUsdPrice : null;

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">On-Chain Contract Information</h3>
          <p className="text-xs text-muted-foreground">Read directly from the deployed contracts</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {ACTIVE_DEPLOYMENT === "mainnet" ? "Base Mainnet · 8453" : "Base Sepolia · 84532"}
        </Badge>
      </div>

      {/* Token facts */}
      <div className="rounded border border-primary/20 bg-primary/5 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {isLoading ? "Loading token…" : token ? `${token.name} (${token.symbol})` : "IDIA Token"}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground">{short(PROTOCOL.idiaToken)}</span>
            <CopyBtn value={PROTOCOL.idiaToken} />
            <a
              href={tokenUrl(PROTOCOL.idiaToken)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Decimals</div>
            <div className="text-xs font-mono">{token?.decimals ?? "—"}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Total Supply</div>
            <div className="text-xs font-mono">
              {token ? token.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Price</div>
            <div className="text-xs font-mono">
              {idiaUsdPrice == null ? "—" : `$${idiaUsdPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">Implied Value</div>
            <div className="text-xs font-mono">
              {marketValue == null ? "—" : `$${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        <ContractRow label="USDC (settlement token)" address={PROTOCOL.usdc} href={tokenUrl(PROTOCOL.usdc)} />
        <ContractRow label="Governor" address={PROTOCOL.governor} href={addrUrl(PROTOCOL.governor)} />
        <ContractRow label="Registry" address={PROTOCOL.registry} href={addrUrl(PROTOCOL.registry)} />
        <ContractRow label="Pool Factory" address={PROTOCOL.poolFactory} href={addrUrl(PROTOCOL.poolFactory)} />
        <ContractRow
          label="Pool Deployer Module"
          address={PROTOCOL.poolDeployerModule}
          href={addrUrl(PROTOCOL.poolDeployerModule)}
        />
        <ContractRow
          label="Liability Shield Receipt"
          address={PROTOCOL.liabilityReceipt}
          href={addrUrl(PROTOCOL.liabilityReceipt)}
        />
      </div>
    </Card>
  );
};

export default ContractInformation;
