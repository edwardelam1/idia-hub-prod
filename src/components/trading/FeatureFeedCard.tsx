import { useState } from "react";
import { useFeatureFeed } from "@/hooks/useFeatureFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Radio, Pause, Play, Square, Copy, Download, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
export interface FeatureFeed { id: string; name: string; description: string; topic: string }
export default function FeatureFeedCard({ feed }: { feed: FeatureFeed }) {
  const f = useFeatureFeed(feed.topic);
  const [confirm, setConfirm] = useState(false);
  const [inspect, setInspect] = useState(false);
  const latest = f.packets[0];
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(latest?.payload, null, 2)); toast.success("Packet copied"); }
    catch (e) { console.error("[PHASE_ERROR: FeatureFeed.Copy]", e); toast.error("Could not copy packet"); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(f.packets, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${feed.topic}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <Card className="min-w-0">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-base flex gap-2 min-w-0"><Radio className="size-4 shrink-0 text-primary mt-1" />{feed.name}</CardTitle>
        <Button size="sm" variant={f.session ? "outline" : "default"} disabled={f.status === "Authorizing"} onClick={() => f.session ? f.disconnect() : setConfirm(true)}>
          {f.session ? <Square className="size-3 mr-1" /> : <Play className="size-3 mr-1" />}{f.session ? "Stop" : "Connect"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{feed.description}</p>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
        <Badge variant="outline">{f.status}</Badge><span>{f.received} live packets</span><span>{f.latency === null ? "—" : `${f.latency} ms`} delivery</span>
      </div>
      {f.session && <p className="text-xs text-muted-foreground">{f.session.credits_charged.toFixed(2)} CR · ends {new Date(f.session.expires_at).toLocaleTimeString()} · no automatic renewal</p>}
      {f.error && <p role="alert" className="text-sm text-destructive">{f.error}</p>}
      <div className="flex items-center gap-1">
        <code className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate">{feed.topic}</code>
        {[{label: f.paused ? "Resume display" : "Pause display", icon: f.paused ? Play : Pause, action: () => f.setPaused(!f.paused), disabled: !f.session},
          {label:"Inspect packet",icon:Info,action:()=>setInspect(true),disabled:!latest},
          {label:"Copy latest packet",icon:Copy,action:()=>void copy(),disabled:!latest},
          {label:"Download packets",icon:Download,action:download,disabled:!latest}].map(({label,icon:Icon,action,disabled}) => <Tooltip key={label}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={label} disabled={disabled} onClick={action}><Icon className="size-3.5" /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}
      </div>
      <div className="h-48 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px]" aria-live="off">
        {!f.packets.length ? <p className="text-muted-foreground">{f.session ? "Waiting for verified source activity." : "Disconnected"}</p> : f.packets.map(packet => <div key={packet.id} className="border-b border-border pb-2 mb-2">
          <span className="text-muted-foreground">#{packet.id} · {new Date(packet.created_at).toLocaleTimeString()}</span>
          <pre className="whitespace-pre-wrap break-all text-foreground mt-1">{JSON.stringify(packet.payload.metrics, null, 2)}</pre>
        </div>)}
      </div>
    </CardContent>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Start {feed.name}?</DialogTitle><DialogDescription>One hour per topic: Analyst 5 CR, Professional 15 CR, Enterprise 50 CR. Your active tier determines the charge. Reconnecting before expiry does not charge again. Stopping does not refund or renew access.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setConfirm(false)}>Cancel</Button><Button onClick={()=>{setConfirm(false); void f.connect();}}>Start paid session</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={inspect} onOpenChange={setInspect}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Packet #{latest?.id}</DialogTitle><DialogDescription>Source aggregates are not on-chain consent proofs. Shared data counts require explicit consent and at least ten contributors.</DialogDescription></DialogHeader><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(latest?.payload,null,2)}</pre></DialogContent></Dialog>
  </Card>;
}