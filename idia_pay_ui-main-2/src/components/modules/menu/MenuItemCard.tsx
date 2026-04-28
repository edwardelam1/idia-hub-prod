import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Lock, Unlock } from "lucide-react";
import { MenuItem, getMarginPercentage, getProfitability } from "./menuData";

interface MenuItemCardProps {
  item: MenuItem;
  onToggleLock: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
}

export const MenuItemCard = ({ item, onToggleLock, onToggleActive }: MenuItemCardProps) => {
  const margin = getMarginPercentage(item.base_price, item.cost_price);
  const profitability = getProfitability(margin);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-2 border rounded gap-3 sm:gap-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-base sm:text-sm font-medium truncate">{item.name}</h4>
            <p className="text-sm sm:text-xs text-muted-foreground truncate">{item.description}</p>
            {item.preparation_time && (
              <p className="text-sm sm:text-xs text-muted-foreground">Prep time: {item.preparation_time}min</p>
            )}
          </div>
          <div className="flex gap-2 sm:flex-shrink-0">
            {item.is_locked && (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
            {!item.is_active && (
              <Badge variant="destructive" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 sm:flex-shrink-0">
        <div className="grid grid-cols-2 sm:block gap-4 sm:gap-0 text-center sm:text-right">
          <div>
            <p className="text-sm sm:text-xs font-medium">${item.base_price.toFixed(2)}</p>
            <p className="text-sm sm:text-xs text-muted-foreground">
              Cost: ${item.cost_price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm sm:text-xs font-medium">{margin.toFixed(1)}%</p>
            <Badge 
              variant={profitability.color as any}
              className="text-xs"
            >
              {profitability.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-1">
          <Switch
            checked={item.is_active}
            onCheckedChange={() => onToggleActive(item)}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 sm:h-6 sm:w-6"
            onClick={() => onToggleLock(item)}
          >
            {item.is_locked ? (
              <Lock className="w-4 h-4 sm:w-3 sm:h-3" />
            ) : (
              <Unlock className="w-4 h-4 sm:w-3 sm:h-3" />
            )}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-6 sm:w-6">
            <Edit className="w-4 h-4 sm:w-3 sm:h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
