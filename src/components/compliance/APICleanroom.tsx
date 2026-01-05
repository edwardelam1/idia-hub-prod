
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Database, 
  Shield, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Server,
  Link,
  Lock,
  Eye,
  RefreshCw,
  FileJson
} from 'lucide-react';

interface APIConnection {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'paused' | 'error' | 'pending';
  lastSync: string;
  recordsIngested: number;
  cleanroomStatus: 'processing' | 'validated' | 'quarantined' | 'ready';
  dataQuality: number;
  endpoint: string;
}

interface CleanroomJob {
  id: string;
  connectionId: string;
  connectionName: string;
  status: 'queued' | 'parsing' | 'validating' | 'transforming' | 'complete' | 'failed';
  progress: number;
  recordsProcessed: number;
  recordsQuarantined: number;
  startedAt: string;
  errors: string[];
}

const APICleanroom = () => {
  const [connections, setConnections] = useState<APIConnection[]>([
    {
      id: '1',
      name: 'Salesforce Health Cloud',
      provider: 'Salesforce',
      status: 'active',
      lastSync: '2024-01-15 10:30',
      recordsIngested: 45230,
      cleanroomStatus: 'ready',
      dataQuality: 94,
      endpoint: 'https://api.salesforce.com/health/v2'
    },
    {
      id: '2',
      name: 'Epic Systems FHIR',
      provider: 'Epic',
      status: 'active',
      lastSync: '2024-01-15 09:15',
      recordsIngested: 128450,
      cleanroomStatus: 'validated',
      dataQuality: 98,
      endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4'
    },
    {
      id: '3',
      name: 'Cerner PowerChart',
      provider: 'Oracle Cerner',
      status: 'paused',
      lastSync: '2024-01-14 18:45',
      recordsIngested: 67890,
      cleanroomStatus: 'quarantined',
      dataQuality: 72,
      endpoint: 'https://fhir.cerner.com/r4'
    },
    {
      id: '4',
      name: 'AWS HealthLake',
      provider: 'Amazon',
      status: 'pending',
      lastSync: 'Never',
      recordsIngested: 0,
      cleanroomStatus: 'processing',
      dataQuality: 0,
      endpoint: 'https://healthlake.us-east-1.amazonaws.com'
    }
  ]);

  const [cleanroomJobs, setCleanroomJobs] = useState<CleanroomJob[]>([
    {
      id: 'job-1',
      connectionId: '2',
      connectionName: 'Epic Systems FHIR',
      status: 'complete',
      progress: 100,
      recordsProcessed: 15420,
      recordsQuarantined: 23,
      startedAt: '2024-01-15 08:00',
      errors: []
    },
    {
      id: 'job-2',
      connectionId: '3',
      connectionName: 'Cerner PowerChart',
      status: 'validating',
      progress: 65,
      recordsProcessed: 8934,
      recordsQuarantined: 156,
      startedAt: '2024-01-15 10:15',
      errors: ['Schema mismatch in patient demographics', 'Invalid date format detected']
    },
    {
      id: 'job-3',
      connectionId: '1',
      connectionName: 'Salesforce Health Cloud',
      status: 'queued',
      progress: 0,
      recordsProcessed: 0,
      recordsQuarantined: 0,
      startedAt: '2024-01-15 11:00',
      errors: []
    }
  ]);

  const [showAddConnection, setShowAddConnection] = useState(false);

  const getStatusColor = (status: APIConnection['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getCleanroomBadge = (status: APIConnection['cleanroomStatus']) => {
    switch (status) {
      case 'ready': return <Badge className="bg-green-500/20 text-green-700">Ready</Badge>;
      case 'validated': return <Badge className="bg-blue-500/20 text-blue-700">Validated</Badge>;
      case 'processing': return <Badge className="bg-yellow-500/20 text-yellow-700">Processing</Badge>;
      case 'quarantined': return <Badge variant="destructive">Quarantined</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getJobStatusIcon = (status: CleanroomJob['status']) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'queued': return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">{connections.filter(c => c.status === 'active').length}</p>
              </div>
              <Link className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Records in Cleanroom</p>
                <p className="text-2xl font-bold">
                  {cleanroomJobs.reduce((acc, job) => acc + job.recordsProcessed, 0).toLocaleString()}
                </p>
              </div>
              <Database className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quarantined Records</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {cleanroomJobs.reduce((acc, job) => acc + job.recordsQuarantined, 0).toLocaleString()}
                </p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Data Quality</p>
                <p className="text-2xl font-bold">
                  {Math.round(connections.filter(c => c.dataQuality > 0).reduce((acc, c) => acc + c.dataQuality, 0) / 
                    connections.filter(c => c.dataQuality > 0).length)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Enterprise API Connections
              </CardTitle>
              <CardDescription>Manage 3rd party data ingestion endpoints with isolated cleanroom processing</CardDescription>
            </div>
            <Button onClick={() => setShowAddConnection(!showAddConnection)}>
              <Link className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddConnection && (
            <Card className="mb-4 border-dashed">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Connection Name</label>
                    <Input placeholder="e.g., Salesforce CRM" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">API Endpoint</label>
                    <Input placeholder="https://api.example.com/v1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">API Key</label>
                    <Input type="password" placeholder="••••••••••••" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm">Test Connection</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddConnection(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {connections.map(connection => (
              <div key={connection.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(connection.status)}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{connection.name}</span>
                      {getCleanroomBadge(connection.cleanroomStatus)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {connection.provider} • Last sync: {connection.lastSync}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-md">
                      {connection.endpoint}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{connection.recordsIngested.toLocaleString()} records</div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-muted-foreground">Quality:</span>
                      <span className={connection.dataQuality >= 90 ? 'text-green-600' : connection.dataQuality >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                        {connection.dataQuality}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {connection.status === 'active' ? (
                      <Button size="icon" variant="ghost" title="Pause">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Resume">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Delete" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cleanroom Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cleanroom Processing Queue
          </CardTitle>
          <CardDescription>
            Isolated environment for parsing and validating external data before database integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Data Isolation Protocol</h4>
                <p className="text-sm text-muted-foreground">
                  All ingested data is processed in an isolated cleanroom environment. Data is validated, 
                  transformed, and sanitized before being staged for approval. No external data touches the 
                  production database until it passes all compliance checks.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {cleanroomJobs.map(job => (
              <div key={job.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getJobStatusIcon(job.status)}
                    <div>
                      <span className="font-medium">{job.connectionName}</span>
                      <Badge variant="outline" className="ml-2 capitalize">{job.status}</Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Started: {job.startedAt}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Records Processed</span>
                    <p className="font-medium">{job.recordsProcessed.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quarantined</span>
                    <p className="font-medium text-yellow-600">{job.recordsQuarantined.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pass Rate</span>
                    <p className="font-medium">
                      {job.recordsProcessed > 0 
                        ? ((1 - job.recordsQuarantined / job.recordsProcessed) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors</span>
                    <p className="font-medium text-red-600">{job.errors.length}</p>
                  </div>
                </div>

                {job.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Validation Errors</span>
                    </div>
                    <ul className="text-sm text-red-600 space-y-1">
                      {job.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.status === 'complete' && (
                  <div className="flex gap-2 mt-4">
                    <Button size="sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve for Integration
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileJson className="h-4 w-4 mr-2" />
                      Review Data
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APICleanroom;
