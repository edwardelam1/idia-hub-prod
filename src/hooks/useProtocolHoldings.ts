/**
 * Live on-chain balances for every protocol wallet / contract that holds funds.
 * All JSON-RPC traffic is proxied through the `base-rpc-proxy` edge function so
 * the Alchemy key never reaches the browser bundle.
 */
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, custom, formatUnits, getAddress, type Address } from "viem";
import { base } from "viem/chains";
import { supabase } from "@/integrations/supabase/client";
import { PROTOCOL } from "@/config/contracts";

const proxyTransport = custom({
  async request({ method, params }) {
    const { data, error } = await supabase.functions.invoke("base-rpc-proxy", {
      body: { jsonrpc: "2.0", id: 1, method, params: params ?? [] },
    });
    if (error) throw error;
    if (data && typeof data === "object" && "error" in data && (data as { error: unknown }).error) {
      throw new Error(JSON.stringify((data as { error: unknown }).error));
    }
    return (data as { result: unknown }).result;
  },
});

const client = createPublicClient({ chain: base, transport: proxyTransport });

const ERC20_READ_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export interface ProtocolWallet {
  key: string;
  label: string;
  description: string;
  address: string;
}

export interface ProtocolHolding extends ProtocolWallet {
  eth: number | null;
  idia: number | null;
  usdc: number | null;
}

export const PROTOCOL_WALLETS: ProtocolWallet[] = [
  { key: "warchest", label: "Global War Chest", description: "Governance Safe", address: PROTOCOL.safe },
  { key: "relayer", label: "Relayer / Settlement", description: "Purchase receiver", address: PROTOCOL.treasury },
  { key: "register", label: "System Cash Register", description: "Operational float", address: PROTOCOL.systemCashRegister },
  { key: "escrow-eco", label: "Ecosystem Escrow", description: "Data yield awards", address: PROTOCOL.escrow.ecosystem },
  { key: "escrow-team", label: "Team Escrow", description: "Team allocation", address: PROTOCOL.escrow.team },
  { key: "escrow-liq", label: "Liquidity Escrow", description: "Liquidity allocation", address: PROTOCOL.escrow.liquidity },
  { key: "escrow-inv", label: "Investor Escrow", description: "Investor allocation", address: PROTOCOL.escrow.investors },
  { key: "escrow-pub", label: "Public Sale Escrow", description: "Public sale allocation", address: PROTOCOL.escrow.publicSale },
  { key: "timelock", label: "Timelock", description: "Governance execution", address: PROTOCOL.timelock },
];

async function readWallet(w: ProtocolWallet): Promise<ProtocolHolding> {
  const addr = getAddress(w.address) as Address;
  const [eth, idia, usdc] = await Promise.all([
    client.getBalance({ address: addr }).then((v) => Number(formatUnits(v, 18))).catch((err: Error) => {
      console.error(`[ProtocolHoldings] eth read failed ${w.key}: ${err.message}`, err.stack);
      return null;
    }),
    client
      .readContract({ address: getAddress(PROTOCOL.idiaToken) as Address, abi: ERC20_READ_ABI, functionName: "balanceOf", args: [addr] } as never)
      .then((v) => Number(formatUnits(v as bigint, 18)))
      .catch((err: Error) => {
        console.error(`[ProtocolHoldings] idia read failed ${w.key}: ${err.message}`, err.stack);
        return null;
      }),
    client
      .readContract({ address: getAddress(PROTOCOL.usdc) as Address, abi: ERC20_READ_ABI, functionName: "balanceOf", args: [addr] } as never)
      .then((v) => Number(formatUnits(v as bigint, 6)))
      .catch((err: Error) => {
        console.error(`[ProtocolHoldings] usdc read failed ${w.key}: ${err.message}`, err.stack);
        return null;
      }),
  ]);
  return { ...w, eth, idia, usdc };
}

export function useProtocolHoldings() {
  return useQuery({
    queryKey: ["protocol-holdings", PROTOCOL.idiaToken],
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ProtocolHolding[]> => {
      console.info(`[PHASE_START: ProtocolHoldings.Read] wallets=${PROTOCOL_WALLETS.length}`);
      try {
        const rows = await Promise.all(PROTOCOL_WALLETS.map(readWallet));
        console.info(`[PHASE_END: ProtocolHoldings.Read] resolved=${rows.length}`);
        return rows;
      } catch (err) {
        const e = err as Error;
        console.error(`[PHASE_END: ProtocolHoldings.Read] FAILED ${e.message}`, e.stack);
        throw e;
      }
    },
  });
}

export interface IdiaTokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

export function useIdiaTokenInfo() {
  return useQuery({
    queryKey: ["idia-token-info", PROTOCOL.idiaToken],
    retry: false,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<IdiaTokenInfo | null> => {
      console.info("[PHASE_START: IdiaTokenInfo.Read]");
      try {
        const token = getAddress(PROTOCOL.idiaToken) as Address;
        const [name, symbol, decimals, supply] = await Promise.all([
          client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "name" } as never),
          client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "symbol" } as never),
          client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "decimals" } as never),
          client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "totalSupply" } as never),
        ]);
        const dec = Number(decimals as number);
        const info = {
          name: String(name),
          symbol: String(symbol),
          decimals: dec,
          totalSupply: Number(formatUnits(supply as bigint, dec)),
        };
        console.info(`[PHASE_END: IdiaTokenInfo.Read] ${info.symbol} supply=${info.totalSupply}`);
        return info;
      } catch (err) {
        const e = err as Error;
        console.error(`[PHASE_END: IdiaTokenInfo.Read] FAILED ${e.message}`, e.stack);
        return null;
      }
    },
  });
}
