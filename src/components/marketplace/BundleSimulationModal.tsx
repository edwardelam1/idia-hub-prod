import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlayCircle, 
  Shield, 
  Database, 
  CheckCircle2, 
  Loader2,
  Hash,
  Clock,
  Users,
  TrendingUp,
  FileJson,
  Lock,
  Zap,
  TableIcon,
  FileText
} from 'lucide-react';

interface BundleSimulationModalProps {
  bundle: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoRun?: boolean;
}

interface SimulatedDataRecord {
  recordId: string;
  acaRecordId: string;
  dataCategory: string;
  anonymizedFields: number;
  qualityScore: number;
  timestamp: string;
}

interface RawDataRecord {
  id: string;
  anonymizedId: string;
  ageRange: string;
  region: string;
  incomeRange: string;
  category: string;
  activityLevel: string;
  healthScore: number;
  engagementIndex: number;
  lastActive: string;
  dataPoints: number;
  consentStatus: string;
}

interface SimulationResult {
  totalRecords: number;
  processedRecords: number;
  anonymizationLevel: string;
  differentialPrivacyEpsilon: number;
  dataQualityScore: number;
  liabilityTokenGenerated: boolean;
  liabilityToken: string;
  estimatedCredits: number;
  sampleRecords: SimulatedDataRecord[];
  rawDataRecords: RawDataRecord[];
  complianceChecks: {
    name: string;
    status: 'passed' | 'failed';
    details: string;
  }[];
}

const BundleSimulationModal = ({ bundle, open: controlledOpen, onOpenChange, autoRun = false }: BundleSimulationModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [hasAutoRun, setHasAutoRun] = useState(false);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const generateHash = (length: number = 16) => {
    const chars = '0123456789abcdef';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setProgress(0);
    setResult(null);

    // Simulate processing with progress updates
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress((i / steps) * 100);
    }

    // Generate simulated results
    const totalRecords = bundle.contacts || Math.floor(Math.random() * 50000) + 10000;
    const sampleRecords: SimulatedDataRecord[] = Array.from({ length: 5 }, (_, i) => ({
      recordId: `REC-${generateHash(8)}`,
      acaRecordId: `ACA-${generateHash(16)}`,
      dataCategory: ['Health Metrics', 'Activity Data', 'Sleep Patterns', 'Biometrics', 'Lifestyle'][i % 5],
      anonymizedFields: Math.floor(Math.random() * 20) + 10,
      qualityScore: Math.floor(Math.random() * 20) + 80,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
    }));

    // Generate raw data records for preview
    const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const regions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Pacific'];
    const incomeRanges = ['$25K-$50K', '$50K-$75K', '$75K-$100K', '$100K-$150K', '$150K+'];
    const categories = ['Premium Consumer', 'Active Lifestyle', 'Health Conscious', 'Tech Savvy', 'Wellness Seeker'];
    const activityLevels = ['Very Active', 'Active', 'Moderate', 'Light', 'Sedentary'];

    const rawDataRecords: RawDataRecord[] = Array.from({ length: 25 }, (_, i) => ({
      id: `${generateHash(8).toUpperCase()}`,
      anonymizedId: `ANON-${generateHash(12)}`,
      ageRange: ageRanges[Math.floor(Math.random() * ageRanges.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      incomeRange: incomeRanges[Math.floor(Math.random() * incomeRanges.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      activityLevel: activityLevels[Math.floor(Math.random() * activityLevels.length)],
      healthScore: Math.floor(Math.random() * 30) + 70,
      engagementIndex: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)),
      lastActive: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString().split('T')[0],
      dataPoints: Math.floor(Math.random() * 500) + 100,
      consentStatus: 'Verified'
    }));

    setResult({
      totalRecords,
      processedRecords: Math.floor(totalRecords * 0.98),
      anonymizationLevel: 'k-anonymity (k=50)',
      differentialPrivacyEpsilon: 0.1,
      dataQualityScore: Math.floor(Math.random() * 10) + 90,
      liabilityTokenGenerated: true,
      liabilityToken: `LT-${generateHash(64)}`,
      estimatedCredits: bundle.price || Math.floor(Math.random() * 2000) + 500,
      sampleRecords,
      rawDataRecords,
      complianceChecks: [
        { name: 'GDPR Compliance', status: 'passed', details: 'All PII properly anonymized' },
        { name: 'CCPA Compliance', status: 'passed', details: 'Consumer rights preserved' },
        { name: 'HIPAA De-identification', status: 'passed', details: 'Safe Harbor method applied' },
        { name: 'Differential Privacy', status: 'passed', details: 'ε = 0.1 noise injection' },
        { name: 'ACA Consent Verification', status: 'passed', details: 'All records have valid consent' },
        { name: 'DigiRAMP Anchoring', status: 'passed', details: 'Provenance chain verified' }
      ]
    });

    setIsSimulating(false);
    setSimulationComplete(true);
  };

  const resetSimulation = () => {
    setSimulationComplete(false);
    setProgress(0);
    setResult(null);
    setHasAutoRun(false);
  };

  // Auto-run simulation when modal opens in controlled mode
  useEffect(() => {
    if (open && autoRun && !hasAutoRun && !isSimulating && !simulationComplete) {
      setHasAutoRun(true);
      runSimulation();
    }
  }, [open, autoRun, hasAutoRun, isSimulating, simulationComplete]);

  // Reset hasAutoRun when modal closes
  useEffect(() => {
    if (!open) {
      setHasAutoRun(false);
    }
  }, [open]);

  // In controlled mode, don't render a trigger button
  const renderTrigger = !isControlled;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
            <PlayCircle className="h-3 w-3" />
            Run Simulation
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Data Bundle Simulation
          </DialogTitle>
          <DialogDescription>
            Simulate data egress with Liability Shield protocol for "{bundle.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bundle Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{bundle.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{bundle.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{bundle.tier}</Badge>
                    <Badge variant="secondary">{bundle.category}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-purple-600 font-semibold">
                    <Database className="h-4 w-4 mr-1" />
                    {bundle.contacts?.toLocaleString() || 'N/A'} records
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {(isSimulating || simulationComplete) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Simulation Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Simulation Results */}
          {simulationComplete && result && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="rawdata" className="gap-1">
                  <TableIcon className="h-3.5 w-3.5" />
                  Raw Data
                </TabsTrigger>
                <TabsTrigger value="compliance" className="gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Compliance
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total Records</p>
                          <p className="font-semibold">{result.totalRecords.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Processed</p>
                          <p className="font-semibold">{result.processedRecords.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Quality Score</p>
                          <p className="font-semibold">{result.dataQualityScore}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Privacy ε</p>
                          <p className="font-semibold">{result.differentialPrivacyEpsilon}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Liability Token */}
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                      <Shield className="h-4 w-4" />
                      DELT Liability Token Generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-2 bg-background rounded border font-mono text-xs break-all">
                      {result.liabilityToken}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This token serves as the immutable "Digital Receipt" for data egress compliance.
                    </p>
                  </CardContent>
                </Card>

                {/* Sample Records */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Sample Data Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.sampleRecords.map((record, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-xs">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {record.recordId}
                            </Badge>
                            <span className="text-muted-foreground">{record.dataCategory}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{record.anonymizedFields} fields</span>
                            <Badge 
                              variant="outline" 
                              className={`${record.qualityScore >= 90 ? 'text-green-600 border-green-500/20' : 'text-amber-600 border-amber-500/20'}`}
                            >
                              {record.qualityScore}% quality
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Raw Data Tab */}
              <TabsContent value="rawdata" className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        Anonymized Dataset Preview
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        Showing {result.rawDataRecords?.length || 0} of {result.totalRecords.toLocaleString()} records
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px] w-full">
                      <div className="min-w-[800px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold text-xs w-[100px]">ID</TableHead>
                              <TableHead className="font-semibold text-xs">Anonymized ID</TableHead>
                              <TableHead className="font-semibold text-xs">Age Range</TableHead>
                              <TableHead className="font-semibold text-xs">Region</TableHead>
                              <TableHead className="font-semibold text-xs">Income</TableHead>
                              <TableHead className="font-semibold text-xs">Category</TableHead>
                              <TableHead className="font-semibold text-xs">Activity</TableHead>
                              <TableHead className="font-semibold text-xs text-center">Health</TableHead>
                              <TableHead className="font-semibold text-xs text-center">Engagement</TableHead>
                              <TableHead className="font-semibold text-xs">Last Active</TableHead>
                              <TableHead className="font-semibold text-xs text-center">Data Pts</TableHead>
                              <TableHead className="font-semibold text-xs">Consent</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(result.rawDataRecords || []).map((record, idx) => (
                              <TableRow key={idx} className="text-xs hover:bg-muted/30">
                                <TableCell className="font-mono text-muted-foreground">{record.id}</TableCell>
                                <TableCell className="font-mono text-xs">{record.anonymizedId}</TableCell>
                                <TableCell>{record.ageRange}</TableCell>
                                <TableCell>{record.region}</TableCell>
                                <TableCell>{record.incomeRange}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {record.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs font-normal ${
                                      record.activityLevel === 'Very Active' ? 'bg-green-100 text-green-700' :
                                      record.activityLevel === 'Active' ? 'bg-blue-100 text-blue-700' :
                                      record.activityLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {record.activityLevel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`font-medium ${record.healthScore >= 85 ? 'text-green-600' : record.healthScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {record.healthScore}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center font-mono">{record.engagementIndex}</TableCell>
                                <TableCell className="text-muted-foreground">{record.lastActive}</TableCell>
                                <TableCell className="text-center">{record.dataPoints}</TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-700 text-xs font-normal">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {record.consentStatus}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                    <div className="p-3 border-t bg-muted/30">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        All personal identifiers have been tokenized using k-anonymity (k=50) and differential privacy (ε=0.1)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      Compliance Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {result.complianceChecks.map((check, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            check.status === 'passed' 
                              ? 'border-green-500/20 bg-green-500/5' 
                              : 'border-red-500/20 bg-red-500/5'
                          }`}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${
                            check.status === 'passed' ? 'text-green-500' : 'text-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{check.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{check.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Anonymization Details */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Anonymization Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Method</p>
                        <p className="font-medium">{result.anonymizationLevel}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Differential Privacy</p>
                        <p className="font-medium">ε = {result.differentialPrivacyEpsilon}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">PII Fields Removed</p>
                        <p className="font-medium">Name, SSN, Email, Phone, Address</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Generalization Applied</p>
                        <p className="font-medium">Age → Range, Location → Region</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Credits Estimate - show after simulation */}
          {simulationComplete && result && (
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-700">Estimated Credit Cost</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{result.estimatedCredits} credits</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!simulationComplete ? (
              <Button 
                onClick={runSimulation} 
                disabled={isSimulating}
                className="flex-1"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Data Simulation
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={resetSimulation}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button 
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BundleSimulationModal;
