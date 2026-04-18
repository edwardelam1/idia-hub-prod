import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Copy, CheckCircle2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ProvenanceLog {
  id: string;
  created_at: string;
  liability_token_hash: string;
  aca_record_references: string[];
  country_of_origin: string;
  digiramp_anchor_id: string;
  egress_type: string;
  client_id: string;
  user_id?: string;
}

const ProvenanceAuditLog = ({ clientId }: { clientId?: string }) => {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('egress-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'egress_logs' },
        (payload) => {
          queryClient.setQueryData<ProvenanceLog[]>(['provenance-logs', userId], (old = []) => {
            const newLog = payload.new as ProvenanceLog;
            if (newLog.user_id && newLog.user_id !== userId) return old;
            if (old.some((l) => l.id === newLog.id)) return old;
            return [newLog, ...old];
          });
          queryClient.invalidateQueries({ queryKey: ['provenance-logs', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['provenance-logs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('egress_logs')
        .select('id, created_at, liability_token_hash, aca_record_references, country_of_origin, digiramp_anchor_id, egress_type, client_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ProvenanceLog[];
    },
    enabled: !!userId,
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash || '—';
    return `${hash.substring(0, 8)}…${hash.substring(hash.length - 8)}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border w-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Synchronizing with DigiRAMP Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-4 bg-destructive/10 border border-destructive/50 rounded-xl w-full">
        <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full overflow-hidden">
        <div className="bg-muted/50 p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Provenance Audit Logs
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Immutable cryptographic receipts for all Liability Shield protocol transfers.
            </p>
          </div>
          <div className="bg-background px-4 py-2 rounded-lg border border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-mono text-sm">Total Records: {logs.length}</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider">Egress Timestamp</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Liability Token Hash</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">ACA References</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">DigiRAMP Anchor</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No Liability Shield transfers recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const acaJoined = (log.aca_record_references || []).join(', ');
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                          {truncateHash(log.liability_token_hash)}
                        </span>
                        <button onClick={() => handleCopy(log.liability_token_hash)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy Full Hash">
                          {copiedHash === log.liability_token_hash ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground bg-muted px-2 py-1 rounded text-xs">
                          {truncateHash(acaJoined)}
                        </span>
                        {acaJoined && (
                          <button onClick={() => handleCopy(acaJoined)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {copiedHash === acaJoined ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground text-xs">
                        {truncateHash(log.digiramp_anchor_id)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">{log.country_of_origin}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProvenanceAuditLog;
