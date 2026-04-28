import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Package, ExternalLink, Settings, Check, X } from "lucide-react";

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  isConnected: boolean;
  isConfigured: boolean;
  logo: string;
  settings?: { [key: string]: any };
}

export const IntegrationsModal = ({ isOpen, onClose }: IntegrationsModalProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "stripe",
      name: "Stripe",
      description: "Payment processing and financial services",
      category: "Payment",
      isConnected: true,
      isConfigured: true,
      logo: "💳",
      settings: { apiKey: "sk_test_..." }
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Accounting and bookkeeping integration",
      category: "Accounting",
      isConnected: false,
      isConfigured: false,
      logo: "📊"
    },
    {
      id: "mailchimp",
      name: "Mailchimp",
      description: "Email marketing and customer communication",
      category: "Marketing",
      isConnected: true,
      isConfigured: false,
      logo: "📧",
      settings: { apiKey: "" }
    },
    {
      id: "slack",
      name: "Slack",
      description: "Team communication and notifications",
      category: "Communication",
      isConnected: false,
      isConfigured: false,
      logo: "💬"
    },
    {
      id: "uber-eats",
      name: "Uber Eats",
      description: "Food delivery platform integration",
      category: "Delivery",
      isConnected: true,
      isConfigured: true,
      logo: "🚗"
    },
    {
      id: "doordash",
      name: "DoorDash",
      description: "Food delivery and logistics",
      category: "Delivery",
      isConnected: false,
      isConfigured: false,
      logo: "🚚"
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();

  const toggleIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, isConnected: !integration.isConnected }
        : integration
    ));

    const integration = integrations.find(i => i.id === integrationId);
    toast({
      title: `${integration?.name} ${integration?.isConnected ? 'Disconnected' : 'Connected'}`,
      description: `${integration?.name} integration has been ${integration?.isConnected ? 'disabled' : 'enabled'}.`,
    });
  };

  const configureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
  };

  const saveIntegrationConfig = () => {
    if (selectedIntegration) {
      setIntegrations(prev => prev.map(integration => 
        integration.id === selectedIntegration.id 
          ? { ...integration, isConfigured: true }
          : integration
      ));
      
      toast({
        title: "Configuration Saved",
        description: `${selectedIntegration.name} has been configured successfully.`,
      });
      
      setSelectedIntegration(null);
    }
  };

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Third-party Integrations
          </DialogTitle>
          <DialogDescription>
            Connect and manage third-party services and APIs to extend your business capabilities.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3">{category}</h3>
              <div className="grid gap-3">
                {integrations
                  .filter(integration => integration.category === category)
                  .map((integration) => (
                    <Card key={integration.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{integration.logo}</span>
                            <div>
                              <CardTitle className="text-base">{integration.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{integration.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {integration.isConnected && (
                              <Badge variant={integration.isConfigured ? "default" : "secondary"}>
                                {integration.isConfigured ? (
                                  <><Check className="h-3 w-3 mr-1" />Configured</>
                                ) : (
                                  <><Settings className="h-3 w-3 mr-1" />Setup Required</>
                                )}
                              </Badge>
                            )}
                            <Switch
                              checked={integration.isConnected}
                              onCheckedChange={() => toggleIntegration(integration.id)}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      {integration.isConnected && (
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {integration.isConfigured ? "Connected and configured" : "Connected but needs configuration"}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => configureIntegration(integration)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </Button>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {selectedIntegration && (
          <Card>
            <CardHeader>
              <CardTitle>Configure {selectedIntegration.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedIntegration.id === 'stripe' && (
                <>
                  <div>
                    <Label htmlFor="stripeApiKey">Stripe API Key</Label>
                    <Input
                      id="stripeApiKey"
                      type="password"
                      placeholder="sk_test_..."
                      defaultValue={selectedIntegration.settings?.apiKey}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stripeWebhook">Webhook Endpoint</Label>
                    <Input
                      id="stripeWebhook"
                      placeholder="https://your-domain.com/webhooks/stripe"
                    />
                  </div>
                </>
              )}
              
              {selectedIntegration.id === 'mailchimp' && (
                <>
                  <div>
                    <Label htmlFor="mailchimpApiKey">Mailchimp API Key</Label>
                    <Input
                      id="mailchimpApiKey"
                      type="password"
                      placeholder="Enter your Mailchimp API key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mailchimpList">Default List ID</Label>
                    <Input
                      id="mailchimpList"
                      placeholder="List ID for customer emails"
                    />
                  </div>
                </>
              )}

              {selectedIntegration.id === 'quickbooks' && (
                <>
                  <div>
                    <Label htmlFor="qbCompanyId">Company ID</Label>
                    <Input
                      id="qbCompanyId"
                      placeholder="QuickBooks Company ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qbSandbox">Sandbox Mode</Label>
                    <Switch id="qbSandbox" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
                  Cancel
                </Button>
                <Button onClick={saveIntegrationConfig}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};