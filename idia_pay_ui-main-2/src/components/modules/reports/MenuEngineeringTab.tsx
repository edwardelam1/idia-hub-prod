import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Utensils } from "lucide-react";
import type { MenuEngineeringItem } from "@/hooks/use-enterprise-reports";

interface Props {
  items: MenuEngineeringItem[];
  loading: boolean;
}

const classColors: Record<string, string> = {
  Star: "default",
  Puzzle: "secondary",
  Plowhorse: "outline",
  Dog: "destructive",
};

export const MenuEngineeringTab = ({ items, loading }: Props) => {
  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Utensils className="w-8 h-8 mb-2" />
          <p className="text-sm">No menu items found</p>
          <p className="text-xs">Add menu items and process POS sales to see engineering analysis</p>
        </CardContent>
      </Card>
    );
  }

  const stars = items.filter(i => i.classification === "Star");
  const puzzles = items.filter(i => i.classification === "Puzzle");
  const plowhorses = items.filter(i => i.classification === "Plowhorse");
  const dogs = items.filter(i => i.classification === "Dog");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-primary">
          <p className="text-xs text-muted-foreground">Stars ⭐</p>
          <p className="text-lg font-bold">{stars.length}</p>
          <p className="text-[10px] text-muted-foreground">High profit, high volume</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-chart-2">
          <p className="text-xs text-muted-foreground">Puzzles 🧩</p>
          <p className="text-lg font-bold">{puzzles.length}</p>
          <p className="text-[10px] text-muted-foreground">High profit, low volume</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-chart-3">
          <p className="text-xs text-muted-foreground">Plowhorses 🐴</p>
          <p className="text-lg font-bold">{plowhorses.length}</p>
          <p className="text-[10px] text-muted-foreground">Low profit, high volume</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-destructive">
          <p className="text-xs text-muted-foreground">Dogs 🐕</p>
          <p className="text-lg font-bold">{dogs.length}</p>
          <p className="text-[10px] text-muted-foreground">Low profit, low volume</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Item Profitability Matrix</CardTitle>
          <CardDescription className="text-xs">Menu items classified by popularity and profitability</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.sort((a, b) => b.totalRevenue - a.totalRevenue).map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs">{item.category}</TableCell>
                  <TableCell className="text-right">${item.basePrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.costPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${item.margin.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.marginPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{item.unitsSold}</TableCell>
                  <TableCell className="text-right">${item.totalRevenue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={classColors[item.classification] as any} className="text-[10px]">
                      {item.classification}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
