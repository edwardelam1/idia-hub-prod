import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const APIKeyManagement = () => {
  const [showKey1, setShowKey1] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [showKey3, setShowKey3] = useState(false);

  const mockKeys = [
    {
      id: "key-1",
      name: "Production Trading System",
      key: "idia_live_3k7j9m2n4p6q8r1s5t7v9w2x4y6z8a1b",
      created: "2025-10-15",
      lastUsed: "2 minutes ago",
      calls: 45678,
      status: "active"
    },
    {
      id: "key-2",
      name: "Backtesting Environment",
      key: "idia_test_9w2x4y6z8a1b3c5d7e9f1g3h5j7k9m2n",
      created: "2025-09-20",
      lastUsed: "1 hour ago",
      calls: 12345,
      status: "active"
    },
    {
      id: "key-3",
      name: "Development Sandbox",
      key: "idia_dev_4p6q8r1s5t7v9w2x4y6z8a1b3c5d7e9f",
      created: "2025-08-10",
      lastUsed: "Never",
      calls: 0,
      status: "inactive"
    }
  ];

  const copyToClipboard = (key: string, name: string) => {
    navigator.clipboard.writeText(key);
    toast.success(`API key "${name}" copied to clipboard`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Secure cryptographic keys for API authentication
              </CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Generate New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockKeys.map((keyData, index) => {
              const showKey = index === 0 ? showKey1 : index === 1 ? showKey2 : showKey3;
              const setShowKey = index === 0 ? setShowKey1 : index === 1 ? setShowKey2 : setShowKey3;

              return (
                <div key={keyData.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{keyData.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Created: {keyData.created} • Last used: {keyData.lastUsed}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        keyData.status === "active" 
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      }
                    >
                      {keyData.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={keyData.key}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(keyData.key, keyData.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{keyData.calls.toLocaleString()}</span> API calls
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Never share API keys in public repositories or client-side code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Rotate keys regularly and immediately revoke compromised keys</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Use separate keys for production, testing, and development environments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>All API calls are logged and audited for compliance (SEC-S-1.4 TOMS)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
