import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Copy, Check, Plus, Trash2, ShieldAlert, Loader2 } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
}

export default function APIKeyManagement() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setKeys(data);
    setLoading(false);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate secure key components
    const rawKey = `idia_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
    const prefix = rawKey.substring(0, 12);
    
    // In production, the rawKey should be hashed before saving to the DB.
    // For this demo, we store a mock hash.
    const { data, error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      name: newKeyName,
      key_prefix: prefix,
      key_hash: 'hashed_value_hidden', 
      environment: 'production'
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setKeys([data, ...keys]);
    setGeneratedKey(rawKey);
    setNewKeyName('');
    toast({ title: 'API Key Created', description: 'Store this key securely. It will not be shown again.' });
  };

  const handleRevokeKey = async (id: string) => {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setKeys(keys.filter(k => k.id !== id));
      toast({ title: 'Key Revoked', description: 'The API key has been permanently disabled.' });
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-muted-foreground">Manage your authentication keys for Vault access.</p>
        </div>
        <Dialog open={showNewKeyModal} onOpenChange={(open) => {
          setShowNewKeyModal(open);
          if (!open) setGeneratedKey(null);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Generate New Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>Create a new key to authenticate requests against the Data Vault.</DialogDescription>
            </DialogHeader>
            {!generatedKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input 
                    placeholder="e.g., Production Backend Sync" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateKey}>Generate Secure Key</Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    <strong>Copy this key now.</strong> For security reasons, you will not be able to view it again after closing this window.
                  </p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  <span className="flex-1">{generatedKey}</span>
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : keys.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No API keys generated yet.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Prefix</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map((key) => (
                  <tr key={key.id} className="bg-background">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      {key.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{key.key_prefix}••••••••</td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        {key.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRevokeKey(key.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
