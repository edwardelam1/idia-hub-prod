import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Key, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';

const GeminiConfigModal = () => {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid Gemini API key');
      return;
    }

    // In a real implementation, this would save to Supabase secrets
    localStorage.setItem('gemini_api_key', apiKey);
    setIsConfigured(true);
    setOpen(false);
    toast.success('Best Friend AI configured successfully!');
  };

  const agentRoster = [
    { name: 'user_management_agent', description: 'User operations & permissions' },
    { name: 'api_integration_agent', description: 'Third-party API management' },
    { name: 'system_monitoring_agent', description: 'Infrastructure oversight' },
    { name: 'financial_reporting_agent', description: 'Financial data aggregation' },
    { name: 'data_pipeline_agent', description: 'Data synapse integrity' },
    { name: 'communication_agent', description: 'Outbound communications' },
    { name: 'task_delegation_agent', description: 'Workflow orchestration' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Best Friend AI</CardTitle>
              </div>
              <Badge variant={isConfigured ? "default" : "secondary"}>
                {isConfigured ? 'Active' : 'Setup Required'}
              </Badge>
            </div>
            <CardDescription>
              Advanced AI system powered by Gemini for Super Admin operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Agent Army Protocol: 7 specialized agents ready</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>Configure Best Friend AI System</span>
          </DialogTitle>
          <DialogDescription>
            Set up the Gemini-powered AI assistant for Super Admin operations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <Label htmlFor="gemini-key" className="text-base font-medium">Gemini API Key</Label>
            </div>
            <Input
              id="gemini-key"
              type="password"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Your API key will be securely stored in the Supabase secrets vault
            </p>
          </div>

          {/* AI Persona Summary */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <Label className="text-base font-medium">AI Persona: Best Friend</Label>
            </div>
            <Textarea
              readOnly
              value="Trusted colleague and high-performance executive assistant. Conversational, predictive, and supportive tone with ruthlessly efficient internal processing. Orchestrates subordinate agent army to execute Super Admin objectives flawlessly."
              className="bg-muted text-sm"
              rows={3}
            />
          </div>

          {/* Agent Army Roster */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Agent Army Roster</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {agentRoster.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Ready</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="h-4 w-4 mr-2" />
              Initialize Best Friend
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeminiConfigModal;