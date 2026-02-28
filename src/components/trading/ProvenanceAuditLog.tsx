import { useState, useEffect } from 'react';
import { ShieldCheck, Copy, CheckCircle2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProvenanceLog {
  provenance_id: string;
  egress_timestamp: string;
  liability_token_hash: string;
  aca_record_reference: string;
  hri_score_at_egress: number;
  country_of_origin: string;
}

interface ProvenanceAuditLogProps {
  clientId?: string;
}

const ProvenanceAuditLog = ({ clientId }: ProvenanceAuditLogProps) => {
  const { user } = useAuth();
  const resolvedClientId = clientId || user?.user_id || 'ENT-MOCK';

  const [logs, setLogs] = useState<ProvenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await fetchApi(`/api/v1/delt/logs?client_id=${resolvedClientId}`);
        setLogs(data.logs || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load DigiRAMP Provenance Logs.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [resolvedClientId]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash;
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
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Provenance Audit Logs
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Immutable cryptographic receipts for all Liability Shield protocol transfers.
            </p>
          </div>
          <div className="bg-background px-4 py-2 rounded-lg border border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-mono text-sm">
              Total Records: {logs.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider">Egress Timestamp</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Liability Token Hash</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">ACA Reference</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">HRI Score</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No Liability Shield transfers recorded for this organization.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.provenance_id}>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {new Date(log.egress_timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                        {truncateHash(log.liability_token_hash)}
                      </span>
                      <button
                        onClick={() => handleCopy(log.liability_token_hash)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy Full Hash"
                      >
                        {copiedHash === log.liability_token_hash ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground bg-muted px-2 py-1 rounded text-xs">
                        {truncateHash(log.aca_record_reference)}
                      </span>
                      <button
                        onClick={() => handleCopy(log.aca_record_reference)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy Full ACA Reference"
                      >
                        {copiedHash === log.aca_record_reference ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono px-2 py-1 rounded text-xs font-medium ${
                      log.hri_score_at_egress >= 80
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.hri_score_at_egress.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {log.country_of_origin}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProvenanceAuditLog;
