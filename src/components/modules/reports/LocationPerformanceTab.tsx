import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface LocationData {
  locationId: string;
  location: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
}

interface Props {
  locationPerformance: LocationData[];
  locationNames: Record<string, string>;
  loading: boolean;
}

export const LocationPerformanceTab = ({ locationPerformance, locationNames, loading }: Props) => {
  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>;

  if (locationPerformance.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <MapPin className="w-8 h-8 mb-2" />
          <p className="text-sm">No location data available</p>
          <p className="text-xs">Process sales through POS with assigned locations to see comparisons</p>
        </CardContent>
      </Card>
    );
  }

  const topLocation = locationPerformance.reduce((a, b) => a.revenue > b.revenue ? a : b);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Locations</p>
          <p className="text-lg font-bold">{locationPerformance.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Top Location</p>
          <p className="text-lg font-bold truncate">{locationNames[topLocation.locationId] || topLocation.location}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Combined Revenue</p>
          <p className="text-lg font-bold">${locationPerformance.reduce((s, l) => s + l.revenue, 0).toFixed(2)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Location Comparison</CardTitle>
          <CardDescription className="text-xs">Side-by-side KPI comparison</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Avg Ticket</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationPerformance.map((loc) => {
                const totalRev = locationPerformance.reduce((s, l) => s + l.revenue, 0);
                const share = totalRev > 0 ? (loc.revenue / totalRev) * 100 : 0;
                return (
                  <TableRow key={loc.locationId}>
                    <TableCell className="font-medium">
                      {locationNames[loc.locationId] || loc.location}
                      {loc.locationId === topLocation.locationId && <Badge variant="secondary" className="ml-2 text-[10px]">Top</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-medium">${loc.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{loc.transactions}</TableCell>
                    <TableCell className="text-right">${loc.avgTicket.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{share.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
