import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, ShoppingCart, DollarSign, User, Play, Square, 
  Coffee, CreditCard, Users, TrendingUp
} from "lucide-react";
import { POSModule } from "../modules/POSModule";

interface EmployeeDashboardProps {
  businessHealthIndex: number;
}

export const EmployeeDashboard = ({ businessHealthIndex }: EmployeeDashboardProps) => {
  const [activeTab, setActiveTab] = useState("pos");
  const [isClocked, setIsClockedIn] = useState(false);
  const [shiftStart, setShiftStart] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data for employee dashboard
  const employeeStats = {
    employeeName: "Sarah Johnson",
    location: "Downtown Location",
    todayTransactions: 47,
    todayRevenue: 1285,
    hoursWorked: 6.5,
    avgTransactionTime: "2m 34s"
  };

  const handleClockInOut = () => {
    if (!isClocked) {
      setIsClockedIn(true);
      setShiftStart(new Date());
    } else {
      setIsClockedIn(false);
      setShiftStart(null);
    }
  };

  const getWorkedHours = () => {
    if (!shiftStart) return "0:00";
    const diff = currentTime.getTime() - shiftStart.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col p-2">
      <div className="mb-2 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-foreground">{employeeStats.employeeName}</h2>
        <p className="text-xs text-muted-foreground">{employeeStats.location}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="w-full overflow-x-auto scrollbar-hide flex-shrink-0">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="pos" className="text-xs px-3">POS</TabsTrigger>
            <TabsTrigger value="timecard" className="text-xs px-3">Time Card</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs px-3">Performance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pos" className="flex-1 min-h-0 overflow-hidden">
          <POSModule />
        </TabsContent>

        <TabsContent value="timecard" className="flex-1 overflow-y-auto p-2">
          {/* Digital Time Clock */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Time Clock</CardTitle>
              <CardDescription>
                Clock in and out for your shifts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="text-4xl font-mono font-bold">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-lg text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                <Button
                  variant={isClocked ? "destructive" : "success"}
                  size="lg"
                  onClick={handleClockInOut}
                  className="w-full max-w-xs"
                >
                  {isClocked ? (
                    <>
                      <Square className="w-6 h-6 mr-2" />
                      Clock Out
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              </div>

              {isClocked && shiftStart && (
                <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Shift Started</p>
                  <p className="font-semibold">{shiftStart.toLocaleTimeString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Time Worked: {getWorkedHours()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Today</p>
                    <p className="text-sm text-muted-foreground">8:00 AM - In Progress</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{getWorkedHours()}</p>
                    <p className="text-sm text-success">Active</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Yesterday</p>
                    <p className="text-sm text-muted-foreground">9:00 AM - 5:30 PM</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">8:30</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Monday</p>
                    <p className="text-sm text-muted-foreground">8:30 AM - 4:00 PM</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">7:30</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="flex-1 overflow-y-auto p-2">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Today's Performance</CardTitle>
                <CardDescription>Your sales metrics for today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Transactions Processed</span>
                  <span className="text-lg font-bold">{employeeStats.todayTransactions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Sales</span>
                  <span className="text-lg font-bold">${employeeStats.todayRevenue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg Transaction Time</span>
                  <span className="text-lg font-bold">{employeeStats.avgTransactionTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Customer Rating</span>
                  <span className="text-lg font-bold">4.8/5.0</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Week's Summary</CardTitle>
                <CardDescription>Weekly performance overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Transactions</span>
                  <span className="text-lg font-bold">234</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Sales</span>
                  <span className="text-lg font-bold">$6,420</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Hours Worked</span>
                  <span className="text-lg font-bold">32.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Performance Score</span>
                  <span className="text-lg font-bold text-success">94%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Your recent accomplishments and recognition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium">Sales Goal Exceeded</p>
                  <p className="text-sm text-muted-foreground">Exceeded daily sales target by 15%</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">Customer Service Excellence</p>
                  <p className="text-sm text-muted-foreground">Received 5-star rating from 10 customers this week</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <Coffee className="w-6 h-6 text-accent-foreground" />
                <div>
                  <p className="font-medium">Perfect Attendance</p>
                  <p className="text-sm text-muted-foreground">No missed shifts this month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};