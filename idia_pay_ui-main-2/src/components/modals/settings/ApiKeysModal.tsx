import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Key, Eye, EyeOff, Copy, Plus, Trash2 } from "lucide-react";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
}

export const ApiKeysModal = ({ isOpen, onClose }: ApiKeysModalProps) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "POS Terminal Integration",
      key: "sk_live_abcd1234567890",
      permissions: ["read:transactions", "write:transactions"],
      createdAt: "2024-01-15",
      lastUsed: "2024-01-20",
      isActive: true
    }
  ]);

  const [showKeys, setShowKeys] = useState<{[key: string]: boolean}>({});
  const [newKeyName, setNewKeyName] = useState("");
  const { toast } = useToast();

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  const generateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the API key.",
        variant: "destructive"
      });
      return;
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      permissions: ["read:basic"],
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: "Never",
      isActive: true
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    toast({
      title: "API Key Generated",
      description: "New API key has been created successfully.",
    });
  };

  const deleteApiKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== keyId));
    toast({
      title: "API Key Deleted",
      description: "The API key has been permanently deleted.",
    });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${'*'.repeat(20)}${key.substring(key.length - 4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            API Keys & Security
          </DialogTitle>
          <DialogDescription>
            Manage API keys, security settings, and access permissions for integrations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">API Keys</h3>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Generate New API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter key name (e.g., POS Integration)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={generateApiKey}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        <CardTitle className="text-base">{apiKey.name}</CardTitle>
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteApiKey(apiKey.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>API Key</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <div>{apiKey.createdAt}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Last Used</Label>
                        <div>{apiKey.lastUsed}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Permissions</Label>
                        <div className="flex flex-wrap gap-1">
                          {apiKey.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="webhookSecret">Webhook Secret</Label>
                    <Input
                      id="webhookSecret"
                      type="password"
                      placeholder="Enter webhook secret"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimitRpm">Rate Limit (requests/minute)</Label>
                    <Input
                      id="rateLimitRpm"
                      type="number"
                      defaultValue="1000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="allowedIps">Allowed IP Addresses (optional)</Label>
                  <Input
                    id="allowedIps"
                    placeholder="192.168.1.0/24, 10.0.0.1 (comma separated)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};