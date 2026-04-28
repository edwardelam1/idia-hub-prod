import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, Users, Calendar, Smartphone, DollarSign, 
  Nfc, CheckCircle, XCircle, Loader2, Wallet, ArrowRight,
  Shield, Zap, Radio
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  total_hours: number;
  overtime_hours: number;
  gross_pay: number;
}

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PayrollMode = 'batch' | 'tap-to-pay' | 'nfc-active';

interface NfcPaymentState {
  status: 'idle' | 'searching' | 'connected' | 'transferring' | 'completed' | 'failed';
  employeeId: string | null;
  progress: number;
  message: string;
}

export const ProcessPayrollModal = ({ isOpen, onClose }: ProcessPayrollModalProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [useIdiaUsd, setUseIdiaUsd] = useState(true);
  const [payrollMode, setPayrollMode] = useState<PayrollMode>('batch');
  const [nfcState, setNfcState] = useState<NfcPaymentState>({
    status: 'idle',
    employeeId: null,
    progress: 0,
    message: ''
  });
  const [currentTapEmployee, setCurrentTapEmployee] = useState<Employee | null>(null);
  const [completedPayments, setCompletedPayments] = useState<string[]>([]);
  const { toast } = useToast();

  // Mock employee data for demo
  const mockEmployees: Employee[] = [
    { id: 'emp-001', name: 'Sarah Johnson', role: 'Team Lead', hourly_rate: 22, total_hours: 40, overtime_hours: 4, gross_pay: 1012 },
    { id: 'emp-002', name: 'Michael Chen', role: 'Shift Manager', hourly_rate: 20, total_hours: 38, overtime_hours: 2, gross_pay: 820 },
    { id: 'emp-003', name: 'Emily Rodriguez', role: 'Associate', hourly_rate: 16, total_hours: 32, overtime_hours: 0, gross_pay: 512 },
    { id: 'emp-004', name: 'James Williams', role: 'Associate', hourly_rate: 16, total_hours: 40, overtime_hours: 6, gross_pay: 784 },
    { id: 'emp-005', name: 'Amanda Foster', role: 'Supervisor', hourly_rate: 18, total_hours: 40, overtime_hours: 3, gross_pay: 801 },
  ];

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setPayPeriodStart(weekAgo.toISOString().split('T')[0]);
      setPayPeriodEnd(today.toISOString().split('T')[0]);
      setEmployees(mockEmployees);
      setSelectedEmployees(mockEmployees.map(emp => emp.id));
      setCompletedPayments([]);
      setPayrollMode('batch');
      setNfcState({ status: 'idle', employeeId: null, progress: 0, message: '' });
    }
  }, [isOpen]);

  const startTapToPay = (employee: Employee) => {
    setCurrentTapEmployee(employee);
    setPayrollMode('nfc-active');
    setNfcState({
      status: 'searching',
      employeeId: employee.id,
      progress: 0,
      message: 'Searching for IDIA Life device...'
    });

    // Simulate NFC discovery
    setTimeout(() => {
      setNfcState(prev => ({
        ...prev,
        status: 'connected',
        progress: 25,
        message: `Connected to ${employee.name}'s IDIA Life`
      }));

      // Simulate transfer
      setTimeout(() => {
        setNfcState(prev => ({
          ...prev,
          status: 'transferring',
          progress: 60,
          message: `Transferring $${employee.gross_pay.toFixed(2)} IDIA-USD...`
        }));

        // Simulate completion
        setTimeout(() => {
          setNfcState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
            message: 'Payment completed successfully!'
          }));
          setCompletedPayments(prev => [...prev, employee.id]);
          
          toast({
            title: "Tap-to-Pay Complete",
            description: `$${employee.gross_pay.toFixed(2)} paid to ${employee.name}`,
          });
        }, 1500);
      }, 1200);
    }, 2000);
  };

  const cancelNfcPayment = () => {
    setNfcState({ status: 'idle', employeeId: null, progress: 0, message: '' });
    setPayrollMode('tap-to-pay');
    setCurrentTapEmployee(null);
  };

  const resetToEmployeeList = () => {
    setNfcState({ status: 'idle', employeeId: null, progress: 0, message: '' });
    setPayrollMode('tap-to-pay');
    setCurrentTapEmployee(null);
  };

  const processPayroll = () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "No Employees Selected",
        description: "Please select employees to process payroll",
        variant: "destructive"
      });
      return;
    }

    const selectedEmployeeData = employees.filter(emp => selectedEmployees.includes(emp.id));
    const totalPayrollAmount = selectedEmployeeData.reduce((sum, emp) => sum + emp.gross_pay, 0);

    toast({
      title: "Payroll Processed",
      description: `$${totalPayrollAmount.toFixed(2)} paid to ${selectedEmployees.length} employees via ${useIdiaUsd ? 'IDIA-USD' : 'Bank Transfer'}`,
    });

    onClose();
  };

  const totalPayroll = employees
    .filter(emp => selectedEmployees.includes(emp.id))
    .reduce((sum, emp) => sum + emp.gross_pay, 0);

  const pendingPayments = employees.filter(emp => !completedPayments.includes(emp.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {payrollMode === 'nfc-active' ? (
              <>
                <Nfc className="w-5 h-5 text-primary animate-pulse" />
                Tap-to-Pay Payroll
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Process Payroll
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {payrollMode === 'nfc-active' 
              ? 'Hold employee device near to complete payment'
              : 'Process employee payments for the selected pay period'}
          </DialogDescription>
        </DialogHeader>

        {/* NFC Active Payment UI */}
        {payrollMode === 'nfc-active' && currentTapEmployee && (
          <div className="space-y-4">
            {/* NFC Animation Area */}
            <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/30">
              {/* Animated NFC Icon */}
              <div className="relative mb-6">
                <div className={`absolute inset-0 rounded-full bg-primary/20 ${nfcState.status === 'searching' ? 'animate-ping' : ''}`} 
                     style={{ width: 120, height: 120, left: -20, top: -20 }} />
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                  nfcState.status === 'completed' ? 'bg-green-500' : 
                  nfcState.status === 'failed' ? 'bg-destructive' : 'bg-primary'
                }`}>
                  {nfcState.status === 'completed' ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                  ) : nfcState.status === 'failed' ? (
                    <XCircle className="w-10 h-10 text-white" />
                  ) : nfcState.status === 'searching' ? (
                    <Radio className="w-10 h-10 text-white animate-pulse" />
                  ) : (
                    <Nfc className="w-10 h-10 text-white" />
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-foreground">
                  ${currentTapEmployee.gross_pay.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  IDIA-USD to {currentTapEmployee.name}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs space-y-2">
                <Progress value={nfcState.progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {nfcState.message}
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2 mt-4">
                <Badge variant={nfcState.status === 'searching' ? 'default' : 'secondary'} className="gap-1">
                  <Radio className="w-3 h-3" />
                  NFC
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Encrypted
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Zap className="w-3 h-3" />
                  Instant
                </Badge>
              </div>
            </div>

            {/* Payment Details Card */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Employee</span>
                <span className="font-medium">{currentTapEmployee.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline">{currentTapEmployee.role}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Worked</span>
                <span>{currentTapEmployee.total_hours}h regular + {currentTapEmployee.overtime_hours}h OT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pay Period</span>
                <span className="text-sm">{payPeriodStart} to {payPeriodEnd}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-medium">Gross Pay</span>
                <span className="text-lg font-bold text-primary">${currentTapEmployee.gross_pay.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              {nfcState.status === 'completed' ? (
                <Button onClick={resetToEmployeeList} className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {pendingPayments.length > 0 ? `Pay Next Employee (${pendingPayments.length} remaining)` : 'Done - All Paid'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={cancelNfcPayment}>
                    Cancel
                  </Button>
                  <Button disabled className="gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for device...
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tap-to-Pay Employee List */}
        {payrollMode === 'tap-to-pay' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Nfc className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Individual Tap-to-Pay</h4>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPayrollMode('batch')}>
                Switch to Batch
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Tap each employee's IDIA Life device to transfer their paycheck instantly via NFC.
            </p>

            {/* Employee Payment Queue */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {employees.map((employee) => {
                const isPaid = completedPayments.includes(employee.id);
                return (
                  <div 
                    key={employee.id} 
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isPaid ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPaid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <h5 className="font-medium">{employee.name}</h5>
                        <p className="text-xs text-muted-foreground">
                          {employee.role} • {employee.total_hours}h + {employee.overtime_hours}h OT
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">${employee.gross_pay.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">IDIA-USD</p>
                      </div>
                      {isPaid ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Paid
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => startTapToPay(employee)} className="gap-1">
                          <Nfc className="w-4 h-4" />
                          Tap to Pay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Footer */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <p className="font-medium">{completedPayments.length} of {employees.length} employees paid</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <p className="text-lg font-bold">
                    ${pendingPayments.reduce((sum, emp) => sum + emp.gross_pay, 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <Progress 
                value={(completedPayments.length / employees.length) * 100} 
                className="h-2 mt-3" 
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Batch Payroll Mode */}
        {payrollMode === 'batch' && (
          <div className="space-y-4">
            {/* Pay Period Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pay Period Start</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pay Period End</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setUseIdiaUsd(true); setPayrollMode('batch'); }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  useIdiaUsd && payrollMode === 'batch'
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-medium">IDIA-USD Batch</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Instant transfer to all employee wallets
                </p>
              </button>

              <button
                onClick={() => setPayrollMode('tap-to-pay')}
                className="p-4 rounded-lg border-2 text-left transition-all border-border hover:border-primary/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Nfc className="w-5 h-5 text-primary" />
                  <span className="font-medium">Tap-to-Pay</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Individual NFC payments per employee
                </p>
              </button>
            </div>

            {/* Employee List */}
            {employees.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Employees ({employees.length})</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmployees(employees.map(emp => emp.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmployees([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees(prev => [...prev, employee.id]);
                            } else {
                              setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <h5 className="font-medium">{employee.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            {employee.total_hours}h regular + {employee.overtime_hours}h overtime
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium">${employee.gross_pay.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          ${employee.hourly_rate}/hr
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedEmployees.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Payroll</span>
                  <span className="text-xl font-bold">${totalPayroll.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>{selectedEmployees.length} employees</span>
                  <span>via IDIA-USD (Instant)</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={processPayroll}
                disabled={selectedEmployees.length === 0}
                className="gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Process Batch Payroll
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};